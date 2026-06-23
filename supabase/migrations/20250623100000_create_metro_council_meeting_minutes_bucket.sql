-- Metro Council Meeting Minutes bucket for public document access.
-- Used by Documents dashboard > Metro Council Meeting Minutes (list + open files).

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('metro_council_meeting_minutes', 'metro_council_meeting_minutes', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket metadata (list may need to read the bucket row)
CREATE POLICY "Allow read metro_council_meeting_minutes bucket metadata"
ON storage.buckets FOR SELECT TO public
USING ( id = 'metro_council_meeting_minutes' );

-- Objects: allow public to list and get files (list for Documents dashboard, get for file links)
CREATE POLICY "Public list/read for metro_council_meeting_minutes bucket"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'metro_council_meeting_minutes' );
