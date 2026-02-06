-- Allow list/read for Expense Reports by Fund.
-- Use the policy that matches your setup:
-- - If files are in bucket "public" under path expense_reports_by_fund/..., the "public" policy below applies.
-- - If files are in bucket "expense_reports_by_fund" with keys like Fund 101/file.pdf, the "expense_reports_by_fund" policy applies.

-- Bucket metadata: list() may need to read the bucket row
CREATE POLICY "Allow read public bucket metadata"
ON storage.buckets FOR SELECT
TO public
USING ( id = 'public' );

-- Public bucket: allow select (list + get) on objects so Documents > Expense Reports by Fund can list and open files
CREATE POLICY "Public list/read for expense reports in public bucket"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'public' );

-- If you use a dedicated bucket named expense_reports_by_fund instead, uncomment and run:
-- CREATE POLICY "Public list/read for expense_reports_by_fund bucket"
-- ON storage.objects FOR SELECT
-- TO public
-- USING ( bucket_id = 'expense_reports_by_fund' );
