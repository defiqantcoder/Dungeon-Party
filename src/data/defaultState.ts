import {
  AbilityKey,
  AvatarGender,
  AvatarRace,
  LedgerState,
  SkillEntry,
  SupplyCounter,
} from '../types/ledger';

export const AVATAR_RACE_OPTIONS: {
  id: AvatarRace;
  label: string;
  defaultSpeed: string;
  shortTag: string;
}[] = [
  { id: 'gnome', label: 'Gnome', defaultSpeed: '25 ft.', shortTag: 'GNM' },
  { id: 'human', label: 'Human', defaultSpeed: '30 ft.', shortTag: 'HUM' },
  { id: 'elf', label: 'Elf', defaultSpeed: '30 ft.', shortTag: 'ELF' },
  { id: 'dwarf', label: 'Dwarf', defaultSpeed: '25 ft.', shortTag: 'DWF' },
  { id: 'halfling', label: 'Halfling', defaultSpeed: '25 ft.', shortTag: 'HLF' },
  { id: 'dragonborn', label: 'Dragonborn', defaultSpeed: '30 ft.', shortTag: 'DRG' },
  { id: 'tiefling', label: 'Tiefling', defaultSpeed: '30 ft.', shortTag: 'TIF' },
  { id: 'half-orc', label: 'Half-Orc', defaultSpeed: '30 ft.', shortTag: 'ORC' },
  { id: 'half-elf', label: 'Half-Elf', defaultSpeed: '30 ft.', shortTag: 'H-E' },
  { id: 'tabaxi', label: 'Tabaxi', defaultSpeed: '30 ft.', shortTag: 'TAB' },
  { id: 'warforged', label: 'Warforged', defaultSpeed: '30 ft.', shortTag: 'WRF' },
  { id: 'aasimar', label: 'Aasimar', defaultSpeed: '30 ft.', shortTag: 'AAS' },
];

export const DEFAULT_MINIATURE_SUPPLIES: SupplyCounter[] = [
  {
    id: 'sup-micro-bandages',
    name: 'Micro-Bandages',
    category: 'medical',
    quantity: 0,
    unit: '',
    notes: '',
  },
  {
    id: 'sup-salve-vials',
    name: 'Salve Vials',
    category: 'medical',
    quantity: 0,
    unit: '',
    notes: '',
  },
  {
    id: 'sup-watch-gears',
    name: 'Watch Gears',
    category: 'clockwork',
    quantity: 0,
    unit: '',
    notes: '',
  },
  {
    id: 'sup-automaton-parts',
    name: 'Automaton Parts',
    category: 'clockwork',
    quantity: 0,
    unit: '',
    notes: '',
  },
];

export const ABILITY_KEYS: AbilityKey[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
};

export const STANDARD_5E_SKILLS: {
  id: string;
  name: string;
  ability: AbilityKey;
}[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'DEX' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'WIS' },
  { id: 'arcana', name: 'Arcana', ability: 'INT' },
  { id: 'athletics', name: 'Athletics', ability: 'STR' },
  { id: 'deception', name: 'Deception', ability: 'CHA' },
  { id: 'history', name: 'History', ability: 'INT' },
  { id: 'insight', name: 'Insight', ability: 'WIS' },
  { id: 'intimidation', name: 'Intimidation', ability: 'CHA' },
  { id: 'investigation', name: 'Investigation', ability: 'INT' },
  { id: 'medicine', name: 'Medicine', ability: 'WIS' },
  { id: 'nature', name: 'Nature', ability: 'INT' },
  { id: 'perception', name: 'Perception', ability: 'WIS' },
  { id: 'performance', name: 'Performance', ability: 'CHA' },
  { id: 'persuasion', name: 'Persuasion', ability: 'CHA' },
  { id: 'religion', name: 'Religion', ability: 'INT' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'DEX' },
  { id: 'stealth', name: 'Stealth', ability: 'DEX' },
  { id: 'survival', name: 'Survival', ability: 'WIS' },
];

