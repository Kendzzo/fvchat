-- Allow authenticated users to upload chat media to their own folder
CREATE POLICY "chat_uploads_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content'
  AND auth.uid() IS NOT NULL
  AND name LIKE auth.uid()::text || '/chat/%'
);