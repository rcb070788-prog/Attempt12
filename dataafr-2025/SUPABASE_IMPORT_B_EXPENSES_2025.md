# Import Exhibit B Expenses 2025 into Supabase

Use **`exhibit_b_expenses_2025_import.csv`** (15 columns, matches table export format).

Regenerate:

```powershell
python dataafr-2025\build_exhibit_b_expenses_2025.py
```

## Step 1 — source_documents prerequisite

`exhibit_b_expenses.doc_id` references `source_documents`. Run in Supabase SQL Editor **before** importing expense rows:

```sql
INSERT INTO source_documents (doc_id, year, exhibit_id, file_name, storage_url, bucket, object_path, object_path_encoded)
VALUES (
  'B_2025', 2025, 'B',
  '2025 Moore County Financial Report.pdf',
  'https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf',
  'AFR_reports', 'originals/2025 Moore County Financial Report.pdf', 'originals/2025%20Moore%20County%20Financial%20Report.pdf'
)
ON CONFLICT (doc_id) DO NOTHING;
```

Or run the script: `dataafr-2025/source_documents_B_2025.sql`

## Step 2 — Dashboard import

1. Open Supabase → **Table Editor** → `exhibit_b_expenses`
2. If re-importing, delete existing 2025 rows first:
   ```sql
   DELETE FROM exhibit_b_expenses WHERE year = 2025;
   ```
3. **Import** `dataafr-2025/exhibit_b_expenses_2025_import.csv`
4. Confirm all 15 headers map 1:1: `line_id`, `doc_id`, `doc_display_order`, `year`, `exhibit_id`, `category_raw`, `hierarchy_path`, `label`, `amount`, `file_name`, `storage_url`, `pdf_page`, `section`, `row_kind`, `entity`
5. Expect **16** rows inserted

## Post-import checks

```sql
SELECT COUNT(*) FROM exhibit_b_expenses WHERE year = 2025;
-- expect 16

SELECT doc_display_order, row_kind, label, amount
FROM exhibit_b_expenses
WHERE year = 2025
ORDER BY doc_display_order;

SELECT amount FROM exhibit_b_expenses
WHERE year = 2025 AND label = 'Total Primary Government';
-- expect 13878547

SELECT amount FROM exhibit_b_expenses
WHERE year = 2025 AND label = 'Total Governmental Activities';
-- expect 10482802
```

## App verification

1. Open **County Expenditures** chart and pie in the app
2. Select year **2025**
3. Governmental function breakdown should match PDF page 17 (e.g. Public Safety ≈ $3.68M, Highways ≈ $2.12M)
4. Click-to-source links should open the PDF at `#page=17`

## Expected 2025 totals

| Label | Amount |
|-------|--------|
| Total Governmental Activities | 10,482,802 |
| Total Business-type Activities | 3,395,745 |
| Total Primary Government | 13,878,547 |
| Metropolitan School Department | 13,859,660 |
| Total Component Units | 13,859,660 |
