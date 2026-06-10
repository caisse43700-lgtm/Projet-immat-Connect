import { corsHeaders } from '../_shared/cors.ts'

// AGORA_APP_ID   : public, peut être en clair (Agora design)
// AGORA_APP_CERTIFICATE : secret — génère le token RTC ; absent = testing mode (null token)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const { channelName, uid } = body as { channelName?: string; uid?: number }

    if (!channelName || !uid) {
      return Response.json({ error: 'channelName and uid required' }, { status: 400, headers: corsHeaders })
    }

    const appId = Deno.env.get('AGORA_APP_ID') || '4771f029e9c6446e872a598870bb74f3'
    const appCert = Deno.env.get('AGORA_APP_CERTIFICATE') || ''

    let token: string | null = null

    if (appCert) {
      try {
        // @ts-ignore — npm package, available in Supabase Edge Runtime
        const { RtcTokenBuilder } = await import('npm:agora-token@2.0.4')
        const expireTs = Math.floor(Date.now() / 1000) + 3600
        // RtcRole.PUBLISHER = 1
        token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, uid, 1, expireTs, expireTs)
      } catch (err) {
        console.error('[get-agora-token] token build failed:', err)
        // Fallback to testing mode — caller still joins with null token
        token = null
      }
    }
    // If appCert absent → testing mode → token stays null → Agora App-ID-only mode

    return Response.json({ token, channelName, uid }, { headers: corsHeaders })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders })
  }
})
