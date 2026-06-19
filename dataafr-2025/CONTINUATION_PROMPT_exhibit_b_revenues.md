# Continuation prompt — Exhibit B revenues

Copy everything below the line into a **new Cursor chat** (Agent mode).

---

Continue the 2025 AFR data extraction for Moore County (project: `c:\GitHub\Attempt12`).

## Already done (prior chats)

- 2025 PDF in Supabase: `AFR_reports/originals/2025 Moore County Financial Report.pdf`
- **Exhibit A** complete — `dataafr-2025/AFR_Exhibit_A_2025_supabase_import.csv`
- **Exhibit B expenses** complete — `dataafr-2025/exhibit_b_expenses_2025_import.csv` (16 rows)
- `source_documents` row `B_2025` — `dataafr-2025/source_documents_B_2025.sql`
- Script pattern: `dataafr-2025/build_exhibit_b_expenses_2025.py`
- **Exhibit B revenues** — script + CSV at `dataafr-2025/exhibit_b_revenues_2025_import.csv` (**81 rows**; general grid PDF-generated)

## Your task

If rows need regeneration, extract **Exhibit B revenue rows** from `dataafr-2025/FY25MooreAFR.pdf` using `dataafr-2025/build_exhibit_b_revenues_2025.py`.

### Template

`dataafr-2025/exhibit_b_revenues_2024_template.csv` — **program rows only** (25 rows). General revenues (52 line_item + 4 total) are generated from the PDF 13×4 column grid in the build script.

### PDF mapping

- **Page 17** program revenues: columns after Expenses = Charges for Services, Operating Grants, Capital Grants
- **Page 18** general revenues: 4 columns = Gov, Business-type, Total Primary, School

### Import

1. Ensure `B_2025` in `source_documents` (`source_documents_B_2025.sql`)
2. Import `dataafr-2025/exhibit_b_revenues_2025_import.csv` into `exhibit_b_revenues`
3. See `dataafr-2025/SUPABASE_IMPORT_B_REVENUES_2025.md`

Regenerate:

```powershell
python dataafr-2025\build_exhibit_b_revenues_2025.py
python dataafr-2025\validate_exhibit_b_revenues_2025.py
```

### Verify in app

County Revenues chart and pie, year 2025.
