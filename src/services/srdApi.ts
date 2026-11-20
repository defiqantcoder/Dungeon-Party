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

type CacheStore = Record<string, { ts: number; data: unknown }>;

function readCache(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    const cache = readCache();
    cache[key] = { ts: Date.now(), data };
    // Keep cache compact (~80 entries max)
    const keys = Object.keys(cache);
    if (keys.length > 80) {
      keys
        .sort((a, b) => cache[a].ts - cache[b].ts)
        .slice(0, keys.length - 80)
        .forEach((k) => delete cache[k]);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

export function hasSrdCacheKey(key: string): boolean {
  const cache = readCache();
  return Boolean(cache[key]);
}

async function fetchJsonWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = readCache();
  if (cache[cacheKey]) {
    return cache[cacheKey].data as T;
  }
  const data = await fetcher();
  writeCache(cacheKey, data);
  return data;
}

async function fetchDnd5e2014(path: string): Promise<any> {
  const res = await fetch(`${BASE_DND5E_2014}${path}`);
  if (!res.ok) {
    throw new Error(`2014 5e SRD API returned ${res.status}`);
  }
  return res.json();
}

export async function fetchSrdSpellList(classId: string): Promise<SrdListItem[]> {
  const normalized = classId.toLowerCase();
  return fetchJsonWithCache(`spells:list:${normalized}`, async () => {
    try {
      const path =
        normalized === 'all' ? '/spells' : `/classes/${normalized}/spells`;
      const json = await fetchDnd5e2014(path);
      const results = Array.isArray(json.results) ? json.results : [];
      return results.map((item: any) => ({
        index: item.index,
        name: item.name,
        level: typeof item.level === 'number' ? item.level : undefined,
        url: item.url,
      }));
    } catch {
      // Fallback strictly filtered to 2014 WotC 5e SRD on Open5e
      const open5eUrl =
        normalized === 'all'
          ? 'https://api.open5e.com/v1/spells/?document__slug=wotc-srd&limit=400'
          : `https://api.open5e.com/v1/spells/?document__slug=wotc-srd&dnd_class__icontains=${encodeURIComponent(
              normalized
            )}&limit=300`;
      const res = await fetch(open5eUrl);
      if (!res.ok) throw new Error('Unable to load 2014 5e SRD spells.');
      const json = await res.json();
      return (json.results ?? []).map((item: any) => ({
        index: item.slug,
        name: item.name,
        level: typeof item.level_int === 'number' ? item.level_int : undefined,
      }));
    }
  });
}

export async function fetchSrdSpellDetail(index: string): Promise<SrdSpellDetail> {
  return fetchJsonWithCache(`spells:detail:${index}`, async () => {
    try {
      const json = await fetchDnd5e2014(`/spells/${encodeURIComponent(index)}`);
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
    } catch {
      const res = await fetch(
        `https://api.open5e.com/v1/spells/${encodeURIComponent(index)}/`
      );
      if (!res.ok) throw new Error('Unable to load 2014 spell details.');
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
        description: json.desc ?? '',
      };
    }
  });
}

export async function fetchSrdEquipmentList(): Promise<SrdListItem[]> {
  return fetchJsonWithCache('equipment:list', async () => {
    try {
      const json = await fetchDnd5e2014('/equipment');
      const results = Array.isArray(json.results) ? json.results : [];
      return results.map((item: any) => ({
        index: item.index,
        name: item.name,
        url: item.url,
      }));
    } catch {
      // Fallback strictly filtered to 2014 WotC 5e SRD on Open5e
      const [weaponsRes, armorRes] = await Promise.all([
        fetch('https://api.open5e.com/v1/weapons/?document__slug=wotc-srd&limit=100'),
        fetch('https://api.open5e.com/v1/armor/?document__slug=wotc-srd&limit=50'),
      ]);
      const combined: SrdListItem[] = [];
      if (weaponsRes.ok) {
        const wJson = await weaponsRes.json();
        (wJson.results ?? []).forEach((w: any) =>
          combined.push({
            index: `open5e-weapon:${w.slug}`,
            name: w.name,
          })
        );
      }
      if (armorRes.ok) {
        const aJson = await armorRes.json();
        (aJson.results ?? []).forEach((a: any) =>
          combined.push({
            index: `open5e-armor:${a.slug}`,
            name: a.name,
          })
        );
      }
      if (combined.length === 0) {
        throw new Error('Unable to load 2014 5e SRD equipment.');
      }
      return combined.sort((a, b) => a.name.localeCompare(b.name));
    }
  });
}

export async function fetchSrdEquipmentDetail(
  index: string
): Promise<SrdEquipmentDetail> {
  return fetchJsonWithCache(`equipment:detail:${index}`, async () => {
    if (index.startsWith('open5e-weapon:') || index.startsWith('open5e-armor:')) {
      const isWeapon = index.startsWith('open5e-weapon:');
      const slug = index.replace(/^open5e-(weapon|armor):/, '');
      const res = await fetch(
        `https://api.open5e.com/v1/${isWeapon ? 'weapons' : 'armor'}/${encodeURIComponent(
          slug
        )}/`
      );
      if (!res.ok) throw new Error('Unable to load 2014 equipment details.');
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
    }

    const json = await fetchDnd5e2014(`/equipment/${encodeURIComponent(index)}`);
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
  });
}

export async function fetchSrdConditionsList(): Promise<SrdListItem[]> {
  return fetchJsonWithCache('conditions:list', async () => {
    try {
      const json = await fetchDnd5e2014('/conditions');
      const results = Array.isArray(json.results) ? json.results : [];
      return results.map((item: any) => ({
        index: item.index,
        name: item.name,
        url: item.url,
      }));
    } catch {
      const res = await fetch(
        'https://api.open5e.com/v1/conditions/?document__slug=wotc-srd&limit=50'
      );
      if (!res.ok) throw new Error('Unable to load 2014 5e SRD conditions.');
      const json = await res.json();
      return (json.results ?? []).map((item: any) => ({
        index: item.slug,
        name: item.name,
      }));
    }
  });
}

export async function fetchSrdConditionDetail(
  index: string
): Promise<SrdConditionDetail> {
  return fetchJsonWithCache(`conditions:detail:${index}`, async () => {
    try {
      const json = await fetchDnd5e2014(`/conditions/${encodeURIComponent(index)}`);
      return {
        index: json.index ?? index,
        name: json.name ?? index,
        description: Array.isArray(json.desc) ? json.desc.join('\n') : '',
      };
    } catch {
      const res = await fetch(
        `https://api.open5e.com/v1/conditions/${encodeURIComponent(index)}/`
      );
      if (!res.ok) throw new Error('Unable to load 2014 condition details.');
      const json = await res.json();
      return {
        index: json.slug ?? index,
        name: json.name ?? index,
        description: json.desc ?? '',
      };
    }
  });
}
