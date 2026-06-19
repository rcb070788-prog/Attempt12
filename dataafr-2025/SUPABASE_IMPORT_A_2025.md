# Import Exhibit A 2025 into Supabase

Use **`AFR_Exhibit_A_2025_supabase_import.csv`** (14 columns, matches table export format). Do not use `AFR_Exhibit_A_2025_import.csv` in the Dashboard — that 11-column file will show as incompatible.

Regenerate both files:

```powershell
python dataafr-2025\build_exhibit_a_level4_2025.py
```

## Dashboard import

1. Open Supabase → **Table Editor** → `AFR_Exhibit_A`
2. If a prior import partially succeeded, delete existing 2025 rows first:
   ```sql
   DELETE FROM AFR_Exhibit_A WHERE year = 2025;
   ```
3. **Import** `dataafr-2025/AFR_Exhibit_A_2025_supabase_import.csv`
4. Confirm all 14 headers map 1:1: `id`, `year`, `exhibit_id`, `category`, `hierarchy_path`, `label`, `amount`, `file_name`, `storage_url`, `pdf_page`, `bounding_box`, `created_at`, `hierarchy_level`, `parent_entity`
5. Expect **116** rows inserted

## Post-import checks

```sql
SELECT COUNT(*) FROM AFR_Exhibit_A WHERE year = 2025;
-- expect 116

SELECT parent_entity, label, amount
FROM AFR_Exhibit_A
WHERE year = 2025
  AND label = 'Pension Changes in Investment Earnings'
  AND category = 'Deferred Inflows of Resources';
-- Governmental Activities: 31910
-- School Department: 451999

SELECT label, amount
FROM AFR_Exhibit_A
WHERE year = 2025 AND label = 'Due to Other Governments';
-- 71781
```

## App verification

1. Open **County Net Worth** in the app
2. Click year **2025** on the chart
3. Drill-down table should show ~98 level-4 line items, including the supplemental 2025-only rows above
