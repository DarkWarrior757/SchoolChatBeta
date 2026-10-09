/*
# Create server-icons storage bucket

1. Changes
- Creates a public storage bucket `server-icons` for class/server icon uploads.
2. Security
- Authenticated users can upload/delete only under their own folder.
- Everyone can read (server icons are public).
*/

INSERT INTO storage.buckets (id, name, public) VALUES ('server-icons', 'server-icons', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "server_icon_read_all" ON storage.objects;
CREATE POLICY "server_icon_read_all" ON storage.objects FOR SELECT TO public USING (bucket_id = 'server-icons');

DROP POLICY IF EXISTS "server_icon_insert_own" ON storage.objects;
CREATE POLICY "server_icon_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'server-icons' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "server_icon_update_own" ON storage.objects;
CREATE POLICY "server_icon_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'server-icons' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'server-icons' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "server_icon_delete_own" ON storage.objects;
CREATE POLICY "server_icon_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'server-icons' AND (storage.foldername(name))[1] = auth.uid()::text);
