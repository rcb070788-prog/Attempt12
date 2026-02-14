import { useState, useEffect } from 'react';
import {
  fetchExhibitBLines,
  fetchExhibitBExpenseTotals,
  fetchExhibitBExpenseLines,
  fetchExhibitBRevenueTotals,
  fetchExhibitBRevenueLines,
} from './api';
import type { NormalizedLine, NormalizedTotalRow } from '../types';

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
 * Fetches revenue line-level data from exhibit_b_revenues (row_kind = 'line_item').
 * Use in County Revenues chart and pies.
 */
export function useExhibitBRevenueLines(): {
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
    fetchExhibitBRevenueLines()
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
 * Fetches expense line-level data from exhibit_b_expenses (row_kind = 'line_item').
 * Use in County Expenditures chart and pie page.
 */
export function useExhibitBExpenseLines(): {
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
    fetchExhibitBExpenseLines()
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
 * Fetches expense total/subtotal rows for the County Expenditures chart (from exhibit_b_expenses).
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
