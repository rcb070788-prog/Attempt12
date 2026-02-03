import type { NormalizedLine } from './types';
import { parseHierarchyPath } from './paths';

const TAXES_PREFIX = 'General Revenues > Taxes >';

function filterByEntity(
  lines: NormalizedLine[],
  includeBusinessType: boolean,
  entityNorms?: string[]
): NormalizedLine[] {
  let allowed = entityNorms ?? (
    includeBusinessType
      ? ['governmental_activities', 'business_type_activities']
      : ['governmental_activities']
  );
  if (!includeBusinessType) {
    allowed = allowed.filter((e) => e !== 'business_type_activities');
    if (allowed.length === 0) allowed = ['governmental_activities'];
  }
  return lines.filter((l) => allowed.includes(l.entity_norm));
}

function isTaxesFees(line: NormalizedLine): boolean {
  return line.category_norm === 'general_revenues' && line.hierarchy_path_canon.startsWith(TAXES_PREFIX);
}

function isChargesForServices(line: NormalizedLine): boolean {
  if (line.category_norm !== 'program_revenues') return false;
  const segs = parseHierarchyPath(line.hierarchy_path_canon);
  return segs[1] === 'Charges for Services';
}

function isGrants(line: NormalizedLine): boolean {
  const segs = parseHierarchyPath(line.hierarchy_path_canon);
  const second = segs[1] ?? '';
  const hasGrants = second.toLowerCase().includes('grants');
  return (
    (line.category_norm === 'program_revenues' && hasGrants) ||
    (line.category_norm === 'general_revenues' && hasGrants)
  );
}

export interface YearMetric {
  year: number;
  totalRevenue: number;
  taxesFees: number;
  chargesForServices: number;
  grants: number;
  other: number;
  pdf_page_url_totalRevenue?: string;
  pdf_page_url_taxesFees?: string;
  pdf_page_url_chargesForServices?: string;
  pdf_page_url_grants?: string;
  pdf_page_url_other?: string;
}

export interface RevenuePieSlice {
  name: string;
  value: number;
  pdf_page_url?: string;
}

export interface TaxBreakdownSlice {
  name: string;
  value: number;
  pdf_page_url?: string;
}

export function getRevenueYearMetrics(
  lines: NormalizedLine[],
  yearMin: number,
  yearMax: number,
  includeBusinessType: boolean,
  entityNorms?: string[]
): YearMetric[] {
  const filtered = filterByEntity(lines, includeBusinessType, entityNorms);
  const revenueLines = filtered.filter(
    (l) =>
      (l.category_norm === 'general_revenues' || l.category_norm === 'program_revenues') &&
      l.year >= yearMin &&
      l.year <= yearMax
  );

  const years = [...new Set(revenueLines.map((l) => l.year))].sort((a, b) => a - b);
  const result: YearMetric[] = [];

  for (const year of years) {
    const forYear = revenueLines.filter((l) => l.year === year);
    const totalRevenue = forYear.reduce((s, l) => s + l.amount, 0);

    const taxRows = forYear.filter(isTaxesFees);
    const taxesFees = taxRows.reduce((s, l) => s + l.amount, 0);
    const taxUrl = taxRows.length ? taxRows.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), taxRows[0].pdf_page_url) : undefined;

    const chargeRows = forYear.filter(isChargesForServices);
    const chargesForServices = chargeRows.reduce((s, l) => s + l.amount, 0);
    const chargeUrl = chargeRows.length ? chargeRows.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), chargeRows[0].pdf_page_url) : undefined;

    const grantRows = forYear.filter(isGrants);
    const grants = grantRows.reduce((s, l) => s + l.amount, 0);
    const grantUrl = grantRows.length ? grantRows.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), grantRows[0].pdf_page_url) : undefined;

    const other = totalRevenue - (taxesFees + chargesForServices + grants);
    const otherRows = forYear.filter(
      (l) => !isTaxesFees(l) && !isChargesForServices(l) && !isGrants(l)
    );
    const otherUrl = otherRows.length ? otherRows.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), otherRows[0].pdf_page_url) : undefined;
    const totalUrl = forYear.length ? forYear.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), forYear[0].pdf_page_url) : undefined;

    result.push({
      year,
      totalRevenue,
      taxesFees,
      chargesForServices,
      grants,
      other,
      pdf_page_url_totalRevenue: totalUrl,
      pdf_page_url_taxesFees: taxUrl,
      pdf_page_url_chargesForServices: chargeUrl,
      pdf_page_url_grants: grantUrl,
      pdf_page_url_other: otherUrl,
    });
  }

  return result.sort((a, b) => a.year - b.year);
}

