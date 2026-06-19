// OSRS Wiki Real-time Prices API 
// https://prices.runescape.wiki/api/v1/osrs
// Free, no API key required. Please keep the User-Agent meaningful.

const BASE = 'https://prices.runescape.wiki/api/v1/osrs';
const UA   = 'AdventurersLog-App/1.0';

// Types

export type ItemMapping = {
  id:       number;
  name:     string;
  examine?: string;
  members:  boolean;
  lowalch?: number;
  highalch?: number;
  limit?:   number;
  value?:   number;
  icon?:    string;
};

export type LatestPrice = {
  high:      number | null;
  highTime:  number | null;
  low:       number | null;
  lowTime:   number | null;
};

export type TimeseriesPoint = {
  timestamp:       number;
  avgHighPrice:    number | null;
  avgLowPrice:     number | null;
  highPriceVolume: number | null;
  lowPriceVolume:  number | null;
};

export type Timestep = '5m' | '1h' | '6h';

//  Mapping cache
// Fetched once and cached in memory for the session.

let mappingCache: ItemMapping[] | null = null;

export async function fetchMapping(): Promise<ItemMapping[]> {
  if (mappingCache) return mappingCache;
  try {
    const res = await fetch(`${BASE}/mapping`, { headers: { 'User-Agent': UA } });
    const data: ItemMapping[] = await res.json();
    mappingCache = data;
    return data;
  } catch {
    return [];
  }
}

export function searchMapping(mapping: ItemMapping[], query: string): ItemMapping[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return mapping
    .filter((m) => m.name.toLowerCase().includes(q))
    .sort((a, b) => {
      // Exact matches first, then starts-with, then contains
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName === q) return -1;
      if (bName === q) return 1;
      if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
      if (bName.startsWith(q) && !aName.startsWith(q)) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);
}

// Latest prices

export async function fetchLatestPrice(id: number): Promise<LatestPrice | null> {
  try {
    const res = await fetch(`${BASE}/latest?id=${id}`, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const item = data?.data?.[id];
    if (!item) return null;
    return item as LatestPrice;
  } catch {
    return null;
  }
}

// Timeseries

export async function fetchTimeseries(id: number, timestep: Timestep): Promise<TimeseriesPoint[]> {
  try {
    const res = await fetch(`${BASE}/timeseries?id=${id}&timestep=${timestep}`, {
      headers: { 'User-Agent': UA },
    });
    const data = await res.json();
    return (data?.data ?? []) as TimeseriesPoint[];
  } catch {
    return [];
  }
}

// Helpers

export function formatGP(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${Math.round(n / 1_000_000)}m`;
  if (n >= 1_000)         return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}

export function formatVolume(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}

export function itemIconUrl(iconFileName: string): string {
  return `https://oldschool.runescape.wiki/images/${encodeURIComponent(iconFileName.replace(/ /g, '_'))}`;
}

// Time range config 
// Maps UI label → API timestep + how many points to show (slice from end)

export type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';

export const TIME_RANGE_CONFIG: Record<TimeRange, { timestep: Timestep; points: number; label: string }> = {
  '1H':  { timestep: '5m', points: 12,  label: '1 Hour' },
  '6H':  { timestep: '5m', points: 72,  label: '6 Hours' },
  '24H': { timestep: '1h', points: 24,  label: '24 Hours' },
  '7D':  { timestep: '6h', points: 28,  label: '7 Days' },
  '30D': { timestep: '6h', points: 120, label: '30 Days' },
};

export const TIME_RANGES: TimeRange[] = ['1H', '6H', '24H', '7D', '30D'];