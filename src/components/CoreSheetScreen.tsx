import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Dices,
  Edit3,
  Heart,
  Lock,
  Minus,
  Moon,
  Plus,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { ABILITY_KEYS, ABILITY_LABELS } from '../data/defaultState';
import {
  AbilityKey,
  LedgerState,
  ProficiencyRank,
  RollMode,
  SkillEntry,
} from '../types/ledger';
import {
  calculateHitDieHeal,
  calculateHpAdjustment,
  calculateRestoredHitDice,
  createId,
  formatSigned,
  formatTimestamp,
  getAbilityMod,
  getInitiative,
  getPassiveInsight,
  getPassiveInvestigation,
  getPassivePerception,
  getSaveTotal,
  getSkillTotal,
  parseHitDieSides,
} from '../utils/ledgerMath';
import { EditorTab } from './GlobalModals';
import { ReactivePortrait } from './ReactivePortrait';

interface CoreSheetScreenProps {
  state: LedgerState;
  readOnly: boolean;
  covertUnlocked: boolean;
  rollMode: RollMode;
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onRollD20: (label: string, modifier: number, overrideMode?: RollMode) => void;
  onRollExpression: (expression: string, label?: string, overrideMode?: RollMode) => void;
  onOpenConditionPicker: () => void;
  onOpenEditor: (tab: EditorTab) => void;
}

const RANK_ORDER: ProficiencyRank[] = ['none', 'half', 'prof', 'exp'];

function rankWeight(rank: ProficiencyRank): number {
  switch (rank) {
    case 'exp':
      return 3;
    case 'prof':
      return 2;
    case 'half':
      return 1;
    default:
      return 0;
  }
}

function rankBadgeText(rank: ProficiencyRank): string {
  switch (rank) {
    case 'exp':
      return 'EXP';
    case 'prof':
      return 'PROF';
    case 'half':
      return 'HALF';
    default:
      return 'NONE';
  }
}

