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
import { useExhibitBRevenueLines } from '../src/lib/useExhibitBLines';
import {
  getRevenueByEntityByYear,
  getRevenuePieForYear,
  getTaxBreakdownPieForYear,
} from '../src/lib/revenueTransforms';
import { buildHierarchyTree, type HierarchyTreeNode, stripRedundantRoot, flattenSingleChildNodes, getHierarchyTreeLeafPaths } from '../src/lib/paths';
import {
  formatCurrency,
  pctChangeOverRange,
  formatPctChange,
  addRealToRevenueYearPoints,
  recomputeRevenueEntityTrendsForSlice,
  calculateTrendLine,
  getValidAndBeyondStartYears,
  extendTrendForward,
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

const REVENUE_PIE_COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#64748b'];

function RevenueHierarchyDropdown(props: {
  tree: HierarchyTreeNode[];
  selectedPaths: string[];
  onTogglePath: (path: string) => void;
  onClose: () => void;
  onSelectAllUnder?: (paths: string[], add: boolean) => void;
}) {
  const { tree, selectedPaths, onTogglePath, onSelectAllUnder } = props;
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderNode = (node: HierarchyTreeNode, depth: number, expandKey: string) => {
    const pl = 4 + depth * 12;
    if (node.fullPath) {
      const checked = selectedSet.has(node.fullPath);
      return (
        <label
          key={node.fullPath}
          className="flex cursor-pointer items-center gap-2 py-2 hover:bg-gray-50"
          style={{ paddingLeft: pl }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onTogglePath(node.fullPath!)}
            className="rounded border-gray-300 text-indigo-600"
          />
          <span className="text-sm text-gray-800">{node.segment}</span>
        </label>
      );
    }
    const isExpanded = expanded.has(expandKey);
    return (
      <div key={expandKey}>
        <button
          type="button"
          onClick={() => toggleExpand(expandKey)}
          className="flex w-full items-center gap-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          style={{ paddingLeft: pl }}
        >
          <i
            className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
          {node.segment}
        </button>
        {isExpanded && (
          <div className="border-l border-gray-100">
            {node.children.map((child) =>
              renderNode(
                child,
                depth + 1,
                child.fullPath ?? `${expandKey} > ${child.segment}`
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 min-w-[280px] max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {tree.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">No categories</div>
      ) : (
        tree.map((root) => (
          <div key={root.segment} className="py-0.5">
            {root.children.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpand(root.segment)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-bold uppercase text-gray-700 hover:bg-gray-50"
                >
                  <i
                    className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform ${
                      expanded.has(root.segment) ? 'rotate-90' : ''
                    }`}
                  />
                  {root.segment}
                </button>
                {expanded.has(root.segment) && (
                  <div className="border-l border-gray-100 pl-2">
                    {onSelectAllUnder && (() => {
                      const leafPaths = getHierarchyTreeLeafPaths([root]);
                      if (leafPaths.length === 0) return null;
                      const allSelected = leafPaths.every((p) => selectedSet.has(p));
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAllUnder(leafPaths, !allSelected);
                          }}
                          className="text-xs text-indigo-600 hover:underline px-4 py-1.5 text-left w-full"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      );
                    })()}
                    {root.children.map((child) =>
                      renderNode(
                        child,
                        0,
                        child.fullPath ?? `${root.segment} > ${child.segment}`
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              root.fullPath && (
                <label className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(root.fullPath)}
                    onChange={() => onTogglePath(root.fullPath!)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm text-gray-800">{root.segment}</span>
                </label>
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}

const REVENUE_TOGGLE_KEYS = ['total', 'genGov', 'schools', 'emergCommDist', 'mud'] as const;
const REVENUE_TOGGLE_LABELS: Record<(typeof REVENUE_TOGGLE_KEYS)[number], string> = {
  total: 'Total',
  genGov: 'Gen Gov',
  schools: 'Schools',
  emergCommDist: 'Emerg Comm Dist',
  mud: 'MUD',
};
const REVENUE_TOGGLE_COLORS: Record<(typeof REVENUE_TOGGLE_KEYS)[number], string> = {
  total: '#dc2626',
  genGov: '#3b82f6',
  schools: '#4ade80',
  emergCommDist: '#f87171',
  mud: '#fb923c',
};
const REVENUE_TOGGLE_DATA_KEYS: Record<(typeof REVENUE_TOGGLE_KEYS)[number], string> = {
  total: 'totalPrimaryGovAndComponentUnits',
  genGov: 'genGov',
  schools: 'schools',
  emergCommDist: 'emergCommDist',
  mud: 'mud',
};

interface CountyRevenuesProps {
  onBack: () => void;
  /** Opens the revenue breakdown pie page; optional initial year for the pie. */
  onOpenPiePage?: (initialYear?: number) => void;
  /** When true, fills parent (full-viewport) with flex layout; chart uses flex-1 */
  fullScreen?: boolean;
}

export const CountyRevenues: React.FC<CountyRevenuesProps> = ({ onBack, onOpenPiePage, fullScreen = false }) => {
  const { data: lines, loading, error } = useExhibitBRevenueLines();
  const [includeBusinessType, setIncludeBusinessType] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [programRevenuesOn, setProgramRevenuesOn] = useState(true);
  const [generalRevenuesOn, setGeneralRevenuesOn] = useState(true);
  const [selectedProgramRevenuePaths, setSelectedProgramRevenuePaths] = useState<string[]>([]);
  const [selectedGeneralRevenuePaths, setSelectedGeneralRevenuePaths] = useState<string[]>([]);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [generalDropdownOpen, setGeneralDropdownOpen] = useState(false);
  const programDropdownRef = useRef<HTMLDivElement>(null);
  const generalDropdownRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);
  const [pendingYearRange, setPendingYearRange] = useState<[number, number] | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const rangeDragCurrentX = useRef<number | null>(null);
  const edgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const ignoreNextOverlayClick = useRef(false);
  const lastDragEndTime = useRef<number>(0);
  const [dragBand, setDragBand] = useState<{ startX: number; endX: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(56);
  const [tabTop, setTabTop] = useState(50);
  const [desktopTogglesOpen, setDesktopTogglesOpen] = useState(true);
  const [showMud2020Message, setShowMud2020Message] = useState(false);
  const mud2020PopoverRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullScreen, setIsNativeFullScreen] = useState(false);
  const [andBeyondOpen, setAndBeyondOpen] = useState(false);
  const [andBeyondOn, setAndBeyondOn] = useState(false);
  const [andBeyondStartYear, setAndBeyondStartYear] = useState<number | null>(null);
  const [andBeyondYearsForward, setAndBeyondYearsForward] = useState(10);

  useEffect(() => {
    const handler = () => {
      setIsNativeFullScreen(document.fullscreenElement === fullscreenContainerRef.current);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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

  const programHierarchyTree = useMemo(() => {
    const paths = lines
      .filter((l) => l.category_norm === 'program_revenues' && l.row_kind === 'line_item')
      .map((l) => l.hierarchy_path_canon)
      .filter(Boolean);
    const tree = buildHierarchyTree([...new Set(paths)]);
    return flattenSingleChildNodes(stripRedundantRoot(tree, 'Program Revenues'));
  }, [lines]);

  const generalHierarchyTree = useMemo(() => {
    const paths = lines
      .filter((l) => l.category_norm === 'general_revenues' && l.row_kind === 'line_item')
      .map((l) => l.hierarchy_path_canon)
      .filter(Boolean);
    const tree = buildHierarchyTree([...new Set(paths)]);
    return flattenSingleChildNodes(stripRedundantRoot(tree, 'General Revenues'));
  }, [lines]);

  React.useEffect(() => {
    if (years.length > 0 && (selectedYear < effectiveYearMin || selectedYear > effectiveYearMax)) {
      setSelectedYear(effectiveYearMax);
    }
  }, [years.length, effectiveYearMin, effectiveYearMax, selectedYear]);

  const trendData = useMemo(
    () =>
      getRevenueByEntityByYear(
        lines,
        yearMin,
        yearMax,
        programRevenuesOn,
        generalRevenuesOn,
        includeBusinessType,
        selectedProgramRevenuePaths.length > 0 ? selectedProgramRevenuePaths : null,
        selectedGeneralRevenuePaths.length > 0 ? selectedGeneralRevenuePaths : null
      ),
    [
      lines,
      yearMin,
      yearMax,
      programRevenuesOn,
      generalRevenuesOn,
      includeBusinessType,
      selectedProgramRevenuePaths,
      selectedGeneralRevenuePaths,
    ]
  );

  const displayedRaw = useMemo(() => {
    if (!trendData.length) return [];
    if (!selectedYearRange) return trendData;
    const [minY, maxY] = selectedYearRange;
    const filtered = trendData.filter((d: any) => d.year >= minY && d.year <= maxY);
    return filtered.length >= 2 ? filtered : trendData;
  }, [trendData, selectedYearRange]);

  const baseYear = displayedRaw.length ? displayedRaw[0].year : yearMin;

  const displayedData = useMemo(() => {
    if (!displayedRaw.length) return [];
    const withReal = addRealToRevenueYearPoints(displayedRaw, baseYear);
    return recomputeRevenueEntityTrendsForSlice(withReal);
  }, [displayedRaw, baseYear]);

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
    let list = displayedData.map((d: any) => {
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
    if (hasBridge) {
      const mudForTrend = list.map((d: any) => {
        const mudVal = d.year === 2020 ? interpolated : d.mud;
        const mudRealVal = d.year === 2020 ? interpolatedReal : d.mudReal;
        return { ...d, mud: mudVal, mudReal: mudRealVal };
      });
      let withMudTrend = calculateTrendLine(mudForTrend, 'mud');
      withMudTrend = calculateTrendLine(withMudTrend, 'mudReal');
      list = list.map((d: any, i: number) => ({
        ...d,
        mudTrend: withMudTrend[i]?.mudTrend,
        mudRealTrend: withMudTrend[i]?.mudRealTrend,
      }));
    }
    return list;
  }, [displayedData]);

  const baselineRow = displayedData.length ? displayedData[0] : null;
  const latestRow = displayedData.length ? displayedData[displayedData.length - 1] : null;
  const chartYears = useMemo(
    () => (chartData.length ? chartData.map((d: any) => d.year) : displayedRaw.map((d: any) => d.year)),
    [chartData, displayedRaw]
  );
  const chartMinYear = chartYears[0] ?? 2005;
  const chartMaxYear = chartYears[chartYears.length - 1] ?? 2025;

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

  /** Matches LineChart margin so overlay coordinates align with the drawn plot area. */
  const CHART_MARGIN = { left: -12.5, right: 5 };

  const clientXToYear = (clientX: number): number | null => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || !chartYears.length) return null;
    const contentLeft = rect.left + CHART_MARGIN.left;
    const contentWidth = rect.width - CHART_MARGIN.left - CHART_MARGIN.right;
    if (contentWidth <= 0) return null;
    const t = (clientX - contentLeft) / contentWidth;
    const index = Math.round(t * (chartYears.length - 1));
    const i = Math.max(0, Math.min(index, chartYears.length - 1));
    return chartYears[i];
  };

  const yearToClientX = (year: number): number => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || chartYears.length < 2) return rect?.left ?? 0;
    const contentLeft = rect.left + CHART_MARGIN.left;
    const contentWidth = rect.width - CHART_MARGIN.left - CHART_MARGIN.right;
    const idx = chartYears.indexOf(year);
    const i = idx === -1 ? 0 : idx;
    const t = i / (chartYears.length - 1);
    return contentLeft + t * contentWidth;
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
          lastDragEndTime.current = Date.now();
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
      const endX = clientX ?? rangeDragCurrentX.current ?? rangeDragStartX.current;
      if (endX != null) handleChartPointerUp(endX);
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

  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (programDropdownRef.current?.contains(target)) return;
      if (generalDropdownRef.current?.contains(target)) return;
      setProgramDropdownOpen(false);
      setGeneralDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, []);

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

  const openRevenueBreakdown = () => onOpenPiePage?.(selectedYear);
  const handlePiesTabTouchStart = (e: React.TouchEvent) => {
    piesTabTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handlePiesTabTouchMove = (e: React.TouchEvent) => {
    if (!piesTabTouchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - piesTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - piesTabTouchStartRef.current.y);
    if (deltaX < -50 && deltaY < 100) {
      openRevenueBreakdown();
      piesTabTouchStartRef.current = null;
    }
  };
  const handlePiesTabTouchEnd = (e: React.TouchEvent) => {
    if (!piesTabTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - piesTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - piesTabTouchStartRef.current.y);
    if (Math.abs(deltaX) < 10 && deltaY < 10) openRevenueBreakdown();
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

  const toggleTrendKey: Record<(typeof REVENUE_TOGGLE_KEYS)[number], keyof typeof toggles> = {
    total: 'trendTotal',
    genGov: 'trendGenGov',
    schools: 'trendSchools',
    emergCommDist: 'trendEmergCommDist',
    mud: 'trendMud',
  };
  const toggleInflationKey: Record<(typeof REVENUE_TOGGLE_KEYS)[number], keyof typeof toggles> = {
    total: 'inflationTotal',
    genGov: 'inflationGenGov',
    schools: 'inflationSchools',
    emergCommDist: 'inflationEmergCommDist',
    mud: 'inflationMud',
  };

  const selectedEntity = REVENUE_TOGGLE_KEYS.find((k) => toggles[k]) ?? 'total';

  const AND_BEYOND_NOMINAL_KEY = 'andBeyondProjection';
  const AND_BEYOND_REAL_KEY = 'andBeyondProjectionReal';

  const chartDataWithExtension = useMemo(() => {
    if (!andBeyondOn || !andBeyondEnabled || andBeyondStartYearClamped == null || andBeyondYearsForward < 1) return chartData;
    const dataKey = REVENUE_TOGGLE_DATA_KEYS[selectedEntity];
    const trendKey = `${dataKey}Trend`;
    const realKey = `${dataKey}Real`;
    const realTrendKey = `${dataKey}RealTrend`;
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
    toggleInflationKey,
  ]);

  const handleSelectEntity = (key: (typeof REVENUE_TOGGLE_KEYS)[number]) => {
    setToggles((prev) => {
      const next = { ...prev };
      REVENUE_TOGGLE_KEYS.forEach((k) => {
        next[k] = k === key;
        next[toggleTrendKey[k]] = false;
        next[toggleInflationKey[k]] = false;
      });
      return next;
    });
  };

  const revenuePie = useMemo(
    () =>
      getRevenuePieForYear(
        lines,
        selectedYear,
        includeBusinessType,
        undefined,
        selectedProgramRevenuePaths.length > 0 ? selectedProgramRevenuePaths : null,
        selectedGeneralRevenuePaths.length > 0 ? selectedGeneralRevenuePaths : null
      ),
    [
      lines,
      selectedYear,
      includeBusinessType,
      selectedProgramRevenuePaths,
      selectedGeneralRevenuePaths,
    ]
  );
  const taxBreakdownPie = useMemo(
    () => getTaxBreakdownPieForYear(lines, selectedYear, includeBusinessType, undefined, 10),
    [lines, selectedYear, includeBusinessType]
  );

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mb-4">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
        </button>
        <p className="text-gray-500 font-bold uppercase text-sm">Loading exhibit data…</p>
      </div>
    );
  }

  const loadError = error;
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

  return (
    <div
      className={
        fullScreen
          ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-6 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100'
          : 'space-y-8'
      }
    >
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
          <div>
            <h3 className={`font-black uppercase leading-none tracking-tighter ${fullScreen || isNativeFullScreen ? 'text-xl md:text-2xl' : 'text-3xl'}`}>County Revenues</h3>
            <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">Revenue trend — drag chart to select year range</p>
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            {(fullScreen || isNativeFullScreen) && onOpenPiePage && (
              <button
                type="button"
                onClick={() => onOpenPiePage(selectedYear)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-black uppercase rounded-lg hover:bg-pink-700 transition-colors"
              >
                <i className="fa-solid fa-chart-pie"></i> View revenue breakdown
              </button>
            )}
          </div>
          <div className="hidden md:flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isNativeFullScreen ? (
                <button
                  type="button"
                  onClick={() => {
                    const exit = document.exitFullscreen ?? (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
                    if (exit) {
                      exit().then(() => onBack()).catch(() => onBack());
                    } else {
                      onBack();
                    }
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

        {!fullScreen && (
          <button onClick={onBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors mt-2 mb-4 w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
          </button>
        )}
        {/* Mobile close/expand when fullscreen - desktop has it in header */}
        {(fullScreen || isNativeFullScreen) && (
          <div className="md:hidden flex justify-end gap-2 shrink-0 mb-4">
            {isNativeFullScreen ? (
              <button
                type="button"
                onClick={() => {
                  const exit = document.exitFullscreen ?? (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
                  if (exit) {
                    exit().then(() => onBack()).catch(() => onBack());
                  } else {
                    onBack();
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors"
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
                className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-black uppercase rounded-lg hover:bg-indigo-200 transition-colors border border-indigo-200"
              >
                <i className="fa-solid fa-expand mr-1.5"></i> Expand chart
              </button>
            )}
          </div>
        )}

        <div className={`flex flex-wrap gap-4 items-center ${fullScreen || isNativeFullScreen ? 'shrink-0 mb-4' : 'mb-4'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={programRevenuesOn}
              onChange={(e) => {
                const on = e.target.checked;
                setProgramRevenuesOn(on);
                if (!on) setSelectedProgramRevenuePaths([]);
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-bold uppercase text-gray-700">Program Revenues</span>
          </label>
          {programRevenuesOn && (
            <div className="relative" ref={programDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setProgramDropdownOpen((o) => !o);
                  setGeneralDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Filter by category
                {selectedProgramRevenuePaths.length > 0 && (
                  <span className="text-indigo-400">({selectedProgramRevenuePaths.length})</span>
                )}
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${programDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {programDropdownOpen && (
                <RevenueHierarchyDropdown
                  tree={programHierarchyTree}
                  selectedPaths={selectedProgramRevenuePaths}
                  onTogglePath={(path) => {
                    setSelectedProgramRevenuePaths((prev) =>
                      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
                    );
                  }}
                  onClose={() => setProgramDropdownOpen(false)}
                  onSelectAllUnder={(paths, add) =>
                    setSelectedProgramRevenuePaths((prev) =>
                      add ? [...new Set([...prev, ...paths])] : prev.filter((p) => !paths.includes(p))
                    )
                  }
                />
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generalRevenuesOn}
              onChange={(e) => {
                const on = e.target.checked;
                setGeneralRevenuesOn(on);
                if (!on) setSelectedGeneralRevenuePaths([]);
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-bold uppercase text-gray-700">General Revenues</span>
          </label>
          {generalRevenuesOn && (
            <div className="relative" ref={generalDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setGeneralDropdownOpen((o) => !o);
                  setProgramDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Filter by category
                {selectedGeneralRevenuePaths.length > 0 && (
                  <span className="text-indigo-400">({selectedGeneralRevenuePaths.length})</span>
                )}
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${generalDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {generalDropdownOpen && (
                <RevenueHierarchyDropdown
                  tree={generalHierarchyTree}
                  selectedPaths={selectedGeneralRevenuePaths}
                  onTogglePath={(path) => {
                    setSelectedGeneralRevenuePaths((prev) =>
                      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
                    );
                  }}
                  onClose={() => setGeneralDropdownOpen(false)}
                  onSelectAllUnder={(paths, add) =>
                    setSelectedGeneralRevenuePaths((prev) =>
                      add ? [...new Set([...prev, ...paths])] : prev.filter((p) => !paths.includes(p))
                    )
                  }
                />
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBusinessType}
              onChange={(e) => setIncludeBusinessType(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-bold uppercase text-gray-700">Include Water &amp; Sewer</span>
          </label>
        </div>

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
          {/* Mobile peeking left tab - anchored when fullScreen */}
          {(fullScreen || isNativeFullScreen) ? (
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
          {/* Mobile peeking right tab - revenue breakdown page when fullScreen */}
          {(fullScreen || isNativeFullScreen) && onOpenPiePage ? (
            <div
              className="md:hidden peeking-tab-right-anchored"
              onTouchStart={handlePiesTabTouchStart}
              onTouchMove={handlePiesTabTouchMove}
              onTouchEnd={handlePiesTabTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onOpenPiePage(selectedYear)}
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
              const y1 = clientXToYear(Math.min(dragBand.startX, dragBand.endX));
              const y2 = clientXToYear(Math.max(dragBand.startX, dragBand.endX));
              if (y1 != null && y2 != null) {
                bandLeft = yearToClientX(y1) - rect.left;
                bandWidth = Math.max(0, yearToClientX(y2) - rect.left - bandLeft);
                centerX = bandLeft + bandWidth / 2;
              } else return null;
            } else return null;
            const edgeWidth = 12;
            const selectButtonWidth = 80;
            const selectLeft = Math.max(0, Math.min(rect.width - selectButtonWidth, centerX - selectButtonWidth / 2));
            return (
              <div
                className="absolute inset-0 z-[5]"
                style={{ pointerEvents: 'auto' }}
                onClick={() => {
                  if (Date.now() - lastDragEndTime.current < 400) {
                    ignoreNextOverlayClick.current = false;
                    return;
                  }
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
                      style={{ left: selectLeft }}
                    >
                      Select
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataWithExtension} margin={{ top: 10, right: 5, left: -12.5, bottom: 0 }}>
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
                          : chartDataWithExtension.length > 0
                            ? [...new Set(chartDataWithExtension.map((d: any) => d.year))].sort((a, b) => a - b)
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
                  if (active && payload && payload.length && chartDataWithExtension.length && baselineRow) {
                    const data = payload[0].payload as any;
                    const MUD_2020_MSG = '2020 not Reported due to COVID 19 and software upgrade';
                    const dataKey = REVENUE_TOGGLE_DATA_KEYS[selectedEntity];
                    const label = REVENUE_TOGGLE_LABELS[selectedEntity];
                    const color = REVENUE_TOGGLE_COLORS[selectedEntity];
                    const trendKey = toggleTrendKey[selectedEntity];
                    const inflKey = toggleInflationKey[selectedEntity];
                    const showReal = toggles[inflKey];
                    if (selectedEntity === 'mud' && data.year === 2020) {
                      return (
                        <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                          <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-gray-400" />
                              {label}
                            </span>
                            <p className="text-xs text-gray-600 max-w-[200px] whitespace-normal break-words">{MUD_2020_MSG}</p>
                          </div>
                        </div>
                      );
                    }
                    const nominalVal = Number(data[dataKey]);
                    const realVal = showReal ? Number(data[`${dataKey}Real`]) : NaN;
                    const hasNominal = Number.isFinite(nominalVal);
                    const hasReal = Number.isFinite(realVal);
                    if (!hasNominal && !hasReal) return null;
                    const pctNominal =
                      toggles[trendKey] && latestRow && hasNominal
                        ? pctChangeOverRange(Number(baselineRow[dataKey]), Number(latestRow[dataKey]))
                        : null;
                    const pctReal =
                      toggles[trendKey] && latestRow && hasReal
                        ? pctChangeOverRange(Number(baselineRow[`${dataKey}Real`]), Number(latestRow[`${dataKey}Real`]))
                        : null;
                    const fmtNominal = formatPctChange(pctNominal);
                    const fmtReal = formatPctChange(pctReal);
                    return (
                      <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                        <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                        <div className="space-y-2">
                          {hasNominal && (
                            <>
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
                                <span className="text-sm font-black" style={{ color }}>{formatCurrency(nominalVal)}</span>
                              </div>
                              {toggles[trendKey] && pctNominal !== null && (
                                <div className="flex justify-between items-center gap-6 pl-3">
                                  <span className="text-[10px] font-black uppercase text-gray-400">% Change</span>
                                  <span className={`text-sm font-black ${fmtNominal.isPositive ? 'text-green-600' : 'text-red-600'}`}>{fmtNominal.text}</span>
                                </div>
                              )}
                            </>
                          )}
                          {hasReal && (
                            <>
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-[10px] font-black uppercase text-gray-400">{label} (inflation adj.)</span>
                                <span className="text-sm font-black" style={{ color, opacity: 0.9 }}>{formatCurrency(realVal)}</span>
                              </div>
                              {toggles[trendKey] && pctReal !== null && (
                                <div className="flex justify-between items-center gap-6 pl-3">
                                  <span className="text-[10px] font-black uppercase text-gray-400">% Change (real)</span>
                                  <span className={`text-sm font-black ${fmtReal.isPositive ? 'text-green-600' : 'text-red-600'}`}>{fmtReal.text}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {(() => {
                const INFLATION_LINE_COLOR = '#fb923c';
                const dataKey = REVENUE_TOGGLE_DATA_KEYS[selectedEntity];
                const label = REVENUE_TOGGLE_LABELS[selectedEntity];
                const color = REVENUE_TOGGLE_COLORS[selectedEntity];
                const trendKey = toggleTrendKey[selectedEntity];
                const inflKey = toggleInflationKey[selectedEntity];
                const showReal = toggles[inflKey];
                const connectNulls = selectedEntity === 'emergCommDist' || selectedEntity === 'mud' ? false : undefined;
                return (
                  <>
                    <Line
                      type="monotone"
                      dataKey={dataKey}
                      name={label}
                      stroke={color}
                      strokeWidth={selectedEntity === 'total' ? 5 : 3}
                      dot={(p) => <ClickableDot {...p} getUrl={(d: any) => d.pdf_page_url} />}
                      connectNulls={connectNulls}
                    />
                    {showReal && (
                      <Line
                        type="monotone"
                        dataKey={`${dataKey}Real`}
                        name={`${label} (inflation adj.)`}
                        stroke={INFLATION_LINE_COLOR}
                        strokeWidth={selectedEntity === 'total' ? 5 : 3}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.85}
                        connectNulls={connectNulls}
                      />
                    )}
                    {toggles[trendKey] && (
                      <Line
                        type="monotone"
                        dataKey={`${dataKey}Trend`}
                        name={`${label} trend`}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.4}
                      />
                    )}
                    {toggles[trendKey] && showReal && (
                      <Line
                        type="monotone"
                        dataKey={`${dataKey}RealTrend`}
                        name={`${label} trend (inflation adj.)`}
                        stroke={INFLATION_LINE_COLOR}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        opacity={0.35}
                      />
                    )}
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
                        {toggles[inflKey] && (
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
                    {selectedEntity === 'mud' && (
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
                        {showReal && (
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
                  </>
                );
              })()}
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

        {/* Desktop only: collapsible panel with toggle at top (mirrors County Expenditures) */}
        <div className="hidden md:block border-t border-gray-50 shrink-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center h-12 border-b border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setDesktopTogglesOpen(!desktopTogglesOpen)}
              aria-label={desktopTogglesOpen ? 'Close chart controls' : 'Open chart controls'}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {desktopTogglesOpen ? (
                <i className="fa-solid fa-chevron-up text-xl strobe-chart-controls" />
              ) : (
                <>
                  <i className="fa-solid fa-chevron-down text-xl strobe-chart-controls" />
                  <span>Chart controls</span>
                </>
              )}
            </button>
          </div>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: desktopTogglesOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className={`space-y-8 pt-6 px-4 ${fullScreen || isNativeFullScreen ? 'pb-2' : 'pb-4'}`}>
                <div className={`space-y-4 ${fullScreen || isNativeFullScreen ? '' : 'mb-8'}`}>
                  <div className={`grid grid-cols-[200px_1fr_1fr_1fr_1fr_1fr] items-end gap-x-2 ${fullScreen || isNativeFullScreen ? 'gap-y-2' : 'gap-y-4'}`}>
                    <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest pb-2">Toggle Comparison</div>
                    {REVENUE_TOGGLE_KEYS.map((key) => (
                      <div key={key} className="text-center">
                        <button
                          onClick={() => handleSelectEntity(key)}
                          className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? '' : 'text-gray-400'}`}
                          style={toggles[key] ? { color: REVENUE_TOGGLE_COLORS[key] } : undefined}
                        >
                          <div
                            className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? '' : 'bg-gray-100'}`}
                            style={toggles[key] ? { backgroundColor: REVENUE_TOGGLE_COLORS[key] } : undefined}
                          />
                          {REVENUE_TOGGLE_LABELS[key]}
                        </button>
                      </div>
                    ))}
                    <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
                    {REVENUE_TOGGLE_KEYS.map((key) => {
                      const isEnabled = key === selectedEntity;
                      return (
                        <div key={key} className="flex justify-center">
                          <div
                            onClick={isEnabled ? () => setToggles({ ...toggles, [toggleTrendKey[key]]: !toggles[toggleTrendKey[key]] }) : undefined}
                            className={`slider-oval ${toggles[toggleTrendKey[key]] ? 'slider-active slider-netWorth-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                            title="Trend"
                          >
                            <div className="slider-circle"></div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
                    {REVENUE_TOGGLE_KEYS.map((key) => {
                      const isEnabled = key === selectedEntity;
                      return (
                        <div key={key} className="flex justify-center">
                          <div
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
          </div>
        </div>

        </div>

        {/* Mobile peeking tab - fixed position when not fullScreen */}
        {!(fullScreen || isNativeFullScreen) && (
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
                  <div className="grid grid-cols-1 gap-6">
                    {REVENUE_TOGGLE_KEYS.map((key) => (
                      <div key={key} className="text-center">
                        <button
                          onClick={() => handleSelectEntity(key)}
                          className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? '' : 'text-gray-400'}`}
                          style={toggles[key] ? { color: REVENUE_TOGGLE_COLORS[key] } : {}}
                        >
                          <div className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? '' : 'bg-gray-100'}`} style={toggles[key] ? { backgroundColor: REVENUE_TOGGLE_COLORS[key] } : {}} />
                          {REVENUE_TOGGLE_LABELS[key]}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Trend Toggle</div>
                  <div className="grid grid-cols-5 gap-4 items-center">
                    {REVENUE_TOGGLE_KEYS.map((key) => {
                      const isEnabled = key === selectedEntity;
                      return (
                        <div key={key} className="flex flex-col items-center gap-2">
                          <div
                            onClick={isEnabled ? () => setToggles({ ...toggles, [toggleTrendKey[key]]: !toggles[toggleTrendKey[key]] }) : undefined}
                            className={`slider-oval ${toggles[toggleTrendKey[key]] ? 'slider-active slider-netWorth-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <div className="slider-circle"></div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-gray-400">{REVENUE_TOGGLE_LABELS[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Inflation Adjusted</div>
                  <div className="grid grid-cols-5 gap-4 items-center">
                    {REVENUE_TOGGLE_KEYS.map((key) => {
                      const isEnabled = key === selectedEntity;
                      return (
                        <div key={key} className="flex flex-col items-center gap-2">
                          <div
                            onClick={isEnabled ? () => setToggles({ ...toggles, [toggleInflationKey[key]]: !toggles[toggleInflationKey[key]] }) : undefined}
                            className={`slider-oval ${toggles[toggleInflationKey[key]] ? 'slider-active slider-inf-on' : ''} ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <div className="slider-circle"></div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-gray-400">{REVENUE_TOGGLE_LABELS[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pie charts - in main content when not fullScreen, in right drawer when fullScreen */}
        {!(fullScreen || isNativeFullScreen) && (
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
                          <Cell key={i} fill={REVENUE_PIE_COLORS[i % REVENUE_PIE_COLORS.length]} />
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
                          <Cell key={i} fill={REVENUE_PIE_COLORS[i % REVENUE_PIE_COLORS.length]} />
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
        {(fullScreen || isNativeFullScreen) && isPiesDrawerOpen && (
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
                            <Cell key={i} fill={REVENUE_PIE_COLORS[i % REVENUE_PIE_COLORS.length]} />
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
                            <Cell key={i} fill={REVENUE_PIE_COLORS[i % REVENUE_PIE_COLORS.length]} />
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
    </div>
  );
};

export default CountyRevenues;
