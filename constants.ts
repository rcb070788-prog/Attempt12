
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
  2025: 321.943
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

/**
 * ELECTED OFFICIALS DIRECTORY
 */
export const OFFICIALS = [
  // Courthouse Officials
  { id: 'mayor', category: 'Courthouse', office: 'Mayor', name: 'Sloan Stewart', phone: '(931) 759-7076', email: 'sstewart@metromoorecounty.org' },
  { id: 'attorney', category: 'Courthouse', office: 'County Attorney', name: 'Bill Rieder', phone: '(931) 455-5478', email: '' },
  { id: 'clerk-master', category: 'Courthouse', office: 'Clerk & Master', name: 'Tammy Roberts', phone: '(931) 759-7028', email: 'Tammy.Roberts@tncourts.gov' },
  { id: 'judge', category: 'Courthouse', office: 'General Sessions Court Judge', name: 'Terry Gregory', phone: '(931) 455-5407', email: '' },
  { id: 'circuit-clerk', category: 'Courthouse', office: 'Circuit Court Clerk', name: 'Linda Wolaver', phone: '(931) 759-7208', email: '' },
  { id: 'deeds', category: 'Courthouse', office: 'Register of Deeds', name: 'Pam Wells', phone: '(931) 759-7913', email: 'mooretn@titlesearcher.com' },
  { id: 'clerk', category: 'Courthouse', office: 'County Clerk', name: 'Lacy Ivey', phone: '(931) 759-7346', email: 'Lacy.ivey@tn.gov' },
  { id: 'assessor', category: 'Courthouse', office: 'Property Assessor', name: 'Shaun Sherrill', phone: '(931) 759-7044', email: 'shaun.sherrill@cot.tn.gov' },
  { id: 'trustee', category: 'Courthouse', office: 'Trustee', name: 'Lynn Harrison', phone: '(931) 759-7912', email: 'trustee@metromoorecounty.org' },

  // Non-Courthouse Officials
  { id: 'highway', category: 'Non-Courthouse', office: 'Highway Department Superintendent', name: 'Shannon Cauble', phone: '(931) 759-7800', email: 'mchd@metromoorecounty.org' },
  { id: 'sheriff', category: 'Non-Courthouse', office: 'Sheriff', name: 'Tyler Hatfield', phone: '(931) 759-6464', email: 'THATFIELD@METROMOORECOUNTY.ORG' },
  { id: 'schools', category: 'Non-Courthouse', office: 'Director of Schools', name: 'Chad Moorehead', phone: '(931) 759-7303', email: 'mcdos@moorecountyschools.net' },
  { id: 'elections', category: 'Non-Courthouse', office: 'Administrator of Elections', name: 'Jim Sanders', phone: '(931) 759-4532', email: '' },

  // Council Members (District 1)
  { id: 'c-d1-1', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Amy Cashion', phone: '(931) 607-4526', email: 'cashion_5412@bellsouth.net' },
  { id: 'c-d1-2', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Sunny Rae Moorehead', phone: '', email: 'sunnyraemcd1@gmail.com' },
  { id: 'c-d1-3', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Shane Taylor', phone: '(931) 224-5763', email: 'shanetaylor@metromoorecounty.org' },

  // Council Members (District 2)
  { id: 'c-d2-1', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Robert Bracewell', phone: '(931) 434-0384', email: 'moorecotnd2@gmail.com' },
  { id: 'c-d2-2', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Douglas Carson II', phone: '(931) 307-9267', email: 'douglas.carson.312@gmail.com' },
  { id: 'c-d2-3', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'John Taylor', phone: '(931) 928-1653', email: 'jet.district2council@gmail.com' },

  // Council Members (District 3)
  { id: 'c-d3-1', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Marty Cashion', phone: '(931) 307-9355', email: 'mmcashiondistrict2@gmail.com' },
  { id: 'c-d3-2', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Dexter Golden', phone: '(931) 703-6506', email: 'Dexter_golden@outlook.com' },
  { id: 'c-d3-3', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Houston Lindsey', phone: '(931) 632-3005', email: 'hdl.district3council@gmail.com' },

  // Council Members (District 4)
  { id: 'c-d4-1', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Peggy Sue Blackburn', phone: '(615) 504-8574', email: 'tryax1962@gmail.com' },
  { id: 'c-d4-2', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Arvis Bobo', phone: '(931) 581-1264', email: 'bosacre@gmail.com' },
  { id: 'c-d4-3', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Bradley Dye', phone: '(931) 307-9201', email: 'bradleydye@hotmail.com' },

  // Council Members (District 5)
  { id: 'c-d5-1', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Gerald Burnett', phone: '(931) 632-2081', email: 'burnett.mcdistrict5@gmail.com' },
  { id: 'c-d5-2', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Greg Guinn', phone: '(931) 224-7976', email: 'gregguinn72@gmail.com' },
  { id: 'c-d5-3', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Jimmy Hammond', phone: '(931) 247-2138', email: 'jimhammond02@gmail.com' },

  // School Board Members
  { id: 'sb-d1', category: 'School Board', district: '1', office: 'School Board Member District 1', name: 'Ed Cashion', phone: '', email: 'ed.cashion@moorecountyschools.net' },
  { id: 'sb-d2', category: 'School Board', district: '2', office: 'School Board Member District 2', name: 'Carrie Barnett', phone: '', email: 'carrie.barnett@moorecountyschools.net' },
  { id: 'sb-d3', category: 'School Board', district: '3', office: 'School Board Member District 3', name: 'Jammie Cashion', phone: '', email: 'jammie.cashion@moorecountyschools.net' },
  { id: 'sb-d4', category: 'School Board', district: '4', office: 'School Board Member District 4', name: 'Kaleigh Hatfield', phone: '', email: 'kaleigh.hatfield@moorecountyschools.net' },
  { id: 'sb-d5', category: 'School Board', district: '5', office: 'School Board Member District 5', name: 'Tanya Vann', phone: '', email: 'tanya.vann@moorecountyschools.net' },
];

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

export const TN_VOTER_LOOKUP_URL = "https://tnmap.tn.gov/voterlookup/";
