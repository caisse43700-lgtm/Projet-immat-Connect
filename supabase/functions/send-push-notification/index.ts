// send-push-notification — ImmatConnect
// Envoie une push notification VAPID à un utilisateur cible.
// Payload attendu : { targetUserId, title, body, data?, tag? }
// Invariant : ne transmet jamais le contenu de message (INV-COM-010/015).
import webPush from 'npm:web-push@3.6.7';

import { corsHeaders } from '../_shared/cors.ts';
import { createClient }  from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth : seul un utilisateur authentifié peut déclencher une push
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId, title, body: notifBody, data, tag } = body;

    if (!targetUserId || !title) {
      return Response.json({ error: 'targetUserId and title required' }, { status: 400, headers: corsHeaders });
    }

    // Clés VAPID depuis les secrets Supabase
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')  || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT')     || 'https://caisse43700-lgtm.github.io/Projet-immat-Connect/';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[send-push] VAPID keys missing in secrets');
      return Response.json({ error: 'push not configured' }, { status: 503, headers: corsHeaders });
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Service role pour lire les abonnements push de targetUserId (bypass RLS)
    const adminSb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: subs, error: subErr } = await adminSb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', targetUserId);

    if (subErr) {
      console.error('[send-push] DB error', subErr);
      return Response.json({ error: 'db error' }, { status: 500, headers: corsHeaders });
    }

    if (!subs || subs.length === 0) {
      // Pas d'abonnement push — silencieux (l'app est peut-être ouverte)
      return Response.json({ sent: 0 }, { headers: corsHeaders });
    }

    const payload = JSON.stringify({ title, body: notifBody || '', data: data || {}, tag: tag || 'immatconnect' });

    const results = await Promise.allSettled(
      subs.map(s =>
        webPush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 },
        )
      )
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Supprimer les abonnements expirés (410 Gone)
    const expired: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const status = (r.reason as any)?.statusCode;
        if (status === 410 || status === 404) expired.push(subs[i].endpoint);
      }
    });
    if (expired.length > 0) {
      await adminSb.from('push_subscriptions').delete().in('endpoint', expired);
    }

    return Response.json({ sent, failed }, { headers: corsHeaders });
  } catch (err) {
    console.error('[send-push] unexpected error', err);
    return Response.json({ error: 'internal error' }, { status: 500, headers: corsHeaders });
  }
});
