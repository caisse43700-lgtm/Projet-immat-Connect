import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ ok: false, reason: 'unauthenticated' }, { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const { request_id, response } = body

    if (!request_id || !['accepted', 'refused'].includes(response))
      return Response.json({ ok: false, reason: 'invalid_params' }, { status: 400, headers: corsHeaders })

    // Vérifier que la demande n'est pas expirée
    const { data: req_row } = await sb
      .from('call_requests')
      .select('expires_at, status')
      .eq('id', request_id)
      .eq('receiver_id', user.id)
      .maybeSingle()

    if (!req_row || req_row.status !== 'pending')
      return Response.json({ ok: false, reason: 'not_found_or_expired' }, { status: 404, headers: corsHeaders })

    if (new Date(req_row.expires_at) < new Date()) {
      await sb.from('call_requests')
        .update({ status: 'expired' })
        .eq('id', request_id)
      return Response.json({ ok: false, reason: 'expired' }, { headers: corsHeaders })
    }

    const { data, error } = await sb
      .from('call_requests')
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq('id', request_id)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error || !data)
      return Response.json({ ok: false, reason: 'update_failed' }, { status: 500, headers: corsHeaders })

    return Response.json({ ok: true, request: data }, { headers: corsHeaders })
  } catch (e) {
    console.error('respond-call-request error:', e)
    return Response.json(
      { ok: false, reason: 'server_error', detail: String(e) },
      { status: 500, headers: corsHeaders }
    )
  }
})
