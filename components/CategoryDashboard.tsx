import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CATEGORIES, DASHBOARDS } from '../constants';
import { formatCurrency } from '../utils/financeUtils';
import { NetWorthChart } from './NetWorthChart';

// These are the "Remote Controls" coming from the main App
interface CategoryDashboardProps {
  currentPage: string;
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  setActiveDashboard: (dash: any) => void;
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
}

const CategoryDashboard: React.FC<CategoryDashboardProps> = ({
  currentPage,
  selectedCategory,
  setSelectedCategory,
  setActiveDashboard,
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
  setToggles
}) => {
  const [showSolvencyDetail, setShowSolvencyDetail] = useState(false);

  // Reset detail view when leaving solvency category
  React.useEffect(() => {
    if (selectedCategory !== 'solvency') setShowSolvencyDetail(false);
  }, [selectedCategory]);

  if (currentPage !== 'home' || !selectedCategory) return null;

  const currentCategoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10 animate-slide-up">
      <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors">
        <i className="fa-solid fa-arrow-left mr-2"></i> Back to Main Menu
      </button>
      
      <div className="flex flex-col">
        <h2 className="text-4xl font-black uppercase text-gray-900 leading-tight">
          {currentCategoryLabel}
        </h2>
        <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Select a report to view official records</p>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-8">
        
        {/* SOLVENCY VIEW - TIER 1: County Net Worth Chart (high-level); "More" opens detail view */}
        {selectedCategory === 'solvency' && !showSolvencyDetail && (
          <NetWorthChart 
            chartData={chartData}
            toggles={toggles}
            setToggles={setToggles}
            setSelectedCategory={setSelectedCategory}
            onMoreClick={() => setShowSolvencyDetail(true)}
          />
        )}

        {/* SOLVENCY VIEW - TIER 2: Debt & Solvency Trend (detail screen) */}
        {selectedCategory === 'solvency' && showSolvencyDetail && (
          <>
            <button
              onClick={() => setShowSolvencyDetail(false)}
              className="mb-6 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i> Back to County Net Worth
            </button>
            <div className={`${expandedChart === 'solvency' ? 'fixed inset-0 z-[500] bg-white p-4 md:p-10' : 'bg-white p-4 md:p-10 rounded-[3rem] shadow-xl text-gray-900 mb-6 border border-gray-100 landscape-fullscreen'}`}>
            
            {/* MOBILE PEEKING COMPARISON (RIGHT) */}
            <div className="md:hidden peeking-tab-right">
              <button className="bg-pink-600 text-white p-3 rounded-l-2xl shadow-2xl">
                <i className="fa-solid fa-layer-group text-xl"></i>
              </button>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-full">
              <div className="flex items-center justify-between w-full mb-2 gap-3">
                  <h3 className="text-xl md:text-[18.66px] font-black uppercase tracking-tighter">
                    Debt & Solvency Trend
                  </h3>
                  <div className="hidden md:flex flex-1 justify-center">
                    {!hoveredData && (
                      <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[9px] md:text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
                        Hover or Tap chart for values
                      </div>
                    )}
                  </div>
                  {!hoveredData && (
                    <div className="md:hidden px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[9px] md:text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
                      Hover or Tap chart for values
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedChart(expandedChart === 'solvency' ? null : 'solvency')}
                    className="bg-gray-100 hover:bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl transition-all"
                  >
                    <i className={`fa-solid ${expandedChart === 'solvency' ? 'fa-compress' : 'fa-expand'}`}></i>
                  </button>
                </div>

                {hoveredData && (
                  <div className="bg-indigo-50 rounded-2xl p-4 flex justify-around items-center border border-indigo-100 min-h-[60px] mb-4">
                    {hoveredData.isCovidGap ? (
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-exclamation text-indigo-400"></i>
                        <p className="text-[14px] font-black text-indigo-600 uppercase italic">
                          Data not collected due to COVID.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase">Year</p>
                          <p className="text-lg md:text-[18.66px] font-black text-gray-900">{hoveredData.year}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-green-600 uppercase">Assets</p>
                          <p className="text-lg md:text-[18.66px] font-black text-green-700">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subAssets : hoveredData.totalAssets))}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-red-600 uppercase">Debt</p>
                          <p className="text-lg md:text-[18.66px] font-black text-red-700">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subLiabs : hoveredData.totalLiabs))}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-600 uppercase">Net Worth</p>
                          <p className="text-lg md:text-[18.66px] font-black text-blue-600">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subNetWorth : hoveredData.totalNetWorth))}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={`${expandedChart === 'solvency' ? 'h-[70vh]' : 'h-[400px]'} w-full mb-12`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  onMouseMove={(e: any) => e?.activePayload && setHoveredData(e.activePayload[0].payload)}
                  onMouseLeave={() => setHoveredData(null)}
                  onClick={(d) => { if (d?.activeLabel) { const yr = Number(d.activeLabel); setSelectedFinancialYear(yr); fetchYearDetails(yr); }}}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" stroke="#475569" fontSize={12} fontWeight="900" ticks={[2005, 2010, 2015, 2020, 2025]} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
                  <Tooltip content={<div className="hidden" />} />
                  
                  <React.Fragment>
                    {selectedParents.length === 0 ? (
                      <React.Fragment>
                        {toggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={3} dot={false} />}
                        {toggles.assetsTrend && <Line type="monotone" dataKey="totalAssetsTrend" stroke="#4ade80" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {toggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={3} dot={false} />}
                        {toggles.liabsTrend && <Line type="monotone" dataKey="totalLiabsTrend" stroke="#f87171" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {toggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={4} dot={false} />}
                        {toggles.netWorthTrend && <Line type="monotone" dataKey="totalNetWorthTrend" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.netWorthInf && <Line type="monotone" dataKey="totalNetWorthReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                      </React.Fragment>
                    ) : (
                      selectedParents.map((sel, idx) => {
                        const kb = sel.replace(/\s+/g, '');
                        const color = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'][idx % 5];
                        return (
                          <React.Fragment key={sel}>
                            {/* Net Worth Logic */}
                            {toggles.netWorth && <Line type="monotone" dataKey={`${kb}NetWorth`} name={`${sel} Net Worth`} stroke={color} strokeWidth={4} dot={false} />}
                            {toggles.netWorthTrend && <Line type="monotone" dataKey={`${kb}NetWorthTrend`} stroke={color} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.netWorthInf && <Line type="monotone" dataKey={`${kb}NetWorthReal`} stroke="#fb923c" strokeWidth={3} dot={false} />}
                            
                            {/* Assets Logic - Fixed: Removed Hardcoded Dashes & Added Trend/Inf */}
                            {toggles.assets && <Line type="monotone" dataKey={`${kb}Assets`} stroke="#4ade80" strokeWidth={2} dot={false} />}
                            {toggles.assetsTrend && <Line type="monotone" dataKey={`${kb}AssetsTrend`} stroke="#4ade80" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.assetsInf && <Line type="monotone" dataKey={`${kb}AssetsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}

                            {/* Liabilities Logic - Fixed: Removed Hardcoded Dashes & Added Trend/Inf */}
                            {toggles.liabs && <Line type="monotone" dataKey={`${kb}Liabs`} stroke="#f87171" strokeWidth={2} dot={false} />}
                            {toggles.liabsTrend && <Line type="monotone" dataKey={`${kb}LiabsTrend`} stroke="#f87171" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.liabsInf && <Line type="monotone" dataKey={`${kb}LiabsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="hidden md:grid grid-cols-[200px_1fr_1fr_1fr] gap-y-8 items-center px-4 mb-12 border-t border-gray-50 pt-10">
              <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Toggle Comparison</div>
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

        {/* LIABILITIES VIEW */}
        {selectedCategory === 'liabilities' && (
          <div className={`${expandedChart === 'solvency' ? 'fixed inset-0 z-[500] bg-white p-4 md:p-10' : 'bg-white p-4 md:p-10 rounded-[3rem] shadow-xl text-gray-900 mb-6 border border-gray-100 landscape-fullscreen'}`}>
            
            {/* MOBILE PEEKING COMPARISON (RIGHT) */}
            <div className="md:hidden peeking-tab-right">
              <button className="bg-pink-600 text-white p-3 rounded-l-2xl shadow-2xl">
                <i className="fa-solid fa-layer-group text-xl"></i>
              </button>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-full">
              <div className="flex items-center justify-between w-full mb-2 gap-3">
                  <h3 className="text-xl md:text-[18.66px] font-black uppercase tracking-tighter">
                    Debt & Solvency Trend
                  </h3>
                  <div className="hidden md:flex flex-1 justify-center">
                    {!hoveredData && (
                      <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[9px] md:text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
                        Hover or Tap chart for values
                      </div>
                    )}
                  </div>
                  {!hoveredData && (
                    <div className="md:hidden px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 text-[9px] md:text-[10px] font-black uppercase text-indigo-300 animate-pulse text-center whitespace-nowrap">
                      Hover or Tap chart for values
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedChart(expandedChart === 'solvency' ? null : 'solvency')}
                    className="bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-xl transition-all"
                  >
                    <i className={`fa-solid ${expandedChart === 'solvency' ? 'fa-compress' : 'fa-expand'}`}></i>
                  </button>
                </div>

                {hoveredData && (
                  <div className="bg-indigo-50 rounded-2xl p-4 flex justify-around items-center border border-indigo-100 min-h-[60px] mb-4">
                    {hoveredData.isCovidGap ? (
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-exclamation text-indigo-400"></i>
                        <p className="text-[14px] font-black text-indigo-600 uppercase italic">
                          Data not collected due to COVID.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase">Year</p>
                          <p className="text-lg md:text-[18.66px] font-black text-gray-900">{hoveredData.year}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-green-600 uppercase">Assets</p>
                          <p className="text-lg md:text-[18.66px] font-black text-green-700">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subAssets : hoveredData.totalAssets))}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-red-600 uppercase">Debt</p>
                          <p className="text-lg md:text-[18.66px] font-black text-red-700">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subLiabs : hoveredData.totalLiabs))}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-600 uppercase">Net Worth</p>
                          <p className="text-lg md:text-[18.66px] font-black text-blue-600">
                            {formatCurrency(Number(chartLevel === 3 ? hoveredData.subNetWorth : hoveredData.totalNetWorth))}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={`${expandedChart === 'solvency' ? 'h-[70vh]' : 'h-[400px]'} w-full mb-12`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  onMouseMove={(e: any) => e?.activePayload && setHoveredData(e.activePayload[0].payload)}
                  onMouseLeave={() => setHoveredData(null)}
                  onClick={(d) => { if (d?.activeLabel) { const yr = Number(d.activeLabel); setSelectedFinancialYear(yr); fetchYearDetails(yr); }}}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" stroke="#475569" fontSize={12} fontWeight="900" ticks={[2005, 2010, 2015, 2020, 2025]} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
                  <Tooltip content={<div className="hidden" />} />
                  
                  <React.Fragment>
                    {selectedParents.length === 0 ? (
                      <React.Fragment>
                        {toggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={3} dot={false} />}
                        {toggles.assetsTrend && <Line type="monotone" dataKey="totalAssetsTrend" stroke="#4ade80" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {toggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={3} dot={false} />}
                        {toggles.liabsTrend && <Line type="monotone" dataKey="totalLiabsTrend" stroke="#f87171" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                        {toggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={4} dot={false} />}
                        {toggles.netWorthTrend && <Line type="monotone" dataKey="totalNetWorthTrend" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                        {toggles.netWorthInf && <Line type="monotone" dataKey="totalNetWorthReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                      </React.Fragment>
                    ) : (
                      selectedParents.map((sel, idx) => {
                        const kb = sel.replace(/\s+/g, '');
                        const color = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'][idx % 5];
                        return (
                          <React.Fragment key={sel}>
                            {/* Net Worth Logic */}
                            {toggles.netWorth && <Line type="monotone" dataKey={`${kb}NetWorth`} name={`${sel} Net Worth`} stroke={color} strokeWidth={4} dot={false} />}
                            {toggles.netWorthTrend && <Line type="monotone" dataKey={`${kb}NetWorthTrend`} stroke={color} strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.netWorthInf && <Line type="monotone" dataKey={`${kb}NetWorthReal`} stroke="#fb923c" strokeWidth={3} dot={false} />}
                            
                            {/* Assets Logic - Fixed: Removed Hardcoded Dashes & Added Trend/Inf */}
                            {toggles.assets && <Line type="monotone" dataKey={`${kb}Assets`} stroke="#4ade80" strokeWidth={2} dot={false} />}
                            {toggles.assetsTrend && <Line type="monotone" dataKey={`${kb}AssetsTrend`} stroke="#4ade80" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.assetsInf && <Line type="monotone" dataKey={`${kb}AssetsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}

                            {/* Liabilities Logic - Fixed: Removed Hardcoded Dashes & Added Trend/Inf */}
                            {toggles.liabs && <Line type="monotone" dataKey={`${kb}Liabs`} stroke="#f87171" strokeWidth={2} dot={false} />}
                            {toggles.liabsTrend && <Line type="monotone" dataKey={`${kb}LiabsTrend`} stroke="#f87171" strokeWidth={1} strokeDasharray="5 5" dot={false} opacity={0.5} />}
                            {toggles.liabsInf && <Line type="monotone" dataKey={`${kb}LiabsReal`} stroke="#fb923c" strokeWidth={2} dot={false} />}
                          </React.Fragment>
                        );
                      })
                    )}
                  </React.Fragment>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="hidden md:grid grid-cols-[200px_1fr_1fr_1fr] gap-y-8 items-center px-4 mb-12 border-t border-gray-50 pt-10">
              <div className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Toggle Comparison</div>
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

        {/* NAVIGATION CONTROLS - only for Debt & Solvency Trend (solvency detail view / liabilities) */}
        {((selectedCategory === 'solvency' && showSolvencyDetail) || selectedCategory === 'liabilities') && (
          <div className="flex flex-wrap gap-3 mb-6 animate-slide-up">
            {chartLevel > 1 && (
              <button onClick={() => { setChartLevel(1); setSelectedParent(null); }} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-[18.66px] font-black uppercase shadow-lg hover:scale-105 transition-all">
                <i className="fa-solid fa-house-chimney mr-2"></i> Reset to Total
              </button>
            )}
            {chartLevel === 1 && (
              <button onClick={() => setChartLevel(2)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[18.66px] font-black uppercase shadow-lg hover:scale-105 transition-all">
                Compare Primary vs Component Units
              </button>
            )}
            {chartLevel === 2 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
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
                      if (active) setSelectedParents(selectedParents.filter(p => p !== btn.id));
                      else setSelectedParents([...selectedParents, btn.id]);
                    }} 
                    className={`px-4 py-4 rounded-xl text-xs font-black uppercase shadow-lg transition-all border-4 ${selectedParents.includes(btn.id) ? 'border-white ring-4 ring-indigo-500 ' + btn.color + ' text-white' : 'bg-white text-gray-400 border-gray-100'}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD FOLDERS */}
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
        
        {DASHBOARDS.filter(dash => dash.category === selectedCategory).length === 0 && (
          <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
            <i className="fa-solid fa-folder-open text-gray-200 text-4xl mb-4"></i>
            <p className="text-gray-400 font-black uppercase text-xs">No reports have been uploaded for this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDashboard;