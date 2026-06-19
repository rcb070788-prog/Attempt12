#!/usr/bin/env python3
"""Build 2025 Exhibit A level-4 rows from FY25 PDF using 2024 template structure."""

from __future__ import annotations

import csv
import io
import re
import sys
import urllib.request
import uuid
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
TEMPLATE_CSV = ROOT / "AFR_Exhibit_A_2024_template.csv"
IMPORT_CSV = ROOT / "AFR_Exhibit_A_2025_import.csv"
SUPABASE_IMPORT_CSV = ROOT / "AFR_Exhibit_A_2025_supabase_import.csv"
PDF_2025 = ROOT / "FY25MooreAFR.pdf"
PDF_2024_URL = (
    "https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/"
    "AFR_reports/originals/2024%20Moore%20County%20Financial%20Report.pdf"
)

FILE_NAME = "2025 Moore County Financial Report.pdf"
STORAGE_URL = (
    "https://hovdckksdjofgghaxtif.supabase.co/storage/v1/object/public/"
    "AFR_reports/originals/2025%20Moore%20County%20Financial%20Report.pdf"
)

COL = {
    "Governmental Activities": 0,
    "Business-type Activities": 1,
    "School Department": 3,
}

SECTION_KEYS = {
    "Assets": "ASSETS",
    "Liabilities": "LIABILITIES",
    "Deferred Outflows of Resources": "DEFERRED OUTFLOWS OF RESOURCES",
    "Deferred Inflows of Resources": "DEFERRED INFLOWS OF RESOURCES",
}

# 2025 Exhibit A lines not present in the 2024 template (append after template rows).
SUPPLEMENTAL_2025_ROWS: list[dict] = [
    {
        "category": "Deferred Inflows of Resources",
        "hierarchy_path": "Primary Government > Governmental Activities",
        "label": "Pension Changes in Investment Earnings",
        "amount_2025": 31_910,
        "pdf_page": "16",
        "parent_entity": "Governmental Activities",
    },
    {
        "category": "Deferred Inflows of Resources",
        "hierarchy_path": "Component Units > Metropolitan School Department",
        "label": "Pension Changes in Investment Earnings",
        "amount_2025": 451_999,
        "pdf_page": "16",
        "parent_entity": "School Department",
    },
    {
        "category": "Liabilities",
        "hierarchy_path": "Primary Government > Governmental Activities",
        "label": "Due to Other Governments",
        "amount_2025": 71_781,
        "pdf_page": "16",
        "parent_entity": "Governmental Activities",
    },
]

EXPECTED = {
    ("Governmental Activities", "Assets"): 25_548_151,
    ("Business-type Activities", "Assets"): 23_880_121,
    ("School Department", "Assets"): 32_380_108,
    ("Governmental Activities", "Liabilities"): 18_425_381,
    ("Business-type Activities", "Liabilities"): 10_778_928,
    ("School Department", "Liabilities"): 2_930_530,
    ("Governmental Activities", "Net Assets"): 2_985_782,
    ("Business-type Activities", "Net Assets"): 13_101_193,
    ("School Department", "Net Assets"): 26_712_939,
}


def load_reader(path_or_url: str | Path) -> PdfReader:
    if str(path_or_url).startswith("http"):
        req = urllib.request.Request(str(path_or_url), headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=60).read()
        return PdfReader(io.BytesIO(data))
    return PdfReader(str(path_or_url))


def parse_amount(token: str) -> int:
    token = token.strip().replace(",", "")
    if not token:
        raise ValueError("empty token")
    if token.startswith("(") and token.endswith(")"):
        return -int(token[1:-1])
    return int(token)


NUM_TOKEN = re.compile(r"\(?-?[\d,]+\)?")


def parse_amount_line(line: str) -> tuple[str, list[int]] | None:
    line = line.strip()
    if not line or line.endswith(":"):
        return None

    if "$" in line:
        label, rest = line.split("$", 1)
        label = label.strip()
        amounts: list[int] = []
        for chunk in ("$" + rest).split("$")[1:]:
            chunk = chunk.strip()
            if not chunk:
                continue
            token = chunk.split()[0]
            amounts.append(parse_amount(token))
        if not amounts:
            return None
        while len(amounts) < 4:
            amounts.append(0)
        return label, amounts[:4]

    tokens = NUM_TOKEN.findall(line)
    if len(tokens) < 4:
        return None
    last_four = tokens[-4:]
    label = line[: line.find(last_four[0])].strip()
    if not label:
        return None
    amounts = [parse_amount(t) for t in last_four]
    return label, amounts


