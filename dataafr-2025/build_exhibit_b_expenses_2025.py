#!/usr/bin/env python3
"""Build 2025 Exhibit B expense rows from FY25 PDF using 2024 template structure."""

from __future__ import annotations

import csv
import re
import sys
import uuid
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
TEMPLATE_CSV = ROOT / "exhibit_b_expenses_2024_template.csv"
IMPORT_CSV = ROOT / "exhibit_b_expenses_2025_import.csv"
PDF_2025 = ROOT / "FY25MooreAFR.pdf"
PDF_PAGE = 17  # 1-based page number in the AFR

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

# PDF statement order for doc_display_order.
DISPLAY_ORDER = [
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
    "Total Governmental Activities",
    "Water and Sewer Department",
    "Total Business-type Activities",
    "Total Primary Government",
    "Metropolitan School Department",
    "Total Component Units",
]

GOV_LINE_ITEMS = DISPLAY_ORDER[:10]

EXPECTED = {
    "Total Governmental Activities": 10_482_802,
    "Total Business-type Activities": 3_395_745,
    "Total Primary Government": 13_878_547,
    "Metropolitan School Department": 13_859_660,
    "Total Component Units": 13_859_660,
    "Water and Sewer Department": 3_395_745,
}

NUM_TOKEN = re.compile(r"\(?-?[\d,]+\)?")


def parse_amount(token: str) -> int:
    token = token.strip().replace(",", "")
    if token.startswith("(") and token.endswith(")"):
        return -int(token[1:-1])
    return int(token)


def parse_expense_line(line: str) -> tuple[str, int] | None:
    """Return (label, expenses_column_amount) from a Statement of Activities row."""
    line = line.strip()
    if not line or line.endswith(":"):
        return None
    if line.startswith("Total Primary Government"):
        parts = NUM_TOKEN.findall(line)
        return ("Total Primary Government", parse_amount(parts[0])) if parts else None
    if line.startswith("Total Governmental Activities"):
        parts = NUM_TOKEN.findall(line)
        return ("Total Governmental Activities", parse_amount(parts[0])) if parts else None
    if line.startswith("Metropolitan School Department"):
        parts = NUM_TOKEN.findall(line)
        return ("Metropolitan School Department", parse_amount(parts[0])) if parts else None

    if "$" in line:
        label, rest = line.split("$", 1)
        label = label.strip()
        token = rest.strip().split()[0]
        return label, parse_amount(token)

    parts = line.split()
    if len(parts) < 2:
        return None
    label_tokens: list[str] = []
    amount_idx = None
    for i, part in enumerate(parts):
        if NUM_TOKEN.fullmatch(part.replace("$", "")):
            amount_idx = i
            break
        label_tokens.append(part)
    if amount_idx is None:
        return None
    label = " ".join(label_tokens).strip()
    return label, parse_amount(parts[amount_idx])


def extract_expenses_from_pdf(pdf_path: Path) -> dict[str, int]:
    reader = PdfReader(str(pdf_path))
    page_text = reader.pages[PDF_PAGE - 1].extract_text() or ""
    amounts: dict[str, int] = {}
    in_expenses = False

    for raw_line in page_text.split("\n"):
        line = raw_line.strip()
        if "Functions/Programs" in line and "Expenses" in line:
            in_expenses = True
            continue
        if not in_expenses:
            continue
        if line.startswith("General Revenues:") or line == "(Continued)":
            break

        parsed = parse_expense_line(line)
        if not parsed:
            continue
        label, amount = parsed
        amounts[label] = amount

    if "Total Business-type Activities" not in amounts and "Water and Sewer Department" in amounts:
        amounts["Total Business-type Activities"] = amounts["Water and Sewer Department"]
    if "Total Component Units" not in amounts and "Metropolitan School Department" in amounts:
        amounts["Total Component Units"] = amounts["Metropolitan School Department"]

    return amounts


def load_template_rows() -> list[dict[str, str]]:
    with TEMPLATE_CSV.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def build_rows(pdf_amounts: dict[str, int], template_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    by_label = {r["label"]: r for r in template_rows}
    missing_labels = [label for label in DISPLAY_ORDER if label not in by_label]
    if missing_labels:
        raise ValueError(f"Template missing labels: {missing_labels}")

    rows: list[dict[str, str]] = []
    unmatched: list[str] = []

    for order, label in enumerate(DISPLAY_ORDER, start=1):
        tpl = by_label[label]
        if label in pdf_amounts:
            amount = pdf_amounts[label]
        elif label == "Total Business-type Activities":
            amount = pdf_amounts.get("Water and Sewer Department", 0)
        elif label == "Total Component Units":
            amount = pdf_amounts.get("Metropolitan School Department", 0)
        else:
            unmatched.append(label)
            amount = 0

        pdf_page = str(PDF_PAGE)

        rows.append(
            {
                "line_id": str(uuid.uuid4()),
                "doc_id": DOC_ID,
                "doc_display_order": str(order),
                "year": "2025",
                "exhibit_id": "B",
                "category_raw": tpl["category_raw"],
                "hierarchy_path": tpl["hierarchy_path"],
                "label": label,
                "amount": str(amount),
                "file_name": FILE_NAME,
                "storage_url": STORAGE_URL,
                "pdf_page": pdf_page,
                "section": "expenses",
                "row_kind": tpl["row_kind"],
                "entity": tpl["entity"],
            }
        )

    if unmatched:
        print(f"WARNING: no PDF match for: {unmatched}", file=sys.stderr)

    return rows


def validate(rows: list[dict[str, str]], pdf_amounts: dict[str, int]) -> None:
    by_label = {r["label"]: int(r["amount"]) for r in rows}

    gov_sum = sum(by_label[l] for l in GOV_LINE_ITEMS)
    gov_total = by_label["Total Governmental Activities"]
    if gov_sum != gov_total:
        raise ValueError(f"Gov line items sum {gov_sum} != Total Governmental Activities {gov_total}")

    primary = by_label["Total Primary Government"]
    expected_primary = gov_total + by_label["Total Business-type Activities"]
    if primary != expected_primary:
        raise ValueError(f"Total Primary Government {primary} != {expected_primary}")

    if by_label["Total Component Units"] != by_label["Metropolitan School Department"]:
        raise ValueError("Total Component Units != Metropolitan School Department")

    for label, expected in EXPECTED.items():
        actual = by_label.get(label)
        if actual != expected:
            raise ValueError(f"{label}: CSV {actual} != expected {expected}")
        pdf_val = pdf_amounts.get(label)
        if pdf_val is not None and pdf_val != expected:
            raise ValueError(f"{label}: PDF {pdf_val} != expected {expected}")


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

    pdf_amounts = extract_expenses_from_pdf(PDF_2025)
    template_rows = load_template_rows()
    rows = build_rows(pdf_amounts, template_rows)
    validate(rows, pdf_amounts)
    write_csv(rows)

    print(f"Wrote {len(rows)} rows to {IMPORT_CSV.name}")
    print("\nReconciliation:")
    by_label = {r["label"]: int(r["amount"]) for r in rows}
    print(f"  Gov line items sum: {sum(by_label[l] for l in GOV_LINE_ITEMS):,}")
    print(f"  Total Governmental Activities: {by_label['Total Governmental Activities']:,}")
    print(f"  Total Business-type Activities: {by_label['Total Business-type Activities']:,}")
    print(f"  Total Primary Government: {by_label['Total Primary Government']:,}")
    print(f"  Metropolitan School Department: {by_label['Metropolitan School Department']:,}")
    print(f"  Total Component Units: {by_label['Total Component Units']:,}")


if __name__ == "__main__":
    main()
