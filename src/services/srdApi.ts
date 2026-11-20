export interface SrdListItem {
  index: string;
  name: string;
  level?: number;
  url?: string;
}

export interface SrdSpellDetail {
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  description: string;
}

export interface SrdEquipmentDetail {
  index: string;
  name: string;
  category: string;
  weight: string;
  cost: string;
  description: string;
}

export interface SrdConditionDetail {
  index: string;
  name: string;
  description: string;
}

export const SRD_SPELL_CLASSES = [
  { id: 'all', label: 'All Classes' },
  { id: 'cleric', label: 'Cleric' },
  { id: 'wizard', label: 'Wizard' },
  { id: 'druid', label: 'Druid' },
  { id: 'bard', label: 'Bard' },
  { id: 'paladin', label: 'Paladin' },
  { id: 'ranger', label: 'Ranger' },
  { id: 'sorcerer', label: 'Sorcerer' },
  { id: 'warlock', label: 'Warlock' },
];

const CACHE_KEY = 'clinical_ledger_srd_2014_cache_v1';
const BASE_DND5E_2014 = 'https://www.dnd5eapi.co/api/2014';
const DEFAULT_TIMEOUT_MS = 6000;
const MAX_CACHE_ENTRIES = 100;

type CacheStore = Record<string, { ts: number; data: unknown }>;

function readCache(): CacheStore {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const sanitized: CacheStore = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as { ts?: unknown }).ts === 'number' &&
        'data' in entry
      ) {
        sanitized[key] = entry as { ts: number; data: unknown };
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const cache = readCache();
    cache[key] = { ts: Date.now(), data };

    // Evict oldest entries if capacity exceeded
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys
        .sort((a, b) => cache[a].ts - cache[b].ts)
        .slice(0, keys.length - MAX_CACHE_ENTRIES)
        .forEach((k) => delete cache[k]);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota or security errors gracefully
  }
}

export function hasSrdCacheKey(key: string): boolean {
  const cache = readCache();
  return Boolean(cache[key] && cache[key].data !== undefined);
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Connection timed out while reaching 2014 5e SRD API.');
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Network is offline. Use Custom Entry below to proceed.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = readCache();
  if (cache[cacheKey] && cache[cacheKey].data !== undefined) {
    return cache[cacheKey].data as T;
  }
  const data = await fetcher();
  writeCache(cacheKey, data);
  return data;
}

