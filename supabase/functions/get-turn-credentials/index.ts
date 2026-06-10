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
    if (!user) return Response.json({ ok: false }, { status: 401, headers: corsHeaders })

    const username   = Deno.env.get('METERED_TURN_USERNAME') || ''
    const credential = Deno.env.get('METERED_TURN_CREDENTIAL') || ''

    if (!username || !credential) {
      return Response.json({ ok: false, reason: 'turn_not_configured' }, { status: 503, headers: corsHeaders })
    }

    const iceServers = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80',            username, credential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential },
      { urls: 'turn:global.relay.metered.ca:443',           username, credential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential },
    ]

    return Response.json({ ok: true, iceServers }, { headers: corsHeaders })

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500, headers: corsHeaders })
  }
})
