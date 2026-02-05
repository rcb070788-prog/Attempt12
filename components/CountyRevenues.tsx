import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { useExhibitBRevenueLines, useExhibitBRevenueTotals } from '../src/lib/useExhibitBLines';
import {
  getRevenueYearMetricsFromTotals,
  getRevenuePieForYear,
  getTaxBreakdownPieForYear,
  type YearMetric,
} from '../src/lib/revenueTransforms';
import {
  formatCurrency,
  pctChangeOverRange,
  formatPctChange,
  addRealToRevenueYearMetrics,
  recomputeRevenueTrendsForSlice,
} from '../utils/financeUtils';

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

const REVENUE_COLORS: Record<string, string> = {
  totalRevenue: '#4f46e5',
  taxesFees: '#059669',
  grants: '#d97706',
  chargesForServices: '#7c3aed',
  other: '#64748b',
};

interface CountyRevenuesProps {
  onBack: () => void;
  /** When true, fills parent (full-viewport) with flex layout; chart uses flex-1 */
  fullScreen?: boolean;
}

export const CountyRevenues: React.FC<CountyRevenuesProps> = ({ onBack, fullScreen = false }) => {
  const { data: lines, loading, error } = useExhibitBRevenueLines();
  const { data: revenueTotals, loading: totalsLoading, error: totalsError } = useExhibitBRevenueTotals();
  const [includeBusinessType, setIncludeBusinessType] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [entityNorms, setEntityNorms] = useState<string[]>(['governmental_activities']);

  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);
  const [pendingYearRange, setPendingYearRange] = useState<[number, number] | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const edgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const ignoreNextOverlayClick = useRef(false);
  const [dragBand, setDragBand] = useState<{ startX: number; endX: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(56);
  const [tabTop, setTabTop] = useState(50);
  const [desktopTogglesOpen, setDesktopTogglesOpen] = useState(true);

  // Mobile peeking right tab + pies drawer (fullScreen only)
  const [isPiesDrawerOpen, setIsPiesDrawerOpen] = useState(false);
  const [piesDrawerDragOffset, setPiesDrawerDragOffset] = useState(0);
  const [piesDraggingDrawer, setPiesDraggingDrawer] = useState(false);
  const piesDrawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const piesTabTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const years = useMemo(() => {
    const y = [...new Set(lines.map((l) => l.year))].filter((yr) => yr >= 2000).sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [lines]);

  const effectiveYearMin = years[0] ?? 2005;
  const effectiveYearMax = years[years.length - 1] ?? 2024;
  const yearMin = effectiveYearMin;
  const yearMax = effectiveYearMax;

  React.useEffect(() => {
    if (years.length > 0 && (selectedYear < effectiveYearMin || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, effectiveYearMin, effectiveYearMax, selectedYear]);

  const yearMetrics = useMemo(
    () => getRevenueYearMetricsFromTotals(revenueTotals, yearMin, yearMax, includeBusinessType),
    [revenueTotals, yearMin, yearMax, includeBusinessType]
  );

  const baseYear = yearMetrics.length ? yearMetrics[yearMetrics.length - 1].year : 2024;
  const yearMetricsWithReal = useMemo(
    () => addRealToRevenueYearMetrics(yearMetrics, baseYear),
    [yearMetrics, baseYear]
  );

  const displayedData = useMemo(() => {
    if (!yearMetricsWithReal.length) return [];
    if (!selectedYearRange) {
      return recomputeRevenueTrendsForSlice(yearMetricsWithReal);
    }
    const [minY, maxY] = selectedYearRange;
    const filtered = yearMetricsWithReal.filter((d: any) => d.year >= minY && d.year <= maxY);
    if (filtered.length < 2) return yearMetricsWithReal;
    return recomputeRevenueTrendsForSlice(filtered);
  }, [yearMetricsWithReal, selectedYearRange]);

  const baselineRow = displayedData.length ? displayedData[0] : null;
  const latestRow = displayedData.length ? displayedData[displayedData.length - 1] : null;
  const chartYears = useMemo(() => yearMetricsWithReal.map((d: any) => d.year), [yearMetricsWithReal]);
  const chartMinYear = chartYears[0] ?? 2005;
  const chartMaxYear = chartYears[chartYears.length - 1] ?? 2025;

  const clientXToYear = (clientX: number): number | null => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || !chartYears.length) return null;
    const t = (clientX - rect.left) / rect.width;
    const index = Math.round(t * (chartYears.length - 1));
    const i = Math.max(0, Math.min(index, chartYears.length - 1));
    return chartYears[i];
  };

  const yearToClientX = (year: number): number => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || chartYears.length < 2) return rect?.left ?? 0;
    const idx = chartYears.indexOf(year);
    const i = idx === -1 ? 0 : idx;
    const t = i / (chartYears.length - 1);
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

  const openPiesDrawer = () => setIsPiesDrawerOpen(true);
  const handlePiesTabTouchStart = (e: React.TouchEvent) => {
    piesTabTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handlePiesTabTouchMove = (e: React.TouchEvent) => {
    if (!piesTabTouchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - piesTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - piesTabTouchStartRef.current.y);
    if (deltaX < -50 && deltaY < 100) {
      openPiesDrawer();
      piesTabTouchStartRef.current = null;
    }
  };
  const handlePiesTabTouchEnd = (e: React.TouchEvent) => {
    if (!piesTabTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - piesTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - piesTabTouchStartRef.current.y);
    if (Math.abs(deltaX) < 10 && deltaY < 10) openPiesDrawer();
    piesTabTouchStartRef.current = null;
  };
  const handlePiesDrawerTouchStart = (e: React.TouchEvent) => {
    piesDrawerTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setPiesDraggingDrawer(true);
  };
  const handlePiesDrawerTouchMove = (e: React.TouchEvent) => {
    if (!piesDrawerTouchStartRef.current || !piesDraggingDrawer) return;
    const deltaX = e.touches[0].clientX - piesDrawerTouchStartRef.current.x;
    if (deltaX > 0) {
      e.preventDefault();
      setPiesDrawerDragOffset(deltaX);
    }
  };
  const handlePiesDrawerTouchEnd = () => {
    if (!piesDraggingDrawer) return;
    if (piesDrawerDragOffset > 100) setIsPiesDrawerOpen(false);
    setPiesDrawerDragOffset(0);
    setPiesDraggingDrawer(false);
    piesDrawerTouchStartRef.current = null;
  };

  useEffect(() => {
    if (!isPiesDrawerOpen) {
      setPiesDrawerDragOffset(0);
      setPiesDraggingDrawer(false);
      piesDrawerTouchStartRef.current = null;
    }
  }, [isPiesDrawerOpen]);

  const [toggles, setToggles] = useState({
    totalRevenue: true,
    taxesFees: true,
    grants: true,
    chargesForServices: true,
    other: true,
    trend: false,
    inflationAdjusted: false,
  });

  const revenuePie = useMemo(
    () => getRevenuePieForYear(lines, selectedYear, includeBusinessType, entityNorms),
    [lines, selectedYear, includeBusinessType, entityNorms]
  );
  const taxBreakdownPie = useMemo(
    () => getTaxBreakdownPieForYear(lines, selectedYear, includeBusinessType, entityNorms, 10),
    [lines, selectedYear, includeBusinessType, entityNorms]
  );

  const handleEntityToggle = (entity: string) => {
    setEntityNorms((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

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

  const seriesKeys = [
    { key: 'totalRevenue', label: 'Total Revenue', color: REVENUE_COLORS.totalRevenue },
    { key: 'taxesFees', label: 'Taxes & Fees', color: REVENUE_COLORS.taxesFees },
    { key: 'grants', label: 'Grants', color: REVENUE_COLORS.grants },
    { key: 'chargesForServices', label: 'Charges for Services', color: REVENUE_COLORS.chargesForServices },
    { key: 'other', label: 'Other', color: REVENUE_COLORS.other },
  ];

  return (
    <div
      className={
        fullScreen
          ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-6 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100'
          : 'space-y-8'
      }
    >
      {!fullScreen && (
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
      )}
      <div className={fullScreen ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'bg-white p-6 md:p-10 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 space-y-6'}>
        <div className={`hidden md:flex justify-between items-start ${fullScreen ? 'shrink-0 mb-4' : 'mb-6'}`}>
          <div>
            <h3 className={`font-black uppercase leading-none tracking-tighter ${fullScreen ? 'text-xl md:text-2xl' : 'text-3xl'}`}>County Revenues</h3>
            <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">Revenue trend — drag chart to select year range</p>
          </div>
          <div className="hidden md:flex px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
            Hover or Tap chart for values
          </div>
        </div>

        <div className={`flex flex-wrap gap-4 items-center ${fullScreen ? 'shrink-0 mb-4' : 'mb-4'}`}>
          {fullScreen && (
            <button
              type="button"
              onClick={() => setIsPiesDrawerOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-black uppercase rounded-lg hover:bg-pink-700 transition-colors"
            >
              <i className="fa-solid fa-chart-pie"></i> View revenue breakdown
            </button>
          )}
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
            <span className="text-sm font-bold uppercase text-gray-700">Include Water & Sewer (Enterprise Fund)</span>
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

        <div
          className={
            fullScreen
              ? 'flex-1 flex flex-col min-h-0'
              : 'md:flex md:flex-col md:min-h-[420px]'
          }
        >
        <div
          ref={chartRef}
          className={
            'relative w-full ' +
            (fullScreen
              ? 'flex-1 min-h-0 min-h-[180px]'
              : 'h-[300px] landscape:h-[70vh] mb-8 md:flex-1 md:min-h-0 md:min-h-[180px]')
          }
          onMouseDown={(e) => { if (!pendingYearRange && e.button === 0) handleChartPointerDown(e.clientX); }}
          onTouchStart={(e) => { if (!pendingYearRange && e.touches[0]) handleChartPointerDown(e.touches[0].clientX); }}
        >
          {/* Mobile peeking left tab - anchored when fullScreen */}
          {fullScreen ? (
            <div className="md:hidden peeking-tab-left-anchored" onClick={(e) => e.stopPropagation()}>
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
          ) : null}
          {/* Mobile peeking right tab - pies drawer when fullScreen */}
          {fullScreen ? (
            <div
              className="md:hidden peeking-tab-right-anchored"
              onTouchStart={handlePiesTabTouchStart}
              onTouchMove={handlePiesTabTouchMove}
              onTouchEnd={handlePiesTabTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPiesDrawerOpen(true)}
                className="bg-pink-600 text-white rounded-l-2xl shadow-2xl touch-none"
              >
                <i className="fa-solid fa-chart-pie text-xl"></i>
              </button>
            </div>
          ) : null}
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
                  (() => {
                    const raw =
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
                          : displayedData.length > 0
                            ? [...new Set(displayedData.map((d: any) => d.year))].sort((a, b) => a - b)
                            : [];
                    return raw.filter((y: number) => y !== 2023);
                  })()
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
                    const pctLabel = toggles.inflationAdjusted ? '% Change (Inflation-adjusted)' : '% Change';
                    const valueKey = (k: string) => (toggles.inflationAdjusted ? `${k}Real` : k);
                    return (
                      <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                        <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                        <div className="space-y-2">
                          {seriesKeys.map(({ key, label, color }) => {
                            if (!toggles[key as keyof typeof toggles]) return null;
                            const valKey = valueKey(key);
                            const val = Number((data as any)[valKey]);
                            const pct =
                              toggles.trend && displayedData.length >= 2 && latestRow
                                ? pctChangeOverRange(Number(baselineRow[valKey]), Number(latestRow[valKey]))
                                : null;
                            const fmt = formatPctChange(pct);
                            return (
                              <div key={key}>
                                <div className="flex justify-between items-center gap-6">
                                  <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
                                  <span className="text-sm font-black" style={{ color }}>{formatCurrency(val)}</span>
                                </div>
                                {toggles.trend && pct !== null && (
                                  <div className="flex justify-between items-center gap-6 pl-3">
                                    <span className="text-[10px] font-black uppercase text-gray-400">{pctLabel}</span>
                                    <span className={`text-sm font-black ${fmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{fmt.text}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {seriesKeys.map(({ key, label, color }) => {
                const valKey = toggles.inflationAdjusted ? `${key}Real` : key;
                const trendKey = toggles.inflationAdjusted ? `${key}RealTrend` : `${key}Trend`;
                const urlKey = key === 'totalRevenue' ? 'pdf_page_url_totalRevenue' : `pdf_page_url_${key}` as keyof YearMetric;
                return (
                  <React.Fragment key={key}>
                    {toggles[key as keyof typeof toggles] && (
                      <Line
                        type="monotone"
                        dataKey={valKey}
                        name={label}
                        stroke={color}
                        strokeWidth={key === 'totalRevenue' ? 5 : 3}
                        dot={(p) => <ClickableDot {...p} getUrl={(d: any) => d[urlKey]} />}
                      />
                    )}
                    {toggles.trend && toggles[key as keyof typeof toggles] && (
                      <Line
                        type="monotone"
                        dataKey={trendKey}
                        name={toggles.inflationAdjusted ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.4}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Desktop only: collapsible bottom peeking panel */}
        <div className="hidden md:block border-t border-gray-50 shrink-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: desktopTogglesOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className={`space-y-8 pt-6 px-4 ${fullScreen ? 'pb-2' : 'pb-4'}`}>
                <div className={`space-y-4 ${fullScreen ? '' : 'mb-8'}`}>
                  <div className={`grid grid-cols-[200px_1fr_1fr_1fr_1fr_1fr] items-end gap-x-2 ${fullScreen ? 'gap-y-2' : 'gap-y-4'}`}>
                    <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest pb-2">Toggle Comparison</div>
                    {seriesKeys.map(({ key, label, color }) => (
                      <div key={key} className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setToggles({ ...toggles, [key]: !toggles[key as keyof typeof toggles] })}
                          className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key as keyof typeof toggles] ? '' : 'text-gray-400'}`}
                          style={toggles[key as keyof typeof toggles] ? { color } : undefined}
                        >
                          <div
                            className={`w-12 h-1.5 rounded-full transition-all ${toggles[key as keyof typeof toggles] ? '' : 'bg-gray-100'}`}
                            style={toggles[key as keyof typeof toggles] ? { backgroundColor: color } : undefined}
                          />
                          {label}
                        </button>
                      </div>
                    ))}
                    <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
                    <div className="col-span-5 flex justify-center">
                      <div
                        onClick={() => setToggles({ ...toggles, trend: !toggles.trend })}
                        className={`slider-oval ${toggles.trend ? 'slider-active slider-networth-on' : ''}`}
                      >
                        <div className="slider-circle"></div>
                      </div>
                    </div>
                    <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
                    <div className="col-span-5 flex justify-center">
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
          </div>
          <div className="flex items-center justify-center h-12 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setDesktopTogglesOpen(!desktopTogglesOpen)}
              aria-label={desktopTogglesOpen ? 'Close chart controls' : 'Open chart controls'}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {desktopTogglesOpen ? (
                <i className="fa-solid fa-chevron-down text-sm" />
              ) : (
                <>
                  <i className="fa-solid fa-chevron-up text-sm" />
                  <span>Chart controls</span>
                </>
              )}
            </button>
          </div>
        </div>

        </div>

        {/* Mobile peeking tab - fixed position when not fullScreen */}
        {!fullScreen && (
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
        )}

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
                  <div className="grid grid-cols-1 gap-4">
                    {seriesKeys.map(({ key, label, color }) => (
                      <div key={key} className="text-center">
                        <button
                          onClick={() => setToggles({ ...toggles, [key]: !toggles[key as keyof typeof toggles] })}
                          className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key as keyof typeof toggles] ? '' : 'text-gray-400'}`}
                          style={toggles[key as keyof typeof toggles] ? { color } : {}}
                        >
                          <div className={`w-12 h-1.5 rounded-full transition-all ${toggles[key as keyof typeof toggles] ? '' : 'bg-gray-100'}`} style={toggles[key as keyof typeof toggles] ? { backgroundColor: color } : {}} />
                          {label}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Trend Toggle</div>
                  <div
                    onClick={() => setToggles({ ...toggles, trend: !toggles.trend })}
                    className={`slider-oval ${toggles.trend ? 'slider-active slider-networth-on' : ''}`}
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

        {/* Pie charts - in main content when not fullScreen, in right drawer when fullScreen */}
        {!fullScreen && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
              <div className="rounded-[2rem] border border-gray-100 p-4">
                <h4 className="text-sm font-black uppercase text-gray-600 mb-4">Revenue by type ({selectedYear})</h4>
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
                          <Cell key={i} fill={Object.values(REVENUE_COLORS)[i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-[2rem] border border-gray-100 p-4">
                <h4 className="text-sm font-black uppercase text-gray-600 mb-4">Tax breakdown ({selectedYear})</h4>
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
                          <Cell key={i} fill={Object.values(REVENUE_COLORS)[i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase">Click a slice to open source PDF</p>
          </>
        )}

        {/* Mobile right drawer - pies (fullScreen only) */}
        {fullScreen && isPiesDrawerOpen && (
          <div className="fixed inset-0 flex justify-end z-[201]">
            <div
              className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsPiesDrawerOpen(false)}
            />
            <div
              className="mobile-drawer-panel-right relative w-80 min-w-[280px] bg-white h-full shadow-2xl flex flex-col p-8 touch-pan-y overflow-y-auto"
              style={{
                transform: `translateX(${piesDrawerDragOffset}px)`,
                transition: piesDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              onTouchStart={handlePiesDrawerTouchStart}
              onTouchMove={handlePiesDrawerTouchMove}
              onTouchEnd={handlePiesDrawerTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPiesDrawerOpen(false)}
                className="self-end text-gray-300 hover:text-red-500 mb-6 transition-colors"
              >
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Revenue breakdown</h3>
              <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="rounded-[2rem] border border-gray-100 p-4">
                  <h4 className="text-sm font-black uppercase text-gray-600 mb-4">Revenue by type ({selectedYear})</h4>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                          onClick={(entry) => openPdf(entry.pdf_page_url)}
                        >
                          {revenuePie.map((_, i) => (
                            <Cell key={i} fill={Object.values(REVENUE_COLORS)[i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[2rem] border border-gray-100 p-4">
                  <h4 className="text-sm font-black uppercase text-gray-600 mb-4">Tax breakdown ({selectedYear})</h4>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taxBreakdownPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                          onClick={(entry) => openPdf(entry.pdf_page_url)}
                        >
                          {taxBreakdownPie.map((_, i) => (
                            <Cell key={i} fill={Object.values(REVENUE_COLORS)[i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 uppercase mt-4">Click a slice to open source PDF</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountyRevenues;
