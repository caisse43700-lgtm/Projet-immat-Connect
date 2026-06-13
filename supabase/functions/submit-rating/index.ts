import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok  = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
const err = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return err('Missing authorization', 401)

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase     = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: userData, error: authErr } = await supabase.auth.getUser(jwt)
  if (authErr || !userData?.user) return err('Unauthorized', 401)
  const raterId = userData.user.id

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return err('Invalid JSON', 400) }

  const rawPlate  = String(body.rated_plate ?? '').toUpperCase().replace(/[-\s]/g, '')
  const score     = Number(body.score)
  const context   = String(body.context ?? '')
  const comment   = body.comment != null ? String(body.comment).slice(0, 280) : null

  if (!/^[A-Z0-9]{2,10}$/.test(rawPlate)) return err('rated_plate invalide', 400)
  if (!Number.isInteger(score) || score < 1 || score > 5) return err('score invalide (1-5)', 400)
  if (!['call', 'message', 'alert', 'encounter'].includes(context)) return err('context invalide', 400)

  const { data: profData } = await supabase
    .from('profiles')
    .select('owner_plate')
    .eq('id', raterId)
    .single()

  const ownPlate = String(profData?.owner_plate ?? '').toUpperCase().replace(/[-\s]/g, '')
  if (ownPlate && ownPlate === rawPlate) return err('Impossible de noter sa propre plaque', 400)

  const { data: inserted, error: insertErr } = await supabase
    .from('driver_ratings')
    .insert({ rater_id: raterId, rated_plate: rawPlate, score, comment, context })
    .select('id')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') return err('Vous avez déjà noté ce conducteur dans ce contexte', 409)
    return err(insertErr.message, 500)
  }

  await supabase.rpc('refresh_ratings_summary').catch(() => {})

  return ok({ ok: true, id: inserted.id })
})
