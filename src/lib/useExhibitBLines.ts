import { useState, useEffect } from 'react';
import { fetchExhibitBLines, fetchExhibitBExpenseTotals, fetchExhibitBRevenueTotals } from './api';
import type { NormalizedLine, NormalizedTotalRow } from './types';

/**
 * Hook that fetches Exhibit B data from tables only (exhibit_b_lines + source_documents).
 * Use this in CountyRevenues and CountyExpenditures instead of useNormalizedLines.
 */
export function useExhibitBLines(): {
  data: NormalizedLine[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<NormalizedLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExhibitBLines()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

/**
 * Fetches expense total/subtotal rows for the County Expenditures chart (label_norm-based).
 */
export function useExhibitBExpenseTotals(): {
  data: NormalizedTotalRow[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<NormalizedTotalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExhibitBExpenseTotals()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

/**
 * Fetches revenue total rows for the County Revenues chart (general + program totals).
 */
export function useExhibitBRevenueTotals(): {
  data: NormalizedTotalRow[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<NormalizedTotalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchExhibitBRevenueTotals()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
