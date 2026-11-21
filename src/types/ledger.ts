export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type ProficiencyRank = 'none' | 'half' | 'prof' | 'exp';

export type ActiveScreen = 'core' | 'gear' | 'custom';

export type ViewMode = 'player' | 'party';

export type RollMode = 'normal' | 'adv' | 'dis';

export type UiDensity = 'cozy' | 'compact';

export type CurrencyDenom = 'PP' | 'GP' | 'EP' | 'SP' | 'CP';

export type AvatarRace =
  | 'gnome'
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'dragonborn'
  | 'tiefling'
  | 'half-orc'
  | 'half-elf'
  | 'tabaxi'
  | 'warforged'
  | 'aasimar';

export type AvatarGender = 'male' | 'female';

export type RechargeRule = 'short' | 'long' | 'manual';

export interface FeatureResource {
  id: string;
  name: string;
  max: number;
  used: number;
  recharge: RechargeRule;
  notes: string;
}

export interface ActionEconomyState {
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  movementUsed: number;
}

export interface SkillEntry {
  id: string;
  name: string;
  ability: AbilityKey;
  rank: ProficiencyRank;
  specialty?: string;
}

export interface AttackEntry {
  id: string;
  name: string;
  attackBonus: string;
  damage: string;
  damageType: string;
  notes: string;
  quickRoll?: boolean;
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number; // 0 = Cantrip, 1..9
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  prepared: boolean;
  concentration: boolean;
  description: string;
  source: 'srd' | 'custom';
}

export interface SpellSlotLevel {
  level: number;
  max: number;
  used: number;
}

export interface GearItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight: string;
  equipped: boolean;
  notes: string;
  source: 'srd' | 'custom';
}

export interface SupplyCounter {
  id: string;
  name: string;
  category: 'medical' | 'clockwork' | 'other';
  quantity: number;
  unit: string;
  notes: string;
}

export type TransactionType = 'income' | 'expense';

export interface SessionCostLine {
  id: string;
  timestamp: string;
  date?: string;
  type?: TransactionType;
  description: string;
  notes?: string;
  amount: string;
  currency: CurrencyDenom;
}

export interface CampaignLogEntry {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  tags: string[];
  isPrivate?: boolean;
}

export interface CustomLedgerSection {
  id: string;
  title: string;
  content: string;
  isPrivate: boolean;
}

export interface DiceMacro {
  slot: number; // 1..9 customizable
  label: string;
  expression: string; // e.g., "1d20+5", "1d8+3"
  mode: RollMode;
}

export interface RollRecord {
  id: string;
  timestamp: string;
  label: string;
  expression: string;
  mode: RollMode;
  rolls: number[];
  keptRoll?: number;
  keptIndices?: number[];
  modifier: number;
  total: number;
  isNat20: boolean;
  isNat1: boolean;
  source?: string;
}

export interface CustomCondition {
  id: string;
  name: string;
  description?: string;
}

export interface TextBoxLayoutItem {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface CurrencyWallet {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface LedgerState {
  version: number;
  identity: {
    name: string;
    player: string;
    campaign: string;
    setting: string;
    race: string;
    alignment: string;
    occupation: string;
    specialty: string;
    portraitStandard: string | null; // Data URL
    portraitVessel: string | null; // Data URL (private/covert)
    avatarRace?: AvatarRace;
    avatarGender?: AvatarGender;
  };
  abilities: Record<AbilityKey, number>;
  proficiencyBonus: number;
  saveProficiencies: Record<AbilityKey, boolean>;
  gnomeCunningMagicAdv: AbilityKey[]; // ['INT', 'WIS', 'CHA']
  skills: SkillEntry[];
  vitals: {
    ac: number;
    initiativeOverride: number | null;
    speed: string;
    hpCurrent: number;
    hpMax: number;
    tempHp: number;
    hitDiceDie: string;
    hitDiceTotal: number;
    hitDiceSpent: number;
    deathSaves: {
      successes: number; // 0..3
      failures: number; // 0..3
    };
    conditions: {
      poisoned: boolean;
      frightened: boolean;
      concentrating: boolean;
      exhaustion: number; // 0..6
      extra: CustomCondition[];
    };
    actionEconomy?: ActionEconomyState;
  };
  features?: FeatureResource[];
  persona: {
    traits: string;
    ideals: string;
    bonds: string;
    flaws: string;
    clinicalNotes: string;
  };
  covert: {
    clockworkVesselActive: boolean;
    clockworkVesselArc: string;
    undyingDriftArc: string;
  };
  gearAndNotes: {
    attacks: AttackEntry[];
    spells: SpellEntry[];
    spellSlots: SpellSlotLevel[];
    gear: GearItem[];
    miniatureSupplies: SupplyCounter[];
    currency: CurrencyWallet;
    sessionCosts: SessionCostLine[];
    scratchpad: string;
    scratchpadPrivate?: boolean;
    campaignLog: CampaignLogEntry[];
  };
  customLedger: CustomLedgerSection[];
  customMacros: DiceMacro[];
  textBoxLayout?: Record<string, TextBoxLayoutItem>;
}

export interface CharacterSlot {
  id: string;
  state: LedgerState;
  rollHistory: RollRecord[];
  updatedAt: string;
}

export interface CharacterRoster {
  activeId: string;
  slots: CharacterSlot[];
}
