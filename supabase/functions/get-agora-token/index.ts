const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const { channelName, uid } = body

    if (!channelName || !uid) {
      return Response.json({ error: 'channelName and uid required' }, { status: 400, headers: corsHeaders })
    }

    const appId = Deno.env.get('AGORA_APP_ID') || '4771f029e9c6446e872a598870bb74f3'
    const appCert = Deno.env.get('AGORA_APP_CERTIFICATE') || ''

    let token = null

    if (appCert) {
      // @ts-ignore
      const { RtcTokenBuilder } = await import('npm:agora-token@2.0.4')
      const expireTs = Math.floor(Date.now() / 1000) + 3600
      token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, uid, 1, expireTs, expireTs)
    }

    return Response.json({ token, channelName, uid }, { headers: corsHeaders })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders })
  }
})
