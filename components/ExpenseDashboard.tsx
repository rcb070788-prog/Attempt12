import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNormalizedLines } from '../src/lib/useNormalizedLines';
import {
  getExpenseTrendByYear,
  getExpensePieForYear,
} from '../src/lib/expenseTransforms';
import { formatCurrency } from '../utils/financeUtils';

function openPdf(url: string | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function ClickableDot(props: {
  cx?: number;
  cy?: number;
  payload?: { pdf_page_url?: string };
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (payload == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="currentColor"
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        openPdf(payload.pdf_page_url);
      }}
    />
  );
}

const EXPENSE_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#64748b'];

export const ExpenseDashboard: React.FC = () => {
  const { data: lines, loading, error } = useNormalizedLines();
  const [yearMin, setYearMin] = useState<number>(2005);
  const [yearMax, setYearMax] = useState<number>(2024);
  const [includeBusinessType, setIncludeBusinessType] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  const years = useMemo(() => {
    const y = [...new Set(lines.map((l) => l.year))].filter((yr) => yr >= 2000).sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [lines]);

  const effectiveYearMax = years.length ? years[years.length - 1] : 2024;
  React.useEffect(() => {
    if (years.length > 0 && (selectedYear < years[0]! || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, selectedYear, effectiveYearMax]);

  const trendData = useMemo(
    () =>
      getExpenseTrendByYear(lines, yearMin, yearMax, includeBusinessType),
    [lines, yearMin, yearMax, includeBusinessType]
  );

  const expensePie = useMemo(
    () =>
      getExpensePieForYear(lines, selectedYear, includeBusinessType, undefined, 8),
    [lines, selectedYear, includeBusinessType]
  );

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <p className="text-gray-500 font-bold uppercase text-sm">Loading exhibit data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <p className="text-red-600 font-bold uppercase text-sm">Unable to load exhibit data.</p>
        <p className="text-gray-500 text-xs mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">
          Expense charts
        </h3>

        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500">Year from</span>
            <select
              value={yearMin}
              onChange={(e) => setYearMin(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500">Year to</span>
            <select
              value={yearMax}
              onChange={(e) => setYearMax(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500">Pie year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            >
              {years.filter((y) => y >= yearMin && y <= yearMax).map((y) => (
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

        {/* A) Total expenses by year */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Year ${label}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="totalExpenses"
                name="Total expenses"
                stroke="#dc2626"
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 uppercase">Click a point to open source PDF</p>

        {/* B) Expense pie by function */}
        <div>
          <h4 className="text-sm font-black uppercase text-gray-600 mb-4">
            Expenses by function ({selectedYear}) — top 8 + Other
          </h4>
          <div className="h-[320px] w-full max-w-lg">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  onClick={(entry) => openPdf(entry.pdf_page_url)}
                >
                  {expensePie.map((_, i) => (
                    <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 uppercase">Click a slice to open source PDF</p>
      </div>
    </div>
  );
};

export default ExpenseDashboard;
