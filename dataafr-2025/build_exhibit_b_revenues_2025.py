#!/usr/bin/env python3
"""Build 2025 Exhibit B revenue rows from FY25 PDF using 2024 template structure."""

from __future__ import annotations

import csv
import re
import sys
import uuid
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
TEMPLATE_CSV = ROOT / "exhibit_b_revenues_2024_template.csv"
IMPORT_CSV = ROOT / "exhibit_b_revenues_2025_import.csv"
PDF_2025 = ROOT / "FY25MooreAFR.pdf"
PAGE_PROGRAM = 17
PAGE_GENERAL = 18

DOC_ID = "B_2025"
FILE_NAME = "2025 Moore County Financial Report.pdf"
STORAGE_URL = (
    "https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/"
    "AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf"
)

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

PROGRAM_COL = {
    "Program Revenues > Charges for Services": 1,
    "Program Revenues > Operating Grants and Contributions": 2,
    "Program Revenues > Capital Grants and Contributions": 3,
}

GENERAL_ENTITY_COL = {
    "governmental_activities": 0,
    "business_type_activities": 1,
    "total_primary_government": 2,
    "school_department": 3,
}

GENERAL_ENTITY_LABELS = {
    "governmental_activities": "Governmental Activities",
    "business_type_activities": "Business-type Activities",
    "total_primary_government": "Total Primary Government",
    "school_department": "Metropolitan School Department",
}

EXPECTED_ROW_COUNT = 81
EXPECTED_PROGRAM_ROWS = 25
EXPECTED_GENERAL_ROWS = 56

# PDF general-revenue line text -> template hierarchy_path
GENERAL_LINE_TO_PATH: dict[str, str] = {
    "Property Taxes Levied for General Purposes": "General Revenues > Taxes > Property Taxes Levied for General Purposes",
    "Property Taxes Levied for Debt Service": "General Revenues > Taxes > Property Taxes Levied for Debt Service",
    "Local Option Sales Tax": "General Revenues > Taxes > Local Option Sales Tax",
    "Wholesale Beer Tax": "General Revenues > Taxes > Wholesale Beer Tax",
    "Business Tax": "General Revenues > Taxes > Business Tax",
    "Litigation Tax - Jail, Workhouse, & Courthouse": (
        "General Revenues > Taxes > Litigation Tax - Jail, Workhouse, & Courthouse"
    ),
    "Litigation Tax - General": "General Revenues > Taxes > Litigation Tax - General",
    "Hotel/Motel Tax": "General Revenues > Taxes > Hotel/Motel Tax",
    "Other Local Taxes": "General Revenues > Taxes > Other Local Taxes",
    "Grants and Contributions Not Restricted to Specific Programs": (
        "General Revenues > Grants and Contributions Not Restricted to Specific Programs"
    ),
    "Unrestricted Investment Income": "General Revenues > Unrestricted Investment Income",
    "Miscellaneous": "General Revenues > Miscellaneous",
    "Gain on Sale of Capital Assets": "General Revenues > Gain on Sale of Capital Assets",
    "Total General Revenues": "General Revenues > Total General Revenues",
}

FUNCTION_ORDER = [
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
    "Water and Sewer Department",
    "Metropolitan School Department",
    "Total Governmental Activities",
    "Total Primary Government",
]

HIERARCHY_ORDER = {
    "Program Revenues > Charges for Services": 0,
    "Program Revenues > Operating Grants and Contributions": 1,
    "Program Revenues > Capital Grants and Contributions": 2,
    "General Revenues > Taxes > Property Taxes Levied for General Purposes": 10,
    "General Revenues > Taxes > Property Taxes Levied for Debt Service": 11,
    "General Revenues > Taxes > Local Option Sales Tax": 12,
    "General Revenues > Taxes > Wholesale Beer Tax": 13,
    "General Revenues > Taxes > Business Tax": 14,
    "General Revenues > Taxes > Litigation Tax - Jail, Workhouse, & Courthouse": 15,
    "General Revenues > Taxes > Litigation Tax - General": 16,
    "General Revenues > Taxes > Hotel/Motel Tax": 17,
    "General Revenues > Taxes > Other Local Taxes": 18,
    "General Revenues > Grants and Contributions Not Restricted to Specific Programs": 20,
    "General Revenues > Unrestricted Investment Income": 21,
    "General Revenues > Miscellaneous": 22,
    "General Revenues > Gain on Sale of Capital Assets": 23,
    "General Revenues > Total General Revenues": 30,
}

