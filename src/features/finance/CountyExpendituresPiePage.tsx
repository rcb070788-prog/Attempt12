import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useExhibitBExpenseLines, useExhibitBExpenseTotals } from '../../lib/useExhibitBLines';
import {
  getExpensePieByEntityForYear,
  COUNTY_EXPENSE_ENTITY_NORMS,
} from '../../lib/expenseTransforms';
import { formatCurrency } from './financeUtils';

function openPdf(url: string | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

const ENTITY_PIE_COLORS = ['#2563eb', '#dc2626', '#ca8a04', '#0d9488'];

interface CountyExpendituresPiePageProps {
  onBack: () => void;
  /** Pre-selected year when opened from County Expenditures. */
  initialYear?: number;
}

export const CountyExpendituresPiePage: React.FC<CountyExpendituresPiePageProps> = ({
  onBack,
  initialYear,
}) => {
  const { data: lines, loading, error } = useExhibitBExpenseLines();
  const { data: totalsRows } = useExhibitBExpenseTotals();
  const [includeBusinessType, setIncludeBusinessType] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(() => initialYear ?? 2024);

  const years = useMemo(() => {
    const y = [...new Set(lines.map((l) => l.year))].sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [lines]);

  const effectiveYearMin = years[0] ?? 2005;
  const effectiveYearMax = years.length ? years[years.length - 1]! : 2024;

  useEffect(() => {
    if (years.length > 0 && (selectedYear < effectiveYearMin || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, selectedYear, effectiveYearMin, effectiveYearMax]);

  const entityNorms = useMemo(
    () => [...COUNTY_EXPENSE_ENTITY_NORMS, ...(includeBusinessType ? ['business_type_activities'] : [])],
    [includeBusinessType]
  );

  const pieData = useMemo(
    () => getExpensePieByEntityForYear(lines, selectedYear, includeBusinessType, entityNorms, totalsRows),
    [lines, selectedYear, includeBusinessType, entityNorms, totalsRows]
  );

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button
          onClick={onBack}
          className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Expenditures
        </button>
        <p className="text-gray-500 font-bold uppercase text-sm">Loading exhibit data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button
          onClick={onBack}
          className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Expenditures
        </button>
        <p className="text-red-600 font-bold uppercase text-sm">Unable to load exhibit data.</p>
        <p className="text-gray-500 text-xs mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="shrink-0 space-y-4">
        <button
          onClick={onBack}
          className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors md:hidden"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Expenditures
        </button>
        <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100">
          <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">
            Expense breakdown by entity
          </h3>
          <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">
            Expenses by entity for the selected year
          </p>

          <div className="flex flex-wrap gap-4 items-center mt-4">
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-500">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBusinessType}
                onChange={(e) => setIncludeBusinessType(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-bold uppercase text-gray-700">
                Include Water & Sewer (Enterprise Fund)
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-2">
        <div className="flex-1 min-h-[320px] w-full max-w-2xl rounded-[2rem] border border-gray-100 bg-white p-4 flex flex-col">
          <h4 className="text-sm font-black uppercase text-gray-600 mb-4 shrink-0">
            Expenses by entity ({selectedYear})
          </h4>
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ left: 100, right: 100, top: 24, bottom: 24 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  onClick={(entry) => openPdf(entry.pdf_page_url)}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={ENTITY_PIE_COLORS[i % ENTITY_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend
                  formatter={(value, entry: { payload?: { value?: number } }) => (
                    <span style={{ fontWeight: 'bold', fontSize: '16pt' }}>
                      {value}: {formatCurrency(entry?.payload?.value ?? 0)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 uppercase mt-2 shrink-0">Click a slice to open source PDF</p>
        </div>
      </div>
    </div>
  );
};

export default CountyExpendituresPiePage;
