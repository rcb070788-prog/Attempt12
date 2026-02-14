import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, pctChangeOverRange, formatPctChange, recomputeTrendsForSlice } from './financeUtils';

// We are defining our "Remote Controls" (Props) here
interface NetWorthChartProps {
  chartData: any[];
  toggles: {
    assets: boolean;
    liabs: boolean;
    netWorth: boolean;
    assetsTrend: boolean;
    liabsTrend: boolean;
    netWorthTrend: boolean;
    assetsInf: boolean;
    liabsInf: boolean;
    netWorthInf: boolean;
  };
  setToggles: (toggles: any) => void;
  setSelectedCategory: (cat: string) => void;
  /** When provided, shows a centered "More" button at the top to open Debt & Solvency detail view */
  onMoreClick?: () => void;
  /** When true, fills parent (full-viewport) with flex layout; chart uses flex-1, no scrolling */
  fullScreen?: boolean;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ 
  chartData, 
  toggles, 
  setToggles, 
  setSelectedCategory,
  onMoreClick,
  fullScreen = false
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [desktopTogglesOpen, setDesktopTogglesOpen] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const [tabTop, setTabTop] = useState(50); // percentage
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tooltipOffsetX, setTooltipOffsetX] = useState(56); // mobile default; desktop set in useEffect
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);
  const [pendingYearRange, setPendingYearRange] = useState<[number, number] | null>(null);
  const rangeDragStartX = useRef<number | null>(null);
  const rangeDragCurrentX = useRef<number | null>(null);
  const edgeBeingDragged = useRef<'left' | 'right' | null>(null);
  const ignoreNextOverlayClick = useRef(false);
  const [dragBand, setDragBand] = useState<{ startX: number; endX: number } | null>(null);

  const displayedData = useMemo(() => {
    if (!chartData.length) return [];
    if (!selectedYearRange) return chartData;
    const [minY, maxY] = selectedYearRange;
    const filtered = chartData.filter((d: any) => d.year >= minY && d.year <= maxY);
    if (filtered.length < 2) return chartData;
    return recomputeTrendsForSlice(filtered, []);
  }, [chartData, selectedYearRange]);

  const baselineRow = displayedData.length ? displayedData[0] : null;
  const latestRow = displayedData.length ? displayedData[displayedData.length - 1] : null;

  const chartYears = useMemo(() => chartData.map((d: any) => d.year), [chartData]);
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
    rangeDragCurrentX.current = clientX;
    setDragBand({ startX: clientX, endX: clientX });
  };

  const handleChartPointerMove = (clientX: number) => {
    if (edgeBeingDragged.current === 'left' && pendingYearRange) {
      const y = clientXToYear(clientX);
      if (y != null) {
        const [, endY] = pendingYearRange;
        const newStart = Math.max(chartMinYear, Math.min(y, endY - 1));
        setPendingYearRange([newStart, endY]);
      }
      return;
    }
    if (edgeBeingDragged.current === 'right' && pendingYearRange) {
      const y = clientXToYear(clientX);
      if (y != null) {
        const [startY] = pendingYearRange;
        const newEnd = Math.min(chartMaxYear, Math.max(y, startY + 1));
        setPendingYearRange([startY, newEnd]);
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

  // Responsive tooltip horizontal offset so it doesn't overlay y-axis dollar values
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setTooltipOffsetX(mq.matches ? 72 : 56);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Scroll tracking to position tab based on chart visibility
  useEffect(() => {
    const handleScroll = () => {
      if (!chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Only show tab when chart is in viewport
      if (rect.bottom < 0 || rect.top > viewportHeight) {
        setTabTop(-100); // Hide off-screen
        return;
      }
      
      // Calculate visible portion of chart
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const visibleHeight = visibleBottom - visibleTop;
      
      // Position tab at center of visible chart area
      const centerY = visibleTop + (visibleHeight / 2);
      const percentage = (centerY / viewportHeight) * 100;
      setTabTop(Math.max(10, Math.min(90, percentage))); // Constrain between 10% and 90%
    };
    
    // Use requestAnimationFrame for smooth updates
    let rafId: number | null = null;
    const throttledScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    };
    
    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('resize', throttledScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('resize', throttledScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Reset drag state when drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setDrawerDragOffset(0);
      setIsDraggingDrawer(false);
      drawerTouchStartRef.current = null;
    }
  }, [isDrawerOpen]);

  // Touch handlers for peeking tab - drag to open
  const handleTabTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If dragged right more than 50px and less vertical movement, open drawer
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
    
    // If minimal movement, treat as tap
    if (Math.abs(deltaX) < 10 && deltaY < 10) {
      setIsDrawerOpen(!isDrawerOpen);
    }
    
    touchStartRef.current = null;
  };

  // Touch handlers for drawer - drag to close
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    drawerTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDraggingDrawer(true);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (!drawerTouchStartRef.current || !isDraggingDrawer) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - drawerTouchStartRef.current.x;
    
    // Only allow dragging left (negative deltaX)
    if (deltaX < 0) {
      e.preventDefault(); // Prevent scrolling while dragging
      setDrawerDragOffset(deltaX);
    }
  };

  const handleDrawerTouchEnd = () => {
    if (!isDraggingDrawer) return;
    
    // If dragged left more than 100px, close drawer
    if (drawerDragOffset < -100) {
      setIsDrawerOpen(false);
    }
    
    // Reset drag state
    setDrawerDragOffset(0);
    setIsDraggingDrawer(false);
    drawerTouchStartRef.current = null;
  };

  return (
    <div 
      className={
        fullScreen
          ? 'flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 md:p-6 rounded-[3rem] shadow-xl text-gray-900 border border-gray-100'
          : 'bg-white p-10 rounded-[3rem] shadow-xl text-gray-900 mb-12 border border-gray-100'
      }
    >
      {onMoreClick && (
        <div className={`flex justify-center mb-6 ${fullScreen ? 'shrink-0' : ''}`}>
          <button
            onClick={onMoreClick}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            More
          </button>
        </div>
      )}
      <div className={`hidden md:flex justify-between items-start mb-10 ${fullScreen ? 'shrink-0 mb-4' : ''}`}>
        <div>
          <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">County Net Worth</h3>
          <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">20-Year Financial Net Worth Trend</p>
        </div>
        <div className="hidden md:flex px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
          Hover or Tap chart for values
        </div>
      </div>

      <div 
        ref={chartRef} 
        className={
          'relative ' +
          (fullScreen
            ? 'flex-1 min-h-0 min-h-[180px] w-full'
            : 'h-[300px] md:h-[450px] w-full landscape:h-[70vh] mb-12')
        }
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
              ticks={isRangeSelecting
                ? (rangeStartYear === rangeEndYear ? [rangeStartYear] : [rangeStartYear, rangeEndYear])
                : (displayedData.length >= 2 ? (() => {
                    const years = displayedData.map((d: any) => d.year);
                    const n = years.length;
                    if (n <= 3) return years;
                    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
                    if (isMobile) return [years[0], years[Math.floor(n / 2)], years[n - 1]].filter((v, i, a) => a.indexOf(v) === i);
                    const step = Math.max(1, Math.floor((n - 1) / 3));
                    return years.filter((_, i) => i % step === 0 || i === n - 1);
                  })() : [2005, 2010, 2015, 2020, 2025])}
              tickFormatter={isRangeSelecting ? (v: number) => String(v).slice(-2) : undefined}
              axisLine={false}
              tickLine={false}
            />
            <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
            <Tooltip 
              position={{ x: tooltipOffsetX, y: 10 }}
              isAnimationActive={false}
              cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
              content={({ active, payload }) => {
                if (active && payload && payload.length && displayedData.length && baselineRow) {
                  const data = payload[0].payload;
                  const netWorthPctLabel = toggles.netWorthInf ? '% Change (Inflation-adjusted)' : '% Change';
                  const assetsPctLabel = toggles.assetsInf ? '% Change (Inflation-adjusted)' : '% Change';
                  const liabsPctLabel = toggles.liabsInf ? '% Change (Inflation-adjusted)' : '% Change';
                  const netWorthValueKey = toggles.netWorthInf ? 'totalNetWorthReal' : 'totalNetWorth';
                  const assetsValueKey = toggles.assetsInf ? 'totalAssetsReal' : 'totalAssets';
                  const liabsValueKey = toggles.liabsInf ? 'totalLiabsReal' : 'totalLiabs';
                  const netWorthPct = displayedData.length >= 2 ? pctChangeOverRange(Number(baselineRow[netWorthValueKey]), Number(data[netWorthValueKey])) : null;
                  const assetsPct = displayedData.length >= 2 ? pctChangeOverRange(Number(baselineRow[assetsValueKey]), Number(data[assetsValueKey])) : null;
                  const liabsPct = displayedData.length >= 2 ? pctChangeOverRange(Number(baselineRow[liabsValueKey]), Number(data[liabsValueKey])) : null;
                  const nwFmt = formatPctChange(netWorthPct);
                  const aFmt = formatPctChange(assetsPct);
                  const lFmt = formatPctChange(liabsPct);
                  return (
                    <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                      <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Net Worth</span><span className="text-sm font-black text-blue-600">{formatCurrency(data.totalNetWorth)}</span></div>
                        {toggles.netWorthTrend && (
                          <div className="flex justify-between items-center gap-6 pl-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                              <span className="text-[10px] font-black uppercase text-gray-400">{netWorthPctLabel}</span>
                            </div>
                            <span className={`text-sm font-black ${nwFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{nwFmt.text}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Assets</span><span className="text-sm font-black text-green-600">{formatCurrency(data.totalAssets)}</span></div>
                        {toggles.assetsTrend && (
                          <div className="flex justify-between items-center gap-6 pl-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#4ade80' }} />
                              <span className="text-[10px] font-black uppercase text-gray-400">{assetsPctLabel}</span>
                            </div>
                            <span className={`text-sm font-black ${aFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{aFmt.text}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Debt</span><span className="text-sm font-black text-red-600">{formatCurrency(data.totalLiabs)}</span></div>
                        {toggles.liabsTrend && (
                          <div className="flex justify-between items-center gap-6 pl-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#f87171' }} />
                              <span className="text-[10px] font-black uppercase text-gray-400">{liabsPctLabel}</span>
                            </div>
                            <span className={`text-sm font-black ${lFmt.isPositive ? 'text-green-600' : 'text-red-600'}`}>{lFmt.text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {toggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={4} dot={false} />}
            {toggles.assetsTrend && <Line type="monotone" dataKey={toggles.assetsInf ? 'totalAssetsRealTrend' : 'totalAssetsTrend'} name={toggles.assetsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={toggles.assetsInf ? '#fb923c' : '#4ade80'} strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
            {toggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
            
            {toggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={4} dot={false} />}
            {toggles.liabsTrend && <Line type="monotone" dataKey={toggles.liabsInf ? 'totalLiabsRealTrend' : 'totalLiabsTrend'} name={toggles.liabsInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={toggles.liabsInf ? '#fb923c' : '#f87171'} strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
            {toggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
            
            {toggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={5} dot={false} />}
            {toggles.netWorthTrend && <Line type="monotone" dataKey={toggles.netWorthInf ? 'totalNetWorthRealTrend' : 'totalNetWorthTrend'} name={toggles.netWorthInf ? 'Trend (Inflation-Adjusted)' : 'Nominal trend'} stroke={toggles.netWorthInf ? '#fb923c' : '#3b82f6'} strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
            {toggles.netWorthInf && <Line type="monotone" dataKey="totalNetWorthReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MOBILE PEEKING TOOLBOX (LEFT) */}
      <div 
        className="md:hidden peeking-tab-left" 
        style={{ 
          top: `${tabTop}%`,
          opacity: tabTop < 0 ? 0 : 1,
          pointerEvents: tabTop < 0 ? 'none' : 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setIsDrawerOpen(!isDrawerOpen); 
          }}
          onTouchStart={handleTabTouchStart}
          onTouchMove={handleTabTouchMove}
          onTouchEnd={handleTabTouchEnd}
          className="bg-indigo-600 text-white p-4 rounded-r-3xl shadow-2xl border-2 border-white/20 touch-none"
        >
          <i className="fa-solid fa-sliders text-2xl"></i>
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div 
            className="mobile-drawer-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(false);
            }}
          ></div>
          {/* Drawer Panel */}
          <div 
            className="mobile-drawer-panel relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col"
            style={{ 
              transform: `translateX(${drawerDragOffset}px)`,
              transition: isDraggingDrawer ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsDrawerOpen(false);
              }}
              className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
            
            {/* Drawer Title */}
            <h3 className="text-2xl font-black uppercase text-gray-900 mb-6">Chart Controls</h3>
            
            {/* All Desktop Toggles */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                {/* Main Toggles Row */}
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
                              setToggles({ ...toggles, [key]: !toggles[key] });
                            }}
                            className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? colors[key] : strobeClass}`}
                          >
                            <div className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? bgColors[key] : 'bg-gray-100'}`} />
                            {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trend Toggle Row */}
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
                              setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any});
                            }} 
                            className={`slider-oval ${toggles[key as keyof typeof toggles] ? `slider-active slider-${base}-on` : ''}`}
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

                {/* Inflation Adjusted Row */}
                <div>
                  <div className="text-[18px] font-black uppercase text-indigo-400 mb-4">Inflation Adjusted</div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
                      <div key={key} className="flex flex-col items-center gap-2">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any});
                          }} 
                          className={`slider-oval ${toggles[key as keyof typeof toggles] ? 'slider-active slider-inf-on' : ''}`}
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

      {/* THE CONTROL PANEL (Strobing Legend & Toggles) */}
      <div className={`mt-8 space-y-8 ${fullScreen ? 'shrink-0 mt-4' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        {/* DESKTOP LAYOUT: Collapsible drawer (same as County Expenditures) */}
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
              <div className={`gap-y-8 items-center px-4 pt-6 ${fullScreen ? 'pb-2' : 'pb-4 mb-12'}`}>
                <div className={`grid grid-cols-[200px_1fr_1fr_1fr] gap-y-8 items-center ${fullScreen ? 'gap-y-4 pt-0' : ''}`}>
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest"></div>
                  {(['assets', 'liabs', 'netWorth'] as const).map(key => {
                    const colors = { assets: 'text-[#4ade80]', liabs: 'text-[#f87171]', netWorth: 'text-[#3b82f6]' };
                    const bgColors = { assets: 'bg-[#4ade80]', liabs: 'bg-[#f87171]', netWorth: 'bg-[#3b82f6]' };
                    const strobeClass = key === 'assets' ? 'strobe-assets' : key === 'liabs' ? 'strobe-liabs' : 'strobe-networth';
                    return (
                      <div key={key} className="text-center">
                        <button 
                          onClick={() => setToggles({ ...toggles, [key]: !toggles[key] })} 
                          className={`text-[13px] font-black uppercase transition-all flex flex-col items-center gap-2 mx-auto ${toggles[key] ? colors[key] : strobeClass}`}
                        >
                          <div className={`w-12 h-1.5 rounded-full transition-all ${toggles[key] ? bgColors[key] : 'bg-gray-100'}`} />
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
                        <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? `slider-active slider-${base}-on` : ''}`}><div className="slider-circle"></div></div>
                      </div>
                    );
                  })}
                  <div className="text-[18px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
                  {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
                    <div key={key} className="flex justify-center">
                      <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? 'slider-active slider-inf-on' : ''}`}><div className="slider-circle"></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT: Hidden - toggles now in drawer */}
        <div className="md:hidden hidden">
          {/* ROW 1: THE STROBING MAIN LEGEND */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {(['assets', 'liabs', 'netWorth'] as const).map(key => {
              const strobeClass = key === 'assets' ? 'strobe-assets' : key === 'liabs' ? 'strobe-liabs' : 'strobe-networth';
              const solidColor = key === 'assets' ? 'text-[#4ade80]' : key === 'liabs' ? 'text-[#f87171]' : 'text-[#3b82f6]';
              return (
                <div key={key} className="text-center">
                  <button 
                    onClick={() => setToggles({...toggles, [key]: !toggles[key]})} 
                    className={`text-[11px] font-black uppercase transition-all duration-500 tracking-tighter ${toggles[key] ? solidColor : strobeClass}`}
                  >
                    {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ROW 2 & 3: MOBILE SUB-TOGGLES */}
          <div className="grid grid-cols-4 gap-4 items-center mb-4">
          <div className="text-[11px] font-black uppercase text-indigo-400">
              Trend Toggle
            </div>
            {['assetsTrend', 'liabsTrend', 'netWorthTrend'].map(key => {
              const base = key.replace('Trend', '');
              return (
                <div key={key} className="flex justify-center">
                  <div
                    onClick={() => setToggles({ ...toggles, [key]: !toggles[key] })}
                    className={`slider-oval ${toggles[key as keyof typeof toggles] ? `slider-active slider-${base}-on` : ''}`}
                  >
                    <div className="slider-circle"></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-4 items-center">
            <div className="text-[11px] font-black uppercase text-indigo-400 tracking-widest">
              Inflation Adjusted
            </div>
            {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
              <div key={key} className="flex justify-center">
                <div
                  onClick={() => setToggles({ ...toggles, [key]: !toggles[key] })}
                  className={`slider-oval ${toggles[key as keyof typeof toggles] ? 'slider-active slider-inf-on' : ''}`}
                >
                  <div className="slider-circle"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};