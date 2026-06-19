# Import Exhibit B Revenues 2025 into Supabase

Use **`exhibit_b_revenues_2025_import.csv`** (15 columns, matches table export format).

Regenerate:

```powershell
python dataafr-2025\build_exhibit_b_revenues_2025.py
python dataafr-2025\validate_exhibit_b_revenues_2025.py
python dataafr-2025\generate_import_sql.py
npx supabase db query --linked -f dataafr-2025\import_exhibit_b_revenues_2025.sql
python scripts\verify_exhibit_b_revenues_2025_app.py
```

Alternative (requires `SUPABASE_SERVICE_ROLE_KEY` in `env`):

```powershell
python scripts\import_exhibit_b_revenues_2025.py
```

## Row structure (81 rows)

| Section | line_item | subtotal | total |
|---------|-----------|----------|-------|
| program_revenues | 19 | 3 | 3 |
| general_revenues | 52 (13 lines × 4 entities) | — | 4 |

Program rows come from [`exhibit_b_revenues_2024_template.csv`](exhibit_b_revenues_2024_template.csv). General rows are generated from the PDF 4-column grid (not the 2024 template).

## Step 1 — source_documents prerequisite

`exhibit_b_revenues.doc_id` references `source_documents`. Run if not already done for Exhibit B expenses:

```sql
-- dataafr-2025/source_documents_B_2025.sql
INSERT INTO source_documents (doc_id, year, exhibit_id, file_name, storage_url, bucket, object_path, object_path_encoded)
VALUES (
  'B_2025', 2025, 'B',
  '2025 Moore County Financial Report.pdf',
  'https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf',
  'AFR_reports', 'originals/2025 Moore County Financial Report.pdf', 'originals/2025%20Moore%20County%20Financial%20Report.pdf'
)
ON CONFLICT (doc_id) DO NOTHING;
```

## Step 2 — Dashboard import

1. Open Supabase → **Table Editor** → `exhibit_b_revenues`
2. If re-importing:
   ```sql
   DELETE FROM exhibit_b_revenues WHERE year = 2025;
   ```
3. **Import** `dataafr-2025/exhibit_b_revenues_2025_import.csv`
4. Map all 15 headers 1:1: `line_id`, `doc_id`, `doc_display_order`, `year`, `exhibit_id`, `category_raw`, `hierarchy_path`, `label`, `amount`, `file_name`, `storage_url`, `pdf_page`, `section`, `row_kind`, `entity`
5. Expect **81** rows inserted

## Post-import checks

```sql
SELECT COUNT(*) FROM exhibit_b_revenues WHERE year = 2025;
-- expect 81

SELECT section, row_kind, COUNT(*) FROM exhibit_b_revenues
WHERE year = 2025 GROUP BY section, row_kind ORDER BY section, row_kind;
-- program: 19 line_item, 3 subtotal, 3 total
-- general: 52 line_item, 4 total

SELECT label, entity, amount FROM exhibit_b_revenues
WHERE year = 2025 AND row_kind = 'total' AND section = 'general_revenues'
ORDER BY entity;
-- Gov 7054519, Biz 78954, Primary 7133473, School 10669390

SELECT SUM(amount) FROM exhibit_b_revenues
WHERE year = 2025 AND row_kind = 'line_item' AND entity = 'governmental_activities';
-- expect 11122791 (Gen Gov chart total with all filters on)

SELECT amount FROM exhibit_b_revenues
WHERE year = 2025 AND hierarchy_path LIKE '%Gain on Sale%'
  AND entity = 'governmental_activities' AND row_kind = 'line_item';
-- expect 28903
```

## App verification

1. Open **County Revenues** chart and revenue pie
2. Select year **2025**
3. With Program + General on and all path filters checked:
   - **Gen Gov** = **$11,122,791**
   - **Schools** = $10,669,390
   - **MUD** = $78,954
4. Click-to-source: program → `#page=17`, general → `#page=18`

## Expected 2025 highlights

| Category | Amount |
|----------|--------|
| Gen Gov chart total (all filters) | 11,122,791 |
| Total General Revenues (Gov) | 7,054,519 |
| Gain on Sale of Capital Assets (Gov) | 28,903 |
| Total General Revenues (School) | 10,669,390 |
| Program Charges subtotal (Gov) | 1,362,138 |
| Program Operating subtotal (Gov) | 2,706,134 |
| Highways Operating Grants (was Capital in 2024) | 1,809,605 |
