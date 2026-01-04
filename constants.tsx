
import React from 'react';

// Define: "Relative Path" means a link that points to a folder starting from where you currently are,
// rather than typing out the full web address.
export const DASHBOARD_CONFIG = {
  expenses: {
    title: "Expenses",
    description: "This section details where taxpayer money is going. Interpreting this data involves looking at department-level spending vs. budgeted amounts.",
    items: [
      { name: "Expenses by Fund", path: "/dashboards/expenses/fund141/index.html" },
      { name: "2023 General Operations", path: "/dashboards/expenses/genops2023/index.html" }
    ]
  },
  revenues: {
    title: "Revenues",
    description: "This shows how money enters the county, including property taxes, sales taxes, and state grants.",
    items: [
      { name: "Primary Revenue Sources", path: "/dashboards/revenues/sources/index.html" }
    ]
  },
  assets: {
    title: "Assets",
    description: "Assets include county-owned property, equipment, and cash reserves.",
    items: [
      { name: "County Property Inventory", path: "/dashboards/assets/property/index.html" }
    ]
  },
  liabilities: {
    title: "Liabilities",
    description: "Liabilities are debts and long-term financial obligations the county owes.",
    items: [
      { name: "Debt Service Schedule", path: "/dashboards/liabilities/debt/index.html" }
    ]
  }
};

export type CategoryKey = keyof typeof DASHBOARD_CONFIG;
