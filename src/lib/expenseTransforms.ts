import type { NormalizedLine } from './types';

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

export interface ExpenseYearPoint {
  year: number;
  totalExpenses: number;
  pdf_page_url?: string;
}

export interface ExpensePieSlice {
  name: string;
  value: number;
  pdf_page_url?: string;
}

export function getExpenseTrendByYear(
  lines: NormalizedLine[],
  yearMin: number,
  yearMax: number,
  includeBusinessType: boolean,
  entityNorms?: string[]
): ExpenseYearPoint[] {
  const filtered = filterByEntity(lines, includeBusinessType, entityNorms);
  const expenseLines = filtered.filter(
    (l) => l.category_norm === 'expenses' && l.year >= yearMin && l.year <= yearMax
  );

  const byYear = new Map<number, { total: number; urls: string[] }>();
  for (const line of expenseLines) {
    const cur = byYear.get(line.year) ?? { total: 0, urls: [] };
    cur.total += line.amount;
    cur.urls.push(line.pdf_page_url);
    byYear.set(line.year, cur);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, { total, urls }]) => ({
      year,
      totalExpenses: total,
      pdf_page_url: urls.length ? urls.reduce((min, u) => (u < min ? u : min), urls[0]) : undefined,
    }));
}

export function getExpensePieForYear(
  lines: NormalizedLine[],
  selectedYear: number,
  includeBusinessType: boolean,
  entityNorms?: string[],
  topN = 8
): ExpensePieSlice[] {
  const filtered = filterByEntity(lines, includeBusinessType, entityNorms);
  const forYear = filtered.filter(
    (l) => l.category_norm === 'expenses' && l.year === selectedYear
  );

  const byLabel = new Map<string, { amount: number; urls: string[] }>();
  for (const line of forYear) {
    const label = line.label || 'Unlabeled';
    const cur = byLabel.get(label) ?? { amount: 0, urls: [] };
    cur.amount += line.amount;
    cur.urls.push(line.pdf_page_url);
    byLabel.set(label, cur);
  }

  const sorted = [...byLabel.entries()]
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
