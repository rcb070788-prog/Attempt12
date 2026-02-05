import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExhibitBLines, useExhibitBExpenseTotals } from '../src/lib/useExhibitBLines';
import {
  getExpenseTrendByYearFromTotals,
  COUNTY_EXPENSE_ENTITY_NORMS,
} from '../src/lib/expenseTransforms';
import {
  formatCurrency,
  pctChangeOverRange,
  formatPctChange,
  addRealToExpenseYearPoints,
  recomputeExpenseTrendsForSlice,
} from '../utils/financeUtils';

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

interface CountyExpendituresProps {
  onBack: () => void;
  /** Opens the expense-by-entity pie page; optional initial year for the pie. */
  onOpenPiePage?: (initialYear?: number) => void;
}

export const CountyExpenditures: React.FC<CountyExpendituresProps> = ({ onBack, onOpenPiePage }) => {
  const { data: lines, loading, error } = useExhibitBLines();
  const { data: expenseTotals, loading: totalsLoading, error: totalsError } = useExhibitBExpenseTotals();
  const [includeBusinessType, setIncludeBusinessType] = useState(false);
  const [breakdownYear, setBreakdownYear] = useState<number>(2024);

  const entityNorms = useMemo(
    () => [...COUNTY_EXPENSE_ENTITY_NORMS, ...(includeBusinessType ? ['business_type_activities'] : [])],
    [includeBusinessType]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);
  const [pendingYearRange, setPendingYearRange] = useState<[number, number] | null>(null);
  const edgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const ignoreNextOverlayClick = useRef(false);
  const [dragBand, setDragBand] = useState<{ startX: number; endX: number } | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(56);
  const [tabTop, setTabTop] = useState(50);

  const chartYears = useMemo(() => {
    const y = [...new Set(expenseTotals.map((r) => r.year))].sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [expenseTotals]);
  const chartYearMin = chartYears[0] ?? 2005;
  const chartYearMax = chartYears[chartYears.length - 1] ?? 2024;

  React.useEffect(() => {
    if (chartYears.length > 0 && (breakdownYear < chartYearMin || breakdownYear > chartYearMax)) {
      setBreakdownYear(chartYearMax);
    }
  }, [chartYears.length, breakdownYear, chartYearMin, chartYearMax]);

  const trendData = useMemo(
    () => getExpenseTrendByYearFromTotals(expenseTotals, chartYearMin, chartYearMax, includeBusinessType),
    [expenseTotals, chartYearMin, chartYearMax, includeBusinessType]
  );

  const baseYear = trendData.length ? trendData[trendData.length - 1].year : 2024;
  const trendWithReal = useMemo(
    () => addRealToExpenseYearPoints(trendData, baseYear),
    [trendData, baseYear]
  );

  const displayedData = useMemo(() => {
    if (!trendWithReal.length) return [];
    if (!selectedYearRange) {
      return recomputeExpenseTrendsForSlice(trendWithReal);
    }
    const [minY, maxY] = selectedYearRange;
    const filtered = trendWithReal.filter((d) => d.year >= minY && d.year <= maxY);
    if (filtered.length < 2) return trendWithReal;
    return recomputeExpenseTrendsForSlice(filtered);
  }, [trendWithReal, selectedYearRange]);

  const baselineRow = displayedData.length ? displayedData[0] : null;
  const latestRow = displayedData.length ? displayedData[displayedData.length - 1] : null;
  const chartDataYears = trendWithReal.map((d) => d.year);
  const chartMinYear = chartDataYears[0] ?? 2005;
  const chartMaxYear = chartDataYears[chartDataYears.length - 1] ?? 2025;

  const clientXToYear = (clientX: number): number | null => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || !chartDataYears.length) return null;
    const t = (clientX - rect.left) / rect.width;
    const index = Math.round(t * (chartDataYears.length - 1));
    const i = Math.max(0, Math.min(index, chartDataYears.length - 1));
    return chartDataYears[i];
  };

  const yearToClientX = (year: number): number => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || chartDataYears.length < 2) return rect?.left ?? 0;
    const idx = chartDataYears.indexOf(year);
    const i = idx === -1 ? 0 : idx;
    const t = i / (chartDataYears.length - 1);
    return rect.left + t * rect.width;
  };

  const isRangeSelecting = !!(dragBand || pendingYearRange);
  const { rangeStartYear, rangeEndYear } = (() => {
    let start = chartMinYear;
    let end = chartMaxYear;
    if (pendingYearRange) {
      start = pendingYearRange[0];
      end = pendingYearRange[1];
    } else if (dragBand) {
      const y1 = clientXToYear(dragBand.startX);
      const y2 = clientXToYear(dragBand.endX);
      if (y1 != null && y2 != null) {
        start = Math.min(y1, y2);
        end = Math.max(y1, y2);
      }
    }
    return { rangeStartYear: start, rangeEndYear: end };
  })();

  const handleChartPointerDown = (clientX: number) => {
    if (pendingYearRange) return;
    rangeDragStartX.current = clientX;
    setDragBand({ startX: clientX, endX: clientX });
  };

  const handleChartPointerMove = (clientX: number) => {
    if (edgeBeingDragged.current === 'left' && pendingYearRange) {
      const y = clientXToYear(clientX);
      if (y != null) {
        const [, endY] = pendingYearRange;
        setPendingYearRange([Math.max(chartMinYear, Math.min(y, endY - 1)), endY]);
      }
      return;
    }
    if (edgeBeingDragged.current === 'right' && pendingYearRange) {
      const y = clientXToYear(clientX);
      if (y != null) {
        const [startY] = pendingYearRange;
        setPendingYearRange([startY, Math.min(chartMaxYear, Math.max(y, startY + 1))]);
      }
      return;
    }
    if (rangeDragStartX.current != null) {
      setDragBand((b) => (b ? { ...b, endX: clientX } : null));
    }
  };

  const handleChartPointerUp = (clientX: number) => {
    if (edgeBeingDragged.current) {
      ignoreNextOverlayClick.current = true;
      edgeBeingDragged.current = null;
      return;
    }
    if (rangeDragStartX.current != null) {
      const y1 = clientXToYear(rangeDragStartX.current);
      const y2 = clientXToYear(clientX);
      if (y1 != null && y2 != null) {
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if (maxY - minY >= 1) {
          ignoreNextOverlayClick.current = true;
          setPendingYearRange([minY, maxY]);
        }
      }
      rangeDragStartX.current = null;
      setDragBand(null);
    }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX != null) handleChartPointerMove(clientX);
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0]?.clientX : e.clientX;
      if (clientX != null) handleChartPointerUp(clientX);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [pendingYearRange]);

  useEffect(() => {
    const onPopstate = () => {
      if (selectedYearRange) setSelectedYearRange(null);
    };
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, [selectedYearRange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingYearRange(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setTooltipOffsetX(mq.matches ? 72 : 56);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportHeight) {
        setTabTop(-100);
        return;
      }
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const centerY = visibleTop + (visibleBottom - visibleTop) / 2;
      setTabTop(Math.max(10, Math.min(90, (centerY / viewportHeight) * 100)));
    };
    let rafId: number | null = null;
    const throttledScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    };
    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('resize', throttledScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('resize', throttledScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) {
      setDrawerDragOffset(0);
      setIsDraggingDrawer(false);
      drawerTouchStartRef.current = null;
    }
  }, [isDrawerOpen]);

  const handleTabTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > 50 && deltaY < 100) {
      setIsDrawerOpen(true);
      touchStartRef.current = null;
    }
  };
  const handleTabTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (Math.abs(deltaX) < 10 && deltaY < 10) setIsDrawerOpen(!isDrawerOpen);
    touchStartRef.current = null;
  };
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsDraggingDrawer(true);
  };
  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (!drawerTouchStartRef.current || !isDraggingDrawer) return;
    const deltaX = e.touches[0].clientX - drawerTouchStartRef.current.x;
    if (deltaX < 0) {
      e.preventDefault();
      setDrawerDragOffset(deltaX);
    }
  };
  const handleDrawerTouchEnd = () => {
    if (!isDraggingDrawer) return;
    if (drawerDragOffset < -100) setIsDrawerOpen(false);
    setDrawerDragOffset(0);
    setIsDraggingDrawer(false);
    drawerTouchStartRef.current = null;
  };

  const [toggles, setToggles] = useState({
    totalExpenses: true,
    trend: false,
    inflationAdjusted: false,
  });

  if (loading || totalsLoading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-gray-500 font-bold uppercase text-sm">Loading exhibit data…</p>
      </div>
    );
  }

  const loadError = error ?? totalsError;
  if (loadError) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-red-600 font-bold uppercase text-sm">Unable to load exhibit data.</p>
        <p className="text-gray-500 text-xs mt-2">{loadError.message}</p>
      </div>
    );
  }

  const expenseColor = '#dc2626';

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors">
        <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
      </button>
      <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 space-y-6">
        <div className="hidden md:flex justify-between items-start mb-6">
          <div>
            <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">County Expenditures</h3>
            <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">Expense trend — drag chart to select year range</p>
          </div>
          <div className="hidden md:flex px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
            Hover or Tap chart for values
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center mb-4">
          {onOpenPiePage && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black uppercase text-gray-500">Year for breakdown</span>
              <select
                value={breakdownYear}
                onChange={(e) => setBreakdownYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              >
                {chartYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onOpenPiePage(breakdownYear)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View expense breakdown by entity
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBusinessType}
              onChange={(e) => setIncludeBusinessType(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-bold uppercase text-gray-700">Include Water & Sewer (Enterprise Fund)</span>
          </label>
        </div>

        <div
          ref={chartRef}
          className="relative h-[300px] md:h-[450px] w-full landscape:h-[70vh] mb-8"
          onMouseDown={(e) => { if (!pendingYearRange && e.button === 0) handleChartPointerDown(e.clientX); }}
          onTouchStart={(e) => { if (!pendingYearRange && e.touches[0]) handleChartPointerDown(e.touches[0].clientX); }}
        >
          {selectedYearRange && (
            <button
              type="button"
              onClick={() => setSelectedYearRange(null)}
              className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black uppercase rounded-lg hover:bg-indigo-700"
            >
              Back
            </button>
          )}
          {(dragBand || pendingYearRange) && chartRef.current && (() => {
            const rect = chartRef.current.getBoundingClientRect();
            let bandLeft: number, bandWidth: number, centerX: number;
            if (pendingYearRange) {
              const [minY, maxY] = pendingYearRange;
              const x0 = yearToClientX(minY) - rect.left;
              const x1 = yearToClientX(maxY) - rect.left;
              bandLeft = x0;
              bandWidth = Math.max(0, x1 - x0);
              centerX = x0 + bandWidth / 2;
            } else if (dragBand) {
              bandLeft = Math.min(dragBand.startX, dragBand.endX) - rect.left;
              bandWidth = Math.abs(dragBand.endX - dragBand.startX);
              centerX = bandLeft + bandWidth / 2;
            } else return null;
            const edgeWidth = 12;
            return (
              <div
                className="absolute inset-0 z-[5]"
                style={{ pointerEvents: 'auto' }}
                onClick={() => {
                  if (ignoreNextOverlayClick.current) {
                    ignoreNextOverlayClick.current = false;
                    return;
                  }
                  if (pendingYearRange) setPendingYearRange(null);
                }}
              >
                <div
                  className="absolute top-0 bottom-0 bg-indigo-200/30"
                  style={{ left: bandLeft, width: bandWidth }}
                />
                {pendingYearRange && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-300/50"
                      style={{ left: bandLeft - edgeWidth / 2, width: edgeWidth }}
                      onMouseDown={(e) => { e.stopPropagation(); edgeBeingDragged.current = 'left'; }}
                      onTouchStart={(e) => { e.stopPropagation(); edgeBeingDragged.current = 'left'; }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-300/50"
                      style={{ left: bandLeft + bandWidth - edgeWidth / 2, width: edgeWidth }}
                      onMouseDown={(e) => { e.stopPropagation(); edgeBeingDragged.current = 'right'; }}
                      onTouchStart={(e) => { e.stopPropagation(); edgeBeingDragged.current = 'right'; }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendingYearRange) {
                          setSelectedYearRange(pendingYearRange);
                          setPendingYearRange(null);
                          window.history.pushState({ chartPeriodSelection: true }, '', window.location.href);
                        }
                      }}
                      className="absolute top-2 px-4 py-2 bg-indigo-600 text-white text-sm font-black uppercase rounded-xl hover:bg-indigo-700 shadow-lg"
                      style={{ left: centerX - 40 }}
                    >
                      Select
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayedData} margin={{ top: 10, right: 5, left: -12.5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="year"
                stroke="#475569"
                fontSize={12}
                fontWeight="900"
                ticks={
                  isRangeSelecting
                    ? rangeStartYear === rangeEndYear
                      ? [rangeStartYear]
                      : [rangeStartYear, rangeEndYear]
                    : displayedData.length >= 2
                      ? (() => {
                          const yrs = displayedData.map((d: any) => d.year);
                          const n = yrs.length;
                          if (n <= 3) return yrs;
                          const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
                          if (isMobile) return [yrs[0], yrs[Math.floor(n / 2)], yrs[n - 1]].filter((v: number, i: number, a: number[]) => a.indexOf(v) === i);
                          const step = Math.max(1, Math.floor((n - 1) / 3));
                          return yrs.filter((_: number, i: number) => i % step === 0 || i === n - 1);
                        })()
                      : [2005, 2010, 2015, 2020, 2025]
                }
                tickFormatter={isRangeSelecting ? (v: number) => String(v).slice(-2) : undefined}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#475569"
                fontSize={12}
                fontWeight="900"
                tickFormatter={(v) => `$${(Number(v || 0) / 1e6).toFixed(0)}M`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                position={{ x: tooltipOffsetX, y: 10 }}
                isAnimationActive={false}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length && displayedData.length && baselineRow) {
                    const data = payload[0].payload;
                    const valKey = toggles.inflationAdjusted ? 'totalExpensesReal' : 'totalExpenses';
                    const pctLabel = toggles.inflationAdjusted ? '% Change (Inflation-adjusted)' : '% Change';
                    const pct =
                      toggles.trend && latestRow
                        ? pctChangeOverRange(Number(baselineRow[valKey]), Number(latestRow[valKey]))
                        : null;
                    const fmt = formatPctChange(pct);
                    return (
                      <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                        <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-[10px] font-black uppercase text-gray-400">Total Expenses</span>
                            <span className="text-sm font-black text-red-600">{formatCurrency(Number((data as any)[valKey]))}</span>
                          </div>
                          {toggles.trend && pct !== null && (
                            <div className="flex justify-between items-center gap-6 pl-3">
                              <span className="text-[10px] font-black uppercase text-gray-400">{pctLabel}</span>
                              <span className={`text-sm font-black ${fmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{fmt.text}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {toggles.totalExpenses && (
                <Line
                  type="monotone"
                  dataKey={toggles.inflationAdjusted ? 'totalExpensesReal' : 'totalExpenses'}
                  name="Total expenses"
                  stroke={expenseColor}
                  strokeWidth={5}
                  dot={(p) => <ClickableDot {...p} />}
                />
              )}
              {toggles.trend && toggles.totalExpenses && (
                <Line
                  type="monotone"
                  dataKey={toggles.inflationAdjusted ? 'totalExpensesRealTrend' : 'totalExpensesTrend'}
                  name={toggles.inflationAdjusted ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'}
                  stroke={expenseColor}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  opacity={0.4}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 uppercase -mt-4">Click a point to open source PDF. Drag chart to select year range.</p>

        {/* Mobile peeking tab */}
        <div
          className="md:hidden peeking-tab-left"
          style={{
            top: `${tabTop}%`,
            opacity: tabTop < 0 ? 0 : 1,
            pointerEvents: tabTop < 0 ? 'none' : 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            onTouchStart={handleTabTouchStart}
            onTouchMove={handleTabTouchMove}
            onTouchEnd={handleTabTouchEnd}
            className="bg-indigo-600 text-white p-4 rounded-r-3xl shadow-2xl border-2 border-white/20 touch-none"
          >
            <i className="fa-solid fa-sliders text-2xl"></i>
          </button>
        </div>

        {/* Mobile drawer */}
        {isDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-[200] flex">
            <div
              className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div
              className="mobile-drawer-panel relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col"
              style={{
                transform: `translateX(${drawerDragOffset}px)`,
                transition: isDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              onTouchStart={handleDrawerTouchStart}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={handleDrawerTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setIsDrawerOpen(false)} className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Chart Controls</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
                <div>
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-4">Toggle Comparison</div>
                  <div
                    onClick={() => setToggles({ ...toggles, totalExpenses: !toggles.totalExpenses })}
                    className={`text-[13px] font-black uppercase flex flex-col items-center gap-2 ${toggles.totalExpenses ? 'text-red-600' : 'text-gray-400'}`}
                  >
                    <div className={`w-12 h-1.5 rounded-full ${toggles.totalExpenses ? 'bg-red-600' : 'bg-gray-100'}`} />
                    Total Expenses
                  </div>
                </div>
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Trend Toggle</div>
                  <div
                    onClick={() => setToggles({ ...toggles, trend: !toggles.trend })}
                    className={`slider-oval ${toggles.trend ? 'slider-active slider-liabs-on' : ''}`}
                  >
                    <div className="slider-circle"></div>
                  </div>
                </div>
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Inflation Adjusted</div>
                  <div
                    onClick={() => setToggles({ ...toggles, inflationAdjusted: !toggles.inflationAdjusted })}
                    className={`slider-oval ${toggles.inflationAdjusted ? 'slider-active slider-inf-on' : ''}`}
                  >
                    <div className="slider-circle"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop toggles */}
        <div className="mt-8 space-y-8 border-t border-gray-50 pt-10">
          <div className="hidden md:grid grid-cols-[200px_1fr] gap-y-8 items-center px-4">
            <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Toggle Comparison</div>
            <div className="text-center">
              <button
                onClick={() => setToggles({ ...toggles, totalExpenses: !toggles.totalExpenses })}
                className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles.totalExpenses ? 'text-red-600' : 'text-gray-400'}`}
              >
                <div className={`w-12 h-1.5 rounded-full transition-all ${toggles.totalExpenses ? 'bg-red-600' : 'bg-gray-100'}`} />
                Total Expenses
              </button>
            </div>
            <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
            <div className="flex justify-center">
              <div
                onClick={() => setToggles({ ...toggles, trend: !toggles.trend })}
                className={`slider-oval ${toggles.trend ? 'slider-active slider-liabs-on' : ''}`}
              >
                <div className="slider-circle"></div>
              </div>
            </div>
            <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
            <div className="flex justify-center">
              <div
                onClick={() => setToggles({ ...toggles, inflationAdjusted: !toggles.inflationAdjusted })}
                className={`slider-oval ${toggles.inflationAdjusted ? 'slider-active slider-inf-on' : ''}`}
              >
                <div className="slider-circle"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountyExpenditures;
