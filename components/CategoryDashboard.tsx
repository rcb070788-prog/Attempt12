import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORIES, DASHBOARDS, DOCUMENT_SECTIONS, INTERNAL_REPORTS } from '../constants';
import { formatCurrency, pctChangeOverRange, formatPctChange, recomputeTrendsForSlice } from '../utils/financeUtils';
import { NetWorthChart } from './NetWorthChart';
import CountyExpenditures from './CountyExpenditures';
import CountyExpendituresPiePage from './CountyExpendituresPiePage';
import CountyRevenues from './CountyRevenues';
import CountyRevenuesPiePage from './CountyRevenuesPiePage';

// These are the "Remote Controls" coming from the main App
interface CategoryDashboardProps {
  currentPage: string;
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  setActiveDashboard: (dash: any) => void;
  documentsStack: string[];
  setDocumentsStack: (stack: string[] | ((prev: string[]) => string[])) => void;
  chartData: any[];
  yearDetailData: any[];
  fetchYearDetails: (year: number) => void;
  // Added these "borrowed" states:
  selectedFinancialYear: number | null;
  setSelectedFinancialYear: (val: number | null) => void;
  expandedChart: string | null;
  setExpandedChart: (val: string | null) => void;
  chartLevel: number;
  setChartLevel: (val: number) => void;
  selectedParents: string[];
  setSelectedParents: (val: string[]) => void;
  selectedParent: string | null;
  setSelectedParent: (val: string | null) => void;
  hoveredData: any;
  setHoveredData: (val: any) => void;
  toggles: any;
  setToggles: (val: any) => void;
  supabase: any;
}

