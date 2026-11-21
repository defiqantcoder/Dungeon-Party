import {
  AbilityKey,
  CurrencyWallet,
  LedgerState,
  ProficiencyRank,
  RollMode,
  RollRecord,
  SkillEntry,
} from '../types/ledger';
import { ABILITY_KEYS } from '../data/defaultState';

export function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function getProficiencyMultiplier(rank: ProficiencyRank): number {
  switch (rank) {
    case 'half':
      return 0.5;
    case 'prof':
      return 1;
    case 'exp':
      return 2;
    default:
      return 0;
  }
}

export function getSaveTotal(state: LedgerState, ability: AbilityKey): number {
  const base = getAbilityMod(state.abilities[ability]);
  const prof = state.saveProficiencies[ability] ? state.proficiencyBonus : 0;
  return base + prof;
}

export function getSkillTotal(state: LedgerState, skill: SkillEntry): number {
  const base = getAbilityMod(state.abilities[skill.ability]);
  const bonus = Math.floor(
    state.proficiencyBonus * getProficiencyMultiplier(skill.rank)
  );
  return base + bonus;
}

export function getPassiveSkill(
  state: LedgerState,
  skillId: string,
  fallbackAbility: AbilityKey
): number {
  const skill = state.skills.find((s) => s.id === skillId);
  if (!skill) {
    return 10 + getAbilityMod(state.abilities[fallbackAbility]);
  }
  return 10 + getSkillTotal(state, skill);
}

export function getPassivePerception(state: LedgerState): number {
  return getPassiveSkill(state, 'perception', 'WIS');
}

export function getPassiveInvestigation(state: LedgerState): number {
  return getPassiveSkill(state, 'investigation', 'INT');
}

export function getPassiveInsight(state: LedgerState): number {
  return getPassiveSkill(state, 'insight', 'WIS');
}

export function getSpellSaveDc(
  state: LedgerState,
  ability: AbilityKey = 'INT'
): number {
  return 8 + state.proficiencyBonus + getAbilityMod(state.abilities[ability]);
}

export function getSpellAttackBonus(
  state: LedgerState,
  ability: AbilityKey = 'INT'
): number {
  return state.proficiencyBonus + getAbilityMod(state.abilities[ability]);
}

export function buildD20Expression(modifier: number): string {
  return `1d20${modifier !== 0 ? formatSigned(modifier) : ''}`;
}

export function calculateRestoredHitDice(hitDiceTotal: number): number {
  return Math.max(1, Math.floor(hitDiceTotal / 2));
}

export function parseHitDieSides(
  hitDiceDie: string,
  defaultSides: number = 8
): number {
  const match = hitDiceDie.match(/d(\d+)/i);
  return match ? parseInt(match[1], 10) : defaultSides;
}

export function calculateHitDieHeal(dieRoll: number, conScore: number): number {
  return Math.max(1, dieRoll + getAbilityMod(conScore));
}

export function calculateHpAdjustment(
  currentHp: number,
  maxHp: number,
  currentTempHp: number,
  amount: number,
  direction: 'heal' | 'wound'
): { hpCurrent: number; tempHp: number } {
  let hp = currentHp;
  let temp = currentTempHp;
  if (direction === 'wound') {
    let remaining = amount;
    if (temp > 0) {
      const absorbed = Math.min(temp, remaining);
      temp -= absorbed;
      remaining -= absorbed;
    }
    hp = Math.max(0, hp - remaining);
  } else {
    hp = Math.min(maxHp, hp + amount);
  }
  return { hpCurrent: hp, tempHp: temp };
}

export function getInitiative(state: LedgerState): number {
  if (
    state.vitals.initiativeOverride !== null &&
    !Number.isNaN(state.vitals.initiativeOverride)
  ) {
    return state.vitals.initiativeOverride;
  }
  return getAbilityMod(state.abilities.DEX);
}

export function parseSpeedFeet(speedText: string, fallback = 30): number {
  const match = speedText.match(/(\d+)/);
  return match ? Math.max(0, parseInt(match[1], 10)) : fallback;
}

