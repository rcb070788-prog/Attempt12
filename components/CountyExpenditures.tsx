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
import { useExhibitBExpenseLines, useExhibitBExpenseTotals } from '../src/lib/useExhibitBLines';
import { getExpenseTrendByYearFromTotals } from '../src/lib/expenseTransforms';
import {
  formatCurrency,
  pctChangeOverRange,
  formatPctChange,
  addRealToExpenseYearPoints,
  recomputeExpenseTrendsForSlice,
  getValidAndBeyondStartYears,
  extendTrendForward,
} from '../utils/financeUtils';

/** Format number for PDF search: comma-separated; negative as (234,567). */
function formatNumberForPdfSearch(value: number): string {
  const abs = Math.abs(value);
  const withCommas = Math.round(abs).toLocaleString('en-US');
  return value < 0 ? `(${withCommas})` : withCommas;
}

function openPdf(url: string | undefined, searchValue?: number) {
  if (!url) return;
  let finalUrl = url;
  if (searchValue !== undefined && Number.isFinite(searchValue)) {
    const searchStr = encodeURIComponent(formatNumberForPdfSearch(searchValue));
    if (url.includes('#')) {
      finalUrl = `${url}&search=${searchStr}`;
    } else {
      finalUrl = `${url}#search=${searchStr}`;
    }
  }
  window.open(finalUrl, '_blank', 'noopener,noreferrer');
}

function ClickableDot(props: {
  cx?: number;
  cy?: number;
  payload?: {
    pdf_page_url?: string;
    totalPrimaryGovAndComponentUnits?: number;
    totalPrimaryGovAndComponentUnitsReal?: number;
  };
  inflationTotal?: boolean;
}) {
  const { cx = 0, cy = 0, payload, inflationTotal } = props;
  if (payload == null) return null;
  const totalKey = inflationTotal ? 'totalPrimaryGovAndComponentUnitsReal' : 'totalPrimaryGovAndComponentUnits';
  const totalValue = payload[totalKey];
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="currentColor"
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        openPdf(payload.pdf_page_url, totalValue !== undefined && Number.isFinite(totalValue) ? totalValue : undefined);
      }}
    />
  );
}

interface CountyExpendituresProps {
  onBack: () => void;
  /** Opens the expense-by-entity pie page; optional initial year for the pie. */
  onOpenPiePage?: (initialYear?: number) => void;
  /** When true, fills parent (full-viewport) with flex layout; chart uses flex-1 */
  fullScreen?: boolean;
}

