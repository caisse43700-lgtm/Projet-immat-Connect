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
    const { receiver_id, receiver_plate, requester_plate } = body

    if (!receiver_id)
      return Response.json({ ok: false, reason: 'missing_receiver' }, { status: 400, headers: corsHeaders })
    if (receiver_id === user.id)
      return Response.json({ ok: false, reason: 'self_call' }, { status: 400, headers: corsHeaders })

    // Vérifier que le conducteur cible autorise les appels
    const { data: pref } = await sb
      .from('call_preferences')
      .select('allow_calls')
      .eq('user_id', receiver_id)
      .maybeSingle()
    if (!pref?.allow_calls)
      return Response.json({ ok: false, reason: 'calls_not_allowed' }, { headers: corsHeaders })

    // Anti-spam : max 3 demandes / 10 min entre les mêmes utilisateurs
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await sb
      .from('call_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .eq('receiver_id', receiver_id)
      .gte('created_at', since)
    if ((count ?? 0) >= 3)
      return Response.json({ ok: false, reason: 'spam_limit' }, { headers: corsHeaders })

    // Vérifier qu'il n'y a pas déjà une demande pending entre ces deux utilisateurs
    const { data: existing } = await sb
      .from('call_requests')
      .select('id')
      .eq('requester_id', user.id)
      .eq('receiver_id', receiver_id)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing)
      return Response.json({ ok: false, reason: 'already_pending' }, { headers: corsHeaders })

    // Créer la demande
    const { data, error } = await sb
      .from('call_requests')
      .insert({
        requester_id: user.id,
        receiver_id,
        requester_plate: requester_plate ?? null,
        receiver_plate: receiver_plate ?? null,
        source: 'vehicle_contact',
      })
      .select()
      .single()

    if (error) throw error
    return Response.json({ ok: true, request: data }, { headers: corsHeaders })
  } catch (e) {
    console.error('create-call-request error:', e)
    return Response.json(
      { ok: false, reason: 'server_error', detail: String(e) },
      { status: 500, headers: corsHeaders }
    )
  }
})