async function fetchDnd5e2014(path: string): Promise<any> {
  const url = `${BASE_DND5E_2014}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetchWithTimeout(url);

  if (res.status === 429) {
    throw new Error(
      '2014 5e SRD rate limit reached (HTTP 429). Please wait or use Custom Entry.'
    );
  }
  if (res.status === 404) {
    throw new Error('2014 5e SRD record not found (HTTP 404).');
  }
  if (!res.ok) {
    throw new Error(`2014 5e SRD API returned HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSrdSpellList(classId: string): Promise<SrdListItem[]> {
  const normalized = classId.toLowerCase().trim();
  return fetchJsonWithCache(`spells:list:${normalized}`, async () => {
    try {
      const path =
        normalized === 'all' ? '/spells' : `/classes/${encodeURIComponent(normalized)}/spells`;
      const json = await fetchDnd5e2014(path);
      const results = Array.isArray(json?.results) ? json.results : [];
      return results
        .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
        .map((item: any) => ({
          index: typeof item.index === 'string' ? item.index : item.name.toLowerCase().replace(/\s+/g, '-'),
          name: item.name,
          level: typeof item.level === 'number' ? item.level : undefined,
          url: typeof item.url === 'string' ? item.url : undefined,
        }));
    } catch (primaryErr) {
      // Fallback strictly filtered to 2014 WotC 5e SRD on Open5e
      try {
        const open5eUrl =
          normalized === 'all'
            ? 'https://api.open5e.com/v1/spells/?document__slug=wotc-srd&limit=400'
            : `https://api.open5e.com/v1/spells/?document__slug=wotc-srd&dnd_class__icontains=${encodeURIComponent(
                normalized
              )}&limit=300`;
        const res = await fetchWithTimeout(open5eUrl);
        if (res.status === 429) {
          throw new Error('Rate limit reached on Open5e backup.');
        }
        if (!res.ok) throw new Error(`Open5e returned HTTP ${res.status}`);
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        return results
          .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
          .map((item: any) => ({
            index: typeof item.slug === 'string' ? item.slug : item.name.toLowerCase().replace(/\s+/g, '-'),
            name: item.name,
            level: typeof item.level_int === 'number' ? item.level_int : undefined,
          }));
      } catch {
        const errorMsg =
          primaryErr instanceof Error
            ? primaryErr.message
            : 'Unable to reach 2014 5e SRD services (offline or rate-limited). Switch to Custom Entry.';
        throw new Error(errorMsg);
      }
    }
  });
}

export async function fetchSrdSpellDetail(index: string): Promise<SrdSpellDetail> {
  const safeIndex = encodeURIComponent(index.trim());
  return fetchJsonWithCache(`spells:detail:${safeIndex}`, async () => {
    try {
      const json = await fetchDnd5e2014(`/spells/${safeIndex}`);
      return {
        index: json.index ?? index,
        name: json.name ?? index,
        level: typeof json.level === 'number' ? json.level : 0,
        school: json.school?.name ?? '',
        castingTime: json.casting_time ?? '',
        range: json.range ?? '',
        duration: json.duration ?? '',
        concentration: Boolean(json.concentration),
        description: Array.isArray(json.desc) ? json.desc.join('\n\n') : '',
      };
    } catch (primaryErr) {
      try {
        const res = await fetchWithTimeout(
          `https://api.open5e.com/v1/spells/${safeIndex}/`
        );
        if (!res.ok) throw new Error('Open5e spell detail unavailable');
        const json = await res.json();
        return {
          index: json.slug ?? index,
          name: json.name ?? index,
          level: typeof json.level_int === 'number' ? json.level_int : 0,
          school: json.school ?? '',
          castingTime: json.casting_time ?? '',
          range: json.range ?? '',
          duration: json.duration ?? '',
          concentration:
            String(json.concentration ?? '').toLowerCase() === 'yes' ||
            Boolean(json.requires_concentration),
          description: typeof json.desc === 'string' ? json.desc : '',
        };
      } catch {
        const errorMsg =
          primaryErr instanceof Error
            ? primaryErr.message
            : 'Unable to load 2014 spell details. You can enter this spell manually via Custom Entry.';
        throw new Error(errorMsg);
      }
    }
  });
}

export async function fetchSrdEquipmentList(): Promise<SrdListItem[]> {
  return fetchJsonWithCache('equipment:list', async () => {
    try {
      const json = await fetchDnd5e2014('/equipment');
      const results = Array.isArray(json?.results) ? json.results : [];
      return results
        .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
        .map((item: any) => ({
          index: typeof item.index === 'string' ? item.index : item.name.toLowerCase().replace(/\s+/g, '-'),
          name: item.name,
          url: typeof item.url === 'string' ? item.url : undefined,
        }));
    } catch (primaryErr) {
      try {
        // Fallback strictly filtered to 2014 WotC 5e SRD on Open5e
        const [weaponsRes, armorRes] = await Promise.all([
          fetchWithTimeout('https://api.open5e.com/v1/weapons/?document__slug=wotc-srd&limit=100'),
          fetchWithTimeout('https://api.open5e.com/v1/armor/?document__slug=wotc-srd&limit=50'),
        ]);
        const combined: SrdListItem[] = [];
        if (weaponsRes.ok) {
          const wJson = await weaponsRes.json();
          (wJson.results ?? []).forEach((w: any) => {
            if (w && typeof w.name === 'string') {
              combined.push({
                index: `open5e-weapon:${w.slug || w.name}`,
                name: w.name,
              });
            }
          });
        }
        if (armorRes.ok) {
          const aJson = await armorRes.json();
          (aJson.results ?? []).forEach((a: any) => {
            if (a && typeof a.name === 'string') {
              combined.push({
                index: `open5e-armor:${a.slug || a.name}`,
                name: a.name,
              });
            }
          });
        }
        if (combined.length === 0) {
          throw new Error('No equipment returned from fallback service.');
        }
        return combined.sort((a, b) => a.name.localeCompare(b.name));
      } catch {
        const errorMsg =
          primaryErr instanceof Error
            ? primaryErr.message
            : 'Unable to reach 2014 5e SRD equipment service. Switch to Custom Entry below.';
        throw new Error(errorMsg);
      }
    }
  });
}

export async function fetchSrdEquipmentDetail(
  index: string
): Promise<SrdEquipmentDetail> {
  const safeIndex = encodeURIComponent(index.trim());
  return fetchJsonWithCache(`equipment:detail:${safeIndex}`, async () => {
    if (index.startsWith('open5e-weapon:') || index.startsWith('open5e-armor:')) {
      const isWeapon = index.startsWith('open5e-weapon:');
      const slug = index.replace(/^open5e-(weapon|armor):/, '');
      try {
        const res = await fetchWithTimeout(
          `https://api.open5e.com/v1/${isWeapon ? 'weapons' : 'armor'}/${encodeURIComponent(
            slug
          )}/`
        );
        if (!res.ok) throw new Error(`Open5e equipment returned HTTP ${res.status}`);
        const json = await res.json();
        const parts: string[] = [];
        if (json.cost) parts.push(`Cost: ${json.cost}`);
        if (json.damage_dice) {
          parts.push(`Damage: ${json.damage_dice} ${json.damage_type ?? ''}`.trim());
        }
        if (json.ac_string) parts.push(`AC: ${json.ac_string}`);
        if (Array.isArray(json.properties) && json.properties.length > 0) {
          parts.push(`Properties: ${json.properties.join(', ')}`);
        }
        return {
          index,
          name: json.name ?? slug,
          category: json.category ?? (isWeapon ? 'Weapon' : 'Armor'),
          weight: json.weight ? String(json.weight) : '',
          cost: json.cost ? String(json.cost) : '',
          description: parts.join(' · '),
        };
      } catch {
        throw new Error('Unable to load equipment details from Open5e fallback.');
      }
    }

    try {
      const json = await fetchDnd5e2014(`/equipment/${safeIndex}`);
      const cost = json.cost ? `${json.cost.quantity} ${json.cost.unit}` : '';
      const descParts: string[] = [];
      if (cost) descParts.push(`Cost: ${cost}`);
      if (json.damage?.damage_dice) {
        descParts.push(
          `Damage: ${json.damage.damage_dice} ${json.damage.damage_type?.name ?? ''}`.trim()
        );
      }
      if (json.armor_class?.base) {
        descParts.push(`AC: ${json.armor_class.base}`);
      }
      if (Array.isArray(json.desc) && json.desc.length > 0) {
        descParts.push(json.desc.join(' '));
      }
      return {
        index: json.index ?? index,
        name: json.name ?? index,
        category: json.equipment_category?.name ?? 'Gear',
        weight: typeof json.weight === 'number' ? `${json.weight} lb.` : '',
        cost,
        description: descParts.join(' · '),
      };
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Unable to load 2014 equipment details. Use Custom Entry below.'
      );
    }
  });
}

