import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';

const MAX_DISPLAY_ROWS = 500;

interface CsvViewerPageProps {
  bucket: string;
  path: string;
  name: string;
}

export default function CsvViewerPage({ bucket, path, name }: CsvViewerPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const downloadUrl = useMemo(
    () => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
    [bucket, path]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(path);
        if (cancelled) return;
        if (downloadError) {
          setError(downloadError.message);
          setLoading(false);
          return;
        }
        if (!blob) {
          setError('No data returned');
          setLoading(false);
          return;
        }
        const text = await blob.text();
        if (cancelled) return;
        const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
        const allRows = (parsed.data || []) as string[][];
        if (allRows.length === 0) {
          setColumns([]);
          setRows([]);
          setLoading(false);
          return;
        }
        const cols = allRows[0].map((c, i) => (c && String(c).trim()) || `Column ${i + 1}`);
        const dataRows = allRows.slice(1);
        const total = dataRows.length;
        const displayRows = dataRows.slice(0, MAX_DISPLAY_ROWS);
        setColumns(cols);
        setRows(displayRows);
        setTotalRows(total > MAX_DISPLAY_ROWS ? total : undefined);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load CSV');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bucket, path]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      row.some(cell => (cell ?? '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const truncated = totalRows != null && totalRows > rows.length;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden h-[100dvh]">
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-black uppercase text-gray-900 truncate">{name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-0 text-sm min-w-[160px]"
            aria-label="Search table"
          />
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-yellow-600 hover:text-yellow-700 font-bold text-sm rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-colors inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-download"></i> Download
          </a>
          <a
            href={typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '/') : '#'}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black uppercase text-xs rounded-xl transition-colors"
          >
            Close
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <i className="fa-solid fa-spinner fa-spin text-4xl mb-4"></i>
            <p className="font-black uppercase text-xs">Loading…</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center space-y-4">
            <p className="text-red-600 font-bold">{error}</p>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-700 font-bold text-sm"
            >
              <i className="fa-solid fa-download"></i> Download instead
            </a>
          </div>
        )}

        {!loading && !error && (columns.length > 0 || filteredRows.length > 0) && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {truncated && (
                <p className="text-gray-500 font-bold text-sm">
                  Showing first {rows.length} of {totalRows} rows.
                </p>
              )}
              {searchQuery.trim() && (
                <p className="text-gray-500 font-bold text-sm">
                  {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''} match.
                </p>
              )}
            </div>
            <div className="overflow-auto rounded-2xl border-2 border-gray-100 bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {columns.map((col, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 tracking-widest whitespace-nowrap border-b border-gray-200"
                      >
                        {col || `Column ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      {columns.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                        >
                          {row[colIdx] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && columns.length > 0 && filteredRows.length === 0 && searchQuery.trim() && (
          <p className="text-gray-500 font-bold text-sm py-8">No rows match your search.</p>
        )}

        {!loading && !error && columns.length === 0 && rows.length === 0 && !searchQuery.trim() && (
          <p className="text-gray-400 font-bold text-sm py-8">No data to display.</p>
        )}
      </main>
    </div>
  );
}
