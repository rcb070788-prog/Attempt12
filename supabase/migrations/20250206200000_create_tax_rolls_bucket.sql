-- Tax Rolls by Assessment bucket for public document access.
-- Used by Documents dashboard > Tax Rolls by Assessment (list + open files).

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax_rolls_by_assessment', 'tax_rolls_by_assessment', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket metadata (list may need to read the bucket row)
CREATE POLICY "Allow read tax_rolls_by_assessment bucket metadata"
ON storage.buckets FOR SELECT TO public
USING ( id = 'tax_rolls_by_assessment' );

-- Objects: allow public to list and get files (list for Documents dashboard, get for file links)
CREATE POLICY "Public list/read for tax_rolls_by_assessment bucket"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'tax_rolls_by_assessment' );