export function createBlankSkills(): SkillEntry[] {
  return STANDARD_5E_SKILLS.map((s) => ({
    ...s,
    rank: 'none',
  }));
}

const DEFAULT_PIP_SKILLS: SkillEntry[] = STANDARD_5E_SKILLS.map((s) => {
  if (s.id === 'medicine') {
    return {
      ...s,
      rank: 'exp',
      specialty: 'Memory & Trauma Care; crafting miniature medical supplies',
    };
  }
  if (
    s.id === 'history' ||
    s.id === 'insight' ||
    s.id === 'investigation' ||
    s.id === 'perception'
  ) {
    return { ...s, rank: 'prof' };
  }
  return { ...s, rank: 'none' };
});

export function createBlankMacros(): LedgerState['customMacros'] {
  return Array.from({ length: 9 }, (_, i) => ({
    slot: i + 1,
    label: '',
    expression: '',
    mode: 'normal',
  }));
}

export const DEFAULT_PIP_MACROS: LedgerState['customMacros'] = [
  { slot: 1, label: 'Medicine', expression: '1d20+7', mode: 'normal' },
  { slot: 2, label: 'Investigation', expression: '1d20+5', mode: 'normal' },
  { slot: 3, label: 'History', expression: '1d20+5', mode: 'normal' },
  { slot: 4, label: 'WIS Magic Save', expression: '1d20+5', mode: 'adv' },
  { slot: 5, label: '', expression: '', mode: 'normal' },
  { slot: 6, label: '', expression: '', mode: 'normal' },
  { slot: 7, label: '', expression: '', mode: 'normal' },
  { slot: 8, label: '', expression: '', mode: 'normal' },
  { slot: 9, label: '', expression: '', mode: 'normal' },
];

export interface BlankCharacterOptions {
  name?: string;
  player?: string;
  occupation?: string;
  avatarRace?: AvatarRace;
  avatarGender?: AvatarGender;
  hpMax?: number;
}

export function createBlankCharacterState(
  options: BlankCharacterOptions = {}
): LedgerState {
  const raceId: AvatarRace = options.avatarRace ?? 'human';
  const raceMeta = AVATAR_RACE_OPTIONS.find((r) => r.id === raceId);
  const hpMax = Math.max(1, Math.round(options.hpMax ?? 1));
  const isGnome = raceId === 'gnome';

  return {
    version: 4,
    identity: {
      name: options.name ?? '',
      player: options.player ?? '',
      campaign: '',
      setting: '',
      race: options.avatarRace ? raceMeta?.label ?? '' : '',
      alignment: '',
      occupation: options.occupation ?? '',
      specialty: '',
      portraitStandard: null,
      portraitVessel: null,
      avatarRace: raceId,
      avatarGender: options.avatarGender ?? 'male',
    },
    abilities: {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    },
    proficiencyBonus: 2,
    saveProficiencies: {
      STR: false,
      DEX: false,
      CON: false,
      INT: false,
      WIS: false,
      CHA: false,
    },
    gnomeCunningMagicAdv: isGnome ? ['INT', 'WIS', 'CHA'] : [],
    skills: createBlankSkills(),
    vitals: {
      ac: 10,
      initiativeOverride: null,
      speed: raceMeta?.defaultSpeed ?? '30 ft.',
      hpCurrent: hpMax,
      hpMax,
      tempHp: 0,
      hitDiceDie: '1d8',
      hitDiceTotal: 1,
      hitDiceSpent: 0,
      deathSaves: {
        successes: 0,
        failures: 0,
      },
      conditions: {
        poisoned: false,
        frightened: false,
        concentrating: false,
        exhaustion: 0,
        extra: [],
      },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementUsed: 0,
      },
    },
    features: [],
    persona: {
      traits: '',
      ideals: '',
      bonds: '',
      flaws: '',
      clinicalNotes: '',
    },
    covert: {
      clockworkVesselActive: false,
      clockworkVesselArc: '',
      undyingDriftArc: '',
    },
    gearAndNotes: {
      attacks: [],
      spells: [],
      spellSlots: Array.from({ length: 9 }, (_, i) => ({
        level: i + 1,
        max: 0,
        used: 0,
      })),
      gear: [],
      miniatureSupplies: [],
      currency: {
        pp: 0,
        gp: 0,
        ep: 0,
        sp: 0,
        cp: 0,
      },
      sessionCosts: [],
      scratchpad: '',
      scratchpadPrivate: false,
      campaignLog: [],
    },
    customLedger: Array.from({ length: 6 }, (_, i) => ({
      id: `custom-${i + 1}`,
      title: '',
      content: '',
      isPrivate: false,
    })),
    customMacros: createBlankMacros(),
    textBoxLayout: {},
  };
}

