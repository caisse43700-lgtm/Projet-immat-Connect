// delete-account — ImmatConnect — S8-01 delete_audit_log
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type DeleteStep =
  | 'push_subscriptions'
  | 'device_sessions'
  | 'user_blocks'
  | 'driver_ratings'
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

function isMissingRelationError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: string };
  const msg = `${e?.code || ''} ${e?.message || ''} ${e?.details || ''}`.toLowerCase();
  return msg.includes('42p01')
    || msg.includes('pgrst205')
    || msg.includes('could not find the table')
    || (msg.includes('relation') && msg.includes('does not exist'));
}

async function optionalDelete(
  adminSb: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
  step: DeleteStep,
): Promise<Response | null> {
  try {
    const { error } = await adminSb.from(table).delete().eq(column, value);
    if (error) throw error;
    return null;
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn(`[delete-account] optional table missing: ${table}`);
      return null;
    }
    return fail(step, error);
  }
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

  const supabaseUrl            = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey        = Deno.env.get('SUPABASE_ANON_KEY');
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

  // ── Audit log RGPD art. 17 ────────────────────────────────────────────────
  let auditId: string | null = null;
  const stepsCompleted: string[] = [];

  try {
    const { data } = await adminSb
      .from('delete_audit_log')
      .insert({ user_id: userId, status: 'pending', steps_completed: [] })
      .select('id')
      .single();
    auditId = data?.id ?? null;
  } catch (_) { /* table pas encore déployée — on continue sans audit */ }

  const recordStep = async (step: string): Promise<void> => {
    stepsCompleted.push(step);
    if (!auditId) return;
    try {
      await adminSb.from('delete_audit_log')
        .update({ steps_completed: stepsCompleted })
        .eq('id', auditId);
    } catch (_) {}
  };

  const failWithAudit = async (step: DeleteStep, error: unknown): Promise<Response> => {
    if (auditId) {
      try {
        await adminSb.from('delete_audit_log')
          .update({ status: 'error', error: `${step}: ${errorMessage(error)}`, steps_completed: stepsCompleted })
          .eq('id', auditId);
      } catch (_) {}
    }
    return fail(step, error);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Étape 1 — push_subscriptions
  try {
    const { error } = await adminSb.from('push_subscriptions').delete().eq('user_id', userId);
    if (error) throw error;
    await recordStep('push_subscriptions');
  } catch (error) { return failWithAudit('push_subscriptions', error); }

  // Étape 2 — device_sessions
  {
    const errorResponse = await optionalDelete(adminSb, 'device_sessions', 'user_id', userId, 'device_sessions');
    if (errorResponse) return failWithAudit('device_sessions', 'optionalDelete failed');
    await recordStep('device_sessions');
  }

  // Étape 3 — user_blocks
  {
    const errorResponse = await optionalDelete(adminSb, 'user_blocks', 'user_id', userId, 'user_blocks');
    if (errorResponse) return failWithAudit('user_blocks', 'optionalDelete failed');
    await recordStep('user_blocks');
  }

  // Étape 4 — driver_ratings
  {
    const errorResponse = await optionalDelete(adminSb, 'driver_ratings', 'rater_id', userId, 'driver_ratings');
    if (errorResponse) return failWithAudit('driver_ratings', 'optionalDelete failed');
    await recordStep('driver_ratings');
  }

  // Étape 5 — user_locations
  try {
    const { error } = await adminSb.from('user_locations').delete().eq('id', userId);
    if (error) throw error;
    await recordStep('user_locations');
  } catch (error) { return failWithAudit('user_locations', error); }

  // Étape 6 — messages envoyés
  try {
    const { error } = await adminSb.from('messages').delete().eq('sender_id', userId);
    if (error) throw error;
    await recordStep('messages_sent');
  } catch (error) { return failWithAudit('messages_sent', error); }

  // Étape 7 — messages reçus
  try {
    const { error } = await adminSb.from('messages').delete().eq('receiver_id', userId);
    if (error) throw error;
    await recordStep('messages_received');
  } catch (error) { return failWithAudit('messages_received', error); }

  // Étape 8 — reports
  try {
    const { error } = await adminSb.from('reports').delete().eq('reporter_id', userId);
    if (error) throw error;
    await recordStep('reports');
  } catch (error) { return failWithAudit('reports', error); }

  // Étape 9 — call_requests (requester)
  try {
    const { error } = await adminSb.from('call_requests').delete().eq('requester_id', userId);
    if (error) throw error;
    await recordStep('call_requests_requester');
  } catch (error) { return failWithAudit('call_requests_requester', error); }

  // Étape 10 — call_requests reçus
  try {
    const { error } = await adminSb.from('call_requests').delete().eq('receiver_id', userId);
    if (error) throw error;
    await recordStep('call_requests_receiver');
  } catch (error) { return failWithAudit('call_requests_receiver', error); }

  // Étape 11 — profiles
  try {
    const { error } = await adminSb.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    await recordStep('profiles');
  } catch (error) { return failWithAudit('profiles', error); }

  // Étape 12 — compte auth (en dernier)
  try {
    const { error } = await adminSb.auth.admin.deleteUser(userId);
    if (error) throw error;
    await recordStep('auth_user');
  } catch (error) { return failWithAudit('auth_user', error); }

  // Marquer la suppression comme terminée
  if (auditId) {
    try {
      await adminSb.from('delete_audit_log')
        .update({ status: 'completed', completed_at: new Date().toISOString(), steps_completed: stepsCompleted })
        .eq('id', auditId);
    } catch (_) {}
  }

  return jsonResponse({ deleted: true }, 200);
});
