import { useState, useEffect } from 'react';
import { fetchNormalizedLines } from './api';
import type { NormalizedLine } from './types';

export function useNormalizedLines(): {
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
    fetchNormalizedLines()
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
