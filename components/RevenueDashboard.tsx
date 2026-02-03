import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNormalizedLines } from '../src/lib/useNormalizedLines';
import {
  getRevenueYearMetrics,
  getRevenuePieForYear,
  getTaxBreakdownPieForYear,
  type YearMetric,
} from '../src/lib/revenueTransforms';
import { formatCurrency } from '../utils/financeUtils';

function openPdf(url: string | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function ClickableDot<T extends Record<string, unknown>>(props: {
  cx?: number;
  cy?: number;
  payload?: T;
  getUrl: (p: T) => string | undefined;
}) {
  const { cx = 0, cy = 0, payload, getUrl } = props;
  if (payload == null) return null;
  const url = getUrl(payload);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="currentColor"
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        openPdf(url);
      }}
    />
  );
}

const REVENUE_COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#64748b'];

export const RevenueDashboard: React.FC = () => {
  const { data: lines, loading, error } = useNormalizedLines();
  const [yearMin, setYearMin] = useState<number>(2005);
  const [yearMax, setYearMax] = useState<number>(2024);
  const [includeBusinessType, setIncludeBusinessType] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [entityNorms, setEntityNorms] = useState<string[]>(['governmental_activities']);

  const years = useMemo(() => {
    const y = [...new Set(lines.map((l) => l.year))].filter((yr) => yr >= 2000).sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [lines]);

  const effectiveYearMin = years[0] ?? 2005;
  const effectiveYearMax = years[years.length - 1] ?? 2024;

  React.useEffect(() => {
    if (years.length > 0 && (selectedYear < effectiveYearMin || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, effectiveYearMin, effectiveYearMax, selectedYear]);

  const yearMetrics = useMemo(
    () =>
      getRevenueYearMetrics(lines, yearMin, yearMax, includeBusinessType, entityNorms),
    [lines, yearMin, yearMax, includeBusinessType, entityNorms]
  );

  const revenuePie = useMemo(
    () =>
      getRevenuePieForYear(lines, selectedYear, includeBusinessType, entityNorms),
    [lines, selectedYear, includeBusinessType, entityNorms]
  );

  const taxBreakdownPie = useMemo(
    () =>
      getTaxBreakdownPieForYear(lines, selectedYear, includeBusinessType, entityNorms, 10),
    [lines, selectedYear, includeBusinessType, entityNorms]
  );

  const handleEntityToggle = (entity: string) => {
    setEntityNorms((prev) =>
      prev.includes(entity)
        ? prev.filter((e) => e !== entity)
        : [...prev, entity]
    );
  };

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
          Revenue charts
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
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-gray-500">Entities</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={entityNorms.includes('governmental_activities')}
                onChange={() => handleEntityToggle('governmental_activities')}
                className="rounded border-gray-300"
              />
              <span className="text-xs font-bold">Governmental</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={entityNorms.includes('business_type_activities')}
                onChange={() => handleEntityToggle('business_type_activities')}
                className="rounded border-gray-300"
              />
              <span className="text-xs font-bold">Business-type</span>
            </label>
          </div>
        </div>

        {/* A) Line chart */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={yearMetrics}
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
              <Legend />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                name="Total revenue"
                stroke={REVENUE_COLORS[0]}
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} getUrl={(d: YearMetric) => d.pdf_page_url_totalRevenue} />}
              />
              <Line
                type="monotone"
                dataKey="taxesFees"
                name="Taxes & fees"
                stroke={REVENUE_COLORS[1]}
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} getUrl={(d: YearMetric) => d.pdf_page_url_taxesFees} />}
              />
              <Line
                type="monotone"
                dataKey="grants"
                name="Grants"
                stroke={REVENUE_COLORS[2]}
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} getUrl={(d: YearMetric) => d.pdf_page_url_grants} />}
              />
              <Line
                type="monotone"
                dataKey="chargesForServices"
                name="Charges for services"
                stroke={REVENUE_COLORS[3]}
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} getUrl={(d: YearMetric) => d.pdf_page_url_chargesForServices} />}
              />
              <Line
                type="monotone"
                dataKey="other"
                name="Other"
                stroke={REVENUE_COLORS[4]}
                strokeWidth={2}
                dot={(p) => <ClickableDot {...p} getUrl={(d: YearMetric) => d.pdf_page_url_other} />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 uppercase">Click a point to open source PDF</p>

        {/* B) Revenue pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-black uppercase text-gray-600 mb-4">
              Revenue by type ({selectedYear})
            </h4>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenuePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    onClick={(entry) => openPdf(entry.pdf_page_url)}
                  >
                    {revenuePie.map((_, i) => (
                      <Cell key={i} fill={REVENUE_COLORS[i % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase text-gray-600 mb-4">
              Tax breakdown ({selectedYear})
            </h4>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taxBreakdownPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    onClick={(entry) => openPdf(entry.pdf_page_url)}
                  >
                    {taxBreakdownPie.map((_, i) => (
                      <Cell key={i} fill={REVENUE_COLORS[i % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 uppercase">Click a slice to open source PDF</p>
      </div>
    </div>
  );
};

export default RevenueDashboard;
