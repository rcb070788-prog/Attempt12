import type { NormalizedLine, NormalizedTotalRow } from '../types';

/** County expense entities: governmental + School Dept + ECD. Match exhibit_b_lines.entity_norm. In the DB, ECD rows use entity_norm='component_unit'; total_primary_government/component_unit total rows use row_kind='total' and are excluded by row_kind filter. */
export const COUNTY_EXPENSE_ENTITY_NORMS = [
  'governmental_activities',
  'school_department',
  'component_unit', // Emergency Communications District line items in the CSV/DB
] as const;

/** Display names for entity_norm (pie labels, etc.). */
export const ENTITY_NORM_DISPLAY_NAMES: Record<string, string> = {
  governmental_activities: 'Governmental activities',
  business_type_activities: 'Water & Sewer (Enterprise Fund)',
  school_department: 'Metropolitan School Department',
  component_unit: 'Emergency Communications District',
};

/** metropolitan_school_department and school_department are the same entity (labeled differently by year in source PDFs). */
/** ECD in CSV/DB uses entity emergency_communications_district; map to component_unit for display. */
function getExpenseEntityForGrouping(line: NormalizedLine): string {
  if (
    line.entity_norm === 'metropolitan_school_department' ||
    line.label_norm === 'metropolitan_school_department'
  ) {
    return 'school_department';
  }
  if (line.entity_norm === 'emergency_communications_district') {
    return 'component_unit';
  }
  return line.entity_norm;
}

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
  if (!includeBusinessType && !entityNorms) {
    allowed = allowed.filter((e) => e !== 'business_type_activities');
    if (allowed.length === 0) allowed = ['governmental_activities'];
  }
  return lines.filter((l) => l.row_kind === 'line_item' && allowed.includes(getExpenseEntityForGrouping(l)));
}

export interface ExpenseYearPoint {
  year: number;
  totalExpenses: number;
  pdf_page_url?: string;
  /** Total Governmental Activities */
  genGov?: number;
  /** Metropolitan School Department */
  schools?: number;
  /** Emergency Communications District */
  emergCommDist?: number;
  /** Total Business-type Activities (MUD) */
  mud?: number;
  /** Total Primary Government + Component Units (comp if present, else schools for 2016–2024) */
  totalPrimaryGovAndComponentUnits?: number;
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

const GOVERNMENTAL_LABEL = 'total_governmental_activities';
const BUSINESS_TYPE_LABEL = 'total_business_type_activities';
const COMPONENT_LABELS = ['total_component_unit', 'total_component_units'];

function isGovernmentalTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm === GOVERNMENTAL_LABEL;
}
function isBusinessTypeTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm === BUSINESS_TYPE_LABEL;
}
function isComponentTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm != null && COMPONENT_LABELS.includes(r.label_norm);
}
function isPrimaryGovernmentTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm === 'total_primary_government';
}
function isSchoolDepartmentTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm === 'metropolitan_school_department';
}
function isEmergencyCommunicationsTotal(r: NormalizedTotalRow): boolean {
  return r.label_norm === 'emergency_communications_district';
}

/** Entity norm for pie grouping from a totals row (MSD → school_department, ECD → component_unit). */
function getExpenseEntityForTotalsRow(r: NormalizedTotalRow): string | null {
  if (r.entity_norm === 'school_department' || isSchoolDepartmentTotal(r)) return 'school_department';
  if (r.entity_norm === 'emergency_communications_district' || isEmergencyCommunicationsTotal(r)) return 'component_unit';
  return null;
}

/**
 * Build expense trend by year from stored total/subtotal rows (label_norm).
 * Returns per-entity series (genGov, schools, emergCommDist, mud) and totalPrimaryGovAndComponentUnits.
 * For 2016–2024 when no Total Component Units row exists, component total = Metropolitan School Department.
 */
