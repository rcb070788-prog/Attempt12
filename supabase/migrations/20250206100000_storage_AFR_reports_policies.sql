-- Allow list/read for AFR_reports bucket (Annual Financial Reports).
-- Used by: (1) Exhibit B / source_documents "click to open PDF" links (storage_url),
--          (2) Documents dashboard > Annual Financial Reports (list + open under originals/).

-- Bucket metadata (list may need to read the bucket row)
CREATE POLICY "Allow read AFR_reports bucket metadata"
ON storage.buckets FOR SELECT
TO public
USING ( id = 'AFR_reports' );

-- Objects: allow public to list and get files (list for Documents dashboard, get for PDF links)
CREATE POLICY "Public list/read for AFR_reports bucket"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'AFR_reports' );