ENTITY_ORDER = {
    "governmental_activities": 0,
    "business_type_activities": 1,
    "total_primary_government": 2,
    "school_department": 3,
}

ROW_KIND_ORDER = {"line_item": 0, "subtotal": 1, "total": 2}

EXPECTED_GENERAL_TOTALS = {
    ("governmental_activities", "Governmental Activities"): 7_054_519,
    ("business_type_activities", "Business-type Activities"): 78_954,
    ("total_primary_government", "Total Primary Government"): 7_133_473,
    ("school_department", "Metropolitan School Department"): 10_669_390,
}

EXPECTED_PROGRAM_SUBTOTALS = {
    ("Program Revenues > Charges for Services", "Total Governmental Activities"): 1_362_138,
    ("Program Revenues > Operating Grants and Contributions", "Total Governmental Activities"): 2_706_134,
    ("Program Revenues > Capital Grants and Contributions", "Total Governmental Activities"): 0,
}

NUM_TOKEN = re.compile(r"\(?-?[\d,]+\)?")


def parse_amount(token: str) -> int:
    token = token.strip().replace(",", "").replace("$", "")
    if token.startswith("(") and token.endswith(")"):
        return -int(token[1:-1])
    return int(token)


def parse_amounts_from_line(line: str) -> tuple[str, list[int]] | None:
    line = line.strip()
    if not line or line.endswith(":"):
        return None

    amounts: list[int] = []
    if "$" in line:
        label, rest = line.split("$", 1)
        label = label.strip()
        for chunk in ("$" + rest).split("$")[1:]:
            chunk = chunk.strip()
            if chunk:
                amounts.append(parse_amount(chunk.split()[0]))
    else:
        parts = line.split()
        label_tokens: list[str] = []
        for part in parts:
            if NUM_TOKEN.fullmatch(part):
                amounts.append(parse_amount(part))
            else:
                label_tokens.append(part)
        label = " ".join(label_tokens).strip()

    if not label or not amounts:
        return None
    return label, amounts


def extract_program_revenues(pdf_path: Path) -> dict[tuple[str, str], int]:
    """Map (hierarchy_path, function_label) -> amount from page 17."""
    reader = PdfReader(str(pdf_path))
    text = reader.pages[PAGE_PROGRAM - 1].extract_text() or ""
    result: dict[tuple[str, str], int] = {}
    in_section = False

    for raw in text.split("\n"):
        line = raw.strip()
        if "Functions/Programs" in line and "Expenses" in line:
            in_section = True
            continue
        if not in_section:
            continue
        if line.startswith("General Revenues:") or line == "(Continued)":
            break

        parsed = parse_amounts_from_line(line)
        if not parsed or len(parsed[1]) < 4:
            continue
        label, amts = parsed
        charges, operating, capital = amts[1], amts[2], amts[3]

        for path, col_idx in PROGRAM_COL.items():
            result[(path, label)] = [charges, operating, capital][col_idx - 1]

    return result


def extract_general_revenues(pdf_path: Path) -> dict[tuple[str, str], int]:
    """Map (hierarchy_path, entity) -> amount from page 18."""
    reader = PdfReader(str(pdf_path))
    text = reader.pages[PAGE_GENERAL - 1].extract_text() or ""
    result: dict[tuple[str, str], int] = {}
    in_taxes = False

    for raw in text.split("\n"):
        line = raw.strip()
        if line == "General Revenues:":
            continue
        if line == "Taxes:":
            in_taxes = True
            continue
        if line.startswith("Change in Net Position"):
            break

        parsed = parse_amounts_from_line(line)
        if not parsed or len(parsed[1]) < 4:
            continue
        label, amts = parsed

        if label in GENERAL_LINE_TO_PATH:
            path = GENERAL_LINE_TO_PATH[label]
            for entity, col in GENERAL_ENTITY_COL.items():
                result[(path, entity)] = amts[col]
            in_taxes = False
        elif in_taxes and line.startswith("Property Taxes"):
            # handled by full label match above
            pass

    return result


