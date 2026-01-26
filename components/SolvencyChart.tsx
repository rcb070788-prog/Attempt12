import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/financeUtils';

// We are defining our "Remote Controls" (Props) here
interface SolvencyChartProps {
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
}

export const SolvencyChart: React.FC<SolvencyChartProps> = ({ 
  chartData, 
  toggles, 
  setToggles, 
  setSelectedCategory 
}) => {
  return (
    <div 
      className="bg-white p-10 rounded-[3rem] shadow-xl text-gray-900 cursor-pointer hover:scale-[1.01] transition-all mb-12 border border-gray-100" 
      onClick={() => setSelectedCategory('solvency')}
    >
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">County Solvency</h3>
          <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">20-Year Financial Net Worth Trend</p>
        </div>
        <div className="bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100">
           <span className="text-[10px] font-black uppercase text-indigo-600">Click for Detailed Analysis</span>
        </div>
      </div>

      <div className="h-[400px] w-full mb-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      <div className="grid grid-cols-[180px_1fr_1fr_1fr] gap-y-6 items-center px-4" onClick={(e) => e.stopPropagation()}>
        <div />
        {['assets', 'liabs', 'netWorth'].map(key => (
          <div key={key} className="text-center">
            <button onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`text-[12px] font-black uppercase transition-all ${toggles[key as keyof typeof toggles] ? 'text-gray-900' : 'text-gray-300'}`}>
              {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
            </button>
          </div>
        ))}
        <div className="text-[11px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
        {['assetsTrend', 'liabsTrend', 'netWorthTrend'].map(key => {
           const base = key.replace('Trend', '');
           return (
            <div key={key} className="flex justify-center">
              <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? `slider-active slider-${base}-on` : ''}`}><div className="slider-circle"></div></div>
            </div>
          );
        })}
        <div className="text-[11px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
        {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
          <div key={key} className="flex justify-center">
            <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? 'slider-active slider-inf-on' : ''}`}><div className="slider-circle"></div></div>
          </div>
        ))}
      </div>
    </div>
  );
};