-- Migration: photo stationné — colonne image_url sur messages + bucket Supabase Storage

-- 1. Colonne image_url nullable sur messages (texte = URL publique Supabase Storage)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Bucket Storage pour photos véhicules stationnés
--    Public = true : les URLs contiennent un UUID aléatoire non devinable
--    → confidentialité par obscurité, pas besoin de signed URLs qui expirent
INSERT INTO storage.buckets (id, name, public)
VALUES ('parked-photos', 'parked-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Politique upload : utilisateurs authentifiés seulement
DROP POLICY IF EXISTS "parked_photos_insert" ON storage.objects;
CREATE POLICY "parked_photos_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'parked-photos');

-- 4. Lecture publique (URL UUID aléatoire — non devinable par un tiers)
DROP POLICY IF EXISTS "parked_photos_select" ON storage.objects;
CREATE POLICY "parked_photos_select" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'parked-photos');
