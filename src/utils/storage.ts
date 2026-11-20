import {
  ABILITY_KEYS,
  createBlankCharacterState,
  createInitialLedgerState,
  DEFAULT_MINIATURE_SUPPLIES,
  DEFAULT_PIP_MACROS,
} from '../data/defaultState';
import {
  AbilityKey,
  CustomLedgerSection,
  DiceMacro,
  LedgerState,
  ProficiencyRank,
  RollMode,
  RollRecord,
  SkillEntry,
} from '../types/ledger';
import { redactStateForParty } from './ledgerMath';

const STATE_STORAGE_KEY = 'clinical_ledger_pip_state_v1';
const ROLL_HISTORY_KEY = 'clinical_ledger_pip_rolls_v1';

const VALID_ABILITIES = new Set<string>(ABILITY_KEYS);
const VALID_RANKS = new Set<string>(['none', 'half', 'prof', 'exp']);
const VALID_ROLL_MODES = new Set<string>(['normal', 'adv', 'dis']);

export function slugifyCharacterName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'character';
}

export function loadLedgerState(): LedgerState {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) return createInitialLedgerState();
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    return mergeWithDefaults(parsed, createBlankCharacterState());
  } catch {
    return createInitialLedgerState();
  }
}

export function saveLedgerState(state: LedgerState): void {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors gracefully
  }
}

export const MAX_ROLL_HISTORY = 25;

