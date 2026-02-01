import { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { getRealValue, calculateTrendLine } from '../utils/financeUtils';

export const useFinanceData = (selectedParents: string[], toggles: any, chartLevel: number) => {
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [yearDetailData, setYearDetailData] = useState<any[]>([]);

  const fetchFinancialData = async () => {
    if (!supabase) return;
    const levelFilter = 'hierarchy_level.in.(1,2,3)';
    const { data: b1 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2004).lte('year', 2013).or(levelFilter);
    const { data: b2 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2014).lte('year', 2023).or(levelFilter);
    const { data: b3 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2024).lte('year', 2033).or(levelFilter);

    const combined = [...(b1 || []), ...(b2 || []), ...(b3 || [])];
    const sorted = combined.sort((a, b) => a.year - b.year);
    setFinancialData(sorted);
  };

  const fetchYearDetails = async (year: number) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('AFR_Exhibit_A').select('*').eq('year', year);
    if (!error && data) setYearDetailData(data);
  };

  // --- THE MATH BRAIN (TIER 1-4 & COVID GAP) ---
  const chartData = useMemo(() => {
    const yearMap = new Map();
    const years = financialData.map(d => Number(d.year));
    const baseYear = years.length > 0 ? Math.min(...years) : 2005;

    financialData.forEach(row => {
      const yr = Number(row.year);
      const amt = Number(row.amount || 0);
      const level = Number(row.hierarchy_level);
      const label = (row.label || '').trim();
      const parent = (row.parent_entity || '').trim();
      const cat = (row.category || '').toLowerCase();

      if (!yearMap.has(yr)) {
        yearMap.set(yr, { 
          year: yr, totalAssets: 0, totalLiabs: 0, totalNetWorth: 0,
          primaryNetWorth: 0, schoolNetWorth: 0, ecdNetWorth: 0,
          isCovidGap: false
        });
      }
      const e = yearMap.get(yr);
      const isAsset = cat.includes('asset');
      const isLiab = cat.includes('liabilit');
      const isNet = cat.includes('net');

      if (level === 1) {
        if (isAsset) e.totalAssets = amt;
        else if (isLiab) e.totalLiabs = amt;
        else if (isNet) e.totalNetWorth = amt;
      }
      
      if (level === 2) {
        if (label.includes('Primary')) e.primaryNetWorth = amt;
        if (label.includes('School')) e.schoolNetWorth = amt;
        if (label.includes('Emergency')) e.ecdNetWorth = amt;
      }

      selectedParents.forEach(sel => {
        const keyBase = sel.replace(/\s+/g, '');
        if (label.includes(sel) || parent.includes(sel)) {
          if (isAsset) e[`${keyBase}Assets`] = amt;
          else if (isLiab) e[`${keyBase}Liabs`] = amt;
          else if (isNet) e[`${keyBase}NetWorth`] = amt;
        }
      });

      if (yr === 2020 && selectedParents.length === 1 && selectedParents[0] === 'Business-type') {
        e.isCovidGap = true;
      }
    });

    let list = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
    
    list = list.map((e, idx, arr) => {
      if (e.year === 2020 && e.isCovidGap) {
        const prev = arr[idx-1], next = arr[idx+1];
        if (prev && next) {
          ['totalAssets', 'totalLiabs', 'totalNetWorth', 'primaryNetWorth', 'schoolNetWorth', 'ecdNetWorth'].forEach(k => {
            e[k] = (Number(prev[k] || 0) + Number(next[k] || 0)) / 2;
          });
          selectedParents.forEach(sel => {
            const kb = sel.replace(/\s+/g, '');
            ['Assets', 'Liabs', 'NetWorth'].forEach(suffix => {
              e[`${kb}${suffix}`] = (Number(prev[`${kb}${suffix}`] || 0) + Number(next[`${kb}${suffix}`] || 0)) / 2;
            });
          });
        }
      }

      e.totalNetWorthReal = getRealValue(e.totalNetWorth, e.year, baseYear);
      e.totalAssetsReal = getRealValue(e.totalAssets, e.year, baseYear);
      e.totalLiabsReal = getRealValue(e.totalLiabs, e.year, baseYear);
      selectedParents.forEach(sel => {
        const kb = sel.replace(/\s+/g, '');
        if (e[`${kb}NetWorth`]) e[`${kb}NetWorthReal`] = getRealValue(e[`${kb}NetWorth`], e.year, baseYear);
        if (e[`${kb}Assets`]) e[`${kb}AssetsReal`] = getRealValue(e[`${kb}Assets`], e.year, baseYear);
        if (e[`${kb}Liabs`]) e[`${kb}LiabsReal`] = getRealValue(e[`${kb}Liabs`], e.year, baseYear);
      });
      return e;
    });

    list = calculateTrendLine(list, 'totalNetWorth');
    list = calculateTrendLine(list, 'totalAssets');
    list = calculateTrendLine(list, 'totalLiabs');
    selectedParents.forEach(sel => {
      const kb = sel.replace(/\s+/g, '');
      list = calculateTrendLine(list, `${kb}NetWorth`);
      list = calculateTrendLine(list, `${kb}Assets`);
      list = calculateTrendLine(list, `${kb}Liabs`);
    });

    list = calculateTrendLine(list, 'totalNetWorthReal');
    list = calculateTrendLine(list, 'totalAssetsReal');
    list = calculateTrendLine(list, 'totalLiabsReal');
    selectedParents.forEach(sel => {
      const kb = sel.replace(/\s+/g, '');
      list = calculateTrendLine(list, `${kb}NetWorthReal`);
      list = calculateTrendLine(list, `${kb}AssetsReal`);
      list = calculateTrendLine(list, `${kb}LiabsReal`);
    });

    return list;
  }, [financialData, selectedParents, toggles, chartLevel]);

  return { chartData, yearDetailData, fetchFinancialData, fetchYearDetails };
};