/*
# Create attachments storage bucket

1. Changes
- Creates a public storage bucket `attachments` for file uploads in chat channels.
2. Security
- Authenticated users can upload/delete only under their own folder.
- Everyone can read (attachments are visible to class members, enforced by RLS on the attachments table).
*/

INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "attachments_read_all" ON storage.objects;
CREATE POLICY "attachments_read_all" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_insert_own" ON storage.objects;
CREATE POLICY "attachments_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "attachments_delete_own" ON storage.objects;
CREATE POLICY "attachments_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
