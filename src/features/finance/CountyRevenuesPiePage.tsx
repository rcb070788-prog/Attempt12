import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useExhibitBRevenueLines } from '../../lib/useExhibitBLines';
import {
  getRevenuePieForYear,
  getTaxBreakdownPieForYear,
} from '../../lib/revenueTransforms';
import { formatCurrency } from './financeUtils';

function openPdf(url: string | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

const REVENUE_PIE_COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#64748b'];

type ChartType = 'revenue' | 'tax';

interface CountyRevenuesPiePageProps {
  onBack: () => void;
  /** Pre-selected year when opened from County Revenues. */
  initialYear?: number;
}

export const CountyRevenuesPiePage: React.FC<CountyRevenuesPiePageProps> = ({
  onBack,
  initialYear,
}) => {
  const { data: lines, loading, error } = useExhibitBRevenueLines();
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [includeBusinessType, setIncludeBusinessType] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(() => initialYear ?? 2024);

  const years = useMemo(() => {
    const y = [...new Set(lines.map((l) => l.year))].filter((yr) => yr >= 2000).sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [lines]);

  const effectiveYearMin = years[0] ?? 2005;
  const effectiveYearMax = years.length ? years[years.length - 1]! : 2024;

  useEffect(() => {
    if (years.length > 0 && (selectedYear < effectiveYearMin || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, selectedYear, effectiveYearMin, effectiveYearMax]);

  const revenuePie = useMemo(
    () =>
      getRevenuePieForYear(lines, selectedYear, includeBusinessType, undefined, null, null),
    [lines, selectedYear, includeBusinessType]
  );

  const taxBreakdownPie = useMemo(
    () => getTaxBreakdownPieForYear(lines, selectedYear, includeBusinessType, undefined, 10),
    [lines, selectedYear, includeBusinessType]
  );

  const pieData = chartType === 'revenue' ? revenuePie : taxBreakdownPie;

  const advanceYear = useCallback(
    (dir: 1 | -1) => {
      setSelectedYear((prev) => {
        const idx = years.indexOf(prev);
        if (idx === -1) return prev;
        const nextIdx = Math.max(0, Math.min(years.length - 1, idx + dir));
        return years[nextIdx]!;
      });
    },
    [years]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) advanceYear(1);
      else if (e.deltaY > 0) advanceYear(-1);
    },
    [advanceYear]
  );

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button
          onClick={onBack}
          className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Revenues
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
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Revenues
        </button>
        <p className="text-red-600 font-bold uppercase text-sm">Unable to load exhibit data.</p>
        <p className="text-gray-500 text-xs mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors"
      >
        <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Revenues
      </button>
      <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 space-y-6">
        <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">
          Revenue breakdown
        </h3>
        <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">
          {chartType === 'revenue'
            ? 'Revenue by type for the selected year'
            : 'Tax breakdown for the selected year'}
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChartType('revenue')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                chartType === 'revenue'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Revenue by type
            </button>
            <button
              type="button"
              onClick={() => setChartType('tax')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                chartType === 'tax'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tax breakdown
            </button>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
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
              Include Water & Sewer
            </span>
          </label>
        </div>

        <div
          className="mt-10 rounded-[2rem] border border-gray-100 p-4"
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        >
          <h4 className="text-sm font-black uppercase text-gray-600 mb-4">
            {chartType === 'revenue' ? 'Revenue by type' : 'Tax breakdown'} ({selectedYear})
          </h4>
          <div className="h-[500px] w-full max-w-xl">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ left: 120, right: 24, top: 24, bottom: 24 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="58%"
                  cy="50%"
                  outerRadius={170}
                  isAnimationActive={false}
                  onClick={(entry) => openPdf(entry.pdf_page_url)}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={REVENUE_PIE_COLORS[i % REVENUE_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 uppercase mt-2">
            Scroll over chart to change year
          </p>
        </div>
        <p className="text-[10px] text-gray-400 uppercase">Click a slice to open source PDF</p>
      </div>
    </div>
  );
};

export default CountyRevenuesPiePage;
