
import { DashboardConfig } from './types';

export const CPI_ANNUAL_AVG: Record<number, number> = {
  2005: 195.3,
  2006: 201.6,
  2007: 207.3,
  2008: 215.303,
  2009: 214.537,
  2010: 218.056,
  2011: 224.939,
  2012: 229.594,
  2013: 232.957,
  2014: 236.736,
  2015: 237.017,
  2016: 240.007,
  2017: 245.120,
  2018: 251.107,
  2019: 255.657,
  2020: 258.811,
  2021: 270.970,
  2022: 292.655,
  2023: 304.702,
  2024: 313.689,
  2025: 321.943,
  // Partial-year estimate: mean of available monthly CPI-U (CUUR0000SA0)
  2026: 330.079
};

export const CATEGORIES = [
  { id: 'expenses', label: 'Expenses', icon: 'fa-money-bill-trend-up', color: 'bg-red-500' },
  { id: 'revenues', label: 'Revenues', icon: 'fa-hand-holding-dollar', color: 'bg-green-500' },
  { id: 'assets', label: 'Assets', icon: 'fa-building-columns', color: 'bg-blue-500' },
  { id: 'solvency', label: 'County Net Worth', icon: 'fa-chart-line', color: 'bg-blue-500' },
  { id: 'documents', label: 'Documents', icon: 'fa-book-open', color: 'bg-yellow-500' },
];

/**
 * Document sections (folder structure) for the Documents dashboard.
 * IDs are used in documentsStack and for future Supabase section_id.
 * When bucketName is set, the Documents view lists that Supabase Storage bucket (folders discovered at runtime).
 * bucketPathPrefix: optional root path inside the bucket (e.g. "expense_reports_by_fund/") so object keys match existing labeling.
 */
export const DOCUMENT_SECTIONS: { id: string; title: string; bucketName?: string; bucketPathPrefix?: string; children?: { id: string; title: string; folderPath?: string }[] }[] = [
  // Bucket expense_reports_by_fund with folders like Fund 101, Fund 116, etc. (no path prefix).
  { id: 'expense-reports-by-fund', title: 'Expense Reports by Fund', bucketName: 'expense_reports_by_fund' },
  {
    id: 'wage-reports',
    title: 'Wage Reports',
    bucketName: 'wage_reports',
    children: [
      { id: 'county-wages', title: 'County Wages', folderPath: 'County Wages' },
      { id: 'school-wages', title: 'School Wages', folderPath: 'School Wages' },
    ],
  },
  {
    id: 'annual-financial-reports',
    title: 'Annual Financial Reports',
    bucketName: 'AFR_reports',
    bucketPathPrefix: 'originals/',
  },
  { id: 'tax-rolls-by-assessment', title: 'Tax Rolls by Assessment', bucketName: 'tax_rolls_by_assessment' },
];

// Re-export from config for backward compatibility
export { OFFICIALS, TN_VOTER_LOOKUP_URL } from './config';

export const DASHBOARDS: (DashboardConfig & { status?: string })[] = [
  {
    id: 'expenses-by-fund',
    category: 'expenses',
    title: 'Expenses by Fund',
    description: 'A detailed breakdown of County spending across various public funds.',
    folderPath: '/dashboards/expenses/expensesbyfund/index.html',
    status: 'Official'
  }
];

export interface InternalReportConfig {
  id: string;
  category: 'expenses' | 'revenues';
  title: string;
  description: string;
}

export const INTERNAL_REPORTS: InternalReportConfig[] = [
  {
    id: 'county-expenditures',
    category: 'expenses',
    title: 'County Expenditures',
    description: 'Charts and breakdown of county spending from Exhibit B.',
  },
  {
    id: 'county-revenues',
    category: 'revenues',
    title: 'County Revenues',
    description: 'Charts and breakdown of county revenues from Exhibit B.',
  },
];
