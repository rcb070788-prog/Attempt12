import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/financeUtils';

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
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ 
  chartData, 
  toggles, 
  setToggles, 
  setSelectedCategory,
  onMoreClick
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [tabTop, setTabTop] = useState(50); // percentage
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawerTouchStartRef = useRef<{ x: number; y: number } | null>(null);

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
      className="bg-white p-10 rounded-[3rem] shadow-xl text-gray-900 mb-12 border border-gray-100"
    >
      {onMoreClick && (
        <div className="flex justify-center mb-6">
          <button
            onClick={onMoreClick}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            More
          </button>
        </div>
      )}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">County Net Worth</h3>
          <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">20-Year Financial Net Worth Trend</p>
        </div>
        <div className="hidden md:flex px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
          Hover or Tap chart for values
        </div>
      </div>

      <div ref={chartRef} className="h-[300px] md:h-[450px] w-full landscape:h-[70vh] mb-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 5, left: -12.5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="year" stroke="#475569" fontSize={12} fontWeight="900" ticks={[2005, 2010, 2015, 2020, 2025]} axisLine={false} tickLine={false} />
            <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                      <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Net Worth</span><span className="text-sm font-black text-blue-600">{formatCurrency(data.totalNetWorth)}</span></div>
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Assets</span><span className="text-sm font-black text-green-600">{formatCurrency(data.totalAssets)}</span></div>
                        <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Debt</span><span className="text-sm font-black text-red-600">{formatCurrency(data.totalLiabs)}</span></div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {toggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={4} dot={false} />}
            {toggles.assetsTrend && <Line type="monotone" dataKey="totalAssetsTrend" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
            {toggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
            
            {toggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={4} dot={false} />}
            {toggles.liabsTrend && <Line type="monotone" dataKey="totalLiabsTrend" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
            {toggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
            
            {toggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={5} dot={false} />}
            {toggles.netWorthTrend && <Line type="monotone" dataKey="totalNetWorthTrend" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
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
      <div className="mt-8 space-y-8" onClick={(e) => e.stopPropagation()}>
        
        {/* DESKTOP LAYOUT: Matching Debt & Solvency Trend Chart */}
        <div className="hidden md:grid grid-cols-[200px_1fr_1fr_1fr] gap-y-8 items-center px-4 mb-12 border-t border-gray-50 pt-10">
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