def template_sort_key(row: dict[str, str]) -> tuple:
    section_ord = 0 if row["section"] == "program_revenues" else 1
    hier_ord = HIERARCHY_ORDER.get(row["hierarchy_path"], 99)
    func_ord = (
        FUNCTION_ORDER.index(row["label"])
        if row["label"] in FUNCTION_ORDER
        else 50
    )
    return (
        section_ord,
        hier_ord,
        ROW_KIND_ORDER.get(row["row_kind"], 9),
        func_ord,
        ENTITY_ORDER.get(row["entity"], 9),
        row["label"],
    )


def generate_general_template_rows() -> list[dict[str, str]]:
    """Emit full 13×4 general line_item grid + 4 total rows (PDF-aligned)."""
    rows: list[dict[str, str]] = []
    line_paths = [p for label, p in GENERAL_LINE_TO_PATH.items() if label != "Total General Revenues"]

    for path in line_paths:
        for entity in GENERAL_ENTITY_COL:
            rows.append(
                {
                    "category_raw": "General Revenues",
                    "hierarchy_path": path,
                    "label": GENERAL_ENTITY_LABELS[entity],
                    "section": "general_revenues",
                    "row_kind": "line_item",
                    "entity": entity,
                }
            )

    for entity in GENERAL_ENTITY_COL:
        rows.append(
            {
                "category_raw": "General Revenues",
                "hierarchy_path": "General Revenues > Total General Revenues",
                "label": GENERAL_ENTITY_LABELS[entity],
                "section": "general_revenues",
                "row_kind": "total",
                "entity": entity,
            }
        )

    return rows


def load_template_rows() -> list[dict[str, str]]:
    with TEMPLATE_CSV.open(encoding="utf-8", newline="") as f:
        all_rows = list(csv.DictReader(f))
    program_rows = [r for r in all_rows if r["section"] == "program_revenues"]
    general_rows = generate_general_template_rows()
    combined = program_rows + general_rows
    if len(program_rows) != EXPECTED_PROGRAM_ROWS:
        raise SystemExit(f"Expected {EXPECTED_PROGRAM_ROWS} program template rows, got {len(program_rows)}")
    if len(general_rows) != EXPECTED_GENERAL_ROWS:
        raise SystemExit(f"Expected {EXPECTED_GENERAL_ROWS} general scaffold rows, got {len(general_rows)}")
    return sorted(combined, key=template_sort_key)


def lookup_amount(
    tpl: dict[str, str],
    program: dict[tuple[str, str], int],
    general: dict[tuple[str, str], int],
) -> int:
    if tpl["section"] == "program_revenues":
        return program.get((tpl["hierarchy_path"], tpl["label"]), 0)
    return general.get((tpl["hierarchy_path"], tpl["entity"]), 0)


def build_rows(
    template_rows: list[dict[str, str]],
    program: dict[tuple[str, str], int],
    general: dict[tuple[str, str], int],
) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    missing: list[str] = []

    for order, tpl in enumerate(template_rows, start=1):
        amount = lookup_amount(tpl, program, general)
        if amount == 0 and tpl["row_kind"] == "line_item":
            key = f"{tpl['section']}|{tpl['hierarchy_path']}|{tpl['label']}|{tpl['entity']}"
            if tpl["section"] == "program_revenues":
                if (tpl["hierarchy_path"], tpl["label"]) not in program:
                    missing.append(key)
            elif (tpl["hierarchy_path"], tpl["entity"]) not in general:
                missing.append(key)

        page = str(PAGE_PROGRAM if tpl["section"] == "program_revenues" else PAGE_GENERAL)
        rows.append(
            {
                "line_id": str(uuid.uuid4()),
                "doc_id": DOC_ID,
                "doc_display_order": str(order),
                "year": "2025",
                "exhibit_id": "B",
                "category_raw": tpl["category_raw"],
                "hierarchy_path": tpl["hierarchy_path"],
                "label": tpl["label"],
                "amount": str(amount),
                "file_name": FILE_NAME,
                "storage_url": STORAGE_URL,
                "pdf_page": page,
                "section": tpl["section"],
                "row_kind": tpl["row_kind"],
                "entity": tpl["entity"],
            }
        )

    if missing:
        print(f"WARNING: zero/missing PDF match for {len(missing)} rows", file=sys.stderr)
        for m in missing[:10]:
            print(f"  {m}", file=sys.stderr)

    return rows


