// src/utils/financeUtils.ts
import { CPI_ANNUAL_AVG } from '../constants';

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