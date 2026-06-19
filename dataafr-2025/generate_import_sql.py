#!/usr/bin/env python3
"""Generate import_exhibit_b_revenues_2025.sql from CSV."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "exhibit_b_revenues_2025_import.csv"
OUT_PATH = ROOT / "import_exhibit_b_revenues_2025.sql"
EXPECTED_ROW_COUNT = 81

COLS = [
    "line_id",
    "doc_id",
    "doc_display_order",
    "year",
    "exhibit_id",
    "category_raw",
    "hierarchy_path",
    "label",
    "amount",
    "file_name",
    "storage_url",
    "pdf_page",
    "section",
    "row_kind",
    "entity",
]


def esc(value: str) -> str:
    return value.replace("'", "''")


def main() -> None:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    if len(rows) != EXPECTED_ROW_COUNT:
        raise SystemExit(f"Expected {EXPECTED_ROW_COUNT} rows, got {len(rows)}")

    lines = [
        f"-- Import 2025 Exhibit B revenues ({EXPECTED_ROW_COUNT} rows). Idempotent: delete then insert.",
        "",
        "INSERT INTO source_documents (doc_id, year, exhibit_id, file_name, storage_url, bucket, object_path, object_path_encoded)",
        "VALUES (",
        "  'B_2025', 2025, 'B', '2025 Moore County Financial Report.pdf',",
        "  'https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf',",
        "  'AFR_reports', 'originals/2025 Moore County Financial Report.pdf', 'originals/2025%20Moore%20County%20Financial%20Report.pdf'",
        ")",
        "ON CONFLICT (doc_id) DO NOTHING;",
        "",
        "DELETE FROM exhibit_b_revenues WHERE year = 2025;",
        "",
    ]

    int_cols = {"doc_display_order", "year", "amount", "pdf_page"}
    for row in rows:
        vals: list[str] = []
        for col in COLS:
            val = row[col]
            if col in int_cols:
                vals.append(str(int(val)))
            else:
                vals.append(f"'{esc(val)}'")
        lines.append(
            f"INSERT INTO exhibit_b_revenues ({', '.join(COLS)}) VALUES ({', '.join(vals)});"
        )

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.name} ({len(rows)} inserts)")


if __name__ == "__main__":
    main()