export function calculateTotalGoldValue(wallet: CurrencyWallet): number {
  const totalCopper =
    (wallet.pp || 0) * 1000 +
    (wallet.gp || 0) * 100 +
    (wallet.ep || 0) * 50 +
    (wallet.sp || 0) * 10 +
    (wallet.cp || 0);
  return Math.round(totalCopper) / 100;
}

export function condenseCurrencyWallet(wallet: CurrencyWallet): CurrencyWallet {
  let totalCopper =
    Math.max(0, wallet.pp || 0) * 1000 +
    Math.max(0, wallet.gp || 0) * 100 +
    Math.max(0, wallet.ep || 0) * 50 +
    Math.max(0, wallet.sp || 0) * 10 +
    Math.max(0, wallet.cp || 0);

  const pp = Math.floor(totalCopper / 1000);
  totalCopper %= 1000;
  const gp = Math.floor(totalCopper / 100);
  totalCopper %= 100;
  const sp = Math.floor(totalCopper / 10);
  const cp = totalCopper % 10;
  return { pp, gp, ep: 0, sp, cp };
}

export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}]`;
}

export function formatShortTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

export function createId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function randomDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollD20Check(
  label: string,
  modifier: number,
  mode: RollMode = 'normal',
  source?: string
): RollRecord {
  const r1 = randomDie(20);
  const rolls = mode === 'normal' ? [r1] : [r1, randomDie(20)];
  let keptIdx = 0;
  if (mode === 'adv') {
    keptIdx = rolls[1] > rolls[0] ? 1 : 0;
  } else if (mode === 'dis') {
    keptIdx = rolls[1] < rolls[0] ? 1 : 0;
  }
  const keptRoll = rolls[keptIdx];
  const total = keptRoll + modifier;
  const modText = modifier !== 0 ? formatSigned(modifier) : '';
  const exprPrefix = mode === 'adv' ? '2d20kh1' : mode === 'dis' ? '2d20kl1' : '1d20';

  return {
    id: createId('roll'),
    timestamp: formatShortTime(),
    label,
    expression: `${exprPrefix}${modText}`,
    mode,
    rolls,
    keptRoll,
    keptIndices: [keptIdx],
    modifier,
    total,
    isNat20: keptRoll === 20,
    isNat1: keptRoll === 1,
    source,
  };
}

export function rollDiceExpression(
  rawExpression: string,
  label: string,
  mode: RollMode = 'normal',
  source?: string
): RollRecord {
  const cleaned = rawExpression.trim().replace(/\s+/g, '').toLowerCase();
  // Supports: 1d20+7, d8+3, 2d20kh1+5, 2d20kl1+3, 4d6kh3, 2d6+3-1
  const match = cleaned.match(/^(\d*)d(\d+)(?:(kh|kl)(\d*))?((?:[+-]\d+)*)$/);

  if (!match) {
    // Fallback to plain integer modifier or d20 check if user enters e.g. "+7"
    const numericOnly = cleaned.match(/^([+-]?\d+)$/);
    if (numericOnly) {
      return rollD20Check(
        label || 'd20 Check',
        parseInt(numericOnly[1], 10),
        mode,
        source
      );
    }
    return rollD20Check(label || rawExpression || 'd20', 0, mode, source);
  }

  const count = Math.max(1, Math.min(50, match[1] ? parseInt(match[1], 10) : 1));
  const sides = Math.max(2, Math.min(1000, parseInt(match[2], 10)));
  const keepDir = match[3] as 'kh' | 'kl' | undefined;
  const keepCountRaw = match[4] ? parseInt(match[4], 10) : 1;
  const modStr = match[5] || '';
  const modifier = modStr
    ? (modStr.match(/[+-]\d+/g) ?? []).reduce(
        (acc, token) => acc + parseInt(token, 10),
        0
      )
    : 0;

  // Apply active Adv/Dis toggle when rolling a plain single d20 without explicit kh/kl
  if (count === 1 && sides === 20 && !keepDir) {
    return rollD20Check(label || cleaned, modifier, mode, source);
  }

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(randomDie(sides));
  }

  let keptIndices: number[];
  let effectiveMode: RollMode = 'normal';

  if (keepDir) {
    const keepN = Math.max(1, Math.min(count, keepCountRaw || 1));
    const indexed = rolls.map((value, idx) => ({ value, idx }));
    indexed.sort((a, b) =>
      keepDir === 'kh' ? b.value - a.value : a.value - b.value
    );
    keptIndices = indexed
      .slice(0, keepN)
      .map((entry) => entry.idx)
      .sort((a, b) => a - b);

    if (sides === 20 && count === 2 && keepN === 1) {
      effectiveMode = keepDir === 'kh' ? 'adv' : 'dis';
    }
  } else {
    keptIndices = rolls.map((_, idx) => idx);
  }

  const keptSum = keptIndices.reduce((acc, idx) => acc + rolls[idx], 0);
  const total = keptSum + modifier;
  const singleKeptD20 =
    sides === 20 && keptIndices.length === 1 ? rolls[keptIndices[0]] : undefined;

  const modText = modifier !== 0 ? formatSigned(modifier) : '';
  const keepText = keepDir
    ? `${keepDir}${Math.max(1, Math.min(count, keepCountRaw || 1))}`
    : '';
  const normalizedExpr = `${count}d${sides}${keepText}${modText}`;

  return {
    id: createId('roll'),
    timestamp: formatShortTime(),
    label: label || normalizedExpr,
    expression: normalizedExpr,
    mode: effectiveMode,
    rolls,
    keptRoll: singleKeptD20,
    keptIndices,
    modifier,
    total,
    isNat20: singleKeptD20 === 20,
    isNat1: singleKeptD20 === 1,
    source,
  };
}

export function redactStateForParty(state: LedgerState): LedgerState {
  return {
    ...state,
    identity: {
      ...state.identity,
      portraitVessel: null,
    },
    covert: {
      clockworkVesselActive: false,
      clockworkVesselArc: '',
      undyingDriftArc: '',
    },
    gearAndNotes: {
      ...state.gearAndNotes,
      miniatureSupplies: state.gearAndNotes.miniatureSupplies.filter(
        (sup) => sup.category !== 'clockwork'
      ),
      scratchpad: state.gearAndNotes.scratchpadPrivate
        ? ''
        : state.gearAndNotes.scratchpad,
      campaignLog: state.gearAndNotes.campaignLog.filter((entry) => !entry.isPrivate),
    },
    customLedger: state.customLedger.map((sec) =>
      sec.isPrivate
        ? {
            ...sec,
            title: '',
            content: '',
            isPrivate: true,
          }
        : { ...sec }
    ),
  };
}

export interface MarkdownExportOptions {
  includeCore: boolean;
  includePersona: boolean;
  includeGearAndSpells: boolean;
  includeNotesAndLogs: boolean;
  includePublicCustom: boolean;
  includePrivateCustom: boolean;
  includeCovertArc: boolean;
}

export function generateMarkdownSnapshot(
  state: LedgerState,
  options: MarkdownExportOptions
): string {
  const lines: string[] = [];
  const passivePerc = getPassivePerception(state);
  const init = getInitiative(state);

  const displayName = state.identity.name.trim() || 'Unnamed Character';
  lines.push(`# THE CLINICAL LEDGER — ${displayName.toUpperCase()}`);
  const metaParts: string[] = [];
  if (state.identity.player.trim()) {
    metaParts.push(`Player: ${state.identity.player.trim()}`);
  }
  if (state.identity.campaign.trim()) {
    metaParts.push(`Campaign: ${state.identity.campaign.trim()}`);
  }
  if (metaParts.length > 0) {
    lines.push(`*${metaParts.join(' · ')}*`);
  }
  lines.push(
    `*Exported: ${formatTimestamp().replace(/^\[|\]$/g, '')}*`
  );
  lines.push('');

  if (options.includeCore) {
    lines.push('## Core Identity & Combat Vitals');
    lines.push(`- **Name:** ${displayName}`);
    if (state.identity.race.trim()) {
      lines.push(`- **Race:** ${state.identity.race.trim()}`);
    }
    if (state.identity.alignment.trim()) {
      lines.push(`- **Alignment:** ${state.identity.alignment.trim()}`);
    }
    if (state.identity.occupation.trim()) {
      lines.push(`- **Occupation:** ${state.identity.occupation.trim()}`);
    }
    if (state.identity.specialty.trim()) {
      lines.push(`- **Specialty:** ${state.identity.specialty.trim()}`);
    }
    if (state.identity.setting.trim()) {
      lines.push(`- **Setting:** ${state.identity.setting.trim()}`);
    }
    lines.push(
      `- **AC:** ${state.vitals.ac} · **Initiative:** ${formatSigned(
        init
      )} · **Speed:** ${state.vitals.speed} · **Proficiency:** ${formatSigned(
        state.proficiencyBonus
      )}`
    );
    lines.push(
      `- **HP:** ${state.vitals.hpCurrent} / ${state.vitals.hpMax}${
        state.vitals.tempHp > 0 ? ` (+${state.vitals.tempHp} Temp)` : ''
      } · **Hit Dice:** ${state.vitals.hitDiceTotal - state.vitals.hitDiceSpent}/${
        state.vitals.hitDiceTotal
      } (${state.vitals.hitDiceDie}) · **Passive Perception:** ${passivePerc}`
    );

    const activeConditions: string[] = [];
    if (state.vitals.conditions.poisoned) activeConditions.push('Poisoned');
    if (state.vitals.conditions.frightened) activeConditions.push('Frightened');
    if (state.vitals.conditions.concentrating) activeConditions.push('Concentrating');
    if (state.vitals.conditions.exhaustion > 0) {
      activeConditions.push(`Exhaustion (Lvl ${state.vitals.conditions.exhaustion})`);
    }
    state.vitals.conditions.extra.forEach((c) => activeConditions.push(c.name));
    if (activeConditions.length > 0) {
      lines.push(`- **Active Conditions:** ${activeConditions.join(', ')}`);
    }
    lines.push('');

    lines.push('### Ability Scores & Saving Throws');
    lines.push('| Ability | Score | Mod | Save | Notes |');
    lines.push('| :--- | :---: | :---: | :---: | :--- |');
    const isGnome = state.identity.race.toLowerCase().includes('gnome');
    ABILITY_KEYS.forEach((ab) => {
      const score = state.abilities[ab];
      const mod = formatSigned(getAbilityMod(score));
      const save = formatSigned(getSaveTotal(state, ab));
      const notes: string[] = [];
      if (state.saveProficiencies[ab]) notes.push('PROF');
      if (state.gnomeCunningMagicAdv.includes(ab)) {
        notes.push(isGnome ? 'Gnome Cunning (Magic Adv)' : 'Magic Save Adv');
      }
      lines.push(`| ${ab} | ${score} | ${mod} | ${save} | ${notes.join(' · ') || '—'} |`);
    });
    lines.push('');

    lines.push('### Proficient & Specialized Skills');
    const notableSkills = state.skills.filter((s) => s.rank !== 'none' || s.specialty);
    if (notableSkills.length === 0) {
      lines.push('- *None selected yet.*');
    } else {
      notableSkills.forEach((s) => {
        const tag =
          s.rank === 'exp'
            ? '[EXP]'
            : s.rank === 'prof'
            ? '[PROF]'
            : s.rank === 'half'
            ? '[HALF]'
            : '';
        const spec = s.specialty ? ` — *${s.specialty}*` : '';
        lines.push(`- **${s.name}** (${s.ability}): ${formatSigned(getSkillTotal(state, s))} ${tag}${spec}`);
      });
    }
    lines.push('');
  }

  if (options.includePersona) {
    lines.push('## Persona & Clinical Notes');
    const appendPersonaField = (label: string, raw: string) => {
      const items = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (items.length === 1) {
        lines.push(`- **${label}:** ${items[0]}`);
      } else if (items.length > 1) {
        lines.push(`- **${label}:**`);
        items.forEach((item) => lines.push(`  - ${item}`));
      }
    };
    appendPersonaField('Traits', state.persona.traits);
    appendPersonaField('Ideals', state.persona.ideals);
    appendPersonaField('Bonds', state.persona.bonds);
    appendPersonaField('Flaws', state.persona.flaws);
    if (state.persona.clinicalNotes.trim()) {
      lines.push('');
      lines.push('### Clinical & Roleplay Notes');
      lines.push(state.persona.clinicalNotes.trim());
    }
    lines.push('');
  }

  if (options.includeGearAndSpells) {
    lines.push('## Actions, Spells & Gear');
    if (state.gearAndNotes.attacks.length > 0) {
      lines.push('### Attacks');
      state.gearAndNotes.attacks.forEach((a) => {
        lines.push(
          `- **${a.name}** (${a.attackBonus} to hit, ${a.damage} ${a.damageType})${
            a.notes ? ` — ${a.notes}` : ''
          }`
        );
      });
      lines.push('');
    }
    if (state.gearAndNotes.spells.length > 0) {
      lines.push('### Spellbook');
      state.gearAndNotes.spells.forEach((sp) => {
        const lvl = sp.level === 0 ? 'Cantrip' : `Level ${sp.level}`;
        lines.push(
          `- **${sp.name}** (${lvl}${sp.school ? ` ${sp.school}` : ''})${
            sp.prepared ? ' [Prepared]' : ''
          }`
        );
      });
      lines.push('');
    }
    const clockworkEnabled = Boolean(state.covert.clockworkVesselActive);
    const visibleSupplies = state.gearAndNotes.miniatureSupplies.filter(
      (sup) => clockworkEnabled || sup.category !== 'clockwork'
    );
    if (visibleSupplies.length > 0) {
      lines.push(
        clockworkEnabled
          ? '### Miniature Medical Supplies & Clockwork Parts'
          : '### Miniature Medical Supplies'
      );
      visibleSupplies.forEach((sup) => {
        lines.push(
          `- **${sup.name}** [${sup.category}]: ${sup.quantity}${
            sup.unit ? ` ${sup.unit}` : ''
          }${sup.notes ? ` — ${sup.notes}` : ''}`
        );
      });
      lines.push('');
    }
    if (state.gearAndNotes.gear.length > 0) {
      lines.push('### Gear & Inventory');
      state.gearAndNotes.gear.forEach((g) => {
        lines.push(
          `- ${g.equipped ? '[Equipped] ' : ''}**${g.name}** ×${g.quantity}${
            g.weight ? ` (${g.weight})` : ''
          }${g.notes ? ` — ${g.notes}` : ''}`
        );
      });
      lines.push('');
    }
    if (state.features && state.features.length > 0) {
      lines.push('### Features & Limited Uses');
      state.features.forEach((f) => {
        const remaining = Math.max(0, f.max - f.used);
        const ruleLabel =
          f.recharge === 'short'
            ? 'Short Rest'
            : f.recharge === 'long'
            ? 'Long Rest'
            : 'Manual';
        lines.push(
          `- **${f.name}**: ${remaining}/${f.max} remaining (${ruleLabel})${
            f.notes ? ` — ${f.notes}` : ''
          }`
        );
      });
      lines.push('');
    }
    const c = state.gearAndNotes.currency;
    lines.push(
      `**Currency:** ${c.pp} PP · ${c.gp} GP · ${c.ep} EP · ${c.sp} SP · ${c.cp} CP *(Total: ${calculateTotalGoldValue(c).toFixed(2)} GP)*`
    );
    if (state.gearAndNotes.sessionCosts.length > 0) {
      lines.push('');
      lines.push('### Currency Transaction History');
      state.gearAndNotes.sessionCosts.forEach((tx) => {
        const isIncome =
          tx.type === 'income' ||
          (!tx.type && tx.amount.trim().startsWith('+'));
        const cleanAmt = tx.amount.trim().replace(/^[+-]/, '');
        const signedAmt = `${isIncome ? '+' : '-'}${cleanAmt || '0'} ${tx.currency}`;
        const dateStamp =
          tx.date?.trim() ||
          tx.timestamp.match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
          tx.timestamp.replace(/^\[|\]$/g, '');
        const extraNote = tx.notes?.trim() ? ` — ${tx.notes.trim()}` : '';
        lines.push(
          `- ${dateStamp ? `[${dateStamp}] ` : ''}**${signedAmt}** · ${tx.description}${extraNote}`
        );
      });
    }
    lines.push('');
  }

  if (options.includeNotesAndLogs) {
    const canShowScratchpad =
      !state.gearAndNotes.scratchpadPrivate || options.includePrivateCustom;
    if (canShowScratchpad && state.gearAndNotes.scratchpad.trim()) {
      lines.push(
        state.gearAndNotes.scratchpadPrivate
          ? '## Quick Session Scratchpad [PRIVATE]'
          : '## Quick Session Scratchpad'
      );
      lines.push(state.gearAndNotes.scratchpad.trim());
      lines.push('');
    }
    const visibleLogEntries = state.gearAndNotes.campaignLog.filter(
      (entry) => !entry.isPrivate || options.includePrivateCustom
    );
    if (visibleLogEntries.length > 0) {
      lines.push('## Campaign & Case Log');
      visibleLogEntries.forEach((entry) => {
        const tagLine =
          entry.tags.length > 0 ? ` (${entry.tags.map((t) => `#${t}`).join(' ')})` : '';
        const privPrefix = entry.isPrivate ? '[PRIVATE] ' : '';
        lines.push(
          `### ${privPrefix}${entry.timestamp} ${entry.title || 'Untitled Entry'}${tagLine}`
        );
        if (entry.body.trim()) lines.push(entry.body.trim());
        lines.push('');
      });
    }
  }

  const publicSections = state.customLedger.filter(
    (s) => !s.isPrivate && (s.title.trim() || s.content.trim())
  );
  if (options.includePublicCustom && publicSections.length > 0) {
    lines.push('## Custom Ledger (Shared)');
    publicSections.forEach((s, idx) => {
      lines.push(`### ${s.title.trim() || `Section ${idx + 1}`}`);
      if (s.content.trim()) lines.push(s.content.trim());
      lines.push('');
    });
  }

  const privateSections = state.customLedger.filter(
    (s) => s.isPrivate && (s.title.trim() || s.content.trim())
  );
  if (options.includePrivateCustom && privateSections.length > 0) {
    lines.push('## Custom Ledger [PRIVATE]');
    privateSections.forEach((s, idx) => {
      lines.push(`### [PRIVATE] ${s.title.trim() || `Section ${idx + 1}`}`);
      if (s.content.trim()) lines.push(s.content.trim());
      lines.push('');
    });
  }

  if (options.includeCovertArc) {
    const clockworkEnabled = Boolean(state.covert.clockworkVesselActive);
    lines.push('## Covert Arc Notes [CLASSIFIED — PLAYER/DM ONLY]');
    if (clockworkEnabled) {
      lines.push('- **Experimental Alternate Arc (Clockwork Vessel):** Enabled');
      if (state.covert.clockworkVesselArc.trim()) {
        lines.push('');
        lines.push('### Alternate Arc — Clockwork / Construct Vessel');
        lines.push(state.covert.clockworkVesselArc.trim());
      }
    }
    if (state.covert.undyingDriftArc.trim()) {
      lines.push('');
      lines.push('### Covert Arc — Lichdom / Undying Drift');
      lines.push(state.covert.undyingDriftArc.trim());
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}
