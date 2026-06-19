"""Validate exhibit_b_revenues_2025_import.csv against schema and expected totals."""

from __future__ import annotations

import csv
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "exhibit_b_revenues_2025_import.csv"

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

EXPECTED_ROW_COUNT = 81

EXPECTED_COUNTS = {
    ("program_revenues", "line_item"): 19,
    ("program_revenues", "subtotal"): 3,
    ("program_revenues", "total"): 3,
    ("general_revenues", "line_item"): 52,
    ("general_revenues", "total"): 4,
}

GENERAL_ENTITY_LABELS = {
    "governmental_activities": "Governmental Activities",
    "business_type_activities": "Business-type Activities",
    "total_primary_government": "Total Primary Government",
    "school_department": "Metropolitan School Department",
}

EXPECTED_GENERAL_TOTALS = {
    ("governmental_activities", "Governmental Activities"): 7_054_519,
    ("business_type_activities", "Business-type Activities"): 78_954,
    ("total_primary_government", "Total Primary Government"): 7_133_473,
    ("school_department", "Metropolitan School Department"): 10_669_390,
}

EXPECTED_GEN_GOV_CHART_TOTAL = 11_122_791
EXPECTED_GAIN_ON_SALE_GOV = 28_903


def main() -> None:
    rows = list(csv.DictReader(CSV.open(encoding="utf-8")))
    assert len(rows) == EXPECTED_ROW_COUNT, f"expected {EXPECTED_ROW_COUNT} rows, got {len(rows)}"
    assert list(rows[0].keys()) == FIELDNAMES

    orders = [int(r["doc_display_order"]) for r in rows]
    assert orders == list(range(1, EXPECTED_ROW_COUNT + 1)), orders
    assert len({r["line_id"] for r in rows}) == EXPECTED_ROW_COUNT
    for r in rows:
        uuid.UUID(r["line_id"])
        assert r["doc_id"] == "B_2025"
        assert r["year"] == "2025"

    counts = Counter((r["section"], r["row_kind"]) for r in rows)
    for key, n in EXPECTED_COUNTS.items():
        assert counts[key] == n, f"{key}: got {counts[key]}, expected {n}"

    gen_totals = {
        (r["entity"], r["label"]): int(r["amount"])
        for r in rows
        if r["section"] == "general_revenues" and r["row_kind"] == "total"
    }
    for key, expected in EXPECTED_GENERAL_TOTALS.items():
        assert gen_totals[key] == expected, f"{key}: {gen_totals.get(key)} != {expected}"

    for entity, label in GENERAL_ENTITY_LABELS.items():
        item_sum = sum(
            int(r["amount"])
            for r in rows
            if r["section"] == "general_revenues"
            and r["row_kind"] == "line_item"
            and r["entity"] == entity
        )
        total = gen_totals[(entity, label)]
        assert item_sum == total, f"general {entity}: line items {item_sum} != total {total}"

    gen_gov = sum(
        int(r["amount"])
        for r in rows
        if r["row_kind"] == "line_item" and r["entity"] == "governmental_activities"
    )
    assert gen_gov == EXPECTED_GEN_GOV_CHART_TOTAL, f"Gen Gov {gen_gov} != {EXPECTED_GEN_GOV_CHART_TOTAL}"

    gain = next(
        r
        for r in rows
        if r["section"] == "general_revenues"
        and r["row_kind"] == "line_item"
        and r["entity"] == "governmental_activities"
        and "Gain on Sale" in r["hierarchy_path"]
    )
    assert int(gain["amount"]) == EXPECTED_GAIN_ON_SALE_GOV

    keys = [(r["section"], r["hierarchy_path"], r["label"], r["entity"]) for r in rows]
    assert len(keys) == len(set(keys)), "duplicate keys in output"

    print(
        f"Local validation passed: {EXPECTED_ROW_COUNT} rows, "
        f"reconciliation OK, Gen Gov = {gen_gov:,}"
    )


if __name__ == "__main__":
    main()
