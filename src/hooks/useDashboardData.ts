import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Bilder, Standorte } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [bilder, setBilder] = useState<Bilder[]>([]);
  const [standorte, setStandorte] = useState<Standorte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [bilderData, standorteData] = await Promise.all([
        LivingAppsService.getBilder(),
        LivingAppsService.getStandorte(),
      ]);
      setBilder(bilderData);
      setStandorte(standorteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const standorteMap = useMemo(() => {
    const m = new Map<string, Standorte>();
    standorte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [standorte]);

  return { bilder, setBilder, standorte, setStandorte, loading, error, fetchAll, standorteMap };
}