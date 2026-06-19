"""Validate exhibit_b_expenses_2025_import.csv against schema and app expectations."""

from __future__ import annotations

import csv
import re
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "exhibit_b_expenses_2025_import.csv"

FIELDNAMES = [
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

EXPENSE_TOTAL_LABEL_NORMS = {
    "total_governmental_activities",
    "total_business_type_activities",
    "total_component_unit",
    "total_component_units",
    "total_primary_government",
    "metropolitan_school_department",
    "emergency_communications_district",
}

GOV_LINE_ITEMS = [
    "General Government",
    "Finance",
    "Administration of Justice",
    "Public Safety",
    "Public Health and Welfare",
    "Social, Cultural, and Recreational Services",
    "Agriculture and Natural Resources",
    "Highways",
    "Interest on Long-term Debt",
    "Education",
]


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def main() -> None:
    rows = list(csv.DictReader(CSV.open(encoding="utf-8")))
    assert len(rows) == 16, f"expected 16 rows, got {len(rows)}"
    assert list(rows[0].keys()) == FIELDNAMES
    orders = [int(r["doc_display_order"]) for r in rows]
    assert orders == list(range(1, 17)), orders
    assert len({r["line_id"] for r in rows}) == 16
    for r in rows:
        uuid.UUID(r["line_id"])
        assert r["doc_id"] == "B_2025"
        assert r["year"] == "2025"
        assert r["section"] == "expenses"

    line_items = [r for r in rows if r["row_kind"] == "line_item"]
    totals = [r for r in rows if r["row_kind"] in ("subtotal", "total")]
    assert len(line_items) == 11
    assert len(totals) == 5

    for r in totals:
        norm = slugify(r["label"])
        assert norm in EXPENSE_TOTAL_LABEL_NORMS, (r["label"], norm)

    by_label = {r["label"]: int(r["amount"]) for r in rows}
    gov_sum = sum(by_label[l] for l in GOV_LINE_ITEMS)
    assert gov_sum == by_label["Total Governmental Activities"]
    assert (
        by_label["Total Primary Government"]
        == by_label["Total Governmental Activities"] + by_label["Total Business-type Activities"]
    )
    assert by_label["Total Component Units"] == by_label["Metropolitan School Department"]

    print("Local validation passed: 16 rows, totals reconcile, label_norms OK")
    print("Governmental line items (County Expenditures pie):")
    for r in line_items:
        if r["entity"] == "governmental_activities":
            print(f"  {r['label']}: {int(r['amount']):,}")


if __name__ == "__main__":
    main()
