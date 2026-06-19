#!/usr/bin/env python3
"""Verify 2025 Exhibit B revenues via Supabase anon API (mirrors app reads)."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EXPECTED_LINE_ITEMS = 71  # 19 program + 52 general
EXPECTED_SUBTOTAL_TOTAL = 10
EXPECTED_GEN_GOV = 11_122_791
EXPECTED_GAIN_ON_SALE_GOV = 28_903


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for name in ("env", ".env", ".env.local"):
        path = ROOT / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip()
    return env


def main() -> None:
    try:
        from supabase import create_client
    except ImportError:
        raise SystemExit("pip install supabase")

    env = load_env()
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise SystemExit("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY")

    client = create_client(url, key)

    count_resp = (
        client.table("exhibit_b_revenues")
        .select("line_id", count="exact")
        .eq("year", 2025)
        .execute()
    )
    total_count = count_resp.count if count_resp.count is not None else len(count_resp.data or [])
    assert total_count == 81, f"expected 81 rows for 2025, got {total_count}"

    lines = (
        client.table("exhibit_b_revenues")
        .select("year,section,row_kind,label,entity,amount,pdf_page,hierarchy_path")
        .eq("year", 2025)
        .eq("row_kind", "line_item")
        .execute()
    )
    line_rows = lines.data or []
    assert len(line_rows) == EXPECTED_LINE_ITEMS, f"expected {EXPECTED_LINE_ITEMS} line_items, got {len(line_rows)}"

    totals = (
        client.table("exhibit_b_revenues")
        .select("label,entity,amount,pdf_page,section")
        .eq("year", 2025)
        .in_("row_kind", ["subtotal", "total"])
        .execute()
    )
    total_rows = totals.data or []
    assert len(total_rows) == EXPECTED_SUBTOTAL_TOTAL, (
        f"expected {EXPECTED_SUBTOTAL_TOTAL} subtotal/total rows, got {len(total_rows)}"
    )

    program_pages = {r["pdf_page"] for r in line_rows if r["section"] == "program_revenues"}
    general_pages = {r["pdf_page"] for r in line_rows if r["section"] == "general_revenues"}
    assert program_pages == {17}, f"program pdf_page expected {{17}}, got {program_pages}"
    assert general_pages == {18}, f"general pdf_page expected {{18}}, got {general_pages}"

    gen_gov = sum(int(r["amount"]) for r in line_rows if r["entity"] == "governmental_activities")
    assert gen_gov == EXPECTED_GEN_GOV, f"Gen Gov {gen_gov} != {EXPECTED_GEN_GOV}"

    gain = next(
        r for r in line_rows
        if r["entity"] == "governmental_activities" and "Gain on Sale" in (r.get("hierarchy_path") or "")
    )
    assert int(gain["amount"]) == EXPECTED_GAIN_ON_SALE_GOV

    print("App API verification passed:")
    print(f"  2025 total rows: {total_count}")
    print(f"  2025 line_items: {len(line_rows)}")
    print(f"  Gen Gov chart total: {gen_gov:,}")
    print(f"  Gain on Sale (gov): {int(gain['amount']):,}")


if __name__ == "__main__":
    main()
