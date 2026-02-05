# Exhibit B tables (Supabase)

County Revenues and County Expenditures read from **tables only** (no view).

## Tables

### exhibit_b_lines

Line-level financial data. Actual schema:

| Column | Type | Description |
|--------|------|-------------|
| line_id | uuid | Primary key |
| doc_id | text | FK to source_documents.doc_id |
| year | integer | Fiscal year |
| amount | bigint | Dollar amount |
| row_kind | text | `line_item`, `subtotal`, or `total` |
| category_norm | text | `general_revenues`, `program_revenues`, `expenses`, etc. |
| entity_norm | text | See below |
| hierarchy_path_canon | text | e.g. `General Revenues > Taxes > Property Tax` |
| hierarchy_path_norm | text | Normalized path |
| label | text | Line label |
| pdf_page | integer | Page number in the source PDF (for fragment #page=N) |

**entity_norm** values: `governmental_activities`, `business_type_activities`, `school_department`, `component_unit`, `total_primary_government`. In the data, Emergency Communications District **line items** use `entity_norm = 'component_unit'`; Metropolitan School Department uses `school_department`. Aggregate rows: `total_primary_government` (governmental + business-type) and "Total Component Unit" rows have `row_kind = 'total'` (or `subtotal`) and must not be summed; the app filters to `row_kind = 'line_item'` so only detail rows are included.

Filter: `row_kind = 'line_item'` and `category_norm` in `general_revenues`, `program_revenues`, `expenses`. The app only fetches line items so total rows are never included; expense and revenue transforms also filter to `row_kind === 'line_item'` as a safeguard.

### source_documents

Document metadata. Actual schema:

| Column | Type | Description |
|--------|------|-------------|
| doc_id | text | Primary key (referenced by exhibit_b_lines.doc_id) |
| year | integer | Year |
| exhibit_id | text | Exhibit identifier |
| file_name | text | File name |
| storage_url | text | URL to the stored document (used for click-to-source) |
| bucket | text | Storage bucket |
| object_path | text | Object path |
| object_path_encoded | text | Encoded object path |

## Join and pdf_page_url

- Select from `exhibit_b_lines` (with filters above): `line_id`, `doc_id`, `year`, `amount`, `row_kind`, `category_norm`, `entity_norm`, `hierarchy_path_canon`, `hierarchy_path_norm`, `label`, `pdf_page`.
- Select `doc_id`, `storage_url` from `source_documents` where `doc_id` in the set of line `doc_id`s.
- In memory: map each `doc_id` to `storage_url`. For each line, **pdf_page_url** is built in code as `storage_url + (pdf_page ? '#page=' + pdf_page : '')` so click-to-source opens the PDF at the right page (many viewers support `#page=N`).
- Output shape matches `NormalizedLine`: `line_id`, `year`, `amount`, `row_kind`, `category_norm`, `entity_norm`, `hierarchy_path_canon`, `hierarchy_path_norm`, `label`, `pdf_page_url`.

Implementation: `src/lib/api.ts` (`fetchExhibitBLines`) and types in `src/lib/types.ts` (`ExhibitBLineRow`, `SourceDocumentRow`).
