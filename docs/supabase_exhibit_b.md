# Exhibit B tables (Supabase)

County Revenues and County Expenditures read from **tables only**. Data is split into **exhibit_b_revenues** (revenues) and **exhibit_b_expenses** (expenses). Schemas are CSV-only (no normalized columns); mapping to `NormalizedLine` / `NormalizedTotalRow` is done in the API layer.

## Tables

### exhibit_b_revenues

Revenue line-level data. Schema mirrors the revenue CSV plus `line_id` and `doc_display_order`.

| Column | Type | Description |
|--------|------|-------------|
| line_id | uuid | Primary key (default gen_random_uuid()) |
| doc_id | text | FK to source_documents.doc_id ON DELETE CASCADE |
| doc_display_order | integer | Order within document |
| year | integer | Fiscal year |
| exhibit_id | text | Exhibit identifier (e.g. B) |
| category_raw | text | Raw category from source |
| hierarchy_path | text | e.g. `Program Revenues > Charges for Services` |
| label | text | Line label |
| amount | bigint | Dollar amount |
| file_name | text | Optional file name |
| storage_url | text | Optional PDF URL (else from source_documents) |
| pdf_page | integer | Page number for #page=N |
| section | text | `general_revenues` or `program_revenues` |
| row_kind | text | `line_item`, `subtotal`, or `total` |
| entity | text | e.g. `governmental_activities`, `school_department` |

**row_kind** defines the three-level hierarchy: Level 1 = `total`, Level 2 = `subtotal`, Level 3 = `line_item`.

**App mapping (in code):** `section` → category_norm, `entity` → entity_norm, `hierarchy_path` → hierarchy_path_canon; label_norm and hierarchy_path_norm are derived via slugify for totals matching.

- County Revenues: `fetchExhibitBRevenueLines()` (line_item), `fetchExhibitBRevenueTotals()` (subtotal/total). Implementation: `src/lib/api.ts`, hooks in `src/lib/useExhibitBLines.ts`.

### exhibit_b_expenses

Expense line-level data. Schema mirrors the expense CSV plus `line_id` and `doc_display_order`. Same column set as exhibit_b_revenues; `section` is always `expenses`.

- County Expenditures and County Expenditures Pie: `fetchExhibitBExpenseLines()` (line_item), `fetchExhibitBExpenseTotals()` (subtotal/total with label_norm in allowed list). Implementation: `src/lib/api.ts`, hooks in `src/lib/useExhibitBLines.ts`.

### source_documents

Unchanged. Document metadata; referenced by `exhibit_b_revenues.doc_id` and `exhibit_b_expenses.doc_id`.

| Column | Type | Description |
|--------|------|-------------|
| doc_id | text | Primary key |
| year | integer | Year |
| exhibit_id | text | Exhibit identifier |
| file_name | text | File name |
| storage_url | text | URL to the stored document (used for click-to-source) |
| bucket | text | Storage bucket |
| object_path | text | Object path |
| object_path_encoded | text | Encoded object path |

## pdf_page_url

For both revenue and expense tables: if a row’s `storage_url` is null or empty, the API loads `storage_url` from `source_documents` by `doc_id`. Then **pdf_page_url** = `storage_url + (pdf_page ? '#page=' + pdf_page : '')` for click-to-source.

## Migrations

- `20250204100000_create_exhibit_b_revenues.sql` – create exhibit_b_revenues (CSV-only).
- `20250204110000_create_exhibit_b_expenses.sql` – create exhibit_b_expenses (CSV-only).
- `20250204120000_drop_exhibit_b_lines.sql` – drop view `v_exhibit_b_lines_normalized` and table `exhibit_b_lines`. Run **after** the new tables are created and populated and the app is using them.

## Legacy: exhibit_b_lines

The table **exhibit_b_lines** (and view **v_exhibit_b_lines_normalized**) are deprecated. The app no longer reads from them; County Revenues use exhibit_b_revenues, County Expenditures and pie use exhibit_b_expenses. Run the drop migration when ready.