const CategoryDashboard: React.FC<CategoryDashboardProps> = ({
  currentPage,
  selectedCategory,
  setSelectedCategory,
  setActiveDashboard,
  documentsStack,
  setDocumentsStack,
  chartData,
  yearDetailData,
  fetchYearDetails,
  selectedFinancialYear,
  setSelectedFinancialYear,
  expandedChart,
  setExpandedChart,
  chartLevel,
  setChartLevel,
  selectedParents,
  setSelectedParents,
  selectedParent,
  setSelectedParent,
  hoveredData,
  setHoveredData,
  toggles,
  setToggles,
  supabase
}) => {
  const [showSolvencyDetail, setShowSolvencyDetail] = useState(false);
  const [solvencyTrendToggles, setSolvencyTrendToggles] = useState({
    assets: false,
    liabs: false,
    netWorth: true,
    assetsTrend: false,
    liabsTrend: false,
    netWorthTrend: false,
    assetsInf: false,
    liabsInf: false,
    netWorthInf: false
  });

  // Mobile peeking left tab + drawer for Debt & Solvency Trend
  const [solvencyDrawerOpen, setSolvencyDrawerOpen] = useState(false);
  const [solvencyDrawerDragOffset, setSolvencyDrawerDragOffset] = useState(0);
  const [solvencyDraggingDrawer, setSolvencyDraggingDrawer] = useState(false);
  const solvencyChartContainerRef = useRef<HTMLDivElement | null>(null);
  const solvencyTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const solvencyDrawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Mobile peeking right tab + full-screen compare drawer for Debt & Solvency Trend
  const [solvencyCompareDrawerOpen, setSolvencyCompareDrawerOpen] = useState(false);
  const [solvencyCompareDrawerDragOffset, setSolvencyCompareDrawerDragOffset] = useState(0);
  const [solvencyCompareDraggingDrawer, setSolvencyCompareDraggingDrawer] = useState(false);
  const solvencyCompareDrawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const solvencyCompareTabTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [solvencyTooltipOffsetX, setSolvencyTooltipOffsetX] = useState(56);
  const [solvencySelectedYearRange, setSolvencySelectedYearRange] = useState<[number, number] | null>(null);
  const [solvencyPendingYearRange, setSolvencyPendingYearRange] = useState<[number, number] | null>(null);
  const solvencyRangeDragStartX = useRef<number | null>(null);
  const solvencyRangeDragCurrentX = useRef<number | null>(null);
  const solvencyEdgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const solvencyIgnoreNextOverlayClick = useRef(false);
  const [solvencyDragBand, setSolvencyDragBand] = useState<{ startX: number; endX: number } | null>(null);

  const [activeInternalReportId, setActiveInternalReportId] = useState<string | null>(null);
  const [expensePieInitialYear, setExpensePieInitialYear] = useState<number | undefined>(undefined);
  const [revenuePieInitialYear, setRevenuePieInitialYear] = useState<number | undefined>(undefined);

  // Documents: storage bucket folder drill-down (path segments, e.g. ["Fund 101"])
  const [documentStoragePathStack, setDocumentStoragePathStack] = useState<string[]>([]);
  const [documentListLoading, setDocumentListLoading] = useState(false);
  const [documentListError, setDocumentListError] = useState<string | null>(null);
  const [documentListItems, setDocumentListItems] = useState<{ kind: 'folder' | 'file'; name: string; path: string }[]>([]);
  const [selectedWageCsvPath, setSelectedWageCsvPath] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveInternalReportId(null);
  }, [selectedCategory]);

  // Reset storage path when user switches document section
  React.useEffect(() => {
    setDocumentStoragePathStack([]);
  }, [documentsStack[0]]);

  // Reset selected wage CSV when list or folder changes
  React.useEffect(() => {
    setSelectedWageCsvPath(null);
  }, [documentsStack.join(','), documentListItems.length]);

  // Fetch bucket list when at document view level for a section with bucketName
  React.useEffect(() => {
    const topId = documentsStack[0];
    const section = DOCUMENT_SECTIONS.find(s => s.id === topId);
    const isViewLevel = documentsStack.length >= 2 || (documentsStack.length === 1 && (!section || !section.children));
    const bucketName = section?.bucketName;
    if (selectedCategory !== 'documents' || !isViewLevel || !bucketName || !supabase) {
      setDocumentListItems([]);
      setDocumentListError(null);
      return;
    }
    const basePrefix = section?.bucketPathPrefix ?? '';
    let prefix: string;
    if (section?.children && documentsStack.length >= 2) {
      const childId = documentsStack[1];
      const child = section.children.find(c => c.id === childId);
      prefix = basePrefix + (child?.folderPath ? child.folderPath + '/' : '');
    } else {
      prefix = basePrefix + (documentStoragePathStack.length ? documentStoragePathStack.join('/') + '/' : '');
    }
    let cancelled = false;
    setDocumentListLoading(true);
    setDocumentListError(null);
    supabase.storage.from(bucketName).list(prefix, { limit: 500 })
      .then(({ data, error }) => {
        if (cancelled) return;
        setDocumentListLoading(false);
        if (import.meta.env.DEV && section?.id === 'expense-reports-by-fund') {
          console.log('Expense Reports by Fund list', { bucketName, prefix, data, error });
        }
        if (error) {
          setDocumentListError(error.message || 'Unable to load documents');
          setDocumentListItems([]);
          return;
        }
        const items: { kind: 'folder' | 'file'; name: string; path: string }[] = [];
        const folderNames = new Set<string>();
        (data || []).forEach((item: { name: string }) => {
          const name = item.name;
          const relative = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name;
          if (relative.includes('/')) {
            const segment = relative.split('/')[0];
            if (segment && !folderNames.has(segment)) {
              folderNames.add(segment);
              items.push({ kind: 'folder', name: segment, path: prefix + segment });
            }
          } else {
            const hasExtension = /\.[a-zA-Z0-9]+$/.test(relative);
            if (!hasExtension && relative && !folderNames.has(relative)) {
              folderNames.add(relative);
              items.push({ kind: 'folder', name: relative, path: prefix + relative });
            } else if (relative) {
              items.push({ kind: 'file', name: relative, path: prefix + relative });
            }
          }
        });
        // Sort: folders first then files, each group alphabetically
        items.sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
        setDocumentListItems(items);
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentListLoading(false);
          setDocumentListError('Unable to load documents');
          setDocumentListItems([]);
        }
      });
    return () => { cancelled = true; };
  }, [selectedCategory, documentsStack, documentStoragePathStack, supabase]);

  const solvencyDisplayedData = useMemo(() => {
    if (!chartData.length) return [];
    if (!solvencySelectedYearRange) return chartData;
    const [minY, maxY] = solvencySelectedYearRange;
    const filtered = chartData.filter((d: any) => d.year >= minY && d.year <= maxY);
    if (filtered.length < 2) return chartData;
    return recomputeTrendsForSlice(filtered, selectedParents);
  }, [chartData, solvencySelectedYearRange, selectedParents]);

  const solvencyBaselineRow = solvencyDisplayedData.length ? solvencyDisplayedData[0] : null;
  const solvencyLatestRow = solvencyDisplayedData.length ? solvencyDisplayedData[solvencyDisplayedData.length - 1] : null;

  const solvencyChartYears = useMemo(() => chartData.map((d: any) => d.year), [chartData]);
  const solvencyChartMinYear = solvencyChartYears[0] ?? 2005;
  const solvencyChartMaxYear = solvencyChartYears[solvencyChartYears.length - 1] ?? 2025;

  const solvencyClientXToYear = (clientX: number): number | null => {
    const rect = solvencyChartContainerRef.current?.getBoundingClientRect();
    if (!rect || !solvencyChartYears.length) return null;
    const t = (clientX - rect.left) / rect.width;
    const index = Math.round(t * (solvencyChartYears.length - 1));
    const i = Math.max(0, Math.min(index, solvencyChartYears.length - 1));
    return solvencyChartYears[i];
  };

  const solvencyYearToClientX = (year: number): number => {
    const rect = solvencyChartContainerRef.current?.getBoundingClientRect();
    if (!rect || solvencyChartYears.length < 2) return rect?.left ?? 0;
    const index = solvencyChartYears.indexOf(year);
    const i = index === -1 ? 0 : index;
    const t = i / (solvencyChartYears.length - 1);
    return rect.left + t * rect.width;
  };

  const solvencyIsRangeSelecting = !!(solvencyDragBand || solvencyPendingYearRange);
  const { solvencyRangeStartYear, solvencyRangeEndYear } = (() => {
    let start = solvencyChartMinYear;
    let end = solvencyChartMaxYear;
    if (solvencyPendingYearRange) {
      start = solvencyPendingYearRange[0];
      end = solvencyPendingYearRange[1];
    } else if (solvencyDragBand) {
      const y1 = solvencyClientXToYear(solvencyDragBand.startX);
      const y2 = solvencyClientXToYear(solvencyDragBand.endX);
      if (y1 != null && y2 != null) {
        start = Math.min(y1, y2);
        end = Math.max(y1, y2);
      }
    }
    return { solvencyRangeStartYear: start, solvencyRangeEndYear: end };
  })();

  const handleSolvencyChartPointerDown = (clientX: number) => {
    if (solvencyPendingYearRange) return;
    solvencyRangeDragStartX.current = clientX;
    solvencyRangeDragCurrentX.current = clientX;
    setSolvencyDragBand({ startX: clientX, endX: clientX });
  };

  const handleSolvencyChartPointerMove = (clientX: number) => {
    if (solvencyEdgeBeingDragged.current === 'left' && solvencyPendingYearRange) {
      const y = solvencyClientXToYear(clientX);
      if (y != null) {
        const [, endY] = solvencyPendingYearRange;
        const newStart = Math.max(solvencyChartMinYear, Math.min(y, endY - 1));
        setSolvencyPendingYearRange([newStart, endY]);
      }
      return;
    }
    if (solvencyEdgeBeingDragged.current === 'right' && solvencyPendingYearRange) {
      const y = solvencyClientXToYear(clientX);
      if (y != null) {
        const [startY] = solvencyPendingYearRange;
        const newEnd = Math.min(solvencyChartMaxYear, Math.max(y, startY + 1));
        setSolvencyPendingYearRange([startY, newEnd]);
      }
      return;
    }
    if (solvencyRangeDragStartX.current != null) {
      solvencyRangeDragCurrentX.current = clientX;
      setSolvencyDragBand((b) => (b ? { ...b, endX: clientX } : null));
    }
  };

  const handleSolvencyChartPointerUp = (clientX: number) => {
    if (solvencyEdgeBeingDragged.current) {
      solvencyEdgeBeingDragged.current = null;
      return;
    }
    if (solvencyRangeDragStartX.current != null) {
      const y1 = solvencyClientXToYear(solvencyRangeDragStartX.current);
      const y2 = solvencyClientXToYear(clientX);
      const minY = y1 != null && y2 != null ? Math.min(y1, y2) : null;
      const maxY = y1 != null && y2 != null ? Math.max(y1, y2) : null;
      const rangeOk = minY != null && maxY != null && maxY - minY >= 1;
      const didSetPending = rangeOk;
      if (y1 != null && y2 != null) {
        const minY_ = Math.min(y1, y2);
        const maxY_ = Math.max(y1, y2);
        if (maxY_ - minY_ >= 1) {
          solvencyIgnoreNextOverlayClick.current = true;
          setSolvencyPendingYearRange([minY_, maxY_]);
        }
      }
      solvencyRangeDragStartX.current = null;
      solvencyRangeDragCurrentX.current = null;
      setSolvencyDragBand(null);
    }
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX != null) handleSolvencyChartPointerMove(clientX);
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0]?.clientX : e.clientX;
      if (clientX != null) handleSolvencyChartPointerUp(clientX);
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
  }, [solvencyPendingYearRange, solvencyChartYears.length]);

  useEffect(() => {
    const onPopstate = () => {
      if (solvencySelectedYearRange) setSolvencySelectedYearRange(null);
    };
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, [solvencySelectedYearRange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSolvencyPendingYearRange(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Responsive tooltip horizontal offset for Debt & Solvency charts
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setSolvencyTooltipOffsetX(mq.matches ? 72 : 56);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Reset drag state when Debt & Solvency drawer closes
  useEffect(() => {
    if (!solvencyDrawerOpen) {
      setSolvencyDrawerDragOffset(0);
      setSolvencyDraggingDrawer(false);
      solvencyDrawerTouchStartRef.current = null;
    }
  }, [solvencyDrawerOpen]);

  // Reset drag state when compare (right) drawer closes
  useEffect(() => {
    if (!solvencyCompareDrawerOpen) {
      setSolvencyCompareDrawerDragOffset(0);
      setSolvencyCompareDraggingDrawer(false);
      solvencyCompareDrawerTouchStartRef.current = null;
    }
  }, [solvencyCompareDrawerOpen]);

  // Touch handlers for Debt & Solvency peeking tab - drag to open
  const handleSolvencyTabTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    solvencyTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSolvencyTabTouchMove = (e: React.TouchEvent) => {
    if (!solvencyTouchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - solvencyTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - solvencyTouchStartRef.current.y);

    if (deltaX > 50 && deltaY < 100) {
      setSolvencyDrawerOpen(true);
      solvencyTouchStartRef.current = null;
    }
  };

  const handleSolvencyTabTouchEnd = (e: React.TouchEvent) => {
    if (!solvencyTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - solvencyTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - solvencyTouchStartRef.current.y);

    if (Math.abs(deltaX) < 10 && deltaY < 10) {
      setSolvencyDrawerOpen(!solvencyDrawerOpen);
    }

    solvencyTouchStartRef.current = null;
  };

  // Touch handlers for Debt & Solvency drawer - drag to close
  const handleSolvencyDrawerTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    solvencyDrawerTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSolvencyDraggingDrawer(true);
  };

  const handleSolvencyDrawerTouchMove = (e: React.TouchEvent) => {
    if (!solvencyDrawerTouchStartRef.current || !solvencyDraggingDrawer) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - solvencyDrawerTouchStartRef.current.x;

    if (deltaX < 0) {
      e.preventDefault();
      setSolvencyDrawerDragOffset(deltaX);
    }
  };

  const handleSolvencyDrawerTouchEnd = () => {
    if (!solvencyDraggingDrawer) return;

    if (solvencyDrawerDragOffset < -100) {
      setSolvencyDrawerOpen(false);
    }

    setSolvencyDrawerDragOffset(0);
    setSolvencyDraggingDrawer(false);
    solvencyDrawerTouchStartRef.current = null;
  };

  // Touch handlers for compare (right) drawer - drag right to close
  const handleSolvencyCompareDrawerTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    solvencyCompareDrawerTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSolvencyCompareDraggingDrawer(true);
  };

  const handleSolvencyCompareDrawerTouchMove = (e: React.TouchEvent) => {
    if (!solvencyCompareDrawerTouchStartRef.current || !solvencyCompareDraggingDrawer) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - solvencyCompareDrawerTouchStartRef.current.x;

    if (deltaX > 0) {
      e.preventDefault();
      setSolvencyCompareDrawerDragOffset(deltaX);
    }
  };

  const handleSolvencyCompareDrawerTouchEnd = () => {
    if (!solvencyCompareDraggingDrawer) return;

    if (solvencyCompareDrawerDragOffset > 100) {
      setSolvencyCompareDrawerOpen(false);
    }

    setSolvencyCompareDrawerDragOffset(0);
    setSolvencyCompareDraggingDrawer(false);
    solvencyCompareDrawerTouchStartRef.current = null;
  };

  // Touch handlers for peeking right tab - swipe left to open compare drawer (mirror of left tab)
  const openCompareDrawer = () => {
    if (chartLevel === 1) setChartLevel(2);
    setSolvencyCompareDrawerOpen(true);
  };

  const handleSolvencyCompareTabTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    solvencyCompareTabTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSolvencyCompareTabTouchMove = (e: React.TouchEvent) => {
    if (!solvencyCompareTabTouchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - solvencyCompareTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - solvencyCompareTabTouchStartRef.current.y);

    if (deltaX < -50 && deltaY < 100) {
      openCompareDrawer();
      solvencyCompareTabTouchStartRef.current = null;
    }
  };

  const handleSolvencyCompareTabTouchEnd = (e: React.TouchEvent) => {
    if (!solvencyCompareTabTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - solvencyCompareTabTouchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - solvencyCompareTabTouchStartRef.current.y);

    if (Math.abs(deltaX) < 10 && deltaY < 10) {
      openCompareDrawer();
    }

    solvencyCompareTabTouchStartRef.current = null;
  };

  // Reset detail view when leaving solvency category
  React.useEffect(() => {
    if (selectedCategory !== 'solvency') setShowSolvencyDetail(false);
  }, [selectedCategory]);

  // Default to Governmental when Debt & Solvency view is shown with no component selected
  React.useEffect(() => {
    const onDebtSolvencyView = selectedCategory === 'solvency' && showSolvencyDetail;
    if (onDebtSolvencyView && selectedParents.length === 0) {
      setChartLevel(2);
      setSelectedParents(['Governmental']);
    }
  }, [selectedCategory, showSolvencyDetail, selectedParents.length]);

  // Auto-expand Debt & Solvency Trend to full screen when entering view
  React.useEffect(() => {
    const onDebtSolvencyView = selectedCategory === 'solvency' && showSolvencyDetail;
    if (onDebtSolvencyView) {
      setExpandedChart('solvency');
    } else if (expandedChart === 'solvency') {
      setExpandedChart(null);
    }
  }, [selectedCategory, showSolvencyDetail]);

  const solvencyComponentOptions = [
    { id: 'Governmental', label: 'Governmental', highlightClass: 'bg-blue-600' },
    { id: 'Business-type', label: 'Business-type', highlightClass: 'bg-cyan-600' },
    { id: 'School Department', label: 'School Dept', highlightClass: 'bg-pink-600' },
    { id: 'Emergency Communications District', label: 'Emerg Comm Dist', highlightClass: 'bg-amber-600' }
  ];

  if (currentPage !== 'home' || !selectedCategory) return null;

  const currentCategoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label;

  /* County Net Worth: full-viewport layout, no scrolling */
  if (selectedCategory === 'solvency' && !showSolvencyDetail) {
    return (
      <div className="fixed inset-0 z-10 bg-gray-50 flex flex-col overflow-hidden animate-slide-up pt-14 md:pt-0">
        <div className="hidden md:flex shrink-0 px-4 md:px-6 py-3 flex-col gap-2">
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 leading-tight">
              {currentCategoryLabel}
            </h2>
            <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Select a report to view official records</p>
          </div>
          <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to Main Menu
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pb-4">
          <NetWorthChart
            chartData={chartData}
            toggles={toggles}
            setToggles={setToggles}
            setSelectedCategory={setSelectedCategory}
            onMoreClick={() => {
              setShowSolvencyDetail(true);
              setChartLevel(2);
              setSelectedParents(['Governmental']);
            }}
            fullScreen
          />
        </div>
      </div>
    );
  }

  /* Documents: folder drill-down with per-level back */
  if (selectedCategory === 'documents') {
    const stack = documentsStack;
    const isRoot = stack.length === 0;
    const topId = stack[0];
    const section = DOCUMENT_SECTIONS.find(s => s.id === topId);
    const isInsideFolder = stack.length === 1 && section?.children;
    const isViewLevel = stack.length >= 2 || (stack.length === 1 && (!section || !section.children));
    const currentTitle = isRoot
      ? 'Documents'
      : isViewLevel
        ? (stack.length === 1 && section ? section.title : DOCUMENT_SECTIONS.find(s => s.id === stack[0])?.children?.find(c => c.id === stack[1])?.title ?? stack[stack.length - 1])
        : section?.title ?? 'Documents';
    const backLabel = isRoot
      ? 'Back to Main Menu'
      : stack.length === 1
        ? 'Back to Documents'
        : `Back to ${section?.title ?? 'Documents'}`;
    const handleBack = () => {
      if (stack.length > 0) {
        setDocumentsStack(prev => prev.slice(0, -1));
      } else {
        setSelectedCategory(null);
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-8 py-10 animate-slide-up">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black uppercase text-gray-900 leading-tight">
            {currentTitle}
          </h2>
          <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
            {isRoot ? 'Select a document category' : isViewLevel ? 'Documents will appear here once uploaded to Supabase' : 'Select a report'}
          </p>
          <button onClick={handleBack} className="text-[10px] font-black uppercase text-gray-400 hover:text-yellow-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> {backLabel}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-8">
          {isRoot &&
            DOCUMENT_SECTIONS.map(sec => (
              <div
                key={sec.id}
                onClick={() => setDocumentsStack([sec.id])}
                className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-500 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-yellow-600 tracking-tighter">{sec.title}</h3>
                  {sec.children && <p className="text-gray-400 text-sm font-medium">{sec.children.length} reports</p>}
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            ))}

          {isInsideFolder &&
            section?.children?.map(child => (
              <div
                key={child.id}
                onClick={() => setDocumentsStack(prev => [...prev, child.id])}
                className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-500 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-yellow-600 tracking-tighter">{child.title}</h3>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            ))}

          {isViewLevel && section?.bucketName && (
            <>
              {documentStoragePathStack.length > 0 && (
                <button
                  onClick={() => setDocumentStoragePathStack(prev => prev.slice(0, -1))}
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-yellow-600 transition-colors w-fit mb-2"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i> Back to {documentStoragePathStack.length === 1 ? 'list' : 'folder'}
                </button>
              )}
              {documentListLoading && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                  <i className="fa-solid fa-spinner fa-spin text-yellow-500 text-4xl mb-4"></i>
                  <p className="text-gray-400 font-black uppercase text-xs">Loading documents…</p>
                </div>
              )}
              {!documentListLoading && documentListError && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                  <i className="fa-solid fa-triangle-exclamation text-amber-400 text-4xl mb-4"></i>
                  <p className="text-gray-600 font-bold mb-4">{documentListError}</p>
                  <button
                    onClick={() => {
                      setDocumentListError(null);
                      const basePrefix = section?.bucketPathPrefix ?? '';
                      let prefix: string;
                      if (section?.children && documentsStack.length >= 2) {
                        const child = section.children.find((c: { id: string; folderPath?: string }) => c.id === documentsStack[1]);
                        prefix = basePrefix + (child?.folderPath ? child.folderPath + '/' : '');
                      } else {
                        prefix = basePrefix + (documentStoragePathStack.length ? documentStoragePathStack.join('/') + '/' : '');
                      }
                      setDocumentListLoading(true);
                      supabase?.storage.from(section!.bucketName!).list(prefix, { limit: 500 })
                        .then(({ data, error }) => {
                          setDocumentListLoading(false);
                          if (import.meta.env.DEV && section?.id === 'expense-reports-by-fund') {
                            console.log('Expense Reports by Fund list (retry)', { prefix, data, error });
                          }
                          if (error) {
                            setDocumentListError(error.message || 'Unable to load documents');
                            setDocumentListItems([]);
                            return;
                          }
                          const items: { kind: 'folder' | 'file'; name: string; path: string }[] = [];
                          const folderNames = new Set<string>();
                          (data || []).forEach((item: { name: string }) => {
                            const name = item.name;
                            const relative = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name;
                            if (relative.includes('/')) {
                              const segment = relative.split('/')[0];
                              if (segment && !folderNames.has(segment)) {
                                folderNames.add(segment);
                                items.push({ kind: 'folder', name: segment, path: prefix + segment });
                              }
                            } else {
                              const hasExtension = /\.[a-zA-Z0-9]+$/.test(relative);
                              if (!hasExtension && relative && !folderNames.has(relative)) {
                                folderNames.add(relative);
                                items.push({ kind: 'folder', name: relative, path: prefix + relative });
                              } else if (relative) {
                                items.push({ kind: 'file', name: relative, path: prefix + relative });
                              }
                            }
                          });
                          items.sort((a, b) => {
                            if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
                            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                          });
                          setDocumentListItems(items);
                        })
                        .catch(() => {
                          setDocumentListLoading(false);
                          setDocumentListError('Unable to load documents');
                        });
                    }}
                    className="px-6 py-3 bg-yellow-500 text-white font-black uppercase text-[10px] rounded-xl hover:bg-yellow-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!documentListLoading && !documentListError && documentListItems.length === 0 && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                  <i className="fa-solid fa-folder-open text-yellow-200 text-4xl mb-4"></i>
                  <p className="text-gray-400 font-black uppercase text-xs">No documents in this folder.</p>
                </div>
              )}
              {!documentListLoading && !documentListError && documentListItems.length > 0 && (
                (() => {
                  const isWageReportStyle = section?.id === 'wage-reports' && stack.length >= 2;
                  const files = documentListItems.filter(i => i.kind === 'file');
                  const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
                  const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
                  const extractYear = (name: string): number | null => {
                    const m = name.match(/\b(19[9][0-9]|20[0-2][0-9]|2030)\b/);
                    return m ? parseInt(m[1], 10) : null;
                  };
                  const pdfsByYear = [...pdfFiles].sort((a, b) => {
                    const yA = extractYear(a.name) ?? 0;
                    const yB = extractYear(b.name) ?? 0;
                    return yB - yA;
                  });
                  if (isWageReportStyle) {
                    const effectiveCsvPath = (selectedWageCsvPath && csvFiles.some(c => c.path === selectedWageCsvPath))
                      ? selectedWageCsvPath
                      : (csvFiles[0]?.path ?? null);
                    return (
                      <div className="space-y-6">
                        {csvFiles.length > 0 && (
                          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100">
                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Summary (CSV)</label>
                            <select
                              value={effectiveCsvPath ?? ''}
                              onChange={(e) => setSelectedWageCsvPath(e.target.value || null)}
                              className="w-full max-w-md px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 font-medium focus:border-yellow-500 focus:ring-0"
                            >
                              {csvFiles.map(f => (
                                <option key={f.path} value={f.path}>{f.name}</option>
                              ))}
                            </select>
                            {effectiveCsvPath && supabase && section?.bucketName && (
                              <a
                                href={supabase.storage.from(section.bucketName).getPublicUrl(effectiveCsvPath).data.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-3 text-yellow-600 hover:text-yellow-700 font-bold text-sm"
                              >
                                <i className="fa-solid fa-download"></i> Open / download
                              </a>
                            )}
                          </div>
                        )}
                        {pdfsByYear.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Reports by year (PDF)</p>
                            <div className="grid grid-cols-1 gap-4">
                              {pdfsByYear.map(item => (
                                <a
                                  key={item.path}
                                  href={supabase?.storage.from(section!.bucketName!).getPublicUrl(item.path).data.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-500 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group no-underline text-inherit"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-yellow-600 transition-colors">
                                      <i className="fa-solid fa-file-pdf"></i>
                                    </div>
                                    <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-yellow-600 tracking-tighter">{item.name}</h3>
                                  </div>
                                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-yellow-50 group-hover:text-yellow-600 transition-colors">
                                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {csvFiles.length === 0 && pdfsByYear.length === 0 && (
                          <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                            <p className="text-gray-400 font-black uppercase text-xs">No CSV or PDF files in this folder.</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {documentListItems.map(item => (
                        item.kind === 'folder' ? (
                          <div
                            key={item.path}
                            onClick={() => setDocumentStoragePathStack(prev => [...prev, item.name])}
                            className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-500 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-yellow-600 transition-colors">
                                <i className="fa-solid fa-folder"></i>
                              </div>
                              <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-yellow-600 tracking-tighter">{item.name}</h3>
                            </div>
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-yellow-50 group-hover:text-yellow-600 transition-colors">
                              <i className="fa-solid fa-chevron-right"></i>
                            </div>
                          </div>
                        ) : (
                          <a
                            key={item.path}
                            href={supabase?.storage.from(section!.bucketName!).getPublicUrl(item.path).data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-yellow-500 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group no-underline text-inherit"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-yellow-600 transition-colors">
                                <i className={`fa-solid ${item.name.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file'}`}></i>
                              </div>
                              <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-yellow-600 tracking-tighter">{item.name}</h3>
                            </div>
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-yellow-50 group-hover:text-yellow-600 transition-colors">
                              <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            </div>
                          </a>
                        )
                      ))}
                    </div>
                  );
                })()
              )}
            </>
          )}
          {isViewLevel && !section?.bucketName && (
            <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
              <i className="fa-solid fa-folder-open text-yellow-200 text-4xl mb-4"></i>
              <p className="text-gray-400 font-black uppercase text-xs">Documents will appear here once uploaded to Supabase.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* County Expenditures: full-viewport layout, no scrolling */
  if (selectedCategory === 'expenses' && activeInternalReportId === 'county-expenditures') {
    return (
      <div className="fixed inset-0 z-10 bg-gray-50 flex flex-col overflow-hidden animate-slide-up pt-14 md:pt-0">
        <div className="flex shrink-0 px-4 md:px-6 py-3 flex-col gap-2">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-3xl font-black uppercase text-gray-900 leading-tight">
              {currentCategoryLabel}
            </h2>
            <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">County Expenditures</p>
          </div>
          <button onClick={() => setActiveInternalReportId(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pb-4 solvency-fullscreen-container">
          <CountyExpenditures
            fullScreen
            onBack={() => setActiveInternalReportId(null)}
            onOpenPiePage={(initialYear) => {
              setExpensePieInitialYear(initialYear);
              setActiveInternalReportId('county-expenditures-pie');
            }}
          />
        </div>
      </div>
    );
  }

  /* Expense Breakdown (County Expenditures pie): full-viewport layout */
  if (selectedCategory === 'expenses' && activeInternalReportId === 'county-expenditures-pie') {
    return (
      <div className="fixed inset-0 z-10 bg-gray-50 flex flex-col overflow-hidden animate-slide-up pt-14 md:pt-0">
        <div className="hidden md:flex shrink-0 px-4 md:px-6 py-3 flex-col gap-2">
          <button onClick={() => setActiveInternalReportId('county-expenditures')} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Expenditures
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-4 md:px-6 pb-4">
          <CountyExpendituresPiePage
            onBack={() => setActiveInternalReportId('county-expenditures')}
            initialYear={expensePieInitialYear}
          />
        </div>
      </div>
    );
  }

  /* County Revenues: full-viewport layout, no scrolling */
  if (selectedCategory === 'revenues' && activeInternalReportId === 'county-revenues') {
    return (
      <div className="fixed inset-0 z-10 bg-gray-50 flex flex-col overflow-hidden animate-slide-up pt-14 md:pt-0">
        <div className="hidden md:flex shrink-0 px-4 md:px-6 py-3 flex-col gap-2">
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 leading-tight">
              {currentCategoryLabel}
            </h2>
            <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">County Revenues</p>
          </div>
          <button onClick={() => setActiveInternalReportId(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to reports
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pb-4 solvency-fullscreen-container">
          <CountyRevenues
            fullScreen
            onBack={() => setActiveInternalReportId(null)}
            onOpenPiePage={(initialYear) => {
              setRevenuePieInitialYear(initialYear);
              setActiveInternalReportId('county-revenues-pie');
            }}
          />
        </div>
      </div>
    );
  }

  /* Revenue Breakdown (County Revenues pie): full-viewport layout, no background image */
  if (selectedCategory === 'revenues' && activeInternalReportId === 'county-revenues-pie') {
    return (
      <div className="fixed inset-0 z-10 bg-gray-50 flex flex-col overflow-hidden animate-slide-up pt-14 md:pt-0">
        <div className="hidden md:flex shrink-0 px-4 md:px-6 py-3 flex-col gap-2">
          <button onClick={() => setActiveInternalReportId('county-revenues')} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to County Revenues
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-4 md:px-6 pb-4">
          <CountyRevenuesPiePage
            onBack={() => setActiveInternalReportId('county-revenues')}
            initialYear={revenuePieInitialYear}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 animate-slide-up">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black uppercase text-gray-900 leading-tight">
          {currentCategoryLabel}
        </h2>
        <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Select a report to view official records</p>
        <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors w-fit">
          <i className="fa-solid fa-arrow-left mr-2"></i> Back to Main Menu
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-8">

        {/* SOLVENCY VIEW - TIER 2: Debt & Solvency Trend (detail screen) */}
        {selectedCategory === 'solvency' && showSolvencyDetail && (
          <>
            {expandedChart !== 'solvency' && (
              <button
                onClick={() => setShowSolvencyDetail(false)}
                className="mb-6 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left"></i> Back to County Net Worth
              </button>
            )}
            <div className={`${expandedChart === 'solvency' ? 'fixed inset-0 z-[500] bg-white flex flex-col overflow-hidden h-[100dvh] md:h-screen solvency-fullscreen-container' : 'bg-white p-4 md:p-10 rounded-[3rem] shadow-xl text-gray-900 mb-6 border border-gray-100 landscape-fullscreen'}`}>
            
            <div className={`flex shrink-0 items-center gap-2 mb-2 relative ${expandedChart === 'solvency' ? 'flex-wrap' : ''}`}>
              <div className="flex items-center gap-2">
                {expandedChart === 'solvency' && (
                  <button
                    onClick={() => setShowSolvencyDetail(false)}
                    className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1"
                  >
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                )}
                <h3 className="text-xl md:text-[18.66px] font-black uppercase tracking-tighter">
                  Debt & Solvency Trend
                </h3>
              </div>
              {/* Desktop: Button group for component selection */}
              <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                {solvencyComponentOptions.map(opt => {
                  const isSelected = selectedParents.length === 1 && selectedParents[0] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setChartLevel(2);
                        setSelectedParents([opt.id]);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                        isSelected 
                          ? `${opt.highlightClass} text-white shadow-lg` 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              ref={solvencyChartContainerRef}
              className={`relative ${expandedChart === 'solvency' ? 'flex-1 min-h-0' : 'h-[400px] mb-12'} w-full`}
              onMouseDown={(e) => { if (!solvencyPendingYearRange && e.button === 0) handleSolvencyChartPointerDown(e.clientX); }}
              onTouchStart={(e) => { if (!solvencyPendingYearRange && e.touches[0]) handleSolvencyChartPointerDown(e.touches[0].clientX); }}
            >
              {/* MOBILE PEEKING LEFT - anchored to center of graph, touch on wrapper */}
              <div
                className="md:hidden peeking-tab-left-anchored"
                style={expandedChart === 'solvency' ? { zIndex: 510 } : {}}
                onTouchStart={handleSolvencyTabTouchStart}
                onTouchMove={handleSolvencyTabTouchMove}
                onTouchEnd={handleSolvencyTabTouchEnd}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSolvencyDrawerOpen(!solvencyDrawerOpen);
                  }}
                  className="bg-indigo-600 text-white p-4 rounded-r-3xl shadow-2xl border-2 border-white/20 touch-none"
                >
                  <i className="fa-solid fa-sliders text-xl"></i>
                </button>
              </div>
              {/* MOBILE PEEKING RIGHT - anchored to center of graph, minimal left padding */}
              <div
                className="md:hidden peeking-tab-right-anchored"
                style={expandedChart === 'solvency' ? { zIndex: 510 } : {}}
                onTouchStart={handleSolvencyCompareTabTouchStart}
                onTouchMove={handleSolvencyCompareTabTouchMove}
                onTouchEnd={handleSolvencyCompareTabTouchEnd}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCompareDrawer();
                  }}
                  className="bg-pink-600 text-white rounded-l-2xl shadow-2xl touch-none"
                >
                  <i className="fa-solid fa-layer-group text-xl"></i>
                </button>
              </div>
              {solvencySelectedYearRange && (
                <button
                  type="button"
                  onClick={() => setSolvencySelectedYearRange(null)}
                  className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black uppercase rounded-lg hover:bg-indigo-700"
                >
                  Back
                </button>
              )}
              {(solvencyDragBand || solvencyPendingYearRange) && solvencyChartContainerRef.current && (() => {
                const rect = solvencyChartContainerRef.current.getBoundingClientRect();
                let bandLeft: number, bandWidth: number, centerX: number;
                if (solvencyPendingYearRange) {
                  const [minY, maxY] = solvencyPendingYearRange;
                  const x0 = solvencyYearToClientX(minY) - rect.left;
                  const x1 = solvencyYearToClientX(maxY) - rect.left;
                  bandLeft = x0;
                  bandWidth = Math.max(0, x1 - x0);
                  centerX = x0 + bandWidth / 2;
                } else if (solvencyDragBand) {
                  bandLeft = Math.min(solvencyDragBand.startX, solvencyDragBand.endX) - rect.left;
                  bandWidth = Math.abs(solvencyDragBand.endX - solvencyDragBand.startX);
                  centerX = bandLeft + bandWidth / 2;
                } else return null;
                const edgeWidth = 12;
                return (
                  <div
                    className="absolute inset-0 z-[5]"
                    style={{ pointerEvents: 'auto' }}
                    onClick={() => {
                      const ignore = solvencyIgnoreNextOverlayClick.current;
                      if (ignore) {
                        solvencyIgnoreNextOverlayClick.current = false;
                        return;
                      }
                      if (solvencyPendingYearRange) setSolvencyPendingYearRange(null);
                    }}
                  >
                    <div
                      className="absolute top-0 bottom-0 bg-indigo-200/30"
                      style={{ left: bandLeft, width: bandWidth }}
                    />
                    {solvencyPendingYearRange && (
                      <>
                        <div
                          className="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-300/50"
                          style={{ left: bandLeft - edgeWidth / 2, width: edgeWidth }}
                          onMouseDown={(e) => { e.stopPropagation(); solvencyEdgeBeingDragged.current = 'left'; }}
                          onTouchStart={(e) => { e.stopPropagation(); solvencyEdgeBeingDragged.current = 'left'; }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-3 cursor-ew-resize hover:bg-indigo-300/50"
                          style={{ left: bandLeft + bandWidth - edgeWidth / 2, width: edgeWidth }}
                          onMouseDown={(e) => { e.stopPropagation(); solvencyEdgeBeingDragged.current = 'right'; }}
                          onTouchStart={(e) => { e.stopPropagation(); solvencyEdgeBeingDragged.current = 'right'; }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (solvencyPendingYearRange) {
                              setSolvencySelectedYearRange(solvencyPendingYearRange);
                              setSolvencyPendingYearRange(null);
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
                <LineChart 
                  data={solvencyDisplayedData} 
                  onClick={(d) => { if (d?.activeLabel) { const yr = Number(d.activeLabel); setSelectedFinancialYear(yr); fetchYearDetails(yr); }}}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="year"
                    stroke="#475569"
                    fontSize={12}
                    fontWeight="900"
                    ticks={solvencyIsRangeSelecting
                      ? (solvencyRangeStartYear === solvencyRangeEndYear ? [solvencyRangeStartYear] : [solvencyRangeStartYear, solvencyRangeEndYear])
                      : (solvencyDisplayedData.length >= 2 ? (() => {
                          const years = solvencyDisplayedData.map((d: any) => d.year);
                          const n = years.length;
                          if (n <= 3) return years;
                          const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
                          if (isMobile) return [years[0], years[Math.floor(n / 2)], years[n - 1]].filter((v: number, i: number, a: number[]) => a.indexOf(v) === i);
                          const step = Math.max(1, Math.floor((n - 1) / 3));
                          return years.filter((_: number, i: number) => i % step === 0 || i === n - 1);
                        })() : [2005, 2010, 2015, 2020, 2025])}
                    tickFormatter={solvencyIsRangeSelecting ? (v: number) => String(v).slice(-2) : undefined}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
                  <Tooltip 
                    position={{ x: solvencyTooltipOffsetX, y: 10 }}
                    isAnimationActive={false}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length && solvencyDisplayedData.length && solvencyBaselineRow) {
                        const data = payload[0].payload;
                        const baselineRow = solvencyBaselineRow;
                        const latestRow = solvencyLatestRow;
                        const useEntity = selectedParents.length === 1;
                        const keyBase = useEntity ? selectedParents[0].replace(/\s+/g, '') : '';
                        const netWorthVal = useEntity ? data[`${keyBase}NetWorth`] : (chartLevel === 3 ? data.subNetWorth : data.totalNetWorth);
                        const assetsVal = useEntity ? data[`${keyBase}Assets`] : (chartLevel === 3 ? data.subAssets : data.totalAssets);
                        const liabsVal = useEntity ? data[`${keyBase}Liabs`] : (chartLevel === 3 ? data.subLiabs : data.totalLiabs);
                        const netWorthPctLabel = solvencyTrendToggles.netWorthInf ? '% Change (Inflation-adjusted)' : '% Change';
                        const assetsPctLabel = solvencyTrendToggles.assetsInf ? '% Change (Inflation-adjusted)' : '% Change';
                        const liabsPctLabel = solvencyTrendToggles.liabsInf ? '% Change (Inflation-adjusted)' : '% Change';
                        const nwValueKey = useEntity ? (solvencyTrendToggles.netWorthInf ? `${keyBase}NetWorthReal` : `${keyBase}NetWorth`) : (solvencyTrendToggles.netWorthInf ? 'totalNetWorthReal' : (chartLevel === 3 ? 'subNetWorth' : 'totalNetWorth'));
                        const aValueKey = useEntity ? (solvencyTrendToggles.assetsInf ? `${keyBase}AssetsReal` : `${keyBase}Assets`) : (solvencyTrendToggles.assetsInf ? 'totalAssetsReal' : (chartLevel === 3 ? 'subAssets' : 'totalAssets'));
                        const lValueKey = useEntity ? (solvencyTrendToggles.liabsInf ? `${keyBase}LiabsReal` : `${keyBase}Liabs`) : (solvencyTrendToggles.liabsInf ? 'totalLiabsReal' : (chartLevel === 3 ? 'subLiabs' : 'totalLiabs'));
                        const netWorthPct = solvencyDisplayedData.length >= 2 && latestRow ? pctChangeOverRange(Number(baselineRow[nwValueKey]), Number(latestRow[nwValueKey])) : null;
                        const assetsPct = solvencyDisplayedData.length >= 2 && latestRow ? pctChangeOverRange(Number(baselineRow[aValueKey]), Number(latestRow[aValueKey])) : null;
                        const liabsPct = solvencyDisplayedData.length >= 2 && latestRow ? pctChangeOverRange(Number(baselineRow[lValueKey]), Number(latestRow[lValueKey])) : null;
                        const nwFmt = formatPctChange(netWorthPct);
                        const aFmt = formatPctChange(assetsPct);
                        const lFmt = formatPctChange(liabsPct);
                        return (
                          <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                            {data.isCovidGap ? (
                              <p className="text-[14px] font-black text-indigo-600 uppercase italic">Data not collected due to COVID.</p>
                            ) : (
                              <>
                                <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Net Worth</span><span className="text-sm font-black text-blue-600">{formatCurrency(Number(netWorthVal))}</span></div>
                                  {solvencyTrendToggles.netWorthTrend && (
                                    <div className="flex justify-between items-center gap-6 pl-3">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                                        <span className="text-[10px] font-black uppercase text-gray-400">{netWorthPctLabel}</span>
                                      </div>
                                      <span className={`text-sm font-black ${nwFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{nwFmt.text}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Assets</span><span className="text-sm font-black text-green-600">{formatCurrency(Number(assetsVal))}</span></div>
                                  {solvencyTrendToggles.assetsTrend && (
                                    <div className="flex justify-between items-center gap-6 pl-3">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#4ade80' }} />
                                        <span className="text-[10px] font-black uppercase text-gray-400">{assetsPctLabel}</span>
                                      </div>
                                      <span className={`text-sm font-black ${aFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{aFmt.text}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Debt</span><span className="text-sm font-black text-red-600">{formatCurrency(Number(liabsVal))}</span></div>
                                  {solvencyTrendToggles.liabsTrend && (
                                    <div className="flex justify-between items-center gap-6 pl-3">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#f87171' }} />
                                        <span className="text-[10px] font-black uppercase text-gray-400">{liabsPctLabel}</span>
                                      </div>
                                      <span className={`text-sm font-black ${lFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{lFmt.text}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  <React.Fragment>
                    {selectedParents.length === 0 ? (
                      <React.Fragment>
                        {solvencyTrendToggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={3} dot={false} />}
                        {solvencyTrendToggles.assetsTrend && <Line type="monotone" dataKey={solvencyTrendToggles.assetsInf ? 'totalAssetsRealTrend' : 'totalAssetsTrend'} name={solvencyTrendToggles.assetsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.assetsInf ? '#fb923c' : '#4ade80'} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {solvencyTrendToggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {solvencyTrendToggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={3} dot={false} />}
                        {solvencyTrendToggles.liabsTrend && <Line type="monotone" dataKey={solvencyTrendToggles.liabsInf ? 'totalLiabsRealTrend' : 'totalLiabsTrend'} name={solvencyTrendToggles.liabsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.liabsInf ? '#fb923c' : '#f87171'} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {solvencyTrendToggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {solvencyTrendToggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={4} dot={false} />}
                        {solvencyTrendToggles.netWorthTrend && <Line type="monotone" dataKey={solvencyTrendToggles.netWorthInf ? 'totalNetWorthRealTrend' : 'totalNetWorthTrend'} name={solvencyTrendToggles.netWorthInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.netWorthInf ? '#fb923c' : '#3b82f6'} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {solvencyTrendToggles.netWorthInf && <Line type="monotone" dataKey="totalNetWorthReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                      </React.Fragment>
                    ) : (
                      selectedParents.map((sel, idx) => {
                        const kb = sel.replace(/\s+/g, '');
                        const color = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'][idx % 5];
                        return (
                          <React.Fragment key={sel}>
                            {/* Net Worth Logic */}
                            {solvencyTrendToggles.netWorth && <Line type="monotone" dataKey={`${kb}NetWorth`} name={`${sel} Net Worth`} stroke={color} strokeWidth={4} dot={false} />}
                            {solvencyTrendToggles.netWorthTrend && <Line type="monotone" dataKey={solvencyTrendToggles.netWorthInf ? `${kb}NetWorthRealTrend` : `${kb}NetWorthTrend`} name={solvencyTrendToggles.netWorthInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.netWorthInf ? '#fb923c' : color} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {solvencyTrendToggles.netWorthInf && <Line type="monotone" dataKey={`${kb}NetWorthReal`} stroke="#fb923c" strokeWidth={3} dot={false} />}
                            
                            {/* Assets Logic */}
                            {solvencyTrendToggles.assets && <Line type="monotone" dataKey={`${kb}Assets`} stroke="#4ade80" strokeWidth={2} dot={false} />}
                            {solvencyTrendToggles.assetsTrend && <Line type="monotone" dataKey={solvencyTrendToggles.assetsInf ? `${kb}AssetsRealTrend` : `${kb}AssetsTrend`} name={solvencyTrendToggles.assetsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.assetsInf ? '#fb923c' : '#4ade80'} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {solvencyTrendToggles.assetsInf && <Line type="monotone" dataKey={`${kb}AssetsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}

                            {/* Liabilities Logic */}
                            {solvencyTrendToggles.liabs && <Line type="monotone" dataKey={`${kb}Liabs`} stroke="#f87171" strokeWidth={2} dot={false} />}
                            {solvencyTrendToggles.liabsTrend && <Line type="monotone" dataKey={solvencyTrendToggles.liabsInf ? `${kb}LiabsRealTrend` : `${kb}LiabsTrend`} name={solvencyTrendToggles.liabsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={solvencyTrendToggles.liabsInf ? '#fb923c' : '#f87171'} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {solvencyTrendToggles.liabsInf && <Line type="monotone" dataKey={`${kb}LiabsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={`hidden md:grid grid-cols-[200px_1fr_1fr_1fr] gap-y-8 items-center px-4 border-t border-gray-50 pt-10 ${expandedChart === 'solvency' ? 'shrink-0' : 'mb-12'}`}>
              <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Toggle Comparison</div>
              {(['assets', 'liabs', 'netWorth'] as const).map(key => {
                const colors = { assets: 'text-[#4ade80]', liabs: 'text-[#f87171]', netWorth: 'text-[#3b82f6]' };
                const bgColors = { assets: 'bg-[#4ade80]', liabs: 'bg-[#f87171]', netWorth: 'bg-[#3b82f6]' };
                const strobeClass = key === 'assets' ? 'strobe-assets' : key === 'liabs' ? 'strobe-liabs' : 'strobe-networth';
                return (
                  <div key={key} className="text-center">
                    <button 
                      onClick={() => setSolvencyTrendToggles({ ...solvencyTrendToggles, [key]: !solvencyTrendToggles[key] })} 
                      className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${solvencyTrendToggles[key] ? colors[key] : strobeClass}`}
                    >
                      <div className={`w-12 h-1.5 rounded-full transition-all ${solvencyTrendToggles[key] ? bgColors[key] : 'bg-gray-100'}`} />
                      {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
                    </button>
                  </div>
                );
              })}
              
              <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
              {['assetsTrend', 'liabsTrend', 'netWorthTrend'].map(key => {
                const base = key.replace('Trend', '');
                return (
                  <div key={key} className="flex justify-center">
                    <div onClick={() => setSolvencyTrendToggles({...solvencyTrendToggles, [key]: !solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] as any})} className={`slider-oval ${solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] ? `slider-active slider-${base}-on` : ''}`}><div className="slider-circle"></div></div>
                  </div>
                );
              })}

              <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
              {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
                <div key={key} className="flex justify-center">
                  <div onClick={() => setSolvencyTrendToggles({...solvencyTrendToggles, [key]: !solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] as any})} className={`slider-oval ${solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] ? 'slider-active slider-inf-on' : ''}`}><div className="slider-circle"></div></div>
                </div>
              ))}
            </div>

            {/* MOBILE LEFT DRAWER - Chart Controls (z above fullscreen when open) */}
            {solvencyDrawerOpen && (
              <div className={`md:hidden fixed inset-0 flex ${expandedChart === 'solvency' ? 'z-[501]' : 'z-[201]'}`}>
                <div
                  className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSolvencyDrawerOpen(false);
                  }}
                ></div>
                <div
                  className="mobile-drawer-panel relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col"
                  style={{
                    transform: `translateX(${solvencyDrawerDragOffset}px)`,
                    transition: solvencyDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                  onTouchStart={handleSolvencyDrawerTouchStart}
                  onTouchMove={handleSolvencyDrawerTouchMove}
                  onTouchEnd={handleSolvencyDrawerTouchEnd}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSolvencyDrawerOpen(false);
                    }}
                    className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-2xl"></i>
                  </button>

                  <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Chart Controls</h3>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                      <div>
                        <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-4">Toggle Comparison</div>
                        <div className="grid grid-cols-1 gap-6">
                          {(['assets', 'liabs', 'netWorth'] as const).map(key => {
                            const colors = { assets: 'text-[#4ade80]', liabs: 'text-[#f87171]', netWorth: 'text-[#3b82f6]' };
                            const bgColors = { assets: 'bg-[#4ade80]', liabs: 'bg-[#f87171]', netWorth: 'bg-[#3b82f6]' };
                            const strobeClass = key === 'assets' ? 'strobe-assets' : key === 'liabs' ? 'strobe-liabs' : 'strobe-networth';
                            return (
                              <div key={key} className="text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSolvencyTrendToggles({ ...solvencyTrendToggles, [key]: !solvencyTrendToggles[key] });
                                  }}
                                  className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${solvencyTrendToggles[key] ? colors[key] : strobeClass}`}
                                >
                                  <div className={`w-12 h-1.5 rounded-full transition-all ${solvencyTrendToggles[key] ? bgColors[key] : 'bg-gray-100'}`} />
                                  {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Trend Toggle</div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                          {['assetsTrend', 'liabsTrend', 'netWorthTrend'].map(key => {
                            const base = key.replace('Trend', '');
                            return (
                              <div key={key} className="flex flex-col items-center gap-2">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSolvencyTrendToggles({ ...solvencyTrendToggles, [key]: !solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] as any });
                                  }}
                                  className={`slider-oval ${solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] ? `slider-active slider-${base}-on` : ''}`}
                                >
                                  <div className="slider-circle"></div>
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-400">
                                  {base === 'assets' ? 'Assets' : base === 'liabs' ? 'Debt' : 'Net Worth'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Inflation Adjusted</div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                          {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
                            <div key={key} className="flex flex-col items-center gap-2">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSolvencyTrendToggles({ ...solvencyTrendToggles, [key]: !solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] as any });
                                }}
                                className={`slider-oval ${solvencyTrendToggles[key as keyof typeof solvencyTrendToggles] ? 'slider-active slider-inf-on' : ''}`}
                              >
                                <div className="slider-circle"></div>
                              </div>
                              <span className="text-[10px] font-black uppercase text-gray-400">
                                {key.replace('Inf', '') === 'assets' ? 'Assets' : key.replace('Inf', '') === 'liabs' ? 'Debt' : 'Net Worth'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MOBILE FULL-SCREEN COMPARE (RIGHT) DRAWER */}
            {solvencyCompareDrawerOpen && (
              <div className={`md:hidden fixed inset-0 flex justify-end ${expandedChart === 'solvency' ? 'z-[501]' : 'z-[201]'}`}>
                <div
                  className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSolvencyCompareDrawerOpen(false);
                  }}
                />
                <div
                  className="mobile-drawer-panel-right relative w-80 bg-white h-full shadow-2xl flex flex-col p-8 touch-pan-y"
                  style={{
                    transform: `translateX(${solvencyCompareDrawerDragOffset}px)`,
                    transition: solvencyCompareDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                  onTouchStart={handleSolvencyCompareDrawerTouchStart}
                  onTouchMove={handleSolvencyCompareDrawerTouchMove}
                  onTouchEnd={handleSolvencyCompareDrawerTouchEnd}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center flex-shrink-0 touch-none"
                    aria-label="Swipe right to close"
                  >
                    <div className="w-1.5 h-12 rounded-full bg-gray-200" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSolvencyCompareDrawerOpen(false);
                    }}
                    className="self-end text-gray-300 hover:text-red-500 mb-6 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-2xl"></i>
                  </button>

                  <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Select component unit</h3>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 p-3">
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'Governmental', label: 'Governmental', color: 'bg-blue-600' },
                        { id: 'Business-type', label: 'Business-type', color: 'bg-cyan-600' },
                        { id: 'School Department', label: 'School Dept', color: 'bg-pink-600' },
                        { id: 'Emergency Communications District', label: 'Emerg Comm Dist', color: 'bg-amber-600' }
                      ].map(btn => (
                        <button
                          key={btn.id}
                          onClick={() => {
                            const active = selectedParents.includes(btn.id);
                            if (active) setSelectedParents([]);
                            else setSelectedParents([btn.id]);
                          }}
                          className={`px-4 py-4 rounded-xl text-xs font-black uppercase shadow-lg transition-all border-4 ${selectedParents.includes(btn.id) ? 'border-white ring-4 ring-indigo-500 ' + btn.color + ' text-white' : 'bg-white text-gray-400 border-gray-100'}`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {/* ASSETS VIEW */}
        {selectedCategory === 'assets' && (
          <div className={`${expandedChart === 'assets' ? 'fixed inset-0 z-[500] bg-white p-4 md:p-10' : 'bg-white p-6 md:p-8 rounded-[3rem] border-2 border-indigo-600 shadow-xl mb-6'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-full">
                <div className="flex justify-between items-center w-full mb-2">
                   <h3 className="text-xl md:text-[18.66px] font-black uppercase text-gray-900 tracking-tighter">Asset Trend Analysis</h3>
                   <button onClick={() => setExpandedChart(expandedChart === 'assets' ? null : 'assets')} className="bg-gray-100 hover:bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl transition-all">
                     <i className={`fa-solid ${expandedChart === 'assets' ? 'fa-compress' : 'fa-expand'}`}></i>
                   </button>
                </div>
                
                <div className="bg-indigo-50 rounded-2xl p-4 flex justify-around items-center border border-indigo-100 min-h-[60px]">
                  {hoveredData ? (
                    <>
                      {hoveredData.isCovidGap ? (
                        <div className="flex items-center gap-3">
                          <i className="fa-solid fa-circle-exclamation text-indigo-400"></i>
                          <p className="text-[14px] font-black text-indigo-600 uppercase italic">Data not collected due to COVID.</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center"><p className="text-[10px] font-black text-indigo-400 uppercase">Year</p><p className="text-lg md:text-[18.66px] font-black text-indigo-900">{hoveredData.year}</p></div>
                          <div className="text-center"><p className="text-[10px] font-black text-indigo-600 uppercase">Total Assets</p><p className="text-lg md:text-[18.66px] font-black text-indigo-900">{formatCurrency(Number(chartLevel === 3 ? hoveredData.subAssets : hoveredData.totalAssets))}</p></div>
                          {chartLevel < 3 && (
                            <>
                              <div className="text-center"><p className="text-[10px] font-black text-[#4f46e5] uppercase">Primary Govt</p><p className="text-lg md:text-[18.66px] font-black text-[#4f46e5]">{formatCurrency(Number(hoveredData.primaryAssets))}</p></div>
                              <div className="text-center"><p className="text-[10px] font-black text-[#ec4899] uppercase">Component Units</p><p className="text-lg md:text-[18.66px] font-black text-[#ec4899]">{formatCurrency(Number(hoveredData.schoolAssets))}</p></div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] md:text-[14px] font-black text-indigo-300 uppercase animate-pulse">Hover or Tap chart for values</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`${expandedChart === 'assets' ? 'h-[70vh]' : 'h-[300px]'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  onMouseMove={(e: any) => (e && e.activePayload) ? setHoveredData(e.activePayload[0].payload) : null}
                  onMouseLeave={() => setHoveredData(null)}
                  onClick={(d) => { if (d?.activeLabel) { const yr = Number(d.activeLabel); setSelectedFinancialYear(yr); fetchYearDetails(yr); }}}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="year" fontSize={14} fontWeight="900" ticks={[2005, 2010, 2015, 2020, 2025]} stroke="#94a3b8" />
                  <YAxis fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} stroke="#374151" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{stroke: '#4f46e5', strokeWidth: 2}} content={expandedChart === 'assets' ? undefined : <div className="hidden" />} />
                  <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px'}} />
                  {selectedParents.length === 0 ? (
                    <Line type="monotone" dataKey="totalAssets" name="Moore County Total" stroke="#4ade80" strokeWidth={5} dot={false} />
                  ) : (
                    selectedParents.map((sel, idx) => {
                      const kb = sel.replace(/\s+/g, '');
                      const colors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
                      return (
                        <Line key={sel} type="monotone" dataKey={`${kb}Assets`} name={`${sel}`} stroke={colors[idx % colors.length]} strokeWidth={4} dot={expandedChart === 'assets'} />
                      );
                    })
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TIER 4: AUDIT TABLE */}
        {selectedFinancialYear && (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden mb-8 animate-slide-up">
            <div className="bg-indigo-600 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-white font-black uppercase text-xl leading-none">{selectedFinancialYear} Audit Details</h3>
                <p className="text-indigo-200 text-[10px] font-black uppercase mt-1">Official Line-Item Records (Level 4)</p>
              </div>
              <button onClick={() => setSelectedFinancialYear(null)} className="text-white/50 hover:text-white transition-colors">
                <i className="fa-solid fa-circle-xmark text-2xl"></i>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-6">Line Item / Entity</th>
                    <th className="p-6">Category</th>
                    <th className="p-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {yearDetailData
                    .filter(row => {
                      if (Number(row.hierarchy_level) !== 4) return false;
                      if (selectedParents.length > 0) return selectedParents.some(p => row.parent_entity?.includes(p));
                      return true;
                    })
                    .sort((a, b) => Number(b.amount) - Number(a.amount))
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-6">
                          <p className="font-black uppercase text-gray-900 text-sm leading-none">{row.label}</p>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">{row.parent_entity}</p>
                        </td>
                        <td className="p-6"><span className="px-3 py-1 bg-gray-100 rounded text-[10px] font-black uppercase text-gray-400 border border-gray-200">{row.category}</span></td>
                        <td className="p-6 text-right font-black text-gray-900 text-sm">{formatCurrency(Number(row.amount))}</td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report cards (internal + iframe) when not showing an internal report */}
        {!(selectedCategory === 'expenses' && activeInternalReportId === 'county-expenditures') &&
         !(selectedCategory === 'expenses' && activeInternalReportId === 'county-expenditures-pie') &&
         !(selectedCategory === 'revenues' && activeInternalReportId === 'county-revenues') &&
         !(selectedCategory === 'revenues' && activeInternalReportId === 'county-revenues-pie') && (
          <>
            {INTERNAL_REPORTS.filter(r => r.category === selectedCategory).map(report => (
              <div
                key={report.id}
                onClick={() => setActiveInternalReportId(report.id)}
                className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group"
              >
                <div className="space-y-1">
                  <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-indigo-600 tracking-tighter">{report.title}</h3>
                  <p className="text-gray-400 text-[18.66px] font-medium leading-tight">{report.description}</p>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            ))}
            {DASHBOARDS.filter(dash => dash.category === selectedCategory).map(dash => (
              <div key={dash.id} onClick={() => setActiveDashboard(dash as any)} className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[18.66px] font-black uppercase text-gray-900 group-hover:text-indigo-600 tracking-tighter">{dash.title}</h3>
                    {dash.status && <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black uppercase rounded text-gray-500">{dash.status}</span>}
                  </div>
                  <p className="text-gray-400 text-[18.66px] font-medium leading-tight">{dash.description}</p>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            ))}
            {INTERNAL_REPORTS.filter(r => r.category === selectedCategory).length === 0 &&
             DASHBOARDS.filter(dash => dash.category === selectedCategory).length === 0 && (
              <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                <i className="fa-solid fa-folder-open text-gray-200 text-4xl mb-4"></i>
                <p className="text-gray-400 font-black uppercase text-xs">No reports have been uploaded for this category yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryDashboard;