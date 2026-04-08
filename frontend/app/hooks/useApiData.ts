'use client';
import { useState, useEffect, useCallback } from 'react';

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  fromCache: boolean;
}

export function useApiData<T>(endpoint: string): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      // force=true일 때만 ?force=true 파라미터 추가 → 백엔드 캐시 무효화 후 MCP 재질의
      const url = force ? `/api${endpoint}?force=true` : `/api${endpoint}`;
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setFromCache(!!json._from_cache);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, fromCache };
}
