-- Make content bucket public for viewing posts
UPDATE storage.buckets SET public = true WHERE id = 'content';