export function loadRollHistory(): RollRecord[] {
  try {
    const raw = localStorage.getItem(ROLL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ROLL_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveRollHistory(rolls: RollRecord[]): void {
  try {
    localStorage.setItem(
      ROLL_HISTORY_KEY,
      JSON.stringify(rolls.slice(0, MAX_ROLL_HISTORY))
    );
  } catch {
    // Ignore quota errors
  }
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeSkills(
  incomingSkills: unknown,
  fallbackSkills: SkillEntry[]
): SkillEntry[] {
  if (!Array.isArray(incomingSkills)) {
    return fallbackSkills.map((s) => ({ ...s }));
  }
  return incomingSkills
    .filter((entry): entry is Partial<SkillEntry> => Boolean(entry && typeof entry === 'object'))
    .map((entry, idx) => {
      const ability: AbilityKey =
        typeof entry.ability === 'string' && VALID_ABILITIES.has(entry.ability)
          ? (entry.ability as AbilityKey)
          : 'INT';
      const rank: ProficiencyRank =
        typeof entry.rank === 'string' && VALID_RANKS.has(entry.rank)
          ? (entry.rank as ProficiencyRank)
          : 'none';
      return {
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id.trim()
            : `skill-${idx + 1}`,
        name:
          typeof entry.name === 'string' && entry.name.trim()
            ? entry.name
            : `Skill ${idx + 1}`,
        ability,
        rank,
        specialty: typeof entry.specialty === 'string' ? entry.specialty : undefined,
      };
    });
}

function normalizeCustomLedger(
  incomingSections: unknown,
  fallbackSections: CustomLedgerSection[]
): CustomLedgerSection[] {
  const source = Array.isArray(incomingSections) ? incomingSections : [];
  return Array.from({ length: 6 }, (_, idx) => {
    const raw = source[idx] as Partial<CustomLedgerSection> | undefined;
    const base = fallbackSections[idx] ?? {
      id: `custom-${idx + 1}`,
      title: '',
      content: '',
      isPrivate: false,
    };
    if (!raw || typeof raw !== 'object') {
      return { ...base };
    }
    return {
      id:
        typeof raw.id === 'string' && raw.id.trim()
          ? raw.id
          : `custom-${idx + 1}`,
      title: typeof raw.title === 'string' ? raw.title : '',
      content: typeof raw.content === 'string' ? raw.content : '',
      isPrivate: Boolean(raw.isPrivate),
    };
  });
}

function normalizeMacros(
  incomingMacros: unknown,
  isLegacyPipUpgrade: boolean
): DiceMacro[] {
  const rawList = Array.isArray(incomingMacros)
    ? incomingMacros.filter(
        (m): m is Partial<DiceMacro> => Boolean(m && typeof m === 'object')
      )
    : [];

  const bySlot = new Map<number, Partial<DiceMacro>>();
  rawList.forEach((m) => {
    if (typeof m.slot === 'number' && m.slot >= 1 && m.slot <= 9) {
      bySlot.set(m.slot, m);
    }
  });

  const hasAnySlot1to4 = [1, 2, 3, 4].some((slot) => bySlot.has(slot));

  return Array.from({ length: 9 }, (_, i) => {
    const slot = i + 1;
    const existing = bySlot.get(slot);
    if (existing) {
      const mode: RollMode =
        typeof existing.mode === 'string' && VALID_ROLL_MODES.has(existing.mode)
          ? (existing.mode as RollMode)
          : 'normal';
      return {
        slot,
        label: typeof existing.label === 'string' ? existing.label : '',
        expression:
          typeof existing.expression === 'string' ? existing.expression : '',
        mode,
      };
    }
    if (slot <= 4 && !hasAnySlot1to4 && isLegacyPipUpgrade) {
      return { ...DEFAULT_PIP_MACROS[slot - 1] };
    }
    return { slot, label: '', expression: '', mode: 'normal' };
  });
}

export function mergeWithDefaults(
  incoming: Partial<LedgerState>,
  defaults: LedgerState = createBlankCharacterState()
): LedgerState {
  const incomingVersion = coerceNumber(incoming.version, 1);
  const incomingName =
    typeof incoming.identity?.name === 'string' ? incoming.identity.name : '';
  const isLegacyPipV1 = incomingVersion < 2 && incomingName.trim().toLowerCase() === 'pip';
  const isLegacyPipV2 = incomingVersion < 3 && incomingName.trim().toLowerCase() === 'pip';

  const mergedAbilities = { ...defaults.abilities };
  ABILITY_KEYS.forEach((ab) => {
    const rawScore = incoming.abilities?.[ab];
    if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
      mergedAbilities[ab] = Math.max(1, Math.min(30, Math.round(rawScore)));
    }
  });

  const mergedSaveProfs = { ...defaults.saveProficiencies };
  ABILITY_KEYS.forEach((ab) => {
    if (typeof incoming.saveProficiencies?.[ab] === 'boolean') {
      mergedSaveProfs[ab] = incoming.saveProficiencies[ab];
    }
  });

  const rawMagicAdv = Array.isArray(incoming.gnomeCunningMagicAdv)
    ? incoming.gnomeCunningMagicAdv.filter(
        (ab): ab is AbilityKey => typeof ab === 'string' && VALID_ABILITIES.has(ab)
      )
    : defaults.gnomeCunningMagicAdv;

  const hpMax = Math.max(
    1,
    Math.round(coerceNumber(incoming.vitals?.hpMax, defaults.vitals.hpMax))
  );
  const hpCurrent = Math.max(
    0,
    Math.min(
      hpMax,
      Math.round(coerceNumber(incoming.vitals?.hpCurrent, defaults.vitals.hpCurrent))
    )
  );
  const hitDiceTotal = Math.max(
    1,
    Math.round(
      coerceNumber(incoming.vitals?.hitDiceTotal, defaults.vitals.hitDiceTotal)
    )
  );
  const hitDiceSpent = Math.max(
    0,
    Math.min(
      hitDiceTotal,
      Math.round(
        coerceNumber(incoming.vitals?.hitDiceSpent, defaults.vitals.hitDiceSpent)
      )
    )
  );

  const normalizedSpellSlots = Array.from({ length: 9 }, (_, i) => {
    const level = i + 1;
    const rawSlot = Array.isArray(incoming.gearAndNotes?.spellSlots)
      ? incoming.gearAndNotes.spellSlots.find((s) => s && s.level === level)
      : undefined;
    const max = Math.max(0, Math.round(coerceNumber(rawSlot?.max, 0)));
    const used = Math.max(
      0,
      Math.min(max, Math.round(coerceNumber(rawSlot?.used, 0)))
    );
    return { level, max, used };
  });

  return {
    ...defaults,
    ...incoming,
    version: defaults.version,
    proficiencyBonus: Math.max(
      1,
      Math.round(coerceNumber(incoming.proficiencyBonus, defaults.proficiencyBonus))
    ),
    identity: {
      ...defaults.identity,
      ...(incoming.identity ?? {}),
      name:
        typeof incoming.identity?.name === 'string'
          ? incoming.identity.name
          : defaults.identity.name,
      player:
        typeof incoming.identity?.player === 'string'
          ? incoming.identity.player
          : defaults.identity.player,
      campaign:
        typeof incoming.identity?.campaign === 'string'
          ? incoming.identity.campaign
          : defaults.identity.campaign,
      setting:
        typeof incoming.identity?.setting === 'string'
          ? incoming.identity.setting
          : defaults.identity.setting,
      race:
        typeof incoming.identity?.race === 'string'
          ? incoming.identity.race
          : defaults.identity.race,
      alignment:
        typeof incoming.identity?.alignment === 'string'
          ? incoming.identity.alignment
          : defaults.identity.alignment,
      occupation:
        typeof incoming.identity?.occupation === 'string'
          ? incoming.identity.occupation
          : defaults.identity.occupation,
      specialty:
        typeof incoming.identity?.specialty === 'string'
          ? incoming.identity.specialty
          : defaults.identity.specialty,
      portraitStandard:
        typeof incoming.identity?.portraitStandard === 'string'
          ? incoming.identity.portraitStandard
          : null,
      portraitVessel:
        typeof incoming.identity?.portraitVessel === 'string'
          ? incoming.identity.portraitVessel
          : null,
    },
    abilities: mergedAbilities,
    saveProficiencies: mergedSaveProfs,
    gnomeCunningMagicAdv: Array.from(new Set(rawMagicAdv)),
    skills: normalizeSkills(incoming.skills, defaults.skills),
    vitals: {
      ...defaults.vitals,
      ...(incoming.vitals ?? {}),
      ac: Math.max(0, Math.round(coerceNumber(incoming.vitals?.ac, defaults.vitals.ac))),
      initiativeOverride:
        incoming.vitals?.initiativeOverride === null ||
        incoming.vitals?.initiativeOverride === undefined
          ? null
          : coerceNumber(incoming.vitals.initiativeOverride, 0),
      speed:
        typeof incoming.vitals?.speed === 'string'
          ? incoming.vitals.speed
          : defaults.vitals.speed,
      hpCurrent,
      hpMax,
      tempHp: Math.max(
        0,
        Math.round(coerceNumber(incoming.vitals?.tempHp, defaults.vitals.tempHp))
      ),
      hitDiceDie:
        typeof incoming.vitals?.hitDiceDie === 'string'
          ? incoming.vitals.hitDiceDie
          : defaults.vitals.hitDiceDie,
      hitDiceTotal,
      hitDiceSpent,
      deathSaves: {
        successes: Math.max(
          0,
          Math.min(
            3,
            Math.round(coerceNumber(incoming.vitals?.deathSaves?.successes, 0))
          )
        ),
        failures: Math.max(
          0,
          Math.min(
            3,
            Math.round(coerceNumber(incoming.vitals?.deathSaves?.failures, 0))
          )
        ),
      },
      conditions: {
        poisoned: Boolean(incoming.vitals?.conditions?.poisoned),
        frightened: Boolean(incoming.vitals?.conditions?.frightened),
        concentrating: Boolean(incoming.vitals?.conditions?.concentrating),
        exhaustion: Math.max(
          0,
          Math.min(
            6,
            Math.round(coerceNumber(incoming.vitals?.conditions?.exhaustion, 0))
          )
        ),
        extra: Array.isArray(incoming.vitals?.conditions?.extra)
          ? incoming.vitals.conditions.extra
          : defaults.vitals.conditions.extra,
      },
    },
    persona: {
      traits:
        typeof incoming.persona?.traits === 'string'
          ? incoming.persona.traits
          : defaults.persona.traits,
      ideals:
        typeof incoming.persona?.ideals === 'string'
          ? incoming.persona.ideals
          : defaults.persona.ideals,
      bonds:
        typeof incoming.persona?.bonds === 'string'
          ? incoming.persona.bonds
          : defaults.persona.bonds,
      flaws:
        typeof incoming.persona?.flaws === 'string'
          ? incoming.persona.flaws
          : defaults.persona.flaws,
      clinicalNotes:
        typeof incoming.persona?.clinicalNotes === 'string'
          ? incoming.persona.clinicalNotes
          : defaults.persona.clinicalNotes,
    },
    covert: {
      clockworkVesselActive: Boolean(incoming.covert?.clockworkVesselActive),
      clockworkVesselArc:
        typeof incoming.covert?.clockworkVesselArc === 'string'
          ? incoming.covert.clockworkVesselArc
          : '',
      undyingDriftArc:
        typeof incoming.covert?.undyingDriftArc === 'string'
          ? incoming.covert.undyingDriftArc
          : '',
    },
    gearAndNotes: {
      attacks: Array.isArray(incoming.gearAndNotes?.attacks)
        ? incoming.gearAndNotes.attacks
        : [],
      spells: Array.isArray(incoming.gearAndNotes?.spells)
        ? incoming.gearAndNotes.spells
        : [],
      spellSlots: normalizedSpellSlots,
      gear: Array.isArray(incoming.gearAndNotes?.gear)
        ? incoming.gearAndNotes.gear
        : [],
      miniatureSupplies:
        isLegacyPipV1 &&
        (!Array.isArray(incoming.gearAndNotes?.miniatureSupplies) ||
          incoming.gearAndNotes.miniatureSupplies.length === 0)
          ? DEFAULT_MINIATURE_SUPPLIES.map((s) => ({ ...s }))
          : Array.isArray(incoming.gearAndNotes?.miniatureSupplies)
          ? incoming.gearAndNotes.miniatureSupplies
          : defaults.gearAndNotes.miniatureSupplies,
      currency: {
        gp: Math.max(0, Math.round(coerceNumber(incoming.gearAndNotes?.currency?.gp, 0))),
        sp: Math.max(0, Math.round(coerceNumber(incoming.gearAndNotes?.currency?.sp, 0))),
        cp: Math.max(0, Math.round(coerceNumber(incoming.gearAndNotes?.currency?.cp, 0))),
      },
      sessionCosts: Array.isArray(incoming.gearAndNotes?.sessionCosts)
        ? incoming.gearAndNotes.sessionCosts
        : [],
      scratchpad:
        typeof incoming.gearAndNotes?.scratchpad === 'string'
          ? incoming.gearAndNotes.scratchpad
          : '',
      scratchpadPrivate: Boolean(incoming.gearAndNotes?.scratchpadPrivate),
      campaignLog: Array.isArray(incoming.gearAndNotes?.campaignLog)
        ? incoming.gearAndNotes.campaignLog
        : [],
    },
    customLedger: normalizeCustomLedger(
      incoming.customLedger,
      defaults.customLedger
    ),
    customMacros: normalizeMacros(incoming.customMacros, isLegacyPipV2),
  };
}

export function exportLedgerJson(
  state: LedgerState,
  partySafeOnly: boolean
): string {
  const payload = partySafeOnly ? redactStateForParty(state) : state;
  return JSON.stringify(
    {
      schema: 'the-clinical-ledger',
      version: 3,
      partySafe: partySafeOnly,
      exportedAt: new Date().toISOString(),
      data: payload,
    },
    null,
    2
  );
}

export function parseImportedLedgerJson(rawText: string): {
  ok: true;
  state: LedgerState;
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(rawText);
    const candidate =
      parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      !candidate.identity ||
      typeof candidate.identity !== 'object' ||
      !candidate.abilities ||
      typeof candidate.abilities !== 'object'
    ) {
      return {
        ok: false,
        error: 'JSON does not match The Clinical Ledger schema.',
      };
    }
    return {
      ok: true,
      state: mergeWithDefaults(
        candidate as Partial<LedgerState>,
        createBlankCharacterState()
      ),
    };
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON file. Could not parse ledger backup.',
    };
  }
}

export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function compressImageToDataUrl(
  file: File,
  maxDim = 420
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