def parse_exhibit_page(text: str) -> dict[str, list[tuple[str, list[int]]]]:
    sections: dict[str, list[tuple[str, list[int]]]] = {}
    current: str | None = None

    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line in SECTION_KEYS.values():
            current = line
            sections.setdefault(current, [])
            continue
        if line == "NET POSITION":
            current = "NET POSITION"
            sections.setdefault(current, [])
            continue
        if current == "NET POSITION" and line.startswith("Restricted for:"):
            current = "NET POSITION RESTRICTED"
            sections.setdefault(current, [])
            line = line.replace("Restricted for:", "").strip()

        if current is None:
            continue

        if line.startswith("Total Assets") or line.startswith("Total Liabilities"):
            parsed = parse_amount_line(line)
            if parsed:
                sections[current].append(parsed)
            current = None
            continue

        if line.startswith("Total Deferred Outflows") or line.startswith("Total Deferred Inflows"):
            parsed = parse_amount_line(line)
            if parsed:
                sections[current].append(parsed)
            continue

        if line.startswith("Total Net Position"):
            parsed = parse_amount_line(line)
            if parsed:
                sections[current].append(parsed)
            continue

        parsed = parse_amount_line(line)
        if parsed:
            sections[current].append(parsed)

    return sections


def get_sections(reader: PdfReader) -> tuple[dict, dict]:
    return (
        parse_exhibit_page(reader.pages[14].extract_text() or ""),
        parse_exhibit_page(reader.pages[15].extract_text() or ""),
    )


def page_sections(p15: dict, p16: dict, category: str) -> dict:
    if category in ("Assets", "Deferred Outflows of Resources"):
        return p15
    return p16


def section_lines(sections: dict, category: str) -> list[tuple[str, list[int]]]:
    key = SECTION_KEYS[category]
    return sections.get(key, [])


def col_values(lines: list[tuple[str, list[int]]], col: int) -> list[int]:
    return [vals[col] for _, vals in lines]


def find_indices(vals24: list[int], template_amounts: list[int]) -> list[int]:
    """Map each template amount to a unique PDF line index using 2024 values."""
    indices: list[int] = []
    used: set[int] = set()
    for amt in template_amounts:
        idx = None
        for i, v in enumerate(vals24):
            if i not in used and v == amt:
                idx = i
                break
        if idx is None:
            raise ValueError(f"Could not map 2024 amount {amt} in {vals24}")
        used.add(idx)
        indices.append(idx)
    return indices


def match_label(lines: list[tuple[str, list[int]]], label: str, col: int) -> int | None:
    if label == "Deferred Current Property Taxes":
        key = "Deferred Current Property Taxes"
    elif label.startswith("Restricted for:"):
        key = label.replace("Restricted for:", "").strip()
    else:
        key = label

    for line_label, vals in lines:
        if line_label == key or line_label.endswith(key) or key in line_label:
            return vals[col]
    return None