export function getExpenseTrendByYearFromTotals(
  totalsRows: NormalizedTotalRow[],
  yearMin: number,
  yearMax: number,
  _includeBusinessType: boolean
): ExpenseYearPoint[] {
  const inRange = totalsRows.filter((r) => r.year >= yearMin && r.year <= yearMax);
  const byYear = new Map<
    number,
    { gov: number; biz: number; comp: number; primaryGov: number; schoolDept: number; ecd: number; urls: string[] }
  >();

  for (const r of inRange) {
    const cur = byYear.get(r.year) ?? {
      gov: 0,
      biz: 0,
      comp: 0,
      primaryGov: 0,
      schoolDept: 0,
      ecd: 0,
      urls: [],
    };
    if (isGovernmentalTotal(r)) cur.gov += r.amount;
    else if (isBusinessTypeTotal(r)) cur.biz += r.amount;
    else if (isComponentTotal(r)) cur.comp += r.amount;
    else if (isPrimaryGovernmentTotal(r)) cur.primaryGov += r.amount;
    else if (isSchoolDepartmentTotal(r)) cur.schoolDept += r.amount;
    else if (isEmergencyCommunicationsTotal(r)) cur.ecd += r.amount;
    if (r.pdf_page_url) cur.urls.push(r.pdf_page_url);
    byYear.set(r.year, cur);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, { gov, biz, comp, primaryGov, schoolDept, ecd, urls }]) => {
      // Total Primary Government and Component Units: use comp when present, else schoolDept (2016–2024)
      const componentTotal = comp > 0 ? comp : schoolDept;
      const totalPrimaryGovAndComponentUnits = primaryGov + componentTotal;
      return {
        year,
        totalExpenses: totalPrimaryGovAndComponentUnits,
        // 2020 only reported Total Primary Government; use it for Gen Gov so the toggle shows the same value.
        genGov: year === 2020 ? primaryGov : gov,
        schools: schoolDept,
        // Only include ECD for years when the entity reported (no row => 0 => omit).
        emergCommDist: ecd > 0 ? ecd : undefined,
        // MUD did not report for 2020; omit so chart shows gap and gray bridge instead.
        mud: year === 2020 ? undefined : biz,
        totalPrimaryGovAndComponentUnits,
        pdf_page_url: urls.length ? urls.reduce((min, u) => (u < min ? u : min), urls[0]) : undefined,
      };
    });
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

/** Pie slices by entity (Governmental, MSD, ECD, optional Water & Sewer) for a given year. */
/** Pass totalsRows to include subtotal-only entities (MSD, ECD) which have no line_item rows in the CSV. */
export function getExpensePieByEntityForYear(
  lines: NormalizedLine[],
  selectedYear: number,
  includeBusinessType: boolean,
  entityNorms?: string[],
  totalsRows?: NormalizedTotalRow[]
): ExpensePieSlice[] {
  const base = entityNorms ?? [...COUNTY_EXPENSE_ENTITY_NORMS];
  let allowed = base.includes('business_type_activities')
    ? base
    : includeBusinessType
      ? [...base, 'business_type_activities']
      : base;
  const filtered = lines.filter(
    (l) =>
      l.row_kind === 'line_item' &&
      l.category_norm === 'expenses' &&
      l.year === selectedYear &&
      allowed.includes(getExpenseEntityForGrouping(l))
  );

  const byEntity = new Map<string, { amount: number; urls: string[] }>();
  for (const line of filtered) {
    const key = getExpenseEntityForGrouping(line);
    const cur = byEntity.get(key) ?? { amount: 0, urls: [] };
    cur.amount += line.amount;
    if (line.pdf_page_url) cur.urls.push(line.pdf_page_url);
    byEntity.set(key, cur);
  }

  if (totalsRows && (allowed.includes('school_department') || allowed.includes('component_unit'))) {
    const totalsForYear = totalsRows.filter((r) => r.year === selectedYear);
    for (const r of totalsForYear) {
      const key = getExpenseEntityForTotalsRow(r);
      if (key != null && allowed.includes(key)) {
        const cur = byEntity.get(key) ?? { amount: 0, urls: [] };
        cur.amount += r.amount;
        if (r.pdf_page_url) cur.urls.push(r.pdf_page_url);
        byEntity.set(key, cur);
      }
    }
  }

  const order = [...allowed].filter((e) => byEntity.has(e));
  return order
    .map((entityNorm) => {
      const cur = byEntity.get(entityNorm)!;
      const name = ENTITY_NORM_DISPLAY_NAMES[entityNorm] ?? entityNorm;
      const pdf_page_url = cur.urls.length ? cur.urls.reduce((min, u) => (u < min ? u : min), cur.urls[0]) : undefined;
      return { name, value: cur.amount, pdf_page_url };
    })
    .filter((s) => s.value !== 0);
}