export const CountyExpenditures: React.FC<CountyExpendituresProps> = ({ onBack, onOpenPiePage, fullScreen = false }) => {
  const { data: lines, loading, error } = useExhibitBExpenseLines();
  const { data: expenseTotals, loading: totalsLoading, error: totalsError } = useExhibitBExpenseTotals();

  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);
  const [pendingYearRange, setPendingYearRange] = useState<[number, number] | null>(null);
  const edgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const ignoreNextOverlayClick = useRef(false);
  const [dragBand, setDragBand] = useState<{ startX: number; endX: number } | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const rangeDragCurrentX = useRef<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [rightDrawerDragOffset, setRightDrawerDragOffset] = useState(0);
  const [rightDraggingDrawer, setRightDraggingDrawer] = useState(false);
  const [desktopTogglesOpen, setDesktopTogglesOpen] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const rightDrawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const rightTabTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(56);
  const [tabTop, setTabTop] = useState(50);
  const [showMud2020Message, setShowMud2020Message] = useState(false);
  const mud2020PopoverRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullScreen, setIsNativeFullScreen] = useState(false);
  const [andBeyondOpen, setAndBeyondOpen] = useState(false);
  const [andBeyondStartYear, setAndBeyondStartYear] = useState<number | null>(null);
  const [andBeyondYearsForward, setAndBeyondYearsForward] = useState(10);
  const [andBeyondOn, setAndBeyondOn] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsNativeFullScreen(document.fullscreenElement === fullscreenContainerRef.current);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const chartYears = useMemo(() => {
    const y = [...new Set(expenseTotals.map((r) => r.year))].sort((a, b) => a - b);
    return y.length ? y : [2005, 2024];
  }, [expenseTotals]);
  const chartYearMin = chartYears[0] ?? 2005;
  const chartYearMax = chartYears[chartYears.length - 1] ?? 2024;

  const trendData = useMemo(
    () => getExpenseTrendByYearFromTotals(expenseTotals, chartYearMin, chartYearMax, true),
    [expenseTotals, chartYearMin, chartYearMax]
  );

  const displayedRaw = useMemo(() => {
    if (!trendData.length) return [];
    if (!selectedYearRange) return trendData;
    const [minY, maxY] = selectedYearRange;
    const filtered = trendData.filter((d) => d.year >= minY && d.year <= maxY);
    return filtered.length >= 2 ? filtered : trendData;
  }, [trendData, selectedYearRange]);

  const baseYear = displayedRaw.length ? displayedRaw[0].year : chartYearMin;

  const displayedData = useMemo(() => {
    if (!displayedRaw.length) return [];
    const withReal = addRealToExpenseYearPoints(displayedRaw, baseYear);
    return recomputeExpenseTrendsForSlice(withReal);
  }, [displayedRaw, baseYear]);

  const baselineRow = displayedData.length ? displayedData[0] : null;
  const latestRow = displayedData.length ? displayedData[displayedData.length - 1] : null;

  const chartData = useMemo(() => {
    if (!displayedData.length) return [];
    const row2019 = displayedData.find((d: any) => d.year === 2019);
    const row2021 = displayedData.find((d: any) => d.year === 2021);
    const mud2019 = row2019 != null && Number.isFinite(Number((row2019 as any).mud)) ? Number((row2019 as any).mud) : undefined;
    const mud2021 = row2021 != null && Number.isFinite(Number((row2021 as any).mud)) ? Number((row2021 as any).mud) : undefined;
    const mudReal2019 = row2019 != null && Number.isFinite(Number((row2019 as any).mudReal)) ? Number((row2019 as any).mudReal) : undefined;
    const mudReal2021 = row2021 != null && Number.isFinite(Number((row2021 as any).mudReal)) ? Number((row2021 as any).mudReal) : undefined;
    const hasBridge = mud2019 != null && mud2021 != null;
    const interpolated = hasBridge ? (mud2019 + mud2021) / 2 : undefined;
    const interpolatedReal = mudReal2019 != null && mudReal2021 != null ? (mudReal2019 + mudReal2021) / 2 : undefined;
    return displayedData.map((d: any) => {
      const year = d.year;
      let mudBridge: number | undefined;
      let mudBridgeReal: number | undefined;
      if (year === 2019 && Number.isFinite(Number(d.mud))) {
        mudBridge = Number(d.mud);
        mudBridgeReal = Number.isFinite(Number(d.mudReal)) ? Number(d.mudReal) : undefined;
      } else if (year === 2021 && Number.isFinite(Number(d.mud))) {
        mudBridge = Number(d.mud);
        mudBridgeReal = Number.isFinite(Number(d.mudReal)) ? Number(d.mudReal) : undefined;
      } else if (year === 2020 && hasBridge) {
        mudBridge = interpolated;
        mudBridgeReal = interpolatedReal;
      }
      return { ...d, mudBridge, mudBridgeReal };
    });
  }, [displayedData]);

  const chartDataYears = chartData.length ? chartData.map((d: any) => d.year) : (trendData.length ? trendData.map((d) => d.year) : []);
  const chartDataYearsRef = useRef<number[]>([]);
  chartDataYearsRef.current = chartDataYears;
  const chartMinYear = chartDataYears[0] ?? 2005;
  const chartMaxYear = chartDataYears[chartDataYears.length - 1] ?? 2025;

  const { latestYear: andBeyondLatestYear, validStartYears: andBeyondValidStartYears } = useMemo(
    () => getValidAndBeyondStartYears(chartData),
    [chartData]
  );
  const andBeyondStartYearClamped = useMemo(() => {
    if (andBeyondStartYear == null || !andBeyondValidStartYears.length) return andBeyondValidStartYears[0] ?? null;
    if (andBeyondValidStartYears.includes(andBeyondStartYear)) return andBeyondStartYear;
    return andBeyondValidStartYears[andBeyondValidStartYears.length - 1] ?? null;
  }, [andBeyondStartYear, andBeyondValidStartYears]);
  const andBeyondEnabled = (fullScreen || isNativeFullScreen) && andBeyondValidStartYears.length >= 1;

  const clientXToYear = (clientX: number): number | null => {
    const rect = chartRef.current?.getBoundingClientRect();
    const years = chartDataYearsRef.current;
    if (!rect || !years.length) return null;
    const t = (clientX - rect.left) / rect.width;
    const index = Math.round(t * (years.length - 1));
    const i = Math.max(0, Math.min(index, years.length - 1));
    return years[i];
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
    rangeDragCurrentX.current = clientX;
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
      rangeDragCurrentX.current = clientX;
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
      const endX = clientX ?? rangeDragCurrentX.current ?? rangeDragStartX.current;
      const y1 = clientXToYear(rangeDragStartX.current);
      const y2 = endX != null ? clientXToYear(endX) : null;
      if (y1 != null && y2 != null) {
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if (maxY >= minY) {
          ignoreNextOverlayClick.current = true;
          setPendingYearRange([minY, maxY]);
        }
      }
      rangeDragStartX.current = null;
      rangeDragCurrentX.current = null;
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
    const onTouchCancel = () => {
      const endX = rangeDragCurrentX.current ?? rangeDragStartX.current;
      if (endX != null) handleChartPointerUp(endX);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onTouchCancel);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onTouchCancel);
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

  useEffect(() => {
    if (!isRightDrawerOpen) {
      setRightDrawerDragOffset(0);
      setRightDraggingDrawer(false);
      rightDrawerTouchStartRef.current = null;
    }
  }, [isRightDrawerOpen]);

  useEffect(() => {
    if (!showMud2020Message) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (mud2020PopoverRef.current?.contains(target)) return;
      setShowMud2020Message(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showMud2020Message]);

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

  const openRightDrawer = () => setIsRightDrawerOpen(true);
  const handleRightTabTouchStart = (e: React.TouchEvent) => {
    rightTabTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleRightTabTouchMove = (e: React.TouchEvent) => {
    if (!rightTabTouchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - rightTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - rightTabTouchStartRef.current.y);
    if (deltaX < -50 && deltaY < 100) {
      openRightDrawer();
      rightTabTouchStartRef.current = null;
    }
  };
  const handleRightTabTouchEnd = (e: React.TouchEvent) => {
    if (!rightTabTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - rightTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - rightTabTouchStartRef.current.y);
    if (Math.abs(deltaX) < 10 && deltaY < 10) openRightDrawer();
    rightTabTouchStartRef.current = null;
  };
  const handleRightDrawerTouchStart = (e: React.TouchEvent) => {
    rightDrawerTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setRightDraggingDrawer(true);
  };
  const handleRightDrawerTouchMove = (e: React.TouchEvent) => {
    if (!rightDrawerTouchStartRef.current || !rightDraggingDrawer) return;
    const deltaX = e.touches[0].clientX - rightDrawerTouchStartRef.current.x;
    if (deltaX > 0) {
      e.preventDefault();
      setRightDrawerDragOffset(deltaX);
    }
  };
  const handleRightDrawerTouchEnd = () => {
    if (!rightDraggingDrawer) return;
    if (rightDrawerDragOffset > 100) setIsRightDrawerOpen(false);
    setRightDrawerDragOffset(0);
    setRightDraggingDrawer(false);
    rightDrawerTouchStartRef.current = null;
  };

  const [toggles, setToggles] = useState({
    total: true,
    genGov: false,
    schools: false,
    emergCommDist: false,
    mud: false,
    trendTotal: false,
    trendGenGov: false,
    trendSchools: false,
    trendEmergCommDist: false,
    trendMud: false,
    inflationTotal: false,
    inflationGenGov: false,
    inflationSchools: false,
    inflationEmergCommDist: false,
    inflationMud: false,
  });

  const expenseToggleKeys = ['total', 'genGov', 'schools', 'emergCommDist', 'mud'] as const;
  const expenseToggleLabels: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'Total',
    genGov: 'Gen Gov',
    schools: 'Schools',
    emergCommDist: 'Emerg Comm Dist',
    mud: 'MUD',
  };
  const expenseToggleColors: Record<(typeof expenseToggleKeys)[number], string> = {
    total: '#dc2626',
    genGov: '#3b82f6',
    schools: '#4ade80',
    emergCommDist: '#f87171',
    mud: '#fb923c',
  };
  const INFLATION_LINE_COLOR = '#fb923c';
  const expenseToggleDataKeys: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'totalPrimaryGovAndComponentUnits',
    genGov: 'genGov',
    schools: 'schools',
    emergCommDist: 'emergCommDist',
    mud: 'mud',
  };
  const expenseToggleRealKeys: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'totalPrimaryGovAndComponentUnitsReal',
    genGov: 'genGovReal',
    schools: 'schoolsReal',
    emergCommDist: 'emergCommDistReal',
    mud: 'mudReal',
  };
  const expenseToggleTrendKeys: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'totalPrimaryGovAndComponentUnitsTrend',
    genGov: 'genGovTrend',
    schools: 'schoolsTrend',
    emergCommDist: 'emergCommDistTrend',
    mud: 'mudTrend',
  };
  const expenseToggleRealTrendKeys: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'totalPrimaryGovAndComponentUnitsRealTrend',
    genGov: 'genGovRealTrend',
    schools: 'schoolsRealTrend',
    emergCommDist: 'emergCommDistRealTrend',
    mud: 'mudRealTrend',
  };
  const toggleTrendKey: Record<(typeof expenseToggleKeys)[number], keyof typeof toggles> = {
    total: 'trendTotal',
    genGov: 'trendGenGov',
    schools: 'trendSchools',
    emergCommDist: 'trendEmergCommDist',
    mud: 'trendMud',
  };
  const toggleInflationKey: Record<(typeof expenseToggleKeys)[number], keyof typeof toggles> = {
    total: 'inflationTotal',
    genGov: 'inflationGenGov',
    schools: 'inflationSchools',
    emergCommDist: 'inflationEmergCommDist',
    mud: 'inflationMud',
  };
  const expenseStrobeClass: Record<(typeof expenseToggleKeys)[number], string> = {
    total: 'strobe-exp-total',
    genGov: 'strobe-exp-gengov',
    schools: 'strobe-exp-schools',
    emergCommDist: 'strobe-exp-emergcommdist',
    mud: 'strobe-exp-mud',
  };

  const selectedEntity = expenseToggleKeys.find((k) => toggles[k]) ?? 'total';

  const AND_BEYOND_NOMINAL_KEY = 'andBeyondProjection';
  const AND_BEYOND_REAL_KEY = 'andBeyondProjectionReal';

  const chartDataWithExtension = useMemo(() => {
    if (!andBeyondOn || !andBeyondEnabled || andBeyondStartYearClamped == null || andBeyondYearsForward < 1) return chartData;
    const dataKey = expenseToggleDataKeys[selectedEntity];
    const trendKey = expenseToggleTrendKeys[selectedEntity];
    const realKey = expenseToggleRealKeys[selectedEntity];
    const realTrendKey = expenseToggleRealTrendKeys[selectedEntity];
    const nominal = extendTrendForward(chartData, dataKey, andBeyondStartYearClamped, andBeyondYearsForward);
    const showReal = toggles[toggleInflationKey[selectedEntity]];
    const real = showReal ? extendTrendForward(chartData, realKey, andBeyondStartYearClamped, andBeyondYearsForward) : null;
    const base = chartData.map((d, i) => {
      if (i !== chartData.length - 1) return d;
      const out = { ...d } as any;
      out[AND_BEYOND_NOMINAL_KEY] = nominal.lastValue;
      if (showReal && real) out[AND_BEYOND_REAL_KEY] = real.lastValue;
      return out;
    });
    const combined = nominal.extendedPoints.map((p, i) => {
      const row: any = { year: (p as any).year, [AND_BEYOND_NOMINAL_KEY]: (p as any)[trendKey] };
      if (showReal && real && real.extendedPoints[i]) row[AND_BEYOND_REAL_KEY] = (real.extendedPoints[i] as any)[realTrendKey];
      return row;
    });
    return [...base, ...combined];
  }, [
    chartData,
    andBeyondOn,
    andBeyondEnabled,
    andBeyondStartYearClamped,
    andBeyondYearsForward,
    selectedEntity,
    toggles,
    expenseToggleDataKeys,
    expenseToggleTrendKeys,
    expenseToggleRealKeys,
    expenseToggleRealTrendKeys,
    toggleInflationKey,
  ]);

  const handleSelectEntity = (key: (typeof expenseToggleKeys)[number]) => {
    setToggles((prev) => {
      const next = { ...prev };
      expenseToggleKeys.forEach((k) => {
        next[k] = k === key;
        next[toggleTrendKey[k]] = false;
        next[toggleInflationKey[k]] = false;
      });
      return next;
    });
  };

  if (loading || totalsLoading) {
    return (
      <div className={fullScreen ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-8 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 flex flex-col justify-center' : 'bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm'}>
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4 w-fit">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-gray-500 font-bold uppercase text-sm">Loading exhibit data…</p>
      </div>
    );
  }

  const loadError = error ?? totalsError;
  if (loadError) {
    return (
      <div className={fullScreen ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-8 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 flex flex-col justify-center' : 'bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm'}>
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4 w-fit">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-red-600 font-bold uppercase text-sm">Unable to load exhibit data.</p>
        <p className="text-gray-500 text-xs mt-2">{loadError.message}</p>
      </div>
    );
  }

  if (expenseTotals.length === 0) {
    return (
      <div className={fullScreen ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-8 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 flex flex-col justify-center' : 'bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm'}>
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4 w-fit">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-gray-600 font-bold uppercase text-sm">No expense data available.</p>
        <p className="text-gray-500 text-xs mt-2">The exhibit_b_expenses table may need to be populated.</p>
      </div>
    );
  }

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
      <div
        ref={fullscreenContainerRef}
        className={
          isNativeFullScreen
            ? 'bg-white text-gray-900 min-h-full w-full flex flex-col rounded-none p-4 md:p-6'
            : fullScreen
              ? 'flex-1 flex flex-col min-h-0 w-full'
              : 'w-full'
        }
      >
        <div className={fullScreen || isNativeFullScreen ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : 'bg-white p-6 md:p-10 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100 space-y-6'}>
        <div className={`hidden md:flex justify-between items-center gap-4 ${fullScreen || isNativeFullScreen ? 'shrink-0 mb-4' : 'mb-6'}`}>
          <div className="shrink-0">
            <h3 className={`font-black uppercase leading-none tracking-tighter ${fullScreen || isNativeFullScreen ? 'text-xl md:text-2xl' : 'text-3xl'}`}>County Expenditures</h3>
            <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">Expense trend — drag chart to select year range</p>
          </div>
          {onOpenPiePage && (
            <div className="flex justify-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onOpenPiePage()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
              >
                View expense breakdown by entity
              </button>
            </div>
          )}
          <div className="hidden md:flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isNativeFullScreen ? (
                <button
                  type="button"
                  onClick={() => {
                    const exit = document.exitFullscreen ?? (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
                    exit?.().then(() => onBack());
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Close Chart
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const el = fullscreenContainerRef.current;
                    const req = el?.requestFullscreen ?? (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })?.webkitRequestFullscreen;
                    if (document.fullscreenEnabled && req) {
                      req.call(el);
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-200 transition-colors border border-indigo-200"
                >
                  <i className="fa-solid fa-expand mr-1.5"></i> Expand chart
                </button>
              )}
            </div>
            {(fullScreen || isNativeFullScreen) && andBeyondValidStartYears.length >= 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAndBeyondOpen((o) => !o);
                    if (andBeyondStartYear == null && andBeyondValidStartYears.length) setAndBeyondStartYear(andBeyondValidStartYears[andBeyondValidStartYears.length - 1]);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-colors border ${andBeyondOn ? 'bg-gray-200 text-gray-800 border-gray-300' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                >
                  And Beyond
                </button>
                {andBeyondOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setAndBeyondOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                      <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Start year (min 5 yrs before latest)</p>
                      <select
                        value={andBeyondStartYearClamped ?? ''}
                        onChange={(e) => setAndBeyondStartYear(Number(e.target.value) || null)}
                        className="mb-3 w-full rounded border border-gray-200 px-2 py-1.5 text-sm font-bold"
                      >
                        {andBeyondValidStartYears.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Years to project (1–50)</p>
                      <select
                        value={andBeyondYearsForward}
                        onChange={(e) => setAndBeyondYearsForward(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm font-bold"
                      >
                        {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => { setAndBeyondOn(true); setAndBeyondOpen(false); }} className="mt-2 w-full rounded bg-indigo-600 py-1.5 text-[10px] font-black uppercase text-white hover:bg-indigo-700">Apply</button>
                      <button type="button" onClick={() => { setAndBeyondOn(false); setAndBeyondOpen(false); }} className="mt-2 w-full rounded border border-gray-300 bg-white py-1.5 text-[10px] font-black uppercase text-gray-600 hover:bg-gray-50">Turn off</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {onOpenPiePage && (
          <div className="flex justify-center md:hidden mb-4">
            <button
              type="button"
              onClick={() => onOpenPiePage()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View expense breakdown by entity
            </button>
          </div>
        )}

        <div
          className={
            fullScreen || isNativeFullScreen
              ? 'flex-1 flex flex-col min-h-0'
              : 'md:flex md:flex-col md:min-h-[420px]'
          }
        >
        <div
          ref={chartRef}
          className={
            'relative w-full ' +
            (fullScreen || isNativeFullScreen
              ? 'flex-1 min-h-0 min-h-[180px]'
              : 'h-[300px] landscape:h-[70vh] mb-8 md:flex-1 md:min-h-0 md:min-h-[180px]')
          }
          style={{ touchAction: dragBand ? 'none' : undefined }}
          onMouseDown={(e) => { if (!pendingYearRange && e.button === 0) handleChartPointerDown(e.clientX); }}
          onTouchStart={(e) => { if (!pendingYearRange && e.touches[0]) handleChartPointerDown(e.touches[0].clientX); }}
        >
          {/* Mobile peeking left tab - anchored when fullScreen or native fullscreen */}
          {(fullScreen || isNativeFullScreen) ? (
            <div
              className="md:hidden peeking-tab-left-anchored"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                onTouchStart={handleTabTouchStart}
                onTouchMove={handleTabTouchMove}
                onTouchEnd={handleTabTouchEnd}
                className="bg-indigo-600 text-white p-4 rounded-r-3xl shadow-2xl border-2 border-white/20 touch-none"
              >
                <i className="fa-solid fa-sliders text-xl"></i>
              </button>
            </div>
          ) : null}
          {/* Mobile peeking right tab - anchored when fullScreen or native fullscreen (only when pie link available) */}
          {(fullScreen || isNativeFullScreen) && onOpenPiePage ? (
            <div
              className="md:hidden peeking-tab-right-anchored"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openRightDrawer();
                }}
                onTouchStart={handleRightTabTouchStart}
                onTouchMove={handleRightTabTouchMove}
                onTouchEnd={handleRightTabTouchEnd}
                className="bg-pink-600 text-white rounded-l-2xl shadow-2xl touch-none"
              >
                <i className="fa-solid fa-layer-group text-xl"></i>
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
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <LineChart data={chartDataWithExtension} margin={{ top: 10, right: 5, left: -12.5, bottom: 0 }}>
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
                    : chartDataWithExtension.length >= 2
                      ? (() => {
                          const yrs = chartDataWithExtension.map((d: any) => d.year);
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
                  if (active && payload && payload.length && chartDataWithExtension.length && baselineRow) {
                    const data = payload[0].payload as any;
                    const MUD_2020_MSG = '2020 not Reported due to COVID 19 and software upgrade';
                    return (
                      <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                        <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                        <div className="space-y-2">
                          {expenseToggleKeys.map((key) => {
                            if (!toggles[key]) return null;
                            const inflKey = toggleInflationKey[key];
                            const trendKey = toggleTrendKey[key];
                            const showReal = toggles[inflKey];
                            if (key === 'mud' && data.year === 2020) {
                              return (
                                <div key={key} className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-gray-400" />
                                    {expenseToggleLabels[key]}
                                  </span>
                                  <p className="text-xs text-gray-600 max-w-[200px] whitespace-normal break-words">{MUD_2020_MSG}</p>
                                </div>
                              );
                            }
                            const nominalVal = Number(data[expenseToggleDataKeys[key]]);
                            const realVal = showReal ? Number(data[expenseToggleRealKeys[key]]) : NaN;
                            const hasNominal = Number.isFinite(nominalVal);
                            const hasReal = Number.isFinite(realVal);
                            if (!hasNominal && !hasReal) return null;
                            const pctNominal =
                              toggles[trendKey] && latestRow && hasNominal
                                ? pctChangeOverRange(Number(baselineRow[expenseToggleDataKeys[key]]), Number(latestRow[expenseToggleDataKeys[key]]))
                                : null;
                            const pctReal =
                              toggles[trendKey] && latestRow && hasReal
                                ? pctChangeOverRange(Number(baselineRow[expenseToggleRealKeys[key]]), Number(latestRow[expenseToggleRealKeys[key]]))
                                : null;
                            const fmtNominal = formatPctChange(pctNominal);
                            const fmtReal = formatPctChange(pctReal);
                            return (
                              <div key={key} className="flex flex-col gap-0.5">
                                {hasNominal && (
                                  <>
                                    <div className="flex justify-between items-center gap-6">
                                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: expenseToggleColors[key] }} />
                                        {expenseToggleLabels[key]}
                                      </span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        className="text-sm font-black cursor-pointer underline decoration-dotted hover:decoration-solid"
                                        style={{ color: expenseToggleColors[key] }}
                                        onClick={(e) => { e.stopPropagation(); openPdf(data.pdf_page_url, nominalVal); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPdf(data.pdf_page_url, nominalVal); } }}
                                      >
                                        {formatCurrency(nominalVal)}
                                      </span>
                                    </div>
                                    {toggles[trendKey] && pctNominal !== null && (
                                      <div className="flex justify-end">
                                        <span className={`text-[10px] font-black ${fmtNominal.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                          {fmtNominal.text}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                                {hasReal && (
                                  <>
                                    <div className="flex justify-between items-center gap-6">
                                      <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0 border border-current" style={{ backgroundColor: expenseToggleColors[key], opacity: 0.85 }} />
                                        {expenseToggleLabels[key]} (inflation adj.)
                                      </span>
                                      <span className="text-sm font-black" style={{ color: expenseToggleColors[key], opacity: 0.9 }}>
                                        {formatCurrency(realVal)}
                                      </span>
                                    </div>
                                    {toggles[trendKey] && pctReal !== null && (
                                      <div className="flex justify-end">
                                        <span className={`text-[10px] font-black ${fmtReal.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                          {fmtReal.text} (real)
                                        </span>
                                      </div>
                                    )}
                                  </>
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
              {expenseToggleKeys.map((key) => {
                if (!toggles[key]) return null;
                const inflKey = toggleInflationKey[key];
                const color = expenseToggleColors[key];
                return (
                  <React.Fragment key={key}>
                    <Line
                      type="monotone"
                      dataKey={expenseToggleDataKeys[key]}
                      name={expenseToggleLabels[key]}
                      stroke={color}
                      strokeWidth={key === 'total' ? 5 : 4}
                      dot={key === 'total' ? (p) => <ClickableDot {...p} inflationTotal={false} /> : false}
                      connectNulls={key === 'emergCommDist' ? false : undefined}
                    />
                    {toggles[inflKey] && (
                      <Line
                        type="monotone"
                        dataKey={expenseToggleRealKeys[key]}
                        name={`${expenseToggleLabels[key]} (inflation adj.)`}
                        stroke={INFLATION_LINE_COLOR}
                        strokeWidth={key === 'total' ? 5 : 4}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.85}
                        connectNulls={key === 'emergCommDist' ? false : undefined}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {toggles.mud && (
                <>
                  <Line
                    type="monotone"
                    dataKey="mudBridge"
                    name="MUD (2020 bridge)"
                    stroke="#9ca3af"
                    strokeWidth={4}
                    connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload?.year === 2020 && cx != null && cy != null) {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill="#9ca3af"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMud2020Message((v) => !v);
                            }}
                          />
                        );
                      }
                      return null;
                    }}
                  />
                  {toggles.inflationMud && (
                    <Line
                      type="monotone"
                      dataKey="mudBridgeReal"
                      name="MUD (2020 bridge, inflation adj.)"
                      stroke={INFLATION_LINE_COLOR}
                      strokeWidth={4}
                      strokeDasharray="5 5"
                      opacity={0.85}
                      connectNulls={false}
                      dot={false}
                    />
                  )}
                </>
              )}
              {expenseToggleKeys.map((key) => {
                if (!toggles[key]) return null;
                const trendKey = toggleTrendKey[key];
                if (!toggles[trendKey]) return null;
                const inflKey = toggleInflationKey[key];
                const color = expenseToggleColors[key];
                return (
                  <React.Fragment key={`${key}-trend`}>
                    <Line
                      type="monotone"
                      dataKey={expenseToggleTrendKeys[key]}
                      name={`${expenseToggleLabels[key]} trend`}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      opacity={0.4}
                    />
                    {toggles[inflKey] && (
                      <Line
                        type="monotone"
                        dataKey={expenseToggleRealTrendKeys[key]}
                        name={`${expenseToggleLabels[key]} trend (inflation adj.)`}
                        stroke={INFLATION_LINE_COLOR}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.35}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {andBeyondOn && andBeyondEnabled && andBeyondStartYearClamped != null && andBeyondYearsForward > 0 && (
                <>
                  <Line
                    type="monotone"
                    dataKey={AND_BEYOND_NOMINAL_KEY}
                    name="Trend projection"
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  {toggles[toggleInflationKey[selectedEntity]] && (
                    <Line
                      type="monotone"
                      dataKey={AND_BEYOND_REAL_KEY}
                      name="Trend projection (inflation adj.)"
                      stroke={INFLATION_LINE_COLOR}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      opacity={0.85}
                      connectNulls
                    />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
          {showMud2020Message && (
            <div
              ref={mud2020PopoverRef}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white p-4 rounded-xl shadow-xl border border-gray-200 max-w-[240px]"
            >
              <p className="text-xs text-gray-700 whitespace-normal break-words">
                2020 not Reported due to COVID 19 and software upgrade
              </p>
              <button
                type="button"
                onClick={() => setShowMud2020Message(false)}
                className="mt-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Desktop only: collapsible bottom peeking panel (net-worth-style grid) */}
        <div className="hidden md:block border-t border-gray-50 shrink-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: desktopTogglesOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className={`gap-y-8 items-center px-4 pt-10 ${fullScreen ? 'pb-2' : 'pb-4'}`}>
                <div className="grid grid-cols-[200px_1fr_1fr_1fr_1fr_1fr] gap-y-8 items-center">
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Toggle Comparison</div>
                  {expenseToggleKeys.map((key) => (
                    <div key={key} className="text-center">
                      <button
                        onClick={() => handleSelectEntity(key)}
                        className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? '' : expenseStrobeClass[key]}`}
                        style={toggles[key] ? { color: expenseToggleColors[key] } : undefined}
                      >
                        <div
                          className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? '' : 'bg-gray-100'}`}
                          style={toggles[key] ? { backgroundColor: expenseToggleColors[key] } : undefined}
                        />
                        {expenseToggleLabels[key]}
                      </button>
                    </div>
                  ))}
                  <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
                  {expenseToggleKeys.map((key) => {
                    const isEnabled = key === selectedEntity;
                    return (
                      <div key={key} className="flex justify-center">
                        <div
                          role="button"
                          aria-disabled={!isEnabled}
                          title="Trend"
                          onClick={isEnabled ? () => setToggles({ ...toggles, [toggleTrendKey[key]]: !toggles[toggleTrendKey[key]] }) : undefined}
                          className={`slider-oval ${toggles[toggleTrendKey[key]] ? 'slider-active slider-liabs-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <div className="slider-circle"></div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
                  {expenseToggleKeys.map((key) => {
                    const isEnabled = key === selectedEntity;
                    return (
                      <div key={key} className="flex justify-center">
                        <div
                          role="button"
                          aria-disabled={!isEnabled}
                          title="Inflation Adjusted"
                          onClick={isEnabled ? () => setToggles({ ...toggles, [toggleInflationKey[key]]: !toggles[toggleInflationKey[key]] }) : undefined}
                          className={`slider-oval ${toggles[toggleInflationKey[key]] ? 'slider-active slider-inf-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <div className="slider-circle"></div>
                        </div>
                      </div>
                    );
                  })}
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

        {/* Mobile peeking left tab - fixed position when not fullScreen */}
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
              <i className="fa-solid fa-sliders text-xl"></i>
            </button>
          </div>
        )}

        {/* Mobile peeking right tab - fixed position when not fullScreen (only when pie link available) */}
        {!fullScreen && onOpenPiePage && (
          <div
            className="md:hidden peeking-tab-right"
            style={{
              top: `${tabTop}%`,
              opacity: tabTop < 0 ? 0 : 1,
              pointerEvents: tabTop < 0 ? 'none' : 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                openRightDrawer();
              }}
              onTouchStart={handleRightTabTouchStart}
              onTouchMove={handleRightTabTouchMove}
              onTouchEnd={handleRightTabTouchEnd}
              className="bg-pink-600 text-white rounded-l-2xl shadow-2xl touch-none"
            >
              <i className="fa-solid fa-layer-group text-xl"></i>
            </button>
          </div>
        )}

        {/* Mobile left drawer */}
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
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  <div>
                    <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-4">Toggle Comparison</div>
                    <div className="grid grid-cols-1 gap-6">
                      {expenseToggleKeys.map((key) => (
                        <div key={key} className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEntity(key);
                            }}
                            className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? '' : expenseStrobeClass[key]}`}
                            style={toggles[key] ? { color: expenseToggleColors[key] } : undefined}
                          >
                            <div
                              className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? '' : 'bg-gray-100'}`}
                              style={toggles[key] ? { backgroundColor: expenseToggleColors[key] } : undefined}
                            />
                            {expenseToggleLabels[key]}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Trend Toggle</div>
                    <div className="grid grid-cols-5 gap-4 items-center">
                      {expenseToggleKeys.map((key) => {
                        const isEnabled = key === selectedEntity;
                        return (
                          <div key={key} className="flex flex-col items-center gap-2">
                            <div
                              role="button"
                              aria-disabled={!isEnabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEnabled) setToggles({ ...toggles, [toggleTrendKey[key]]: !toggles[toggleTrendKey[key]] });
                              }}
                              className={`slider-oval ${toggles[toggleTrendKey[key]] ? 'slider-active slider-liabs-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <div className="slider-circle"></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${isEnabled ? 'text-gray-400' : 'text-gray-300'}`}>
                              {expenseToggleLabels[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Inflation Adjusted</div>
                    <div className="grid grid-cols-5 gap-4 items-center">
                      {expenseToggleKeys.map((key) => {
                        const isEnabled = key === selectedEntity;
                        return (
                          <div key={key} className="flex flex-col items-center gap-2">
                            <div
                              role="button"
                              aria-disabled={!isEnabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEnabled) setToggles({ ...toggles, [toggleInflationKey[key]]: !toggles[toggleInflationKey[key]] });
                              }}
                              className={`slider-oval ${toggles[toggleInflationKey[key]] ? 'slider-active slider-inf-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <div className="slider-circle"></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${isEnabled ? 'text-gray-400' : 'text-gray-300'}`}>
                              {expenseToggleLabels[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile right drawer - Expenditure by entity / Pie (only when onOpenPiePage) */}
        {onOpenPiePage && isRightDrawerOpen && (
          <div className="md:hidden fixed inset-0 flex justify-end z-[200]">
            <div
              className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsRightDrawerOpen(false)}
            />
            <div
              className="mobile-drawer-panel-right relative w-80 bg-white h-full shadow-2xl flex flex-col p-8 touch-pan-y"
              style={{
                transform: `translateX(${rightDrawerDragOffset}px)`,
                transition: rightDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              onTouchStart={handleRightDrawerTouchStart}
              onTouchMove={handleRightDrawerTouchMove}
              onTouchEnd={handleRightDrawerTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center flex-shrink-0 touch-none"
                aria-label="Swipe right to close"
              >
                <div className="w-1.5 h-12 rounded-full bg-gray-200" />
              </div>
              <button
                onClick={() => setIsRightDrawerOpen(false)}
                className="self-end text-gray-300 hover:text-red-500 mb-6 transition-colors"
              >
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Expenditure by entity</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 p-3">
                <button
                  type="button"
                  onClick={() => {
                    onOpenPiePage();
                    setIsRightDrawerOpen(false);
                  }}
                  className="w-full px-4 py-4 rounded-xl text-sm font-black uppercase bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
                >
                  View expense breakdown by entity
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default CountyExpenditures;
