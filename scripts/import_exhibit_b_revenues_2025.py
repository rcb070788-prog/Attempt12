#!/usr/bin/env python3
"""Import exhibit_b_revenues_2025_import.csv into Supabase (requires service role key)."""

from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "dataafr-2025" / "exhibit_b_revenues_2025_import.csv"
SOURCE_DOC_SQL = ROOT / "dataafr-2025" / "source_documents_B_2025.sql"
EXPECTED_ROW_COUNT = 81


def load_env() -> dict[str, str]:
    env: dict[str, str] = dict(os.environ)
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


def get_client(env: dict[str, str]):
    try:
        from supabase import create_client
    except ImportError as exc:
        raise SystemExit("pip install supabase") from exc

    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = (
        env.get("SUPABASE_SERVICE_ROLE_KEY")
        or env.get("SUPABASE_SERVICE_KEY")
        or env.get("SUPABASE_SERVICE_ROLE")
    )
    if not url or not key:
        raise SystemExit(
            "Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env/.env/.env.local"
        )
    return create_client(url, key)


def seed_source_document(client) -> None:
    sql = SOURCE_DOC_SQL.read_text(encoding="utf-8")
    client.postgrest.rpc  # noqa: B018 — ensure client exists
    # Use raw SQL via REST is not available; upsert via table API is enough for source_documents.
    row = {
        "doc_id": "B_2025",
        "year": 2025,
        "exhibit_id": "B",
        "file_name": "2025 Moore County Financial Report.pdf",
        "storage_url": (
            "https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/"
            "AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf"
        ),
        "bucket": "AFR_reports",
        "object_path": "originals/2025 Moore County Financial Report.pdf",
        "object_path_encoded": "originals/2025%20Moore%20County%20Financial%20Report.pdf",
    }
    client.table("source_documents").upsert(row, on_conflict="doc_id").execute()
    print("source_documents: upserted B_2025")


def load_csv_rows() -> list[dict]:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != EXPECTED_ROW_COUNT:
        raise SystemExit(f"Expected {EXPECTED_ROW_COUNT} CSV rows, got {len(rows)}")
    out: list[dict] = []
    for r in rows:
        out.append(
            {
                "line_id": r["line_id"],
                "doc_id": r["doc_id"],
                "doc_display_order": int(r["doc_display_order"]),
                "year": int(r["year"]),
                "exhibit_id": r["exhibit_id"],
                "category_raw": r["category_raw"],
                "hierarchy_path": r["hierarchy_path"],
                "label": r["label"],
                "amount": int(r["amount"]),
                "file_name": r["file_name"],
                "storage_url": r["storage_url"],
                "pdf_page": int(r["pdf_page"]),
                "section": r["section"],
                "row_kind": r["row_kind"],
                "entity": r["entity"],
            }
        )
    return out


def import_revenues(client) -> None:
    client.table("exhibit_b_revenues").delete().eq("year", 2025).execute()
    print("exhibit_b_revenues: deleted existing year=2025 rows")

    rows = load_csv_rows()
    batch_size = 25
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        client.table("exhibit_b_revenues").insert(batch).execute()
    print(f"exhibit_b_revenues: inserted {len(rows)} rows")


def verify(client) -> None:
    resp = (
        client.table("exhibit_b_revenues")
        .select("line_id", count="exact")
        .eq("year", 2025)
        .execute()
    )
    count = resp.count if resp.count is not None else len(resp.data or [])
    print(f"verify count year=2025: {count}")
    if count != EXPECTED_ROW_COUNT:
        raise SystemExit(f"Expected {EXPECTED_ROW_COUNT} rows after import, got {count}")

    totals = (
        client.table("exhibit_b_revenues")
        .select("label,entity,amount")
        .eq("year", 2025)
        .eq("section", "general_revenues")
        .eq("row_kind", "total")
        .execute()
    )
    expected = {
        ("governmental_activities", "Governmental Activities"): 7_054_519,
        ("business_type_activities", "Business-type Activities"): 78_954,
        ("total_primary_government", "Total Primary Government"): 7_133_473,
        ("school_department", "Metropolitan School Department"): 10_669_390,
    }
    for row in totals.data or []:
        key = (row["entity"], row["label"])
        if key in expected:
            actual = int(row["amount"])
            exp = expected[key]
            assert actual == exp, f"{key}: {actual} != {exp}"
            print(f"  total OK: {row['label']} = {actual:,}")

    highways = (
        client.table("exhibit_b_revenues")
        .select("amount")
        .eq("year", 2025)
        .eq("label", "Highways")
        .like("hierarchy_path", "%Operating Grants%")
        .execute()
    )
    if not highways.data or int(highways.data[0]["amount"]) != 1_809_605:
        raise SystemExit("Highways Operating Grants spot-check failed")
    print("  spot-check OK: Highways Operating Grants = 1,809,605")


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV not found: {CSV_PATH}")

    client = get_client(load_env())
    seed_source_document(client)
    import_revenues(client)
    verify(client)
    print("\nImport complete.")


if __name__ == "__main__":
    main()
