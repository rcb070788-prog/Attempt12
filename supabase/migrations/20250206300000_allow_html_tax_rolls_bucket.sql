-- Allow .htm/.html uploads to tax_rolls_by_assessment (official source files for comparison)
UPDATE storage.buckets
SET allowed_mime_types = COALESCE(allowed_mime_types, '{}') || ARRAY['text/html', 'text/plain', 'application/pdf', 'text/csv']::text[]
WHERE id = 'tax_rolls_by_assessment'
  AND (allowed_mime_types IS NULL OR NOT ('text/html' = ANY(allowed_mime_types)));
