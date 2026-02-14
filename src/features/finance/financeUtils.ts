// src/utils/financeUtils.ts
import { CPI_ANNUAL_AVG } from '../../constants';

export const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return "$0";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const getRealValue = (amount: number, year: number, baseYear: number) => {
  const currentCPI = CPI_ANNUAL_AVG[year];
  const baseCPI = CPI_ANNUAL_AVG[baseYear];
  if (!currentCPI || !baseCPI) return amount;
  return (amount / currentCPI) * baseCPI;
};

/** Value if base-year amount had only grown at CPI rate since base year. */
export function getInflationOnlyValue(baseYearAmount: number, year: number, baseYear: number): number {
  const currentCPI = CPI_ANNUAL_AVG[year];
  const baseCPI = CPI_ANNUAL_AVG[baseYear];
  if (!currentCPI || !baseCPI) return baseYearAmount;
  return baseYearAmount * (currentCPI / baseCPI);
}

export const calculateTrendLine = (data: any[], key: string) => {
  const n = data.length;
  if (n < 2) return data;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  data.forEach((d, i) => {
    const val = Number(d[key] || 0);
    sumX += i;
    sumY += val;
    sumXY += i * val;
    sumXX += i * i;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return data.map((d, i) => ({ ...d, [`${key}Trend`]: slope * i + intercept }));
};

/** (current - baseline) / baseline * 100; null if baseline 0 or invalid */
export const pctChangeFromBaseline = (currentValue: number, baselineValue: number): number | null => {
  const base = Number(baselineValue);
  if (base === 0 || !Number.isFinite(base) || !Number.isFinite(Number(currentValue))) return null;
  return ((Number(currentValue) - base) / base) * 100;
};

/** Format pct for tooltip: "+12.3%" / "-5.2%"; isPositive for green/red */
export const formatPctChange = (pct: number | null): { text: string; isPositive: boolean } => {
  if (pct === null || !Number.isFinite(pct)) return { text: '—', isPositive: false };
  const isPositive = pct >= 0;
  const prefix = isPositive ? '+' : '';
  return { text: `${prefix}${pct.toFixed(1)}%`, isPositive };
};

/**
 * % change from earliest to latest in range. Handles zero-crossing so sign matches direction:
 * line up → positive %, line down → negative %. Uses symmetric (midpoint) formula when
 * earliest is 0 or when earliest and latest have opposite signs.
 * Uses |earliest| in the denominator so negative values (e.g. refund years) don't flip the result.
 */
export const pctChangeOverRange = (earliestValue: number, latestValue: number): number | null => {
  const earliest = Number(earliestValue);
  const latest = Number(latestValue);
  if (!Number.isFinite(earliest) || !Number.isFinite(latest)) return null;
  const sameSign = (earliest >= 0 && latest >= 0) || (earliest <= 0 && latest <= 0);
  if (earliest !== 0 && sameSign) {
    return ((latest - earliest) / Math.abs(earliest)) * 100;
  }
  const midpoint = (Math.abs(earliest) + Math.abs(latest)) / 2;
  if (midpoint === 0) return null;
  return ((latest - earliest) / midpoint) * 100;
};

/** Format "vs. inflation" for tooltip: "+67.6 pts (128.2% − 60.6%)"; isPositive = spending outpaced inflation. */
export const formatVsInflation = (
  pctNominal: number | null,
  pctInflation: number | null
): { text: string; isPositive: boolean } => {
  if (pctNominal == null || pctInflation == null || !Number.isFinite(pctNominal) || !Number.isFinite(pctInflation)) {
    return { text: '—', isPositive: false };
  }
  const vsPts = pctNominal - pctInflation;
  const isPositive = vsPts >= 0;
  const prefix = isPositive ? '+' : '';
  return {
    text: `${prefix}${vsPts.toFixed(1)} pts (${pctNominal.toFixed(1)}% − ${pctInflation.toFixed(1)}%)`,
    isPositive,
  };
};

/** Short "vs. inflation" for tooltip: "+67.6% more than inflation" / "-12.3% less than inflation". */
export const formatVsInflationShort = (
  pctNominal: number | null,
  pctInflation: number | null
): { text: string; isPositive: boolean } => {
  if (pctNominal == null || pctInflation == null || !Number.isFinite(pctNominal) || !Number.isFinite(pctInflation)) {
    return { text: '—', isPositive: false };
  }
  const vsPts = pctNominal - pctInflation;
  const isPositive = vsPts >= 0;
  const prefix = isPositive ? '+' : '';
  const direction = isPositive ? 'more' : 'less';
  return {
    text: `${prefix}${vsPts.toFixed(1)}% ${direction} than inflation`,
    isPositive,
  };
};

/** Single source of truth: recompute Trend and RealTrend on a slice (filtered data). */
export const recomputeTrendsForSlice = (data: any[], selectedParents: string[]): any[] => {
  if (data.length < 2) return data;
  let list = [...data];
  list = calculateTrendLine(list, 'totalNetWorth');
  list = calculateTrendLine(list, 'totalAssets');
  list = calculateTrendLine(list, 'totalLiabs');
  list = calculateTrendLine(list, 'totalNetWorthReal');
  list = calculateTrendLine(list, 'totalAssetsReal');
  list = calculateTrendLine(list, 'totalLiabsReal');
  selectedParents.forEach(sel => {
    const kb = sel.replace(/\s+/g, '');
    list = calculateTrendLine(list, `${kb}NetWorth`);
    list = calculateTrendLine(list, `${kb}Assets`);
    list = calculateTrendLine(list, `${kb}Liabs`);
    list = calculateTrendLine(list, `${kb}NetWorthReal`);
    list = calculateTrendLine(list, `${kb}AssetsReal`);
    list = calculateTrendLine(list, `${kb}LiabsReal`);
  });
  return list;
};

const REVENUE_METRIC_KEYS = ['totalRevenue', 'taxesFees', 'grants', 'chargesForServices', 'other'] as const;

/** Add inflation-adjusted (*Real) values to revenue year-metric rows. Base year for CPI. */
export function addRealToRevenueYearMetrics<T extends Record<string, unknown>>(rows: T[], baseYear: number): T[] {
  return rows.map((row) => {
    const year = Number((row as any).year);
    const out = { ...row } as any;
    for (const key of REVENUE_METRIC_KEYS) {
      const val = Number((row as any)[key]);
      if (Number.isFinite(val)) out[`${key}Real`] = getRealValue(val, year, baseYear);
    }
    return out as T;
  });
}

/** Recompute trend and real-trend for revenue metrics on a slice. Input rows must already have *Real. */
export function recomputeRevenueTrendsForSlice(data: any[]): any[] {
  if (data.length < 2) return data;
  let list = [...data];
  for (const key of REVENUE_METRIC_KEYS) {
    list = calculateTrendLine(list, key);
    list = calculateTrendLine(list, `${key}Real`);
  }
  return list;
}

/** Entity keys for revenue-by-entity chart (mirrors expense chart). */
const REVENUE_ENTITY_KEYS = [
  'totalPrimaryGovAndComponentUnits',
  'genGov',
  'schools',
  'emergCommDist',
  'mud',
] as const;

/** Add inflation-only (*Real) values to revenue-by-entity year points: what each value would be if it had only grown at CPI since base year. */
export function addRealToRevenueYearPoints<T extends { year: number; totalPrimaryGovAndComponentUnits: number }>(
  rows: T[],
  baseYear: number
): T[] {
  const baseRow = rows.find((r) => (r as any).year === baseYear) ?? rows[0];
  if (!baseRow) return rows;
  return rows.map((row) => {
    const year = Number((row as any).year);
    const out = { ...row } as any;
    for (const key of REVENUE_ENTITY_KEYS) {
      const baseVal = Number((baseRow as any)[key]);
      const rowVal = Number((row as any)[key]);
      if (Number.isFinite(baseVal) && Number.isFinite(rowVal))
        out[`${key}Real`] = getInflationOnlyValue(baseVal, year, baseYear);
    }
    return out as T;
  });
}

/** Recompute trend and *RealTrend for revenue-by-entity keys on a slice. Input must already have *Real. */
export function recomputeRevenueEntityTrendsForSlice(data: any[]): any[] {
  if (data.length < 2) return data;
  let list = [...data];
  for (const key of REVENUE_ENTITY_KEYS) {
    list = calculateTrendLine(list, key);
    list = calculateTrendLine(list, `${key}Real`);
  }
  return list;
}

const EXPENSE_METRIC_KEYS = [
  'totalExpenses',
  'totalPrimaryGovAndComponentUnits',
  'genGov',
  'schools',
  'emergCommDist',
  'mud',
] as const;

/** Add inflation-only (*Real) values to expense year points: what each value would be if it had only grown at CPI since base year. */
export function addRealToExpenseYearPoints<T extends { year: number; totalExpenses: number }>(rows: T[], baseYear: number): T[] {
  const baseRow = rows.find((r) => (r as any).year === baseYear) ?? rows[0];
  if (!baseRow) return rows;
  return rows.map((row) => {
    const year = Number((row as any).year);
    const out = { ...row } as any;
    const baseExpenses = Number((baseRow as any).totalExpenses);
    if (Number.isFinite(baseExpenses)) out.totalExpensesReal = getInflationOnlyValue(baseExpenses, year, baseYear);
    for (const key of EXPENSE_METRIC_KEYS) {
      if (key === 'totalExpenses') continue;
      const baseVal = Number((baseRow as any)[key]);
      if (Number.isFinite(baseVal)) out[`${key}Real`] = getInflationOnlyValue(baseVal, year, baseYear);
    }
    return out as T;
  });
}

const EXPENSE_ENTITY_KEYS = ['genGov', 'schools', 'emergCommDist', 'mud'] as const;

/** Recompute totalExpenses, totalPrimaryGovAndComponentUnits, and per-entity trend and *Real trend on a slice. */
export function recomputeExpenseTrendsForSlice(data: any[]): any[] {
  if (data.length < 2) return data;
  let list = [...data];
  list = calculateTrendLine(list, 'totalExpenses');
  list = calculateTrendLine(list, 'totalExpensesReal');
  list = calculateTrendLine(list, 'totalPrimaryGovAndComponentUnits');
  list = calculateTrendLine(list, 'totalPrimaryGovAndComponentUnitsReal');
  for (const key of EXPENSE_ENTITY_KEYS) {
    list = calculateTrendLine(list, key);
    list = calculateTrendLine(list, `${key}Real`);
  }
  return list;
}

/** Valid start years for "And Beyond" projection: start year must be <= latestYear - 5. */
export function getValidAndBeyondStartYears(chartData: { year: number }[]): { latestYear: number; validStartYears: number[] } {
  if (!chartData.length) return { latestYear: 0, validStartYears: [] };
  const years = chartData.map((d) => d.year);
  const latestYear = Math.max(...years);
  const chartMinYear = Math.min(...years);
  const maxStartYear = latestYear - 5;
  if (maxStartYear < chartMinYear) return { latestYear, validStartYears: [] };
  const validStartYears: number[] = [];
  for (let y = chartMinYear; y <= maxStartYear; y++) validStartYears.push(y);
  return { latestYear, validStartYears };
}

/**
 * Fit linear trend on data from startYear through latest year, then return slope (per calendar year),
 * last trend value, and synthetic points for future years. Used for "And Beyond" projection.
 * @param data - Array of { year, [valueKey], ... }; will be filtered to startYear <= year <= maxYear
 * @param valueKey - Key used to fit the trend (e.g. 'totalPrimaryGovAndComponentUnits')
 * @param startYear - First year to include in the fit
 * @param numYearsForward - Number of years to project beyond the latest year in data
 * @returns extendedPoints: array of { year, [valueKeyTrend]: value }; slopePerYear and lastValue for callers that need them
 */
export function extendTrendForward(
  data: any[],
  valueKey: string,
  startYear: number,
  numYearsForward: number
): { slopePerYear: number; lastValue: number; extendedPoints: any[] } {
  const trendKey = `${valueKey}Trend`;
  const slice = data.filter((d) => {
    const y = Number(d.year);
    return Number.isFinite(y) && y >= startYear;
  }).sort((a, b) => Number(a.year) - Number(b.year));
  const maxYear = slice.length ? Math.max(...slice.map((d) => Number(d.year))) : 0;
  const fromStart = slice.filter((d) => Number(d.year) <= maxYear);
  if (fromStart.length < 2 || numYearsForward < 1) {
    return { slopePerYear: 0, lastValue: 0, extendedPoints: [] };
  }
  const withTrend = calculateTrendLine(fromStart, valueKey);
  const firstVal = Number((withTrend[0] as any)[trendKey]);
  const lastVal = Number((withTrend[withTrend.length - 1] as any)[trendKey]);
  const n = withTrend.length;
  const slopePerYear = n > 1 ? (lastVal - firstVal) / (n - 1) : 0;
  const extendedPoints: any[] = [];
  for (let k = 1; k <= numYearsForward; k++) {
    const year = maxYear + k;
    extendedPoints.push({ year, [trendKey]: lastVal + k * slopePerYear });
  }
  return { slopePerYear, lastValue: lastVal, extendedPoints };
}