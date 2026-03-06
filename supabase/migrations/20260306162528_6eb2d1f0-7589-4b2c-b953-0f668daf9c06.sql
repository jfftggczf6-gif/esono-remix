
-- Create public bucket "templates" if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to templates bucket
CREATE POLICY "Public read access on templates"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'templates');
