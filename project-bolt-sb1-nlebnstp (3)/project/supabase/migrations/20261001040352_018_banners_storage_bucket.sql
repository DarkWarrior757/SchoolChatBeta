/*
# Create banners storage bucket

1. Changes
- Creates a public storage bucket `banners` for user-uploaded banner images/GIFs.
2. Security
- Storage policies: authenticated users can upload/delete only their own folder, everyone can read (banners are public).
*/

INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "banner_read_all" ON storage.objects;
CREATE POLICY "banner_read_all" ON storage.objects FOR SELECT TO public USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "banner_insert_own" ON storage.objects;
CREATE POLICY "banner_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "banner_update_own" ON storage.objects;
CREATE POLICY "banner_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "banner_delete_own" ON storage.objects;
CREATE POLICY "banner_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);
