// delete-account — ImmatConnect
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type DeleteStep =
  | 'push_subscriptions'
  | 'user_locations'
  | 'messages_sent'
  | 'messages_received'
  | 'reports'
  | 'call_requests_requester'
  | 'call_requests_receiver'
  | 'profiles'
  | 'auth_user';

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders });
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

async function fail(step: DeleteStep, error: unknown): Promise<Response> {
  console.error(`[delete-account] step ${step}`, error);
  return jsonResponse({ error: errorMessage(error), step }, 500);
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

  // Étape 1 — push_subscriptions
  try {
    const { error } = await adminSb.from('push_subscriptions').delete().eq('user_id', userId);
    if (error) throw error;
  } catch (error) { return fail('push_subscriptions', error); }

  // Étape 2 — user_locations
  try {
    const { error } = await adminSb.from('user_locations').delete().eq('id', userId);
    if (error) throw error;
  } catch (error) { return fail('user_locations', error); }

  // Étape 3 — messages envoyés
  try {
    const { error } = await adminSb.from('messages').delete().eq('sender_id', userId);
    if (error) throw error;
  } catch (error) { return fail('messages_sent', error); }

  // Étape 4 — messages reçus
  try {
    const { error } = await adminSb.from('messages').delete().eq('receiver_id', userId);
    if (error) throw error;
  } catch (error) { return fail('messages_received', error); }

  // Étape 5 — reports
  try {
    const { error } = await adminSb.from('reports').delete().eq('reporter_id', userId);
    if (error) throw error;
  } catch (error) { return fail('reports', error); }

  // Étape 6 — call_requests (requester = colonne réelle, alias caller dans le prompt)
  try {
    const { error } = await adminSb.from('call_requests').delete().eq('requester_id', userId);
    if (error) throw error;
  } catch (error) { return fail('call_requests_requester', error); }

  // Étape 7 — call_requests reçus
  try {
    const { error } = await adminSb.from('call_requests').delete().eq('receiver_id', userId);
    if (error) throw error;
  } catch (error) { return fail('call_requests_receiver', error); }

  // Étape 8 — profiles
  try {
    const { error } = await adminSb.from('profiles').delete().eq('id', userId);
    if (error) throw error;
  } catch (error) { return fail('profiles', error); }

  // Étape 9 — compte auth (en dernier)
  try {
    const { error } = await adminSb.auth.admin.deleteUser(userId);
    if (error) throw error;
  } catch (error) { return fail('auth_user', error); }

  return jsonResponse({ deleted: true }, 200);
});
