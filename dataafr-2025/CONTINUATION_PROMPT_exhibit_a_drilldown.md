# Continuation prompt — Exhibit A level-4 drill-down rows

Copy everything below the line into a **new Cursor chat** (Agent mode).

---

Continue the 2025 AFR Exhibit A data extraction for Moore County (project: `c:\GitHub\Attempt12`).

## Already done
- Steps 1–2 complete: 2025 PDF uploaded to Supabase `AFR_reports/originals/2025 Moore County Financial Report.pdf`
- **Verified** hierarchy levels 1–3 (18 rows) written to:
  - `dataafr-2025/AFR_Exhibit_A_2025_import.csv`
- User will import that CSV into Supabase `AFR_Exhibit_A` (or may have already)

## Your task
1. Extract **hierarchy level 4** drill-down rows from **Exhibit A** in `dataafr-2025/FY25MooreAFR.pdf` (pages **15–16**).
2. Use `dataafr-2025/AFR_Exhibit_A_2024_template.csv` as the structural template (95 level-4 rows: same `category`, `hierarchy_path`, `label`, `parent_entity`, `pdf_page` pattern).
3. Map 2025 dollar amounts from the PDF. Known 2025 vs 2024 differences to handle:
   - `Restricted for: Other Purposes` (2024 Gov) → likely `Restricted for: Capital Projects` ($4,852) in 2025
   - `Pension Changes in Investment Earnings` under Deferred **Outflows** (School) may be 0 or moved to Deferred **Inflows** in 2025
4. **Append** the new level-4 rows to `dataafr-2025/AFR_Exhibit_A_2025_import.csv` (do not duplicate the existing 18 level 1–3 rows).
5. Use these constants on every row:
   - `year`: 2025
   - `file_name`: `2025 Moore County Financial Report.pdf`
   - `storage_url`: `https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf`
   - `exhibit_id`: `A` (blank for level 1–2 rollups only)
6. Report row count and flag any template rows with no clear 2025 PDF match.

## Reference — verified 2025 level 3 totals (do not change)
| Category | Entity | Amount |
|----------|--------|--------|
| Total Assets | Governmental Activities | 25,548,151 |
| Total Assets | Business-type Activities | 23,880,121 |
| Total Assets | School Department | 32,380,108 |
| Total Liabilities | Governmental Activities | 18,425,381 |
| Total Liabilities | Business-type Activities | 10,778,928 |
| Total Liabilities | School Department | 2,930,530 |
| Total Net Position | Governmental Activities | 2,985,782 |
| Total Net Position | Business-type Activities | 13,101,193 |
| Total Net Position | School Department | 26,712,939 |

## After CSV is complete
Remind me to import the updated CSV into Supabase `AFR_Exhibit_A` and verify County Net Worth drill-down in the app.
