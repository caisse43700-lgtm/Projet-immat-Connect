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

    if (!channelName || uid === undefined || uid === null) {
      return Response.json({ error: 'channelName and uid required' }, { status: 400, headers: corsHeaders })
    }

    const appId = Deno.env.get('AGORA_APP_ID') || '4771f029e9c6446e872a598870bb74f3'
    const appCert = Deno.env.get('AGORA_APP_CERTIFICATE') || ''

    let token: string | null = null

    if (appCert) {
      // Tentative 1 : import nommé (ESM)
      let RtcTokenBuilder: any = null
      try {
        const mod: any = await import('npm:agora-token@2.0.4')
        RtcTokenBuilder = mod?.RtcTokenBuilder ?? mod?.default?.RtcTokenBuilder ?? null
      } catch (importErr) {
        console.error('[get-agora-token] npm import failed:', importErr)
      }

      if (RtcTokenBuilder && typeof RtcTokenBuilder.buildTokenWithUid === 'function') {
        try {
          const expireTs = Math.floor(Date.now() / 1000) + 3600
          token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channelName, Number(uid), 1, expireTs, expireTs)
          console.log('[get-agora-token] token généré via agora-token@2.0.4')
        } catch (buildErr) {
          console.error('[get-agora-token] buildTokenWithUid failed:', buildErr)
          return Response.json(
            { error: 'token-build-failed', detail: String(buildErr) },
            { status: 500, headers: corsHeaders }
          )
        }
      } else {
        // Fallback : token natif Agora AccessToken2 via Web Crypto (Deno built-in)
        try {
          token = await buildAgoraToken(appId, appCert, String(channelName), String(uid), 3600)
          console.log('[get-agora-token] token généré via implémentation native')
        } catch (nativeErr) {
          console.error('[get-agora-token] native token failed:', nativeErr)
          return Response.json(
            { error: 'token-native-failed', detail: String(nativeErr) },
            { status: 500, headers: corsHeaders }
          )
        }
      }
    } else {
      console.warn('[get-agora-token] AGORA_APP_CERTIFICATE non configuré — token null (testing mode)')
    }

    return Response.json({ token, channelName, uid }, { headers: corsHeaders })
  } catch (err) {
    console.error('[get-agora-token] unexpected error:', err)
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders })
  }
})

// ── Implémentation native Agora AccessToken2 (Web Crypto, sans dépendance npm) ──
// Ref: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey
async function buildAgoraToken(
  appId: string,
  appCert: string,
  channelName: string,
  uid: string,
  expireSeconds: number
): Promise<string> {
  const encoder = new TextEncoder()
  const nowTs = Math.floor(Date.now() / 1000)
  const expireTs = nowTs + expireSeconds
  const salt = Math.floor(Math.random() * 0xFFFFFFFF) + 1

  // Signature = HMAC-SHA256(appCert, appId + nowTs + salt + channelName + uid)
  const sigMsg = encoder.encode(appId + nowTs + salt + channelName + uid)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appCert),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, sigMsg))

  // Pack message : appId(16) + expire(4BE) + salt(4BE) + issueTs(4BE) + services
  // Service RTC = type(2BE) + channelName(2BE+bytes) + uid(2BE+bytes) + privileges
  const buf = new DataView(new ArrayBuffer(4096))
  let off = 0

  function writeU16(v: number) { buf.setUint16(off, v, false); off += 2 }
  function writeU32(v: number) { buf.setUint32(off, v, false); off += 4 }
  function writeBytes(b: Uint8Array) { new Uint8Array(buf.buffer).set(b, off); off += b.length }
  function writeStr(s: string) { const b = encoder.encode(s); writeU16(b.length); writeBytes(b) }

  // version=2
  writeU16(2)
  // appId (16 bytes)
  writeBytes(encoder.encode(appId.substring(0, 16)))
  // expire
  writeU32(expireTs)
  // salt
  writeU32(salt)
  // issueTs
  writeU32(nowTs)
  // services count = 1
  writeU16(1)
  // service type = 1 (RTC)
  writeU16(1)
  // channelName
  writeStr(channelName)
  // uid ("" = all users)
  writeStr(uid === '0' ? '' : uid)
  // privileges count = 5
  writeU16(5)
  // 1=joinChannel, 2=publishAudio, 3=publishVideo, 4=publishData, 7=subscribe
  for (const priv of [1, 2, 3, 4, 7]) { writeU16(priv); writeU32(expireTs) }
  // signature
  writeU16(sigBuf.length)
  writeBytes(sigBuf)

  const payload = new Uint8Array(buf.buffer, 0, off)

  // zlib deflate via DecompressionStream (compress = CompressionStream)
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(payload)
  writer.close()
  const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer())

  // base64url
  const b64 = btoa(String.fromCharCode(...compressed))
  return '007' + b64
}
