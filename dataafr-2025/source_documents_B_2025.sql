-- Prerequisite for exhibit_b_expenses import (doc_id FK).
-- Run in Supabase SQL Editor before importing exhibit_b_expenses_2025_import.csv

INSERT INTO source_documents (doc_id, year, exhibit_id, file_name, storage_url, bucket, object_path, object_path_encoded)
VALUES (
  'B_2025',
  2025,
  'B',
  '2025 Moore County Financial Report.pdf',
  'https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf',
  'AFR_reports',
  'originals/2025 Moore County Financial Report.pdf',
  'originals/2025%20Moore%20County%20Financial%20Report.pdf'
)
ON CONFLICT (doc_id) DO NOTHING;
