-- Concerned Citizens meeting notes bucket for public document access.
-- Used by Meetings dashboard > Meeting Notes (list + open PDFs).

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cc_meeting_notes', 'cc_meeting_notes', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket metadata (list may need to read the bucket row)
CREATE POLICY "Allow read cc_meeting_notes bucket metadata"
ON storage.buckets FOR SELECT TO public
USING ( id = 'cc_meeting_notes' );

-- Objects: allow public to list and get files (list for Meetings dashboard, get for file links)
CREATE POLICY "Public list/read for cc_meeting_notes bucket"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'cc_meeting_notes' );
