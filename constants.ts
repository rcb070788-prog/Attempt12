
import { DashboardConfig } from './types';

export const CATEGORIES = [
  { id: 'expenses', label: 'Expenses', icon: 'fa-money-bill-trend-up', color: 'bg-red-500' },
  { id: 'revenues', label: 'Revenues', icon: 'fa-hand-holding-dollar', color: 'bg-green-500' },
  { id: 'assets', label: 'Assets', icon: 'fa-building-columns', color: 'bg-blue-500' },
  { id: 'liabilities', label: 'Liabilities', icon: 'fa-file-invoice-dollar', color: 'bg-amber-500' },
];

/**
 * ELECTED OFFICIALS DIRECTORY
 */
export const OFFICIALS = [
  // Courthouse Officials
  { id: 'mayor', category: 'Courthouse', office: 'Mayor', name: 'Sloan Stewart', phone: '(931) 759-7076', email: 'sloan.stewart@example.gov' },
  { id: 'attorney', category: 'Courthouse', office: 'County Attorney', name: 'Bill Rieder', phone: '(931) 455-5478', email: '' },
  { id: 'clerk-master', category: 'Courthouse', office: 'Clerk & Master', name: 'Tammy Roberts', phone: '(931) 759-7028', email: '' },
  { id: 'judge', category: 'Courthouse', office: 'General Sessions Court Judge', name: 'Terry Gregory', phone: '(931) 455-5407', email: '' },
  { id: 'circuit-clerk', category: 'Courthouse', office: 'Circuit Court Clerk', name: 'Linda Wolaver', phone: '(931) 759-7208', email: '' },
  { id: 'deeds', category: 'Courthouse', office: 'Register of Deeds', name: 'Pam Wells', phone: '(931) 759-7913', email: '' },
  { id: 'clerk', category: 'Courthouse', office: 'County Clerk', name: 'Lacy Ivey', phone: '(931) 759-7346', email: 'lacy.ivey@example.gov' },
  { id: 'assessor', category: 'Courthouse', office: 'Property Assessor', name: 'Shaun Sherrill', phone: '(931) 759-7044', email: '' },
  { id: 'trustee', category: 'Courthouse', office: 'Trustee', name: 'Lynn Harrison', phone: '(931) 759-7912', email: '' },

  // Non-Courthouse Officials
  { id: 'highway', category: 'Non-Courthouse', office: 'Highway Department Superintendent', name: 'Shannon Cauble', phone: '(931) 759-7800', email: '' },
  { id: 'sheriff', category: 'Non-Courthouse', office: 'Sheriff', name: 'Tyler Hatfield', phone: '(931) 759-6464', email: '' },
  { id: 'schools', category: 'Non-Courthouse', office: 'Director of Schools', name: 'Chad Moorehead', phone: '(931) 759-7303', email: '' },
  { id: 'elections', category: 'Non-Courthouse', office: 'Administrator of Elections', name: 'Jim Sanders', phone: '(931) 759-4532', email: '' },

  // Council Members (District 1)
  { id: 'c-d1-1', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Amy Cashion', phone: '(931) 607-4526', email: '' },
  { id: 'c-d1-2', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Sunny Rae Moorehead', phone: '', email: '' },
  { id: 'c-d1-3', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Shane Taylor', phone: '(931) 224-5763', email: '' },

  // Council Members (District 2)
  { id: 'c-d2-1', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Robert Bracewell', phone: '(931) 434-0384', email: 'moorecotnd2@gmail.com' },
  { id: 'c-d2-2', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Douglas Carson II', phone: '(931) 307-9267', email: '' },
  { id: 'c-d2-3', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'John Taylor', phone: '(931) 928-1653', email: '' },

  // Council Members (District 3)
  { id: 'c-d3-1', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Marty Cashion', phone: '(931) 307-9355', email: '' },
  { id: 'c-d3-2', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Dexter Golden', phone: '(931) 703-6506', email: '' },
  { id: 'c-d3-3', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Houston Lindsey', phone: '(931) 632-3005', email: '' },

  // Council Members (District 4)
  { id: 'c-d4-1', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Peggy Sue Blackburn', phone: '(615) 504-8574', email: '' },
  { id: 'c-d4-2', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Arvis Bobo', phone: '(931) 581-1264', email: '' },
  { id: 'c-d4-3', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Bradley Dye', phone: '(931) 307-9201', email: '' },

  // Council Members (District 5)
  { id: 'c-d5-1', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Gerald Burnett', phone: '(931) 632-2081', email: '' },
  { id: 'c-d5-2', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Greg Guinn', phone: '(931) 224-7976', email: '' },
  { id: 'c-d5-3', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Jimmy Hammond', phone: '(931) 247-2138', email: '' },
];

export const DASHBOARDS: (DashboardConfig & { status?: string })[] = [
  {
    id: 'expenses-by-fund',
    category: 'expenses',
    title: 'Expenses by Fund',
    description: 'A detailed breakdown of County spending across various public funds.',
    folderPath: '/dashboards/expenses/expensesbyfund/index.html',
    status: 'Official'
  },
  {
    id: 'education-budget',
    category: 'expenses',
    title: 'School District Allocation',
    description: 'Transparency report on how local taxes are being used for school infrastructure.',
    folderPath: '/dashboards/expenses/education/index.html',
    status: 'Planned'
  },
  {
    id: 'property-tax-revenue',
    category: 'revenues',
    title: 'Property Tax Collection',
    description: 'Visualization of tax revenue trends.',
    folderPath: '/dashboards/revenues/property-tax/index.html',
    status: 'Planned'
  }
];

export const TN_VOTER_LOOKUP_URL = "https://tnmap.tn.gov/voterlookup/";
