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