export async function fetchSrdConditionsList(): Promise<SrdListItem[]> {
  return fetchJsonWithCache('conditions:list', async () => {
    try {
      const json = await fetchDnd5e2014('/conditions');
      const results = Array.isArray(json?.results) ? json.results : [];
      return results
        .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
        .map((item: any) => ({
          index: typeof item.index === 'string' ? item.index : item.name.toLowerCase().replace(/\s+/g, '-'),
          name: item.name,
          url: typeof item.url === 'string' ? item.url : undefined,
        }));
    } catch (primaryErr) {
      try {
        const res = await fetchWithTimeout(
          'https://api.open5e.com/v1/conditions/?document__slug=wotc-srd&limit=50'
        );
        if (!res.ok) throw new Error(`Open5e conditions returned HTTP ${res.status}`);
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        return results
          .filter((item: any) => item && typeof item === 'object' && typeof item.name === 'string')
          .map((item: any) => ({
            index: typeof item.slug === 'string' ? item.slug : item.name.toLowerCase().replace(/\s+/g, '-'),
            name: item.name,
          }));
      } catch {
        const errorMsg =
          primaryErr instanceof Error
            ? primaryErr.message
            : 'Unable to load 2014 5e SRD conditions. You can enter conditions via Custom Entry.';
        throw new Error(errorMsg);
      }
    }
  });
}

export async function fetchSrdConditionDetail(
  index: string
): Promise<SrdConditionDetail> {
  const safeIndex = encodeURIComponent(index.trim());
  return fetchJsonWithCache(`conditions:detail:${safeIndex}`, async () => {
    try {
      const json = await fetchDnd5e2014(`/conditions/${safeIndex}`);
      return {
        index: json.index ?? index,
        name: json.name ?? index,
        description: Array.isArray(json.desc) ? json.desc.join('\n') : '',
      };
    } catch (primaryErr) {
      try {
        const res = await fetchWithTimeout(
          `https://api.open5e.com/v1/conditions/${safeIndex}/`
        );
        if (!res.ok) throw new Error(`Open5e condition detail returned HTTP ${res.status}`);
        const json = await res.json();
        return {
          index: json.slug ?? index,
          name: json.name ?? index,
          description: typeof json.desc === 'string' ? json.desc : '',
        };
      } catch {
        const errorMsg =
          primaryErr instanceof Error
            ? primaryErr.message
            : 'Unable to load 2014 condition details. Use Custom Entry below.';
        throw new Error(errorMsg);
      }
    }
  });
}
