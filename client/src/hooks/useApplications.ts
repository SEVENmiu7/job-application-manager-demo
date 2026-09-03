import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api';
import type { ApplicationRecord, ApplicationStats } from '@shared/types';

export function useApplications(
  filters?: Record<string, string>,
  view: 'full' | 'board' = 'full',
) {
  const [data, setData] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const replaceApplication = useCallback((record: ApplicationRecord) => {
    setData((current: ApplicationRecord[]) =>
      current.map((item: ApplicationRecord) =>
        item.record_id === record.record_id ? record : item,
      ),
    );
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const request =
      view === 'board'
        ? api.listBoardApplications()
        : api.listApplications(filters);
    request
      .then((result: ApplicationRecord[]) => {
        if (active) setData(Array.isArray(result) ? result : []);
      })
      .catch((caughtError: unknown) => {
        if (!active) return;
        const message: string =
          caughtError instanceof Error ? caughtError.message : '未知错误';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, tick, view]);

  return { data, loading, error, refetch, replaceApplication };
}

export function useStats() {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getStats()
      .then((result: ApplicationStats) => setStats(result))
      .catch((caughtError: unknown) => {
        const message: string =
          caughtError instanceof Error ? caughtError.message : '未知错误';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [tick]);

  return { stats, loading, error, refetch };
}