def normalize_label(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def find_line_by_label(
    lines: list[tuple[str, list[int]]], label: str
) -> tuple[str, list[int]] | None:
    target = normalize_label(label)
    for line_label, vals in lines:
        if normalize_label(line_label) == target:
            return line_label, vals
    for line_label, vals in lines:
        if target in normalize_label(line_label) or normalize_label(line_label) in target:
            return line_label, vals
    return None


def map_subtotal_rows(
    template_rows: list[dict],
    lines24: list[tuple[str, list[int]]],
    lines25: list[tuple[str, list[int]]],
    col: int,
    flags: list[str],
) -> list[tuple[dict, int]]:
    amounts24 = [int(r["amount"]) for r in template_rows]
    vals24 = col_values(lines24, col)
    indices = find_indices(vals24, amounts24)
    mapped: list[tuple[dict, int]] = []
    for row, idx in zip(template_rows, indices):
        label24, _ = lines24[idx]
        match = find_line_by_label(lines25, label24)
        if match is None:
            flags.append(
                f"{row['parent_entity']} | {row['category']} | 2024 line '{label24}': "
                "no matching label in 2025 PDF"
            )
            mapped.append((row, 0))
            continue
        mapped.append((row, match[1][col]))
    return mapped


def map_named_rows(
    row: dict,
    sections25: dict,
    col: int,
    flags: list[str],
) -> int:
    label = row["label"]
    category = row["category"]
    parent = row["parent_entity"]

    if category == "Net Assets":
        if label in ("Net Investment in Capital Assets", "Unrestricted"):
            val = match_label(sections25.get("NET POSITION", []), label, col)
            if val is None:
                val = match_label(sections25.get("NET POSITION RESTRICTED", []), label, col)
            if val is None:
                flags.append(f"{parent} | {label}: no 2025 match")
                return 0
            return val

        if label.startswith("Restricted for:"):
            key = label.replace("Restricted for:", "").strip()
            if key == "Other Purposes":
                flags.append(
                    f"{parent} | Restricted for: Other Purposes: absent in 2025 PDF "
                    "(semantically replaced by Capital Projects $4,852)"
                )
                return 0
            val = match_label(sections25.get("NET POSITION RESTRICTED", []), label, col)
            if val is None:
                flags.append(f"{parent} | {label}: no 2025 match")
                return 0
            return val

    lines = section_lines(sections25, category)

    if label.startswith("Total Deferred"):
        for line_label, vals in lines:
            if line_label.startswith("Total Deferred"):
                return vals[col]
        flags.append(f"{parent} | {category} | {label}: total line not found")
        return 0

    if label == "Pension Changes in Investment Earnings" and category == "Deferred Outflows of Resources":
        val = match_label(lines, label, col)
        if val is None or val == 0:
            flags.append(
                f"{parent} | Pension Changes in Investment Earnings (Deferred Outflows): "
                "0 or absent in 2025 - value may appear under Deferred Inflows"
            )
            return 0
        return val

    val = match_label(lines, label, col)
    if val is None:
        flags.append(f"{parent} | {category} | {label}: no 2025 label match")
        return 0
    return val


def build_rows() -> tuple[list[dict], list[str]]:
    reader24 = load_reader(PDF_2024_URL)
    reader25 = load_reader(PDF_2025)
    p15_24, p16_24 = get_sections(reader24)
    p15_25, p16_25 = get_sections(reader25)

    template_rows = [
        r
        for r in csv.DictReader(TEMPLATE_CSV.open(encoding="utf-8"))
        if r.get("hierarchy_level") == "4"
    ]
    if len(template_rows) != 95:
        raise SystemExit(f"Expected 95 template rows, got {len(template_rows)}")

    flags: list[str] = []
    output: list[dict] = []

    # Process in template order, batching subtotal groups
    i = 0
    while i < len(template_rows):
        row = template_rows[i]
        label = row["label"]
        if label.endswith("(Subtotal)"):
            parent = row["parent_entity"]
            category = row["category"]
            group = [row]
            j = i + 1
            while j < len(template_rows):
                nxt = template_rows[j]
                if (
                    nxt["label"].endswith("(Subtotal)")
                    and nxt["parent_entity"] == parent
                    and nxt["category"] == category
                ):
                    group.append(nxt)
                    j += 1
                else:
                    break
            sec24 = page_sections(p15_24, p16_24, category)
            sec25 = page_sections(p15_25, p16_25, category)
            lines24 = section_lines(sec24, category)
            lines25 = section_lines(sec25, category)
            mapped = map_subtotal_rows(group, lines24, lines25, COL[parent], flags)
            for r, amt in mapped:
                output.append({**r, "amount_2025": amt})
            i = j
        else:
            category = row["category"]
            sec25 = page_sections(p15_25, p16_25, category)
            amt = map_named_rows(row, sec25, COL[row["parent_entity"]], flags)
            output.append({**row, "amount_2025": amt})
            i += 1

    if len(output) != 95:
        raise SystemExit(f"Expected 95 output rows, got {len(output)}")

    output.extend(SUPPLEMENTAL_2025_ROWS)

    return output, flags


def validate(output: list[dict]) -> list[str]:
    errors: list[str] = []
    for (parent, category), expected in EXPECTED.items():
        if category == "Net Assets":
            actual = sum(
                r["amount_2025"]
                for r in output
                if r["parent_entity"] == parent and r["category"] == "Net Assets"
            )
        elif category == "Liabilities":
            actual = sum(
                r["amount_2025"]
                for r in output
                if r["parent_entity"] == parent and r["category"] == "Liabilities"
            )
        else:
            actual = sum(
                r["amount_2025"]
                for r in output
                if r["parent_entity"] == parent
                and r["category"] == category
                and r["label"].endswith("(Subtotal)")
            )
        if actual != expected:
            errors.append(f"{parent} {category}: expected {expected:,}, got {actual:,}")
    return errors


def write_import(output: list[dict]) -> Path:
    fieldnames = [
        "year",
        "exhibit_id",
        "category",
        "hierarchy_path",
        "label",
        "amount",
        "file_name",
        "storage_url",
        "pdf_page",
        "hierarchy_level",
        "parent_entity",
    ]

    reader = csv.DictReader(IMPORT_CSV.open(encoding="utf-8"))
    base_rows = [r for r in reader if r.get("hierarchy_level") in ("1", "2", "3")]
    if len(base_rows) != 18:
        raise SystemExit(f"Expected 18 level 1-3 rows in import CSV, got {len(base_rows)}")

    rows: list[dict[str, str]] = list(base_rows)
    for r in output:
        rows.append(
            {
                "year": "2025",
                "exhibit_id": "A",
                "category": r["category"],
                "hierarchy_path": r["hierarchy_path"],
                "label": r["label"],
                "amount": str(r["amount_2025"]),
                "file_name": FILE_NAME,
                "storage_url": STORAGE_URL,
                "pdf_page": r["pdf_page"],
                "hierarchy_level": "4",
                "parent_entity": r["parent_entity"],
            }
        )

    dest = IMPORT_CSV
    try:
        with dest.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
    except PermissionError:
        dest = IMPORT_CSV.with_name("AFR_Exhibit_A_2025_import_COMPLETE.csv")
        with dest.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
    return dest


def write_supabase_import(source: Path) -> Path:
    """Write Dashboard-compatible CSV matching AFR_Exhibit_A table export format."""
    fieldnames = [
        "id",
        "year",
        "exhibit_id",
        "category",
        "hierarchy_path",
        "label",
        "amount",
        "file_name",
        "storage_url",
        "pdf_page",
        "bounding_box",
        "created_at",
        "hierarchy_level",
        "parent_entity",
    ]
    source_rows = list(csv.DictReader(source.open(encoding="utf-8")))
    rows: list[dict[str, str]] = []
    for row in source_rows:
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "year": row["year"],
                "exhibit_id": row.get("exhibit_id", ""),
                "category": row["category"],
                "hierarchy_path": row.get("hierarchy_path", ""),
                "label": row["label"],
                "amount": row["amount"],
                "file_name": row.get("file_name", ""),
                "storage_url": row.get("storage_url", ""),
                "pdf_page": row.get("pdf_page", ""),
                "bounding_box": "",
                "created_at": "",
                "hierarchy_level": row["hierarchy_level"],
                "parent_entity": row["parent_entity"],
            }
        )
    with SUPABASE_IMPORT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    return SUPABASE_IMPORT_CSV


def main() -> int:
    output, flags = build_rows()
    errors = validate(output)
    if errors:
        print("VALIDATION ERRORS:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1

    dest = write_import(output)
    supabase_dest = write_supabase_import(dest)
    print(f"Wrote {len(output)} level-4 rows to {dest.name}")
    print(f"Wrote {18 + len(output)} rows to {supabase_dest.name} (Supabase Dashboard format)")
    print(f"Total import rows: {18 + len(output)}")
    if flags:
        print("\nFlagged rows:")
        for f in flags:
            print(f"  - {f}")
    else:
        print("\nNo flagged rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