def validate(rows: list[dict[str, str]]) -> None:
    by_key = {
        (r["hierarchy_path"], r["label"], r["entity"]): int(r["amount"])
        for r in rows
        if r["section"] == "program_revenues"
    }
    for (path, label), expected in EXPECTED_PROGRAM_SUBTOTALS.items():
        actual = by_key.get((path, label, "governmental_activities"))
        if actual != expected:
            raise ValueError(f"Program subtotal {path} / {label}: {actual} != {expected}")

    gen_totals = {
        (r["entity"], r["label"]): int(r["amount"])
        for r in rows
        if r["section"] == "general_revenues" and r["row_kind"] == "total"
    }
    for key, expected in EXPECTED_GENERAL_TOTALS.items():
        actual = gen_totals.get(key)
        if actual != expected:
            raise ValueError(f"General total {key}: {actual} != {expected}")

    for entity in GENERAL_ENTITY_COL:
        item_sum = sum(
            int(r["amount"])
            for r in rows
            if r["section"] == "general_revenues"
            and r["row_kind"] == "line_item"
            and r["entity"] == entity
        )
        total_row = gen_totals.get((entity, GENERAL_ENTITY_LABELS[entity]))
        if total_row is None:
            raise ValueError(f"Missing general total row for {entity}")
        if item_sum != total_row:
            raise ValueError(
                f"General line items for {entity}: {item_sum} != total {total_row}"
            )

    gen_gov = sum(
        int(r["amount"])
        for r in rows
        if r["row_kind"] == "line_item"
        and r["entity"] == "governmental_activities"
    )
    expected_gen_gov = 11_122_791
    if gen_gov != expected_gen_gov:
        raise ValueError(f"Gen Gov chart total {gen_gov} != expected {expected_gen_gov}")

    # Charges gov line items sum
    charges_items = [
        int(r["amount"])
        for r in rows
        if r["section"] == "program_revenues"
        and r["hierarchy_path"] == "Program Revenues > Charges for Services"
        and r["row_kind"] == "line_item"
        and r["entity"] == "governmental_activities"
    ]
    charges_sub = by_key.get(
        ("Program Revenues > Charges for Services", "Total Governmental Activities", "governmental_activities")
    )
    if sum(charges_items) != charges_sub:
        raise ValueError(f"Charges line items {sum(charges_items)} != subtotal {charges_sub}")


def write_csv(rows: list[dict[str, str]]) -> None:
    with IMPORT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    if not PDF_2025.exists():
        raise SystemExit(f"PDF not found: {PDF_2025}")
    if not TEMPLATE_CSV.exists():
        raise SystemExit(f"Template not found: {TEMPLATE_CSV}")

    program = extract_program_revenues(PDF_2025)
    general = extract_general_revenues(PDF_2025)
    template_rows = load_template_rows()
    if len(template_rows) != EXPECTED_ROW_COUNT:
        raise SystemExit(f"Expected {EXPECTED_ROW_COUNT} template rows, got {len(template_rows)}")

    rows = build_rows(template_rows, program, general)
    validate(rows)
    write_csv(rows)

    print(f"Wrote {len(rows)} rows to {IMPORT_CSV.name}")
    print("\nGeneral revenue totals:")
    for r in rows:
        if r["section"] == "general_revenues" and r["row_kind"] == "total":
            print(f"  {r['entity']}: {int(r['amount']):,}")
    print("\nProgram subtotals (gov):")
    for r in rows:
        if r["section"] == "program_revenues" and r["row_kind"] == "subtotal":
            print(f"  {r['hierarchy_path'].split('>')[-1].strip()}: {int(r['amount']):,}")


if __name__ == "__main__":
    main()
