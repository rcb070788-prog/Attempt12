#!/usr/bin/env python3
"""Verify County Revenues Include Water & Sewer toggle math for 2025 (mirrors app logic)."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "dataafr-2025" / "exhibit_b_revenues_2025_import.csv"

YEAR = 2025
EXPECTED_GEN_GOV = 11_122_791
EXPECTED_MUD = 4_773_734
EXPECTED_SCHOOLS = 12_452_165
EXPECTED_TOTAL_ON = 28_348_690
EXPECTED_TOTAL_OFF = 23_574_956


def aggregate(lines: list[dict], include_business_type: bool) -> dict[str, int | None]:
    gen_gov = sum(
        int(r["amount"])
        for r in lines
        if r["entity"] == "governmental_activities"
    )
    schools = sum(
        int(r["amount"])
        for r in lines
        if r["entity"] == "school_department"
    )
    mud_raw = sum(
        int(r["amount"])
        for r in lines
        if r["entity"] == "business_type_activities"
    )
    mud = mud_raw if include_business_type else None
    total = gen_gov + schools + (mud or 0)
    return {"genGov": gen_gov, "schools": schools, "mud": mud, "total": total}


def main() -> None:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    line_items = [
        r
        for r in rows
        if r["year"] == str(YEAR)
        and r["row_kind"] == "line_item"
        and r["section"] in ("program_revenues", "general_revenues")
    ]

    on = aggregate(line_items, include_business_type=True)
    off = aggregate(line_items, include_business_type=False)

    assert on["genGov"] == EXPECTED_GEN_GOV, f"Gen Gov {on['genGov']} != {EXPECTED_GEN_GOV}"
    assert off["genGov"] == EXPECTED_GEN_GOV, "Gen Gov must not change when toggle off"
    assert on["mud"] == EXPECTED_MUD, f"MUD on {on['mud']} != {EXPECTED_MUD}"
    assert off["mud"] is None
    assert on["schools"] == EXPECTED_SCHOOLS
    assert off["schools"] == EXPECTED_SCHOOLS
    assert on["total"] == EXPECTED_TOTAL_ON, f"Total on {on['total']} != {EXPECTED_TOTAL_ON}"
    assert off["total"] == EXPECTED_TOTAL_OFF, f"Total off {off['total']} != {EXPECTED_TOTAL_OFF}"

    print("Toggle behavior verified for 2025:")
    print(f"  Gen Gov (toggle on/off):  {on['genGov']:,} / {off['genGov']:,}")
    print(f"  Water & Sewer:            {on['mud']:,} / hidden")
    print(f"  Schools:                  {on['schools']:,}")
    print(f"  Total:                    {on['total']:,} / {off['total']:,}")


if __name__ == "__main__":
    main()