export function createInitialLedgerState(): LedgerState {
  return {
    version: 4,
    identity: {
      name: 'Pip',
      player: 'Sinnoh',
      campaign: 'The Quiet Age: A Red Star Rebellion Before the Awakening',
      setting: 'Veyr',
      race: 'Gnome (~300 yrs)',
      alignment: 'Lawful Good',
      occupation: 'Community Wellness Practitioner',
      specialty: 'Memory and Trauma Care Specialist',
      portraitStandard: null,
      portraitVessel: null,
      avatarRace: 'gnome',
      avatarGender: 'male',
    },
    abilities: {
      STR: 14,
      DEX: 16,
      CON: 16,
      INT: 16,
      WIS: 16,
      CHA: 15,
    },
    proficiencyBonus: 2,
    saveProficiencies: {
      STR: false,
      DEX: false,
      CON: false,
      INT: false,
      WIS: true,
      CHA: true,
    },
    gnomeCunningMagicAdv: ['INT', 'WIS', 'CHA'],
    skills: DEFAULT_PIP_SKILLS.map((s) => ({ ...s })),
    vitals: {
      ac: 13,
      initiativeOverride: null,
      speed: '25 ft.',
      hpCurrent: 11,
      hpMax: 11,
      tempHp: 0,
      hitDiceDie: '1d8',
      hitDiceTotal: 1,
      hitDiceSpent: 0,
      deathSaves: {
        successes: 0,
        failures: 0,
      },
      conditions: {
        poisoned: false,
        frightened: false,
        concentrating: false,
        exhaustion: 0,
        extra: [],
      },
      actionEconomy: {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementUsed: 0,
      },
    },
    features: [],
    persona: {
      traits:
        'Clockwork & Watchmaking Hobbyist — pocket watches, precision chronometers, and tiny clockwork automatons.',
      ideals: '',
      bonds: '',
      flaws: '',
      clinicalNotes: '',
    },
    covert: {
      clockworkVesselActive: false,
      clockworkVesselArc: '',
      undyingDriftArc: '',
    },
    gearAndNotes: {
      attacks: [],
      spells: [],
      spellSlots: Array.from({ length: 9 }, (_, i) => ({
        level: i + 1,
        max: 0,
        used: 0,
      })),
      gear: [],
      miniatureSupplies: DEFAULT_MINIATURE_SUPPLIES.map((s) => ({ ...s })),
      currency: {
        pp: 0,
        gp: 0,
        ep: 0,
        sp: 0,
        cp: 0,
      },
      sessionCosts: [],
      scratchpad: '',
      scratchpadPrivate: false,
      campaignLog: [],
    },
    customLedger: Array.from({ length: 6 }, (_, i) => ({
      id: `custom-${i + 1}`,
      title: '',
      content: '',
      isPrivate: false,
    })),
    customMacros: DEFAULT_PIP_MACROS.map((m) => ({ ...m })),
    textBoxLayout: {},
  };
}