export const CoreSheetScreen: React.FC<CoreSheetScreenProps> = ({
  state,
  readOnly,
  covertUnlocked,
  rollMode,
  onUpdateState,
  onRollD20,
  onRollExpression,
  onOpenConditionPicker,
  onOpenEditor,
}) => {
  // Dedicated Screen 1 inline edit toggle (Player/DM View only)
  const [editMode, setEditMode] = useState(false);
  const [hpDeltaInput, setHpDeltaInput] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'proficient'>('all');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillAbility, setNewSkillAbility] = useState<AbilityKey>('INT');
  const [newSkillRank, setNewSkillRank] = useState<ProficiencyRank>('prof');
  const [restNotice, setRestNotice] = useState<string | null>(null);

  const isEditing = !readOnly && editMode;
  const isCovertActive = !readOnly && covertUnlocked;
  const isClockworkMode = isCovertActive && state.covert.clockworkVesselActive;
  const isDown = state.vitals.hpCurrent <= 0;
  const isGnome = state.identity.race.toLowerCase().includes('gnome');
  const magicAdvAbilities = state.gnomeCunningMagicAdv;
  const passivePerception = getPassivePerception(state);
  const passiveInvestigation = getPassiveInvestigation(state);
  const passiveInsight = getPassiveInsight(state);
  const initiative = getInitiative(state);
  const hitDiceRemaining = Math.max(
    0,
    state.vitals.hitDiceTotal - state.vitals.hitDiceSpent
  );

  // Pin verified / proficient skills (EXP then PROF then HALF) above NONE skills
  const { pinnedSkills, unproficientSkills } = useMemo(() => {
    const pinned = state.skills
      .filter((s) => s.rank !== 'none')
      .sort((a, b) => {
        const diff = rankWeight(b.rank) - rankWeight(a.rank);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    const rest = state.skills
      .filter((s) => s.rank === 'none')
      .sort((a, b) => a.name.localeCompare(b.name));
    return { pinnedSkills: pinned, unproficientSkills: rest };
  }, [state.skills]);

  const showNotice = (msg: string) => {
    setRestNotice(msg);
    window.setTimeout(() => setRestNotice(null), 2600);
  };

  const applyWoundOrHeal = (direction: 'wound' | 'heal') => {
    if (readOnly) return;
    const raw = parseInt(hpDeltaInput, 10);
    const amount = Number.isNaN(raw) || raw <= 0 ? 1 : raw;

    onUpdateState((prev) => {
      const { hpCurrent, tempHp } = calculateHpAdjustment(
        prev.vitals.hpCurrent,
        prev.vitals.hpMax,
        prev.vitals.tempHp,
        amount,
        direction
      );
      return {
        ...prev,
        vitals: {
          ...prev.vitals,
          hpCurrent,
          tempHp,
          deathSaves:
            hpCurrent > 0
              ? { successes: 0, failures: 0 }
              : prev.vitals.deathSaves,
        },
      };
    });
    setHpDeltaInput('');
  };

  const handleSpendHitDie = () => {
    if (readOnly || hitDiceRemaining <= 0) return;
    const conMod = getAbilityMod(state.abilities.CON);
    const dieSides = parseHitDieSides(state.vitals.hitDiceDie, 8);
    const roll = Math.floor(Math.random() * dieSides) + 1;
    const healed = calculateHitDieHeal(roll, state.abilities.CON);

    onRollExpression(
      `1d${dieSides}${formatSigned(conMod)}`,
      `Short Rest Hit Die (${state.vitals.hitDiceDie})`
    );

    onUpdateState((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        hpCurrent: Math.min(prev.vitals.hpMax, prev.vitals.hpCurrent + healed),
        hitDiceSpent: Math.min(
          prev.vitals.hitDiceTotal,
          prev.vitals.hitDiceSpent + 1
        ),
      },
    }));
    showNotice(`Short Rest: spent 1 Hit Die (+${healed} HP applied).`);
  };

  const handleLongRest = () => {
    if (readOnly) return;
    onUpdateState((prev) => {
      const recoveredHd = calculateRestoredHitDice(prev.vitals.hitDiceTotal);
      return {
        ...prev,
        vitals: {
          ...prev.vitals,
          hpCurrent: prev.vitals.hpMax,
          tempHp: 0,
          hitDiceSpent: Math.max(0, prev.vitals.hitDiceSpent - recoveredHd),
          deathSaves: { successes: 0, failures: 0 },
        },
        gearAndNotes: {
          ...prev.gearAndNotes,
          spellSlots: prev.gearAndNotes.spellSlots.map((slot) => ({
            ...slot,
            used: 0,
          })),
        },
      };
    });
    showNotice('Long Rest completed: HP, Death Saves, Spell Slots, and Hit Dice restored.');
  };

  const cycleSkillRank = (skillId: string) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      skills: prev.skills.map((sk) => {
        if (sk.id !== skillId) return sk;
        const nextIdx = (RANK_ORDER.indexOf(sk.rank) + 1) % RANK_ORDER.length;
        return { ...sk, rank: RANK_ORDER[nextIdx] };
      }),
    }));
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !newSkillName.trim()) return;
    const entry: SkillEntry = {
      id: createId('skill'),
      name: newSkillName.trim(),
      ability: newSkillAbility,
      rank: newSkillRank,
    };
    onUpdateState((prev) => ({
      ...prev,
      skills: [...prev.skills, entry],
    }));
    setNewSkillName('');
    setNewSkillAbility('INT');
    setNewSkillRank('prof');
    setShowAddSkill(false);
  };

  const toggleMagicAdv = (ab: AbilityKey) => {
    if (readOnly) return;
    onUpdateState((prev) => {
      const exists = prev.gnomeCunningMagicAdv.includes(ab);
      return {
        ...prev,
        gnomeCunningMagicAdv: exists
          ? prev.gnomeCunningMagicAdv.filter((item) => item !== ab)
          : [...prev.gnomeCunningMagicAdv, ab],
      };
    });
  };

  const insertClinicalTimestamp = () => {
    if (readOnly) return;
    const stamp = `${formatTimestamp()} `;
    onUpdateState((prev) => ({
      ...prev,
      persona: {
        ...prev.persona,
        clinicalNotes: prev.persona.clinicalNotes
          ? `${prev.persona.clinicalNotes}\n${stamp}`
          : stamp,
      },
    }));
  };

  const renderSkillRow = (skill: SkillEntry) => {
    const total = getSkillTotal(state, skill);
    const isHighlighted = skill.rank === 'exp' || skill.rank === 'prof';

    return (
      <div
        key={skill.id}
        className={`py-2 px-2 flex items-start justify-between gap-2 transition-colors hover:bg-[#171022]/60 ${
          isHighlighted ? 'bg-[#080c0a]/75' : ''
        }`}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => cycleSkillRank(skill.id)}
            title={
              !readOnly
                ? 'Click to cycle rank (NONE → HALF → PROF → EXP)'
                : `Rank: ${rankBadgeText(skill.rank)}`
            }
            className={`mt-0.5 min-w-[2.9rem] px-1.5 py-0.5 text-[10px] font-mono rounded border text-center shrink-0 ${
              skill.rank === 'exp'
                ? 'bg-[#a855f7]/25 border-[#c084fc] text-[#c084fc] font-bold'
                : skill.rank === 'prof'
                ? 'bg-[#171022] border-[#581c87] text-[#d4e0da] font-semibold'
                : skill.rank === 'half'
                ? 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7]'
                : 'bg-[#080c0a] border-[#2e243b]/70 text-[#65766e]'
            } ${!readOnly ? 'cursor-pointer hover:border-[#c084fc]' : 'cursor-default'}`}
          >
            {rankBadgeText(skill.rank)}
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      skills: prev.skills.map((s) =>
                        s.id === skill.id ? { ...s, name: e.target.value } : s
                      ),
                    }))
                  }
                  aria-label="Skill name"
                  className="ledger-input flex-1 min-w-[110px] px-1.5 py-0.5 text-xs"
                />
                <select
                  value={skill.ability}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      skills: prev.skills.map((s) =>
                        s.id === skill.id
                          ? { ...s, ability: e.target.value as AbilityKey }
                          : s
                      ),
                    }))
                  }
                  aria-label={`${skill.name} governing ability`}
                  className="ledger-input px-1.5 py-0.5 text-[10px] font-mono"
                >
                  {ABILITY_KEYS.map((ab) => (
                    <option key={ab} value={ab}>
                      {ab}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      skills: prev.skills.filter((s) => s.id !== skill.id),
                    }))
                  }
                  className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                  title={`Remove ${skill.name}`}
                  aria-label={`Remove ${skill.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span
                  className={`text-xs ${
                    isHighlighted
                      ? 'text-[#d4e0da] font-medium'
                      : 'text-[#9eb0a7]'
                  }`}
                >
                  {skill.name}
                </span>
                <span className="font-mono text-[10px] text-[#65766e]">
                  {skill.ability}
                </span>
              </div>
            )}

            {isEditing ? (
              <input
                type="text"
                value={skill.specialty ?? ''}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    skills: prev.skills.map((s) =>
                      s.id === skill.id ? { ...s, specialty: e.target.value } : s
                    ),
                  }))
                }
                placeholder="Add specialty note..."
                className="ledger-input w-full mt-1 px-2 py-0.5 text-[11px]"
              />
            ) : (
              skill.specialty && (
                <div className="text-[11px] text-[#c084fc]/90 leading-snug mt-0.5">
                  {skill.specialty}
                </div>
              )
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRollD20(skill.name, total, rollMode)}
          className="min-w-[3.1rem] px-2 py-0.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] font-mono text-xs font-semibold text-[#d4e0da] hover:text-[#c084fc] tabular-nums flex items-center justify-end gap-1 shrink-0 cursor-pointer"
          title={`Roll ${skill.name} (${formatSigned(total)})`}
        >
          <Dices className="w-3 h-3 text-[#65766e]" />
          <span>{formatSigned(total)}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Screen 1 Control Bar (Dedicated Edit Sheet Toggle — Player/DM View only) */}
      {!readOnly && (
        <div className="surface-clinical rounded px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-xs uppercase tracking-[0.08em] text-[#9eb0a7]">
              Core Sheet &amp; Vitals
            </span>
            <span className="text-[11px] text-[#65766e] hidden sm:inline">
              {isEditing
                ? 'Inline editing unlocked for abilities, Max HP, skills, and identity.'
                : 'Live Play mode — vitals, rolls, conditions, and notes are active.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditMode((prev) => !prev)}
              aria-pressed={isEditing}
              className={`h-7 px-3 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isEditing
                  ? 'bg-[#a855f7] border-[#c084fc] text-[#080c0a] font-semibold'
                  : 'bg-[#080c0a] border-[#581c87] text-[#d4e0da] hover:border-[#c084fc]'
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Edit Sheet</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenEditor('stats')}
              className="h-7 px-2.5 rounded text-xs text-[#9eb0a7] hover:text-[#d4e0da] bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Open Full Modal Editor (F5)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modal Editor</span>
            </button>
          </div>
        </div>
      )}

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN (4 cols): Identity & Reactive Portrait, Combat Vitals, Covert Arc */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* 1. Identity & Reactive Portrait Card */}
          <section
            id="section-identity"
            className="surface-clinical rounded p-4 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
              <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7]">
                Identity &amp; Reactive Portrait
              </h2>
              {isEditing ? (
                <label className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#9eb0a7]">
                  <span>Player:</span>
                  <input
                    type="text"
                    value={state.identity.player}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, player: e.target.value },
                      }))
                    }
                    placeholder="Player name"
                    className="ledger-input w-24 px-1.5 py-0.5 text-[11px] text-[#d4e0da]"
                  />
                </label>
              ) : (
                <span className="font-mono text-[11px] text-[#9eb0a7]">
                  Player:{' '}
                  <span className="text-[#d4e0da]">
                    {state.identity.player.trim() || '—'}
                  </span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 lg:grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-5 lg:col-span-12 xl:col-span-5">
                <ReactivePortrait
                  name={state.identity.name}
                  hpCurrent={state.vitals.hpCurrent}
                  hpMax={state.vitals.hpMax}
                  concentrating={state.vitals.conditions.concentrating}
                  poisoned={state.vitals.conditions.poisoned}
                  frightened={state.vitals.conditions.frightened}
                  covertUnlocked={isCovertActive}
                  isClockworkMode={isClockworkMode}
                  portraitStandard={state.identity.portraitStandard}
                  portraitVessel={state.identity.portraitVessel}
                  readOnly={readOnly}
                  onUpdatePortrait={(slot, dataUrl) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      identity: {
                        ...prev.identity,
                        portraitStandard:
                          slot === 'standard' ? dataUrl : prev.identity.portraitStandard,
                        portraitVessel:
                          slot === 'vessel' ? dataUrl : prev.identity.portraitVessel,
                      },
                    }))
                  }
                />
              </div>

              <div className="sm:col-span-7 lg:col-span-12 xl:col-span-7 flex flex-col gap-2">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Name
                  </label>
                  {!isEditing ? (
                    <div className="font-display text-xl text-[#d4e0da] tracking-wide">
                      {state.identity.name.trim() || (
                        <span className="text-[#65766e] italic">Unnamed Character</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={state.identity.name}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, name: e.target.value },
                        }))
                      }
                      placeholder="Character name"
                      className="ledger-input w-full px-2 py-1 font-display text-lg text-[#d4e0da]"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                      Race / Age
                    </label>
                    {!isEditing ? (
                      <div className="text-xs text-[#d4e0da] py-0.5">
                        {state.identity.race.trim() || (
                          <span className="text-[#65766e]">—</span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={state.identity.race}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            identity: { ...prev.identity, race: e.target.value },
                          }))
                        }
                        placeholder="Race / Ancestry"
                        className="ledger-input w-full px-2 py-1 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                      Alignment
                    </label>
                    {!isEditing ? (
                      <div className="text-xs text-[#d4e0da] py-0.5">
                        {state.identity.alignment.trim() || (
                          <span className="text-[#65766e]">—</span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={state.identity.alignment}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            identity: { ...prev.identity, alignment: e.target.value },
                          }))
                        }
                        placeholder="Alignment"
                        className="ledger-input w-full px-2 py-1 text-xs"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Occupation / Class
                  </label>
                  {!isEditing ? (
                    <div className="text-xs text-[#d4e0da] py-0.5">
                      {state.identity.occupation.trim() || (
                        <span className="text-[#65766e]">—</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={state.identity.occupation}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, occupation: e.target.value },
                        }))
                      }
                      placeholder="Class, role, or occupation"
                      className="ledger-input w-full px-2 py-1 text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Specialty / Subclass
                  </label>
                  {!isEditing ? (
                    <div className="text-xs text-[#c084fc] py-0.5">
                      {state.identity.specialty.trim() || (
                        <span className="text-[#65766e]">—</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={state.identity.specialty}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, specialty: e.target.value },
                        }))
                      }
                      placeholder="Subclass or specialty"
                      className="ledger-input w-full px-2 py-1 text-xs text-[#c084fc]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Campaign Context Strip */}
            {isEditing ? (
              <div className="pt-2 border-t border-[#2e243b] grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={state.identity.campaign}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      identity: { ...prev.identity, campaign: e.target.value },
                    }))
                  }
                  placeholder="Campaign name"
                  className="ledger-input sm:col-span-2 px-2 py-1 text-[11px]"
                />
                <input
                  type="text"
                  value={state.identity.setting}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      identity: { ...prev.identity, setting: e.target.value },
                    }))
                  }
                  placeholder="Setting"
                  className="ledger-input px-2 py-1 text-[11px] font-mono text-[#c084fc]"
                />
              </div>
            ) : (
              (state.identity.campaign.trim() || state.identity.setting.trim()) && (
                <div className="pt-2 border-t border-[#2e243b] text-[11px] text-[#9eb0a7] flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate">{state.identity.campaign}</span>
                  {state.identity.setting.trim() && (
                    <span className="font-mono text-[#c084fc] shrink-0">
                      {state.identity.setting}
                    </span>
                  )}
                </div>
              )
            )}

            {/* Quick Combat Stats Strip (AC / Init / Speed / Prof) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  AC
                </div>
                {!isEditing ? (
                  <div className="font-display text-xl text-[#d4e0da] tabular-nums">
                    {state.vitals.ac}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={state.vitals.ac}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          ac: Math.max(0, parseInt(e.target.value, 10) || 0),
                        },
                      }))
                    }
                    className="ledger-input w-full mt-0.5 text-center font-display text-lg text-[#d4e0da] tabular-nums"
                  />
                )}
              </div>

              {isEditing ? (
                <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Init
                  </div>
                  <input
                    type="number"
                    value={state.vitals.initiativeOverride ?? ''}
                    placeholder={formatSigned(getAbilityMod(state.abilities.DEX))}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        vitals: {
                          ...prev.vitals,
                          initiativeOverride:
                            e.target.value === ''
                              ? null
                              : parseInt(e.target.value, 10),
                        },
                      }))
                    }
                    className="ledger-input w-full mt-0.5 text-center font-display text-lg text-[#c084fc] tabular-nums"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRollD20('Initiative', initiative, rollMode)}
                  className="bg-[#080c0a] border border-[#2e243b] hover:border-[#a855f7] rounded p-2 text-center transition-colors cursor-pointer"
                  title="Roll Initiative"
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Init
                  </div>
                  <div className="font-display text-xl text-[#c084fc] tabular-nums">
                    {formatSigned(initiative)}
                  </div>
                </button>
              )}

              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Speed
                </div>
                {!isEditing ? (
                  <div className="font-display text-base leading-7 text-[#d4e0da] tabular-nums">
                    {state.vitals.speed}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={state.vitals.speed}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        vitals: { ...prev.vitals, speed: e.target.value },
                      }))
                    }
                    className="ledger-input w-full mt-0.5 text-center font-display text-sm py-0.5 text-[#d4e0da] tabular-nums"
                  />
                )}
              </div>

              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Prof
                </div>
                {!isEditing ? (
                  <div className="font-display text-xl text-[#c084fc] tabular-nums">
                    {formatSigned(state.proficiencyBonus)}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    value={state.proficiencyBonus}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        proficiencyBonus: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 2
                        ),
                      }))
                    }
                    className="ledger-input w-full mt-0.5 text-center font-display text-lg text-[#c084fc] tabular-nums"
                  />
                )}
              </div>
            </div>
          </section>

          {/* 2. Combat Vitals Card */}
          <section
            id="section-vitals"
            className={`rounded p-4 flex flex-col gap-3.5 transition-colors ${
              isDown
                ? 'bg-[#171022] border border-[#ff4d4d] glow-crimson'
                : 'surface-resonant'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#581c87]/70 pb-2">
              <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#d4e0da] flex items-center gap-2">
                <Heart
                  className={`w-4 h-4 ${
                    isDown ? 'text-[#ff4d4d]' : 'text-[#c084fc]'
                  }`}
                />
                <span>Combat Vitals</span>
              </h2>
              {isDown && (
                <span className="font-mono text-[11px] font-bold text-[#ff4d4d] uppercase tracking-wider">
                  0 HP · Dying
                </span>
              )}
            </div>

            {/* HP Readout, Max HP, Temp HP & Hit Dice */}
            <div className="grid grid-cols-12 gap-2 items-stretch">
              <div className="col-span-7 bg-[#080c0a] border border-[#2e243b] rounded p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Hit Points
                  </span>
                  {isEditing ? (
                    <label className="inline-flex items-center gap-1 font-mono text-[10px] text-[#9eb0a7]">
                      <span>Max</span>
                      <input
                        type="number"
                        min={1}
                        value={state.vitals.hpMax}
                        onChange={(e) => {
                          const hpMax = Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1
                          );
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              hpMax,
                              hpCurrent: Math.min(prev.vitals.hpCurrent, hpMax),
                            },
                          }));
                        }}
                        className="ledger-input w-12 px-1 py-0 text-right font-mono text-[11px] text-[#c084fc] tabular-nums"
                      />
                    </label>
                  ) : (
                    <span className="font-mono text-[10px] text-[#9eb0a7] tabular-nums">
                      Max {state.vitals.hpMax}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hpCurrent: Math.max(0, prev.vitals.hpCurrent - 1),
                          },
                        }))
                      }
                      className="w-7 h-7 rounded bg-[#0b100e] border border-[#2e243b] hover:border-[#ff4d4d] text-[#d4e0da] hover:text-[#ff4d4d] flex items-center justify-center cursor-pointer"
                      aria-label="Decrease HP by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="flex items-baseline gap-1 font-mono tabular-nums mx-auto">
                    <span
                      className={`text-2xl font-bold ${
                        isDown ? 'text-[#ff4d4d]' : 'text-[#d4e0da]'
                      }`}
                    >
                      {state.vitals.hpCurrent}
                    </span>
                    <span className="text-sm text-[#9eb0a7]">
                      / {state.vitals.hpMax}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hpCurrent: Math.min(
                              prev.vitals.hpMax,
                              prev.vitals.hpCurrent + 1
                            ),
                            deathSaves: { successes: 0, failures: 0 },
                          },
                        }))
                      }
                      className="w-7 h-7 rounded bg-[#0b100e] border border-[#2e243b] hover:border-[#4af626] text-[#d4e0da] hover:text-[#4af626] flex items-center justify-center cursor-pointer"
                      aria-label="Increase HP by 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Health Bar */}
                <div className="mt-2 h-1.5 w-full bg-[#171022] rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isDown ||
                      state.vitals.hpCurrent / Math.max(1, state.vitals.hpMax) <= 0.5
                        ? 'bg-[#ff4d4d]'
                        : 'bg-[#a855f7]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (state.vitals.hpCurrent /
                            Math.max(1, state.vitals.hpMax)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Temp HP & Hit Dice */}
              <div className="col-span-5 flex flex-col gap-2">
                <div className="bg-[#080c0a] border border-[#2e243b] rounded px-2.5 py-2 flex items-center justify-between flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Temp HP
                  </span>
                  {readOnly ? (
                    <span className="font-mono text-sm font-semibold text-[#c084fc] tabular-nums">
                      {state.vitals.tempHp}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={state.vitals.tempHp}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            tempHp: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        }))
                      }
                      className="w-12 bg-transparent text-right font-mono text-sm font-semibold text-[#c084fc] tabular-nums focus:outline-none"
                    />
                  )}
                </div>

                <div className="bg-[#080c0a] border border-[#2e243b] rounded px-2.5 py-2 flex items-center justify-between gap-1 flex-1">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={state.vitals.hitDiceDie}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: { ...prev.vitals, hitDiceDie: e.target.value },
                          }))
                        }
                        aria-label="Hit die formula"
                        className="ledger-input w-12 px-1 py-0 font-mono text-[11px]"
                      />
                      <input
                        type="number"
                        min={1}
                        value={state.vitals.hitDiceTotal}
                        onChange={(e) => {
                          const total = Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1
                          );
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              hitDiceTotal: total,
                              hitDiceSpent: Math.min(prev.vitals.hitDiceSpent, total),
                            },
                          }));
                        }}
                        aria-label="Total Hit Dice"
                        className="ledger-input w-10 px-1 py-0 text-right font-mono text-[11px] tabular-nums"
                      />
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                        HD ({state.vitals.hitDiceDie})
                      </span>
                      <span className="font-mono text-sm font-semibold text-[#d4e0da] tabular-nums">
                        {hitDiceRemaining}/{state.vitals.hitDiceTotal}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* + Heal / - Wound Controls */}
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={hpDeltaInput}
                  onChange={(e) => setHpDeltaInput(e.target.value)}
                  placeholder="Amt (1)"
                  aria-label="Heal or wound amount"
                  className="ledger-input h-8 w-20 px-2 text-xs font-mono tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => applyWoundOrHeal('heal')}
                  className="flex-1 h-8 text-xs font-semibold rounded border border-[#4af626]/70 text-[#4af626] hover:bg-[#4af626]/12 transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Heal
                </button>
                <button
                  type="button"
                  onClick={() => applyWoundOrHeal('wound')}
                  className="flex-1 h-8 text-xs font-semibold rounded border border-[#ff4d4d]/70 text-[#ff4d4d] hover:bg-[#ff4d4d]/15 transition-colors cursor-pointer whitespace-nowrap"
                >
                  - Wound
                </button>
              </div>
            )}

            {/* Death Saves (3-pip Successes & Failures) */}
            <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                Death Saves
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#4af626]">
                    Succ
                  </span>
                  {[1, 2, 3].map((pip) => {
                    const filled = state.vitals.deathSaves.successes >= pip;
                    return (
                      <button
                        key={`succ-${pip}`}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              deathSaves: {
                                ...prev.vitals.deathSaves,
                                successes:
                                  prev.vitals.deathSaves.successes === pip
                                    ? pip - 1
                                    : pip,
                              },
                            },
                          }))
                        }
                        aria-label={`Death save success ${pip}`}
                        className={`w-3.5 h-3.5 rounded-xs border transition-colors ${
                          filled
                            ? 'bg-[#4af626] border-[#4af626]'
                            : 'bg-transparent border-[#581c87]'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#ff4d4d]">
                    Fail
                  </span>
                  {[1, 2, 3].map((pip) => {
                    const filled = state.vitals.deathSaves.failures >= pip;
                    return (
                      <button
                        key={`fail-${pip}`}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              deathSaves: {
                                ...prev.vitals.deathSaves,
                                failures:
                                  prev.vitals.deathSaves.failures === pip
                                    ? pip - 1
                                    : pip,
                              },
                            },
                          }))
                        }
                        aria-label={`Death save failure ${pip}`}
                        className={`w-3.5 h-3.5 rounded-xs border transition-colors ${
                          filled
                            ? 'bg-[#ff4d4d] border-[#ff4d4d]'
                            : 'bg-transparent border-[#581c87]'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Short & Long Rest Controls */}
            {!readOnly && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSpendHitDie}
                  disabled={hitDiceRemaining <= 0}
                  className="h-8 px-2.5 text-xs font-medium rounded border border-[#581c87] text-[#d4e0da] hover:bg-[#581c87]/30 hover:border-[#a855f7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Spend 1 Hit Die to recover HP"
                >
                  <Sun className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Short Rest</span>
                </button>
                <button
                  type="button"
                  onClick={handleLongRest}
                  className="h-8 px-2.5 text-xs font-medium rounded border border-[#581c87] text-[#d4e0da] hover:bg-[#581c87]/30 hover:border-[#a855f7] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Restore max HP, spell slots, death saves, and half Hit Dice"
                >
                  <Moon className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Long Rest</span>
                </button>
              </div>
            )}

            {restNotice && (
              <p className="text-[11px] font-mono text-[#4af626] bg-[#4af626]/8 border border-[#4af626]/40 rounded px-2.5 py-1.5">
                {restNotice}
              </p>
            )}

            {/* Interactive Condition Toggle Pills */}
            <div className="pt-2 border-t border-[#581c87]/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Condition Toggle Pills
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={onOpenConditionPicker}
                    className="text-[11px] text-[#c084fc] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>SRD / Custom</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      key: 'poisoned',
                      label: 'Poisoned',
                      activeClass:
                        'bg-[#ff4d4d]/15 border-[#ff4d4d] text-[#ff4d4d]',
                    },
                    {
                      key: 'frightened',
                      label: 'Frightened',
                      activeClass:
                        'bg-[#ff4d4d]/15 border-[#ff4d4d] text-[#ff4d4d]',
                    },
                    {
                      key: 'concentrating',
                      label: 'Concentrating',
                      activeClass:
                        'bg-[#a855f7]/25 border-[#c084fc] text-[#c084fc]',
                    },
                  ] as const
                ).map((cond) => {
                  const active = state.vitals.conditions[cond.key];
                  return (
                    <button
                      key={cond.key}
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            conditions: {
                              ...prev.vitals.conditions,
                              [cond.key]: !prev.vitals.conditions[cond.key],
                            },
                          },
                        }))
                      }
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors ${
                        active
                          ? cond.activeClass
                          : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                      } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {cond.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      vitals: {
                        ...prev.vitals,
                        conditions: {
                          ...prev.vitals.conditions,
                          exhaustion: (prev.vitals.conditions.exhaustion + 1) % 7,
                        },
                      },
                    }))
                  }
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors tabular-nums ${
                    state.vitals.conditions.exhaustion > 0
                      ? 'bg-[#ff4d4d]/15 border-[#ff4d4d] text-[#ff4d4d]'
                      : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  title="Click to cycle Exhaustion level (0–6)"
                >
                  Exhaustion
                  {state.vitals.conditions.exhaustion > 0
                    ? ` L${state.vitals.conditions.exhaustion}`
                    : ''}
                </button>

                {state.vitals.conditions.extra.map((cond) => (
                  <span
                    key={cond.id}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-lg border border-[#ff4d4d]/80 bg-[#ff4d4d]/12 text-[#ff4d4d] inline-flex items-center gap-1.5"
                    title={cond.description || cond.name}
                  >
                    <span>{cond.name}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            vitals: {
                              ...prev.vitals,
                              conditions: {
                                ...prev.vitals.conditions,
                                extra: prev.vitals.conditions.extra.filter(
                                  (c) => c.id !== cond.id
                                ),
                              },
                            },
                          }))
                        }
                        aria-label={`Remove ${cond.name}`}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Covert Arc Panel (Strictly Player/DM View ONLY) */}
          {!readOnly && (
            <section
              id="section-covert"
              className={`rounded p-4 transition-colors ${
                covertUnlocked
                  ? 'surface-resonant border-[#c084fc]'
                  : 'surface-clinical'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#c084fc] flex items-center gap-1.5">
                  {covertUnlocked ? (
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#9eb0a7]" />
                  )}
                  <span>Covert Arc Telemetry</span>
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  {covertUnlocked ? 'UNLOCKED' : 'MASKED'}
                </span>
              </div>

              {!covertUnlocked ? (
                <p className="text-xs text-[#9eb0a7] mt-2.5 leading-relaxed">
                  Private arc notes are masked on load. Press{' '}
                  <span className="font-mono text-[#c084fc]">Ctrl+H</span> or hold{' '}
                  <span className="font-mono text-[#d4e0da]">Covert</span> in the
                  header to unlock.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {state.covert.clockworkVesselActive && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#c084fc] mb-1">
                        Alternate Arc — Clockwork / Construct Vessel
                      </label>
                      <textarea
                        rows={3}
                        value={state.covert.clockworkVesselArc}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            covert: {
                              ...prev.covert,
                              clockworkVesselArc: e.target.value,
                            },
                          }))
                        }
                        placeholder="Record private notes for Clockwork / Construct Vessel contingency..."
                        className="ledger-input w-full p-2 text-xs leading-relaxed resize-y"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Covert Arc — Lichdom / Undying Drift
                    </label>
                    <textarea
                      rows={3}
                      value={state.covert.undyingDriftArc}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          covert: {
                            ...prev.covert,
                            undyingDriftArc: e.target.value,
                          },
                        }))
                      }
                      placeholder="Record private notes for Undying Drift contingencies..."
                      className="ledger-input w-full p-2 text-xs leading-relaxed resize-y"
                    />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (8 cols): Ability Scores, Saving Throws, Skills & Passive Senses, Personality & Flaws + Clinical Notes */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* 3. Ability Scores & Gnome Cunning Card */}
          <section
            id="section-abilities"
            className="surface-clinical rounded p-4 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7]">
                  Ability Scores
                </h2>
                {magicAdvAbilities.length > 0 && (
                  <span className="font-mono text-[10px] text-[#4af626]">
                    {isGnome ? 'Gnome Cunning · ' : ''}
                    {magicAdvAbilities.join('/')} Magic Save Adv
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onOpenEditor('stats')}
                    className="text-[11px] font-mono text-[#c084fc] hover:underline cursor-pointer"
                  >
                    Modal Edit (F5)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {ABILITY_KEYS.map((ab) => {
                const score = state.abilities[ab];
                const mod = getAbilityMod(score);
                const hasMagicAdv = magicAdvAbilities.includes(ab);
                return (
                  <div
                    key={ab}
                    className="bg-[#080c0a] border border-[#2e243b] rounded p-2.5 flex flex-col items-center gap-1.5"
                  >
                    <div className="flex items-center justify-between w-full border-b border-[#2e243b] pb-1">
                      <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-[#9eb0a7]">
                        {ab}
                      </span>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => toggleMagicAdv(ab)}
                          className={`font-mono text-[9px] uppercase px-1 rounded border cursor-pointer ${
                            hasMagicAdv
                              ? 'text-[#4af626] border-[#4af626]/60 bg-[#4af626]/10'
                              : 'text-[#65766e] border-[#2e243b] hover:border-[#581c87]'
                          }`}
                          title={`Toggle ${ab} saving throw advantage against magic`}
                        >
                          M·ADV
                        </button>
                      ) : hasMagicAdv ? (
                        <span
                          className="font-mono text-[9px] text-[#4af626] uppercase"
                          title="Advantage on saving throws against magic"
                        >
                          M·ADV
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-[#2e243b]">—</span>
                      )}
                    </div>

                    {!isEditing ? (
                      <span className="font-display text-2xl text-[#d4e0da] tabular-nums">
                        {score}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={score}
                        aria-label={`${ABILITY_LABELS[ab]} score`}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            abilities: {
                              ...prev.abilities,
                              [ab]: Math.max(
                                1,
                                Math.min(30, parseInt(e.target.value, 10) || 10)
                              ),
                            },
                          }))
                        }
                        className="ledger-input w-14 text-center font-display text-xl text-[#d4e0da] tabular-nums"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onRollD20(`${ABILITY_LABELS[ab]} Check`, mod, rollMode)
                      }
                      className="w-full py-1 rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] font-mono text-xs font-semibold text-[#c084fc] tabular-nums transition-colors cursor-pointer"
                      title={`Roll ${ABILITY_LABELS[ab]} Check (${formatSigned(mod)})`}
                    >
                      {formatSigned(mod)}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Saving Throws + Skills & Passive Senses Split */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Saving Throws (5 cols) */}
            <section
              id="section-saves"
              className="xl:col-span-5 surface-clinical rounded p-4 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between border-b border-[#2e243b] pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#a855f7]" />
                  <span>Saving Throws</span>
                </h2>
                {magicAdvAbilities.length > 0 && (
                  <span className="font-mono text-[10px] text-[#4af626]">
                    {isGnome ? 'Gnome Cunning' : 'Magic Adv'}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[#1d1827]">
                {ABILITY_KEYS.map((ab: AbilityKey) => {
                  const isProf = state.saveProficiencies[ab];
                  const hasMagicAdv = magicAdvAbilities.includes(ab);
                  const total = getSaveTotal(state, ab);
                  return (
                    <div
                      key={ab}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() =>
                            onUpdateState((prev) => ({
                              ...prev,
                              saveProficiencies: {
                                ...prev.saveProficiencies,
                                [ab]: !prev.saveProficiencies[ab],
                              },
                            }))
                          }
                          aria-label={`Toggle ${ab} save proficiency`}
                          title={
                            readOnly
                              ? `${ab} save proficiency: ${isProf ? 'Proficient' : 'None'}`
                              : `Click to toggle ${ab} saving throw proficiency`
                          }
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                            isProf
                              ? 'bg-[#c084fc] border-[#c084fc]'
                              : 'bg-transparent border-[#581c87]'
                          } ${!readOnly ? 'cursor-pointer hover:border-[#c084fc]' : 'cursor-default'}`}
                        >
                          {isProf && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#080c0a]" />
                          )}
                        </button>
                        <span className="font-mono font-semibold text-[#d4e0da] w-8">
                          {ab}
                        </span>
                        <span
                          className={`font-mono text-[10px] ${
                            isProf ? 'text-[#c084fc]' : 'text-[#65766e]'
                          }`}
                        >
                          {isProf ? 'PROF' : 'NONE'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasMagicAdv && (
                          <button
                            type="button"
                            onClick={() =>
                              onRollD20(
                                `${ab} Save vs. Magic${isGnome ? ' (Gnome Cunning)' : ''}`,
                                total,
                                'adv'
                              )
                            }
                            className="px-1.5 py-0.5 text-[10px] font-mono text-[#4af626] bg-[#4af626]/8 border border-[#4af626]/40 hover:border-[#4af626] rounded cursor-pointer whitespace-nowrap"
                            title={`Advantage on ${ab} saving throws against magic`}
                          >
                            Magic Adv
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onRollD20(`${ABILITY_LABELS[ab]} Save`, total, rollMode)
                          }
                          className="min-w-[2.6rem] px-2 py-0.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] font-mono text-xs font-semibold text-[#d4e0da] hover:text-[#c084fc] tabular-nums text-right cursor-pointer"
                        >
                          {formatSigned(total)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {magicAdvAbilities.length > 0 && (
                <div className="mt-auto pt-2 border-t border-[#2e243b] text-[11px] text-[#9eb0a7] flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4af626] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#d4e0da]">
                      {isGnome ? 'Gnome Cunning:' : 'Magic Save Advantage:'}
                    </strong>{' '}
                    Advantage on {magicAdvAbilities.join(', ')} saving throws
                    against magic.
                  </span>
                </div>
              )}
            </section>

            {/* 4. Skills & Passive Senses Card (7 cols) */}
            <section
              id="section-skills"
              className="xl:col-span-7 surface-clinical rounded p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7]">
                  Skills &amp; Passive Senses
                </h2>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setShowAddSkill((prev) => !prev)}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#080c0a] border border-[#581c87] hover:border-[#c084fc] text-[#c084fc] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Skill</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1 bg-[#080c0a] border border-[#2e243b] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setSkillFilter('all')}
                      className={`px-2 py-0.5 text-[11px] rounded-sm cursor-pointer ${
                        skillFilter === 'all'
                          ? 'bg-[#171022] text-[#c084fc]'
                          : 'text-[#9eb0a7] hover:text-[#d4e0da]'
                      }`}
                    >
                      All ({state.skills.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkillFilter('proficient')}
                      className={`px-2 py-0.5 text-[11px] rounded-sm cursor-pointer ${
                        skillFilter === 'proficient'
                          ? 'bg-[#171022] text-[#c084fc]'
                          : 'text-[#9eb0a7] hover:text-[#d4e0da]'
                      }`}
                    >
                      Proficient ({pinnedSkills.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Custom Skill Inline Form */}
              {showAddSkill && !readOnly && (
                <form
                  onSubmit={handleAddSkill}
                  className="bg-[#080c0a] border border-[#581c87] rounded p-2.5 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Custom skill name..."
                    className="ledger-input flex-1 min-w-[140px] px-2 py-1 text-xs"
                    autoFocus
                  />
                  <select
                    value={newSkillAbility}
                    onChange={(e) =>
                      setNewSkillAbility(e.target.value as AbilityKey)
                    }
                    className="ledger-input px-2 py-1 text-xs font-mono"
                  >
                    {ABILITY_KEYS.map((ab) => (
                      <option key={ab} value={ab}>
                        {ab}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newSkillRank}
                    onChange={(e) =>
                      setNewSkillRank(e.target.value as ProficiencyRank)
                    }
                    className="ledger-input px-2 py-1 text-xs font-mono"
                  >
                    <option value="none">None</option>
                    <option value="half">Half</option>
                    <option value="prof">Prof</option>
                    <option value="exp">Exp</option>
                  </select>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSkill(false)}
                    className="px-2 py-1 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Integrated Passive Senses Readout Strip */}
              <div className="grid grid-cols-3 gap-2 bg-[#080c0a] border border-[#2e243b] rounded p-2">
                <div className="flex items-center justify-between px-1.5 border-r border-[#2e243b]">
                  <span className="text-[11px] text-[#d4e0da]">Passive Perception</span>
                  <span className="font-mono text-sm font-bold text-[#c084fc] tabular-nums">
                    {passivePerception}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1.5 border-r border-[#2e243b]">
                  <span className="text-[11px] text-[#9eb0a7]">Investigation</span>
                  <span className="font-mono text-xs font-semibold text-[#d4e0da] tabular-nums">
                    {passiveInvestigation}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-[11px] text-[#9eb0a7]">Insight</span>
                  <span className="font-mono text-xs font-semibold text-[#d4e0da] tabular-nums">
                    {passiveInsight}
                  </span>
                </div>
              </div>

              {/* Pinned Proficient Skills + Divider + Remaining Skills */}
              <div className="max-h-[410px] overflow-y-auto pr-1 flex flex-col">
                {pinnedSkills.length > 0 && (
                  <div className="divide-y divide-[#1d1827]">
                    {pinnedSkills.map(renderSkillRow)}
                  </div>
                )}

                {skillFilter === 'proficient' && pinnedSkills.length === 0 && (
                  <p className="text-xs text-[#9eb0a7] py-4 text-center">
                    No proficient skills selected yet. Switch to{' '}
                    <button
                      type="button"
                      onClick={() => setSkillFilter('all')}
                      className="text-[#c084fc] underline cursor-pointer"
                    >
                      All ({state.skills.length})
                    </button>{' '}
                    and click any rank badge to toggle proficiency.
                  </p>
                )}

                {skillFilter === 'all' && unproficientSkills.length > 0 && (
                  <>
                    {pinnedSkills.length > 0 && (
                      <div className="my-2 flex items-center gap-2">
                        <span className="h-px flex-1 bg-[#2e243b]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#65766e]">
                          Other Skills (NONE)
                        </span>
                        <span className="h-px flex-1 bg-[#2e243b]" />
                      </div>
                    )}
                    <div className="divide-y divide-[#1d1827]">
                      {unproficientSkills.map(renderSkillRow)}
                    </div>
                  </>
                )}

                {state.skills.length === 0 && (
                  <p className="text-xs text-[#9eb0a7] py-4 text-center">
                    No skills listed. Click <span className="font-mono text-[#c084fc]">+ Skill</span> or open <span className="font-mono text-[#c084fc]">F5</span> to add skills.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* 5. Personality & Flaws + Clinical & Roleplay Notes */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Personality & Flaws Card */}
            <section
              id="section-persona"
              className="xl:col-span-6 surface-clinical rounded p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-[#2e243b] pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7]">
                  Personality &amp; Flaws
                </h2>
                {!readOnly && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="text-[11px] font-mono text-[#c084fc] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {(
                  [
                    {
                      key: 'traits',
                      label: 'Traits',
                      placeholder: 'Verified character traits...',
                    },
                    {
                      key: 'ideals',
                      label: 'Ideals',
                      placeholder: 'Enter verified ideals...',
                    },
                    {
                      key: 'bonds',
                      label: 'Bonds',
                      placeholder: 'Enter verified bonds...',
                    },
                    {
                      key: 'flaws',
                      label: 'Flaws',
                      placeholder: 'Enter verified flaws...',
                    },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      {field.label}
                    </label>
                    {!isEditing ? (
                      <div className="bg-[#080c0a] border border-[#2e243b] rounded p-2 text-xs text-[#d4e0da] min-h-[42px] whitespace-pre-wrap leading-relaxed">
                        {state.persona[field.key].trim() || (
                          <span className="text-[#65766e] italic">Unrecorded</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        value={state.persona[field.key]}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            persona: {
                              ...prev.persona,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="ledger-input w-full p-2 text-xs leading-relaxed resize-y"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Clinical & Roleplay Notes Card (Always directly editable in Player/DM View) */}
            <section className="xl:col-span-6 surface-clinical rounded p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#2e243b] pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7]">
                  Clinical &amp; Roleplay Notes
                </h2>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={insertClinicalTimestamp}
                    className="text-[11px] font-mono text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3" />
                    <span>+ Timestamp</span>
                  </button>
                )}
              </div>

              {readOnly ? (
                <div className="flex-1 bg-[#080c0a] border border-[#2e243b] rounded p-3 text-xs text-[#d4e0da] min-h-[210px] whitespace-pre-wrap leading-relaxed">
                  {state.persona.clinicalNotes.trim() || (
                    <span className="text-[#65766e] italic">
                      No clinical notes recorded yet.
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  value={state.persona.clinicalNotes}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      persona: {
                        ...prev.persona,
                        clinicalNotes: e.target.value,
                      },
                    }))
                  }
                  placeholder="Record session observations, memory/trauma care notes, or roleplay details..."
                  className="ledger-input flex-1 w-full p-2.5 text-xs leading-relaxed resize-y min-h-[220px]"
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
