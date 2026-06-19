# Continuation prompt — Exhibit B expenses

Copy everything below the line into a **new Cursor chat** (Agent mode).

---

Continue the 2025 AFR data extraction for Moore County (project: `c:\GitHub\Attempt12`).

## Already done (prior chats)

- 2025 PDF uploaded to Supabase: `AFR_reports/originals/2025 Moore County Financial Report.pdf`
- **Exhibit A** complete: 116 rows in `dataafr-2025/AFR_Exhibit_A_2025_supabase_import.csv` (import via `dataafr-2025/SUPABASE_IMPORT_A_2025.md`)
- Extraction script pattern: `dataafr-2025/build_exhibit_a_level4_2025.py`
- **Exhibit B expenses NOT started** — no 2025 script or import CSV yet

## Your task

Extract **Exhibit B expense rows** from `dataafr-2025/FY25MooreAFR.pdf` and prepare Supabase import files.

### 1. Use the 2024 template as structure

Template: `dataafr-2025/exhibit_b_expenses_2024_template.csv` — **16 rows**:

| row_kind | count | entity values |
|----------|-------|---------------|
| line_item | 11 | 9 × `governmental_activities`, 1 × `business_type_activities` (Water and Sewer), 1 implicit via biz |
| subtotal | 3 | `governmental_activities`, `business_type_activities`, `school_department` |
| total | 2 | `total_primary_government`, `component_unit` |

Keep the same `category_raw`, `hierarchy_path`, `label`, `section` (`expenses`), `row_kind`, and `entity` for each template row. Only update `year`, amounts, `doc_id`, `file_name`, `storage_url`, `pdf_page`, `line_id`, and `doc_display_order`.

Table schema: `supabase/migrations/20250204110000_create_exhibit_b_expenses.sql` — docs in `docs/supabase_exhibit_b.md`.

App reads via `fetchExhibitBExpenseLines()` / `fetchExhibitBExpenseTotals()` in `src/lib/api.ts`. Totals must use labels that slugify to values in `EXPENSE_TOTAL_LABEL_NORMS` (e.g. `Total Governmental Activities`, `Total Primary Government`, `Metropolitan School Department`, `Total Component Units`).

### 2. Extract amounts from PDF page 17

Exhibit B **Statement of Activities** — expense function lines are on **page 17** (PDF page index 16). Use the **Expenses** column (first dollar amount on each line, before Charges for Services).

**2025 amounts to map** (verified from PDF text extraction):

| Label | Amount |
|-------|--------|
| General Government | 1,210,197 |
| Finance | 478,233 |
| Administration of Justice | 481,303 |
| Public Safety | 3,683,844 |
| Public Health and Welfare | 1,587,759 |
| Social, Cultural, and Recreational Services | 336,439 |
| Agriculture and Natural Resources | 69,655 |
| Highways | 2,119,118 |
| Interest on Long-term Debt | 479,429 |
| Education | 36,825 |
| **Total Governmental Activities** | **10,482,802** |
| Water and Sewer Department | 3,395,745 |
| **Total Business-type Activities** | **3,395,745** (same as Water and Sewer — only one biz activity) |
| **Total Primary Government** | **13,878,547** |
| Metropolitan School Department | 13,859,660 |
| **Total Component Units** | **13,859,660** (only component unit; line may not appear verbatim in PDF — derive from school row) |

**Validation checks:**
- Gov line items sum to Total Governmental Activities (10,482,802)
- Total Primary Government = Gov subtotal + Biz subtotal (10,482,802 + 3,395,745 = 13,878,547)
- Total Component Units = Metropolitan School Department

**2025 vs 2024 structure notes:**
- Same 10 governmental function labels as 2024 (no new function lines expected)
- `Total Component Units` was on PDF page 19 in 2024 template; in 2025 PDF it does not appear as a separate printed line — still include the row per template with amount = school total, `pdf_page` = 17
- Page 18 is **General Revenues** (not expenses) — do not pull expense amounts from page 18

