// notify-help-request — ImmatConnect — Aide V1 #7 (push proximité)
// À la création d'une demande d'aide, notifie les conducteurs PROCHES (push VAPID).
// Payload attendu : { requestId }
// Sécurité : seul le demandeur de la demande peut déclencher la notification de SA demande.
// Idempotence : un événement marqueur 'proximity_notified' (client_event_id = requestId) garantit
//   un seul envoi par demande (UNIQUE(actor_id, client_event_id) sur help_events).
// Confidentialité : la notification ne révèle ni la position précise ni la plaque — seulement le type.
import webPush from 'npm:web-push@3.6.7';

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TYPE_LABELS: Record<string, string> = {
  panne: 'Panne', carburant: 'Carburant', batterie: 'Batterie',
  moteur: 'Moteur', incendie: 'Incendie', perdu: 'Conducteur perdu',
};

// Distance Haversine en km
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function sendWithRetry(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 120 },
      );
      return;
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as any)?.statusCode;
      if (status && status < 500) throw err; // 4xx = permanent
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1) Identité de l'appelant (doit être le demandeur)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
    }
    const userSb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userSb.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthenticated' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const requestId = body?.requestId;
    if (!requestId) {
      return Response.json({ error: 'requestId required' }, { status: 400, headers: corsHeaders });
    }

    // 2) Clés VAPID
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')  || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT')     || 'https://caisse43700-lgtm.github.io/Projet-immat-Connect/';
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[notify-help] VAPID keys missing');
      return Response.json({ error: 'push not configured' }, { status: 503, headers: corsHeaders });
    }
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 3) Service role (bypass RLS) pour lire demande / positions / abonnements
    const adminSb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 4) Charge la demande, vérifie propriété + statut ouvert
    const { data: reqRow, error: reqErr } = await adminSb
      .from('help_requests')
      .select('id, demandeur_id, type, famille, lat, lng, status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr) {
      console.error('[notify-help] read request', reqErr);
      return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders });
    }
    if (!reqRow) {
      return Response.json({ error: 'request not found' }, { status: 404, headers: corsHeaders });
    }
    if (reqRow.demandeur_id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders });
    }
    if (reqRow.status !== 'ouverte') {
      return Response.json({ sent: 0, noop: true, reason: 'not_open' }, { headers: corsHeaders });
    }
    if (reqRow.lat == null || reqRow.lng == null) {
      return Response.json({ sent: 0, noop: true, reason: 'no_position' }, { headers: corsHeaders });
    }

    // 5) Idempotence : marqueur 'proximity_notified' (client_event_id = requestId)
    const { error: markErr } = await adminSb
      .from('help_events')
      .insert({
        request_id: requestId,
        actor_id: reqRow.demandeur_id,
        type: 'proximity_notified',
        payload: { source: 'system' },
        client_event_id: requestId,
      });
    if (markErr) {
      // 23505 = unique violation → déjà notifié, on s'arrête (anti double-push)
      if ((markErr as any)?.code === '23505') {
        return Response.json({ sent: 0, noop: true, reason: 'already_notified' }, { headers: corsHeaders });
      }
      console.error('[notify-help] marker insert', markErr);
      // On continue malgré tout : mieux vaut notifier que rater l'alerte
    }

    // 6) Conducteurs proches via bounding-box + Haversine (positions fraîches < 30 min)
    const radiusKm = reqRow.famille === 'urgence' ? 15 : 10;
    const lat = Number(reqRow.lat), lng = Number(reqRow.lng);
    const dLat = radiusKm / 111.0;
    const dLng = radiusKm / (111.0 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    const cut = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: locs, error: locErr } = await adminSb
      .from('user_locations')
      .select('id, latitude, longitude, updated_at')
      .gte('latitude', lat - dLat).lte('latitude', lat + dLat)
      .gte('longitude', lng - dLng).lte('longitude', lng + dLng)
      .gte('updated_at', cut)
      .neq('id', reqRow.demandeur_id)
      .limit(500);
    if (locErr) {
      console.error('[notify-help] user_locations', locErr);
      return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders });
    }

    const nearbyIds = [...new Set((locs || [])
      .filter(l => l && l.id && Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)))
      .filter(l => distanceKm(lat, lng, Number(l.latitude), Number(l.longitude)) <= radiusKm)
      .map(l => l.id))];

    if (nearbyIds.length === 0) {
      return Response.json({ sent: 0, targets: 0 }, { headers: corsHeaders });
    }

    // 7) Abonnements push des conducteurs proches
    const { data: subs, error: subErr } = await adminSb
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', nearbyIds);
    if (subErr) {
      console.error('[notify-help] push_subscriptions', subErr);
      return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders });
    }
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, targets: nearbyIds.length }, { headers: corsHeaders });
    }

    // 8) Envoi (type uniquement — pas de position précise ni de plaque)
    const label = TYPE_LABELS[reqRow.type] || 'Assistance';
    const payload = JSON.stringify({
      title: '🆘 Demande d\'aide à proximité',
      body: `Un conducteur a besoin d'aide (${label}) près de vous.`,
      data: { type: 'help', requestId },
      tag: 'help-' + requestId,
    });

    const results = await Promise.allSettled(subs.map(s => sendWithRetry(s, payload)));
    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Nettoyage des abonnements expirés (410/404)
    const expired: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const st = (r.reason as any)?.statusCode;
        if (st === 410 || st === 404) expired.push(subs[i].endpoint);
      }
    });
    if (expired.length > 0) {
      await adminSb.from('push_subscriptions').delete().in('endpoint', expired);
    }

    return Response.json({ sent, failed, targets: nearbyIds.length }, { headers: corsHeaders });
  } catch (err) {
    console.error('[notify-help] unexpected', err);
    return Response.json({ error: 'internal error' }, { status: 500, headers: corsHeaders });
  }
});
