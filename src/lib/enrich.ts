import type { EnrichedBilder } from '@/types/enriched';
import type { Bilder, Standorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BilderMaps {
  standorteMap: Map<string, Standorte>;
}

export function enrichBilder(
  bilder: Bilder[],
  maps: BilderMaps
): EnrichedBilder[] {
  return bilder.map(r => ({
    ...r,
    bild_standortName: resolveDisplay(r.fields.bild_standort, maps.standorteMap, 'standort_name'),
  }));
}