### 3. Build extraction script + CSVs

Create `dataafr-2025/build_exhibit_b_expenses_2025.py` (mirror Exhibit A script pattern):

1. Load 2024 template rows (structure only)
2. Parse FY25 PDF page 17 for expense amounts (label match on function names; handle lines with/without `$`)
3. Write **`dataafr-2025/exhibit_b_expenses_2025_import.csv`** — 15 columns matching table schema
4. Write **`dataafr-2025/SUPABASE_IMPORT_B_EXPENSES_2025.md`** — import instructions

**Constants on every row:**
- `year`: 2025
- `doc_id`: `B_2025`
- `exhibit_id`: `B`
- `file_name`: `2025 Moore County Financial Report.pdf`
- `storage_url`: `https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf`
- `section`: `expenses`
- `line_id`: new `uuid4` per row
- `doc_display_order`: sequential integers 1–16 (required NOT NULL + unique per doc_id; 2024 export had blanks but schema requires values)

Unlike Exhibit A, **no separate “slim” vs “supabase” CSV** — the 15-column file matches the table directly (same as 2024 template export format).

Regenerate:

```powershell
python dataafr-2025\build_exhibit_b_expenses_2025.py
```

### 4. Prerequisite: `source_documents` row

`exhibit_b_expenses.doc_id` FK requires a `source_documents` row. Before import, ensure this exists (insert if missing):

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

(Mirror the existing `B_2024` row pattern if column values differ in production.)

### 5. Supabase import

1. Table Editor → **`exhibit_b_expenses`**
2. If re-importing: `DELETE FROM exhibit_b_expenses WHERE year = 2025;`
3. Import **`dataafr-2025/exhibit_b_expenses_2025_import.csv`**
4. Map all 15 headers 1:1: `line_id`, `doc_id`, `doc_display_order`, `year`, `exhibit_id`, `category_raw`, `hierarchy_path`, `label`, `amount`, `file_name`, `storage_url`, `pdf_page`, `section`, `row_kind`, `entity`
5. Expect **16** rows inserted

**Post-import SQL:**

```sql
SELECT COUNT(*) FROM exhibit_b_expenses WHERE year = 2025;  -- expect 16

SELECT row_kind, label, amount FROM exhibit_b_expenses
WHERE year = 2025 ORDER BY doc_display_order;

SELECT amount FROM exhibit_b_expenses
WHERE year = 2025 AND label = 'Total Primary Government';  -- 13878547
```

### 6. App verification

1. Open **County Expenditures** chart and pie in the app
2. Select year **2025**
3. Confirm governmental function breakdown and totals match PDF
4. Click-to-source links should open PDF at page 17 (`#page=17`)

### 7. Report back

- Row count (expect 16)
- Any template rows with ambiguous PDF matches
- Reconciliation summary (subtotals vs totals)
- Remind user to import CSV and verify app charts

## Lessons from Exhibit A (apply here)

- Validate subtotals sum correctly before import
- Flag 2025-only structural differences vs 2024; append supplemental rows only if PDF adds new lines not in template
- Pre-generate UUIDs in CSV — no SQL needed for UUID generation
- Do not upload wrong column-count CSV (Exhibit A needed 14-col supabase file; Exhibit B template already matches table)
- Amount column is integer dollars (no cents, no commas in CSV)

## Optional prerequisite (separate from Exhibit B)

If not already fixed: 2025 Exhibit A **level-1** `Moore County Grand Total` rows still show Primary Government only instead of county-wide (Primary + School). See prior chat for UPDATE SQL on `AFR_Exhibit_A` — affects County Net Worth charts, not Exhibit B.

## Reference — 2024 template totals (for comparison)

| Label | 2024 |
|-------|------|
| Total Governmental Activities | 10,587,427 |
| Total Business-type Activities | 2,998,819 |
| Total Primary Government | 13,586,246 |
| Metropolitan School Department | 13,819,894 |
| Total Component Units | 13,819,894 |