export function getRevenuePieForYear(
  lines: NormalizedLine[],
  selectedYear: number,
  includeBusinessType: boolean,
  entityNorms?: string[]
): RevenuePieSlice[] {
  const filtered = filterByEntity(lines, includeBusinessType, entityNorms);
  const forYear = filtered.filter(
    (l) =>
      (l.category_norm === 'general_revenues' || l.category_norm === 'program_revenues') &&
      l.year === selectedYear
  );

  const taxRows = forYear.filter(isTaxesFees);
  const chargeRows = forYear.filter(isChargesForServices);
  const grantRows = forYear.filter(isGrants);
  const otherRows = forYear.filter((l) => !isTaxesFees(l) && !isChargesForServices(l) && !isGrants(l));

  const pickUrl = (rows: NormalizedLine[]) =>
    rows.length ? rows.reduce((min, l) => (l.pdf_page_url < (min ?? '') ? l.pdf_page_url : min), rows[0].pdf_page_url) : undefined;

  return [
    { name: 'Taxes & Fees', value: taxRows.reduce((s, l) => s + l.amount, 0), pdf_page_url: pickUrl(taxRows) },
    { name: 'Charges for Services', value: chargeRows.reduce((s, l) => s + l.amount, 0), pdf_page_url: pickUrl(chargeRows) },
    { name: 'Grants', value: grantRows.reduce((s, l) => s + l.amount, 0), pdf_page_url: pickUrl(grantRows) },
    { name: 'Other', value: otherRows.reduce((s, l) => s + l.amount, 0), pdf_page_url: pickUrl(otherRows) },
  ].filter((s) => s.value !== 0);
}

export function getTaxBreakdownPieForYear(
  lines: NormalizedLine[],
  selectedYear: number,
  includeBusinessType: boolean,
  entityNorms?: string[],
  topN = 10
): TaxBreakdownSlice[] {
  const filtered = filterByEntity(lines, includeBusinessType, entityNorms);
  const taxLines = filtered.filter(
    (l) =>
      l.category_norm === 'general_revenues' &&
      l.hierarchy_path_canon.startsWith(TAXES_PREFIX) &&
      l.year === selectedYear
  );

  const byType = new Map<string, { amount: number; urls: string[] }>();
  for (const line of taxLines) {
    const segs = parseHierarchyPath(line.hierarchy_path_canon);
    const taxType = segs[2] ?? 'Other';
    const cur = byType.get(taxType) ?? { amount: 0, urls: [] };
    cur.amount += line.amount;
    cur.urls.push(line.pdf_page_url);
    byType.set(taxType, cur);
  }

  const sorted = [...byType.entries()]
    .map(([name, { amount, urls }]) => ({
      name,
      value: amount,
      pdf_page_url: urls.length ? urls.reduce((min, u) => (u < min ? u : min), urls[0]) : undefined,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  if (rest.length > 0) {
    const otherValue = rest.reduce((s, r) => s + r.value, 0);
    const otherUrl = rest.flatMap((r) => (r.pdf_page_url ? [r.pdf_page_url] : [])).sort()[0];
    top.push({ name: 'Other', value: otherValue, pdf_page_url: otherUrl });
  }
  return top.filter((s) => s.value !== 0);
}
