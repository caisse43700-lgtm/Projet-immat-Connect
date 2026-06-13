// export-user-data — ImmatConnect
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type ProfileRow = {
  id: string;
  email: string | null;
  pseudo: string | null;
  owner_plate: string | null;
  phone: string | null;
  vehicle_color: string | null;
};

type UserLocationRow = {
  id: string;
  user_name: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  target_plate: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

type ReportRow = {
  id: string;
  reporter_id: string | null;
  plate: string | null;
  reason: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  created_at: string | null;
};

// Colonnes réelles : requester_id / requester_plate (pas caller_id / caller_plate)
type CallRequestRow = {
  id: string;
  requester_id: string | null;
  receiver_id: string | null;
  requester_plate: string | null;
  receiver_plate: string | null;
  status: string | null;
  created_at: string | null;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  created_at: string | null;
};

type RedactedPushRow = Omit<PushSubscriptionRow, 'p256dh' | 'auth'> & {
  p256dh: '[chiffré]';
  auth: '[chiffré]';
};

// Tables S6 — optionnelles (peuvent ne pas encore être déployées)
type DriverRatingRow = {
  id: string;
  rater_id: string | null;
  rated_plate: string | null;
  score: number | null;
  context: string | null;
  comment: string | null;
  created_at: string | null;
};

type UserBlockRow = {
  blocked_plate: string | null;
};

type DeviceSessionRow = {
  device_id: string | null;
  platform: string | null;
  last_seen: string | null;
};

type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown error';
}

// Détecte les erreurs liées à une table inexistante (migration pas encore déployée).
function isMissingRelationError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: string };
  const msg = `${e?.code || ''} ${e?.message || ''} ${e?.details || ''}`.toLowerCase();
  return msg.includes('42p01')
    || msg.includes('pgrst205')
    || msg.includes('could not find the table')
    || (msg.includes('relation') && msg.includes('does not exist'));
}

async function readOne<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: SupabaseErrorLike | null }>,
): Promise<T | null> {
  const { data, error } = await query;
  if (error) { console.error(`[export-user-data] ${label}`, error); throw new Error(error.message); }
  return data?.[0] ?? null;
}

async function readAll<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: SupabaseErrorLike | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) { console.error(`[export-user-data] ${label}`, error); throw new Error(error.message); }
  return data ?? [];
}

// Lecture tolérante : retourne [] si la table est absente, lève une erreur sinon.
async function readAllOptional<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: SupabaseErrorLike | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn(`[export-user-data] optional table missing: ${label}`);
      return [];
    }
    console.error(`[export-user-data] ${label}`, error);
    throw new Error(error.message);
  }
  return data ?? [];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const token = getBearerToken(req);
  if (!token) return jsonResponse({ error: 'unauthorized' }, 401);

  const supabaseUrl          = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey      = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'missing_environment' }, 500);
  }

  const userSb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await userSb.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ error: 'unauthorized' }, 401);

  const userId  = userData.user.id;
  const adminSb = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const [
      profile,
      location,
      messagesSent,
      messagesReceived,
      reports,
      callRequestsInitiated,
      callRequestsReceived,
      pushSubscriptions,
      driverRatings,
      userBlocks,
      deviceSessions,
    ] = await Promise.all([
      readOne<ProfileRow>('profile',
        adminSb.from('profiles').select('*').eq('id', userId).limit(1)),
      readOne<UserLocationRow>('location',
        adminSb.from('user_locations').select('*').eq('id', userId).limit(1)),
      readAll<MessageRow>('messages_sent',
        adminSb.from('messages').select('*').eq('sender_id', userId)),
      readAll<MessageRow>('messages_received',
        adminSb.from('messages').select('*').eq('receiver_id', userId)),
      readAll<ReportRow>('reports',
        adminSb.from('reports').select('*').eq('reporter_id', userId)),
      readAll<CallRequestRow>('call_requests_initiated',
        adminSb.from('call_requests').select('*').eq('requester_id', userId)),
      readAll<CallRequestRow>('call_requests_received',
        adminSb.from('call_requests').select('*').eq('receiver_id', userId)),
      readAll<PushSubscriptionRow>('push_subscriptions',
        adminSb.from('push_subscriptions').select('*').eq('user_id', userId)),
      // Tables S6 — optionnelles si migrations pas encore déployées
      readAllOptional<DriverRatingRow>('driver_ratings',
        adminSb.from('driver_ratings').select('id,rated_plate,score,context,comment,created_at').eq('rater_id', userId)),
      readAllOptional<UserBlockRow>('user_blocks',
        adminSb.from('user_blocks').select('blocked_plate').eq('user_id', userId)),
      readAllOptional<DeviceSessionRow>('device_sessions',
        adminSb.from('device_sessions').select('device_id,platform,last_seen').eq('user_id', userId)),
    ]);

    const redactedPush: RedactedPushRow[] = pushSubscriptions.map(s => ({
      ...s, p256dh: '[chiffré]', auth: '[chiffré]',
    }));

    return jsonResponse(
      {
        exported_at: new Date().toISOString(),
        user_id: userId,
        profile,
        location,
        messages_sent: messagesSent,
        messages_received: messagesReceived,
        reports,
        call_requests_initiated: callRequestsInitiated,
        call_requests_received: callRequestsReceived,
        push_subscriptions: redactedPush,
        driver_ratings: driverRatings,
        user_blocks: userBlocks,
        device_sessions: deviceSessions,
      },
      200,
      {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mes-donnees-immatconnect.json"',
      },
    );
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
