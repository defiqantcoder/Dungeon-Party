import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  AVATAR_RACE_OPTIONS,
  createInitialLedgerState,
  STANDARD_5E_SKILLS,
} from '../data/defaultState';
import {
  AbilityKey,
  ActiveScreen,
  AvatarGender,
  AvatarRace,
  LedgerState,
  ProficiencyRank,
  RollMode,
  SkillEntry,
} from '../types/ledger';
import {
  buildD20Expression,
  createId,
  formatSigned,
  generateMarkdownSnapshot,
  getSaveTotal,
  getSkillTotal,
  MarkdownExportOptions,
  redactStateForParty,
} from '../utils/ledgerMath';
import {
  exportLedgerJson,
  parseImportedLedgerJson,
  slugifyCharacterName,
  triggerFileDownload,
} from '../utils/storage';

/* ============================================================================
 * 1. GLOBAL SEARCH MODAL (F2)
 * ============================================================================ */

interface SearchResult {
  id: string;
  screen: ActiveScreen;
  sectionId: string;
  category: string;
  title: string;
  snippet: string;
}

interface GlobalSearchModalProps {
  state: LedgerState;
  isPartyMode: boolean;
  covertUnlocked: boolean;
  onClose: () => void;
  onJump: (screen: ActiveScreen, sectionId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  state,
  isPartyMode,
  covertUnlocked,
  onClose,
  onJump,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const hits: SearchResult[] = [];

    // Identity & Persona
    const identityText = `${state.identity.name} ${state.identity.race} ${state.identity.occupation} ${state.identity.specialty} ${state.identity.campaign} ${state.identity.setting}`;
    if (identityText.toLowerCase().includes(q)) {
      hits.push({
        id: 'hit-identity',
        screen: 'core',
        sectionId: 'section-identity',
        category: 'Core Sheet',
        title: `${state.identity.name} — Subject Profile`,
        snippet: `${state.identity.occupation} · ${state.identity.specialty}`,
      });
    }

    // Skills
    state.skills.forEach((s) => {
      if (
        s.name.toLowerCase().includes(q) ||
        (s.specialty && s.specialty.toLowerCase().includes(q))
      ) {
        hits.push({
          id: `hit-skill-${s.id}`,
          screen: 'core',
          sectionId: 'section-skills',
          category: 'Skills',
          title: `${s.name} (${s.ability})`,
          snippet: s.specialty || `Rank: ${s.rank.toUpperCase()}`,
        });
      }
    });

    // Features & Limited Uses
    (state.features ?? []).forEach((f) => {
      if (`${f.name} ${f.notes} ${f.recharge}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-feat-${f.id}`,
          screen: 'core',
          sectionId: 'section-features',
          category: 'Features',
          title: `${f.name} (${Math.max(0, f.max - f.used)}/${f.max})`,
          snippet: f.notes || `Recharges on ${f.recharge} rest`,
        });
      }
    });

    // Persona fields
    (
      [
        ['Traits', state.persona.traits],
        ['Ideals', state.persona.ideals],
        ['Bonds', state.persona.bonds],
        ['Flaws', state.persona.flaws],
        ['Clinical & Roleplay Notes', state.persona.clinicalNotes],
      ] as const
    ).forEach(([label, text]) => {
      if (text.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-persona-${label}`,
          screen: 'core',
          sectionId: 'section-persona',
          category: 'Persona',
          title: label,
          snippet: text.slice(0, 120),
        });
      }
    });

    const clockworkEnabled = !isPartyMode && state.covert.clockworkVesselActive;

    // Covert Arc (strictly ONLY when Player/DM View AND covertUnlocked)
    if (!isPartyMode && covertUnlocked) {
      if (
        clockworkEnabled &&
        state.covert.clockworkVesselArc.toLowerCase().includes(q)
      ) {
        hits.push({
          id: 'hit-covert-vessel',
          screen: 'core',
          sectionId: 'section-covert',
          category: 'Covert Arc',
          title: 'Clockwork / Construct Vessel',
          snippet: state.covert.clockworkVesselArc.slice(0, 120),
        });
      }
      if (state.covert.undyingDriftArc.toLowerCase().includes(q)) {
        hits.push({
          id: 'hit-covert-drift',
          screen: 'core',
          sectionId: 'section-covert',
          category: 'Covert Arc',
          title: 'Lichdom / Undying Drift',
          snippet: state.covert.undyingDriftArc.slice(0, 120),
        });
      }
    }

    // Attacks, Spells, Gear, Supplies
    state.gearAndNotes.attacks.forEach((a) => {
      if (`${a.name} ${a.damageType} ${a.notes}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-atk-${a.id}`,
          screen: 'gear',
          sectionId: 'section-attacks',
          category: 'Attacks',
          title: a.name,
          snippet: `${a.attackBonus} · ${a.damage} ${a.damageType}`.trim(),
        });
      }
    });

    state.gearAndNotes.spells.forEach((sp) => {
      if (`${sp.name} ${sp.school} ${sp.description}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-spell-${sp.id}`,
          screen: 'gear',
          sectionId: 'section-spells',
          category: 'Spellbook',
          title: sp.name,
          snippet: sp.description.slice(0, 120) || sp.school,
        });
      }
    });

    state.gearAndNotes.miniatureSupplies.forEach((sup) => {
      if (!clockworkEnabled && sup.category === 'clockwork') return;
      if (`${sup.name} ${sup.category} ${sup.notes}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-sup-${sup.id}`,
          screen: 'gear',
          sectionId: 'section-supplies',
          category: 'Miniature Supplies',
          title: `${sup.name} (${sup.quantity}${sup.unit ? ` ${sup.unit}` : ''})`,
          snippet: sup.notes || sup.category,
        });
      }
    });

    state.gearAndNotes.gear.forEach((g) => {
      if (`${g.name} ${g.category} ${g.notes}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-gear-${g.id}`,
          screen: 'gear',
          sectionId: 'section-gear',
          category: 'Gear',
          title: g.name,
          snippet: g.notes || g.category,
        });
      }
    });

    state.gearAndNotes.sessionCosts.forEach((tx) => {
      if (
        `${tx.description} ${tx.notes ?? ''} ${tx.amount} ${tx.currency} ${tx.date ?? ''}`
          .toLowerCase()
          .includes(q)
      ) {
        const isIncome =
          tx.type === 'income' ||
          (!tx.type && tx.amount.trim().startsWith('+'));
        const cleanAmt = tx.amount.trim().replace(/^[+-]/, '');
        hits.push({
          id: `hit-tx-${tx.id}`,
          screen: 'gear',
          sectionId: 'section-currency',
          category: isIncome ? 'Currency · Income' : 'Currency · Expense',
          title: `${isIncome ? '+' : '-'}${cleanAmt} ${tx.currency} — ${tx.description}`,
          snippet: [tx.date || tx.timestamp.slice(1, 11), tx.notes]
            .filter(Boolean)
            .join(' · '),
        });
      }
    });

    const canViewPrivate = !isPartyMode && covertUnlocked;

    if (
      (canViewPrivate || !state.gearAndNotes.scratchpadPrivate) &&
      state.gearAndNotes.scratchpad.toLowerCase().includes(q)
    ) {
      hits.push({
        id: 'hit-scratchpad',
        screen: 'gear',
        sectionId: 'section-scratchpad',
        category: state.gearAndNotes.scratchpadPrivate
          ? 'Scratchpad [PRIVATE]'
          : 'Scratchpad',
        title: 'Quick Session Scratchpad',
        snippet: state.gearAndNotes.scratchpad.slice(0, 120),
      });
    }

    state.gearAndNotes.campaignLog.forEach((entry) => {
      if (!canViewPrivate && entry.isPrivate) return;
      if (
        `${entry.title} ${entry.body} ${entry.tags.join(' ')}`
          .toLowerCase()
          .includes(q)
      ) {
        hits.push({
          id: `hit-log-${entry.id}`,
          screen: 'gear',
          sectionId: 'section-campaign-log',
          category: entry.isPrivate ? 'Campaign Log [PRIVATE]' : 'Campaign Log',
          title: `${entry.timestamp} ${entry.title}`,
          snippet: entry.body.slice(0, 120),
        });
      }
    });

    // Custom Ledger (respecting Party Share View AND Covert Arc Lock)
    state.customLedger.forEach((sec, idx) => {
      if (!canViewPrivate && sec.isPrivate) return;
      if (`${sec.title} ${sec.content}`.toLowerCase().includes(q)) {
        hits.push({
          id: `hit-custom-${sec.id}`,
          screen: 'custom',
          sectionId: `section-${sec.id}`,
          category: sec.isPrivate ? 'Custom [PRIVATE]' : 'Custom Ledger',
          title: sec.title.trim() || `Section 0${idx + 1}`,
          snippet: sec.content.slice(0, 120) || 'Empty section',
        });
      }
    });

    return hits;
  }, [query, state, isPartyMode, covertUnlocked]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Global Ledger Search"
    >
      <div className="surface-modal rounded w-full max-w-xl overflow-hidden flex flex-col max-h-[75vh]">
        <div className="p-3 border-b border-[#2e243b] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#c084fc] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sheet, skills, gear, logs, and visible custom panels..."
            className="w-full bg-transparent text-sm text-[#d4e0da] placeholder:text-[#65766e] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-6 text-center text-xs text-[#9eb0a7]">
              Type to search across The Clinical Ledger.
              {isPartyMode && (
                <div className="mt-1 font-mono text-[11px] text-[#4af626]">
                  Party Share View active — private records are excluded.
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#9eb0a7]">
              No matching records found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => {
                    onJump(hit.screen, hit.sectionId);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded bg-[#080c0a] hover:bg-[#171022] border border-[#2e243b] hover:border-[#a855f7] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase text-[#c084fc]">
                        {hit.category}
                      </span>
                      <span className="text-xs font-medium text-[#d4e0da] truncate">
                        {hit.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9eb0a7] truncate mt-0.5">
                      {hit.snippet}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9eb0a7] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. FULL EDITOR & BACKUP MODAL (F5)
 * ============================================================================ */

export type EditorTab = 'stats' | 'vitals' | 'macros' | 'custom' | 'backup';

interface FullEditorModalProps {
  state: LedgerState;
  initialTab?: EditorTab;
  covertUnlocked: boolean;
  onClose: () => void;
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onReplaceState: (next: LedgerState) => void;
  onNewBlankCharacter: () => void;
  onOpenNewCharacterModal?: () => void;
}

export const FullEditorModal: React.FC<FullEditorModalProps> = ({
  state,
  initialTab = 'stats',
  covertUnlocked,
  onClose,
  onUpdateState,
  onReplaceState,
  onNewBlankCharacter,
  onOpenNewCharacterModal,
}) => {
  const [tab, setTab] = useState<EditorTab>(initialTab);
  const [importStatus, setImportStatus] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmNewBlank, setConfirmNewBlank] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillAbility, setNewSkillAbility] = useState<AbilityKey>('INT');
  const [newSkillRank, setNewSkillRank] = useState<ProficiencyRank>('none');
  const [quickFillSlot, setQuickFillSlot] = useState<number>(1);
  const [quickFillSource, setQuickFillSource] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fileSlug = slugifyCharacterName(state.identity.name);

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
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
    setNewSkillRank('none');
  };

  const handleAddMissingStandardSkills = () => {
    onUpdateState((prev) => {
      const existingIds = new Set(prev.skills.map((s) => s.id));
      const existingNames = new Set(
        prev.skills.map((s) => s.name.trim().toLowerCase())
      );
      const additions: SkillEntry[] = STANDARD_5E_SKILLS.filter(
        (s) =>
          !existingIds.has(s.id) && !existingNames.has(s.name.toLowerCase())
      ).map((s) => ({
        ...s,
        rank: 'none',
      }));
      if (additions.length === 0) return prev;
      return {
        ...prev,
        skills: [...prev.skills, ...additions],
      };
    });
  };

  const handleApplyQuickFillMacro = () => {
    if (!quickFillSource) return;
    let label = '';
    let expression = '';
    let mode: RollMode = 'normal';

    if (quickFillSource.startsWith('skill:')) {
      const skillId = quickFillSource.slice(6);
      const skill = state.skills.find((s) => s.id === skillId);
      if (!skill) return;
      const total = getSkillTotal(state, skill);
      label = skill.name;
      expression = buildD20Expression(total);
    } else if (quickFillSource.startsWith('save:')) {
      const ab = quickFillSource.slice(5) as AbilityKey;
      const total = getSaveTotal(state, ab);
      label = `${ab} Save`;
      expression = buildD20Expression(total);
    } else if (quickFillSource.startsWith('msave:')) {
      const ab = quickFillSource.slice(6) as AbilityKey;
      const total = getSaveTotal(state, ab);
      label = `${ab} Magic Save`;
      expression = buildD20Expression(total);
      mode = 'adv';
    }

    if (!label || !expression) return;
    onUpdateState((prev) => ({
      ...prev,
      customMacros: prev.customMacros.map((m) =>
        m.slot === quickFillSlot ? { ...m, label, expression, mode } : m
      ),
    }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseImportedLedgerJson(String(reader.result ?? ''));
      if (parsed.ok) {
        onReplaceState(parsed.state);
        setImportStatus({
          type: 'ok',
          text: 'Ledger JSON imported and saved to localStorage.',
        });
      } else {
        setImportStatus({ type: 'err', text: parsed.error });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Full Ledger Editor"
    >
      <div className="surface-modal rounded w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2e243b] flex items-center justify-between">
          <h2 className="font-display text-sm sm:text-base uppercase tracking-[0.06em] text-[#d4e0da]">
            Full Ledger Editor &amp; Backup (F5)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            aria-label="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-4 pt-2 flex items-center gap-1 border-b border-[#2e243b] overflow-x-auto">
          {(
            [
              { id: 'stats', label: 'Abilities & Skills' },
              { id: 'vitals', label: 'Identity & Vitals' },
              { id: 'macros', label: 'Dice Macros (1–9)' },
              { id: 'custom', label: 'Custom & Advanced' },
              { id: 'backup', label: 'Backup / New Character' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'border-[#c084fc] text-[#c084fc]'
                  : 'border-transparent text-[#9eb0a7] hover:text-[#d4e0da]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'stats' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7] mb-2">
                  Ability Scores, Saving Throw Proficiencies &amp; Magic Save Advantage
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {ABILITY_KEYS.map((ab) => {
                    const hasMagicAdv = state.gnomeCunningMagicAdv.includes(ab);
                    return (
                      <div
                        key={ab}
                        className="bg-[#080c0a] border border-[#2e243b] rounded p-2.5 flex flex-col gap-1.5"
                      >
                        <label className="font-mono text-[11px] text-[#9eb0a7]">
                          {ab} ({ABILITY_LABELS[ab].slice(0, 3)})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={state.abilities[ab]}
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
                          className="ledger-input px-2 py-1 text-sm font-mono tabular-nums"
                        />
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-[#d4e0da] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.saveProficiencies[ab]}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                saveProficiencies: {
                                  ...prev.saveProficiencies,
                                  [ab]: e.target.checked,
                                },
                              }))
                            }
                            className="accent-[#a855f7]"
                          />
                          <span>Save Prof</span>
                        </label>
                        <label
                          className="inline-flex items-center gap-1.5 text-[11px] text-[#4af626] cursor-pointer"
                          title="Advantage on saving throws against magic"
                        >
                          <input
                            type="checkbox"
                            checked={hasMagicAdv}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                gnomeCunningMagicAdv: e.target.checked
                                  ? Array.from(
                                      new Set([...prev.gnomeCunningMagicAdv, ab])
                                    )
                                  : prev.gnomeCunningMagicAdv.filter(
                                      (item) => item !== ab
                                    ),
                              }))
                            }
                            className="accent-[#4af626]"
                          />
                          <span>Magic Adv</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7]">
                    Customizable Skill List, Ranks &amp; Specialties ({state.skills.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddMissingStandardSkills}
                    className="text-[11px] font-mono text-[#c084fc] hover:underline cursor-pointer"
                  >
                    + Restore Missing 5e Skills
                  </button>
                </div>

                {/* Add Custom Skill Row */}
                <form
                  onSubmit={handleAddCustomSkill}
                  className="bg-[#080c0a] border border-[#581c87]/70 rounded p-2.5 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Add custom skill (e.g. Navigation, Streetwise)..."
                    className="ledger-input flex-1 min-w-[180px] px-2 py-1 text-xs"
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
                    <option value="half">Half Prof</option>
                    <option value="prof">Proficient</option>
                    <option value="exp">Expertise</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {state.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="bg-[#080c0a] border border-[#2e243b] rounded p-2 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              skills: prev.skills.map((s) =>
                                s.id === skill.id
                                  ? { ...s, name: e.target.value }
                                  : s
                              ),
                            }))
                          }
                          aria-label="Skill name"
                          className="ledger-input flex-1 min-w-0 px-2 py-0.5 text-xs font-medium text-[#d4e0da]"
                        />
                        <select
                          value={skill.ability}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              skills: prev.skills.map((s) =>
                                s.id === skill.id
                                  ? {
                                      ...s,
                                      ability: e.target.value as AbilityKey,
                                    }
                                  : s
                              ),
                            }))
                          }
                          aria-label={`${skill.name} ability`}
                          className="ledger-input px-1.5 py-0.5 text-[11px] font-mono shrink-0"
                        >
                          {ABILITY_KEYS.map((ab) => (
                            <option key={ab} value={ab}>
                              {ab}
                            </option>
                          ))}
                        </select>
                        <select
                          value={skill.rank}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              skills: prev.skills.map((s) =>
                                s.id === skill.id
                                  ? {
                                      ...s,
                                      rank: e.target.value as ProficiencyRank,
                                    }
                                  : s
                              ),
                            }))
                          }
                          aria-label={`${skill.name} rank`}
                          className="ledger-input px-1.5 py-0.5 text-[11px] font-mono shrink-0"
                        >
                          <option value="none">None</option>
                          <option value="half">Half Prof</option>
                          <option value="prof">Proficient</option>
                          <option value="exp">Expertise</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState((prev) => ({
                              ...prev,
                              skills: prev.skills.filter((s) => s.id !== skill.id),
                            }))
                          }
                          className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer shrink-0"
                          title={`Remove ${skill.name}`}
                          aria-label={`Remove ${skill.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={skill.specialty ?? ''}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            skills: prev.skills.map((s) =>
                              s.id === skill.id
                                ? { ...s, specialty: e.target.value }
                                : s
                            ),
                          }))
                        }
                        placeholder="Optional specialty note..."
                        className="ledger-input px-2 py-1 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'vitals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2.5">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7]">
                  Character Identity
                </h3>
                {(
                  [
                    ['name', 'Character Name'],
                    ['player', 'Player'],
                    ['campaign', 'Campaign'],
                    ['setting', 'Setting'],
                    ['race', 'Race / Age'],
                    ['alignment', 'Alignment'],
                    ['occupation', 'Civic Occupation'],
                    ['specialty', 'Specialty'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={state.identity[key]}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: { ...prev.identity, [key]: e.target.value },
                        }))
                      }
                      className="ledger-input w-full px-2.5 py-1.5 text-xs"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Portrait Sprite Race
                    </label>
                    <select
                      value={state.identity.avatarRace}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: {
                            ...prev.identity,
                            avatarRace: e.target.value as AvatarRace,
                          },
                        }))
                      }
                      className="ledger-input w-full px-2 py-1.5 text-xs font-mono"
                    >
                      {AVATAR_RACE_OPTIONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Sprite Variant
                    </label>
                    <select
                      value={state.identity.avatarGender}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          identity: {
                            ...prev.identity,
                            avatarGender: e.target.value as AvatarGender,
                          },
                        }))
                      }
                      className="ledger-input w-full px-2 py-1.5 text-xs font-mono"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7]">
                  Combat &amp; Vitality Calibration
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Max HP
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={state.vitals.hpMax}
                      onChange={(e) => {
                        const hpMax = Math.max(1, parseInt(e.target.value, 10) || 1);
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hpMax,
                            hpCurrent: Math.min(prev.vitals.hpCurrent, hpMax),
                          },
                        }));
                      }}
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Proficiency Bonus
                    </label>
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
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Armor Class
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={state.vitals.ac}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            ac: Math.max(0, parseInt(e.target.value, 10) || 10),
                          },
                        }))
                      }
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Initiative Override (blank = DEX)
                    </label>
                    <input
                      type="number"
                      value={state.vitals.initiativeOverride ?? ''}
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
                      placeholder="Auto"
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Hit Die Type
                    </label>
                    <input
                      type="text"
                      value={state.vitals.hitDiceDie}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: { ...prev.vitals, hitDiceDie: e.target.value },
                        }))
                      }
                      placeholder="1d8"
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#9eb0a7] mb-1">
                      Total Hit Dice
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={state.vitals.hitDiceTotal}
                      onChange={(e) => {
                        const total = Math.max(1, parseInt(e.target.value, 10) || 1);
                        onUpdateState((prev) => ({
                          ...prev,
                          vitals: {
                            ...prev.vitals,
                            hitDiceTotal: total,
                            hitDiceSpent: Math.min(prev.vitals.hitDiceSpent, total),
                          },
                        }));
                      }}
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'macros' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#9eb0a7]">
                Customize all Dice Dock quick-roll macro slots{' '}
                <span className="font-mono text-[#d4e0da]">1–9</span> (supports standard
                rolls like <span className="font-mono text-[#c084fc]">1d20+7</span> or{' '}
                <span className="font-mono text-[#c084fc]">1d8+3</span>, advantage{' '}
                <span className="font-mono text-[#c084fc]">2d20kh1+5</span>, and
                disadvantage{' '}
                <span className="font-mono text-[#c084fc]">2d20kl1+3</span>). Press keys{' '}
                <span className="font-mono text-[#d4e0da]">1–9</span> outside text fields
                to trigger any configured slot.
              </p>

              {/* Quick-Fill Helper from Current Character Skills & Saves */}
              <div className="bg-[#080c0a] border border-[#581c87]/70 rounded p-2.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#c084fc]">
                  Quick-Fill Slot:
                </span>
                <select
                  value={quickFillSlot}
                  onChange={(e) => setQuickFillSlot(parseInt(e.target.value, 10))}
                  aria-label="Target macro slot"
                  className="ledger-input px-2 py-1 text-xs font-mono"
                >
                  {state.customMacros.map((m) => (
                    <option key={m.slot} value={m.slot}>
                      Slot {m.slot}
                    </option>
                  ))}
                </select>
                <select
                  value={quickFillSource}
                  onChange={(e) => setQuickFillSource(e.target.value)}
                  aria-label="Choose skill or saving throw to populate macro"
                  className="ledger-input flex-1 min-w-[180px] px-2 py-1 text-xs"
                >
                  <option value="">Choose a skill or saving throw…</option>
                  <optgroup label="Skills">
                    {state.skills.map((s) => (
                      <option key={`skill:${s.id}`} value={`skill:${s.id}`}>
                        {s.name} ({formatSigned(getSkillTotal(state, s))})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Saving Throws">
                    {ABILITY_KEYS.map((ab) => (
                      <option key={`save:${ab}`} value={`save:${ab}`}>
                        {ab} Save ({formatSigned(getSaveTotal(state, ab))})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Magic Saving Throws (Adv)">
                    {ABILITY_KEYS.map((ab) => (
                      <option key={`msave:${ab}`} value={`msave:${ab}`}>
                        {ab} Magic Save ({formatSigned(getSaveTotal(state, ab))} ADV)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button
                  type="button"
                  disabled={!quickFillSource}
                  onClick={handleApplyQuickFillMacro}
                  className="px-2.5 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] disabled:opacity-40 disabled:cursor-not-allowed text-[#080c0a] text-xs font-semibold cursor-pointer"
                >
                  Fill Slot
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {state.customMacros.map((macro) => (
                  <div
                    key={macro.slot}
                    className="bg-[#080c0a] border border-[#2e243b] rounded p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <span className="font-mono text-xs text-[#c084fc] sm:col-span-1">
                      Slot {macro.slot}
                    </span>
                    <input
                      type="text"
                      value={macro.label}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customMacros: prev.customMacros.map((m) =>
                            m.slot === macro.slot
                              ? { ...m, label: e.target.value }
                              : m
                          ),
                        }))
                      }
                      placeholder="Macro Label (e.g. Stealth, Longsword)"
                      className="ledger-input px-2 py-1 text-xs sm:col-span-4"
                    />
                    <input
                      type="text"
                      value={macro.expression}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customMacros: prev.customMacros.map((m) =>
                            m.slot === macro.slot
                              ? { ...m, expression: e.target.value }
                              : m
                          ),
                        }))
                      }
                      placeholder="e.g. 1d20+5, 2d20kh1+5, 1d8+3"
                      className="ledger-input px-2 py-1 text-xs font-mono sm:col-span-4"
                    />
                    <select
                      value={macro.mode}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customMacros: prev.customMacros.map((m) =>
                            m.slot === macro.slot
                              ? { ...m, mode: e.target.value as RollMode }
                              : m
                          ),
                        }))
                      }
                      className="ledger-input px-2 py-1 text-xs font-mono sm:col-span-2"
                    >
                      <option value="normal">Normal</option>
                      <option value="adv">Advantage</option>
                      <option value="dis">Disadv.</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customMacros: prev.customMacros.map((m) =>
                            m.slot === macro.slot
                              ? { ...m, label: '', expression: '', mode: 'normal' }
                              : m
                          ),
                        }))
                      }
                      disabled={!macro.label && !macro.expression}
                      className="sm:col-span-1 p-1.5 text-[#65766e] hover:text-[#ff4d4d] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      title={`Clear Slot ${macro.slot}`}
                      aria-label={`Clear Slot ${macro.slot}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'custom' && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7] mb-2">
                  Custom Ledger Titles &amp; Privacy Flags
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.customLedger.map((sec, idx) => {
                    const isLockedPrivate = sec.isPrivate && !covertUnlocked;
                    return (
                      <div
                        key={sec.id}
                        className="bg-[#080c0a] border border-[#2e243b] rounded p-2 flex items-center gap-2"
                      >
                        <span className="font-mono text-[11px] text-[#65766e]">
                          0{idx + 1}
                        </span>
                        {isLockedPrivate ? (
                          <span className="flex-1 px-2 py-1 text-xs font-mono text-[#65766e]">
                            [ Masked · Covert Locked ]
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                customLedger: prev.customLedger.map((s) =>
                                  s.id === sec.id ? { ...s, title: e.target.value } : s
                                ),
                              }))
                            }
                            placeholder={`Untitled Section ${idx + 1}`}
                            className="ledger-input flex-1 px-2 py-1 text-xs"
                          />
                        )}
                        <label
                          className={`inline-flex items-center gap-1 text-[11px] font-mono text-[#c084fc] shrink-0 ${
                            isLockedPrivate
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isLockedPrivate}
                            checked={sec.isPrivate}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                customLedger: prev.customLedger.map((s) =>
                                  s.id === sec.id
                                    ? { ...s, isPrivate: e.target.checked }
                                    : s
                                ),
                              }))
                            }
                            className="accent-[#a855f7]"
                          />
                          <span>PRIV</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#2e243b] pt-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#c084fc]">
                    Advanced / Optional Mechanics
                  </h3>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                      state.covert.clockworkVesselActive
                        ? 'bg-[#171022] border-[#c084fc] text-[#c084fc]'
                        : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7]'
                    }`}
                  >
                    {state.covert.clockworkVesselActive
                      ? 'ENABLED'
                      : 'STANDARD MODE'}
                  </span>
                </div>

                <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[#d4e0da]">
                      Enable Experimental / Alternate Arcs (Clockwork Vessel)
                    </span>
                    <p className="text-[11px] text-[#9eb0a7] leading-relaxed">
                      Off by default to keep the character sheet in standard mode.
                      When enabled, reveals Clockwork Vessel portrait states (while
                      Covert Arc is unlocked), alternate arc notes, and Clockwork Part
                      counters on Screen 2. Always hidden in Party Share View.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state.covert.clockworkVesselActive}
                    aria-label="Enable Experimental / Alternate Arcs (Clockwork Vessel)"
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        covert: {
                          ...prev.covert,
                          clockworkVesselActive: !prev.covert.clockworkVesselActive,
                        },
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                      state.covert.clockworkVesselActive
                        ? 'bg-[#a855f7] border-[#c084fc]'
                        : 'bg-[#0b100e] border-[#2e243b]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full transition-transform ${
                        state.covert.clockworkVesselActive
                          ? 'translate-x-5 bg-[#080c0a]'
                          : 'translate-x-1 bg-[#9eb0a7]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'backup' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3.5 flex flex-col gap-2.5">
                <h3 className="font-display text-sm text-[#d4e0da]">
                  JSON Export &amp; Import
                </h3>
                <p className="text-xs text-[#9eb0a7]">
                  Each character saves automatically per browser in{' '}
                  <span className="font-mono">localStorage</span>. Export a portable
                  JSON backup to share, archive, or switch between characters cleanly.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        exportLedgerJson(state, false),
                        `clinical-ledger-${fileSlug}-full-backup.json`,
                        'application/json'
                      )
                    }
                    className="px-3 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Full Backup (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        exportLedgerJson(state, true),
                        `clinical-ledger-${fileSlug}-party-safe.json`,
                        'application/json'
                      )
                    }
                    className="px-3 py-1.5 rounded bg-[#0b100e] border border-[#4af626]/60 text-[#4af626] hover:bg-[#4af626]/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Party-Safe (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded bg-[#0b100e] border border-[#581c87] hover:border-[#c084fc] text-[#d4e0da] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Character (.json)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </div>
                {importStatus && (
                  <p
                    className={`text-xs font-mono ${
                      importStatus.type === 'ok'
                        ? 'text-[#4af626]'
                        : 'text-[#ff4d4d]'
                    }`}
                  >
                    {importStatus.text}
                  </p>
                )}
              </div>

              {/* New Blank Character Card */}
              <div className="bg-[#080c0a] border border-[#a855f7]/60 rounded p-3.5 flex flex-col gap-2">
                <h3 className="font-display text-sm text-[#c084fc] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>New Blank Character</span>
                </h3>
                <p className="text-xs text-[#9eb0a7] leading-relaxed">
                  Resets identity, ability scores (10), skills (all NONE), saving
                  throws, vitals, gear, supplies, notes, quick-roll macros (1–9),
                  custom sections, and roll history to a clean blank sheet so you can
                  build any character from scratch.
                </p>
                {!confirmNewBlank ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenNewCharacterModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenNewCharacterModal();
                        }}
                        className="px-3 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add New Character to Roster</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmNewBlank(true);
                        setConfirmReset(false);
                      }}
                      className="px-3 py-1.5 rounded bg-[#171022] border border-[#a855f7] text-[#c084fc] hover:bg-[#a855f7] hover:text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Reset Current Slot to Blank</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNewBlankCharacter();
                        setConfirmNewBlank(false);
                        setImportStatus({
                          type: 'ok',
                          text: 'Created a new blank character and saved to localStorage.',
                        });
                      }}
                      className="px-3 py-1.5 rounded bg-[#ff4d4d] text-[#080c0a] text-xs font-bold cursor-pointer"
                    >
                      Confirm New Blank Character
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmNewBlank(false)}
                      className="px-3 py-1.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Restore Pip Preset Baseline */}
              <div className="bg-[#080c0a] border border-[#ff4d4d]/40 rounded p-3.5 flex flex-col gap-2">
                <h3 className="font-display text-sm text-[#ff4d4d]">
                  Restore Pip&apos;s Preset Character
                </h3>
                <p className="text-xs text-[#9eb0a7]">
                  Clears all entered logs, gear, custom sections, and notes and restores
                  Pip&apos;s verified initial character sheet preset.
                </p>
                {!confirmReset ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReset(true);
                        setConfirmNewBlank(false);
                      }}
                      className="px-3 py-1.5 rounded border border-[#ff4d4d] text-[#ff4d4d] hover:bg-[#ff4d4d]/15 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Pip&apos;s Preset</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onReplaceState(createInitialLedgerState());
                        setConfirmReset(false);
                        setImportStatus({
                          type: 'ok',
                          text: "Restored Pip's preset character sheet.",
                        });
                      }}
                      className="px-3 py-1.5 rounded bg-[#ff4d4d] text-[#080c0a] text-xs font-bold cursor-pointer"
                    >
                      Confirm Restore Pip
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-[#2e243b] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EXPORT MARKDOWN MODAL (F6)
 * ============================================================================ */

interface ExportMarkdownModalProps {
  state: LedgerState;
  isPartyMode: boolean;
  covertUnlocked: boolean;
  onClose: () => void;
}

export const ExportMarkdownModal: React.FC<ExportMarkdownModalProps> = ({
  state,
  isPartyMode,
  covertUnlocked,
  onClose,
}) => {
  const [options, setOptions] = useState<MarkdownExportOptions>({
    includeCore: true,
    includePersona: true,
    includeGearAndSpells: true,
    includeNotesAndLogs: true,
    includePublicCustom: true,
    includePrivateCustom: false,
    includeCovertArc: false,
  });
  const [copied, setCopied] = useState(false);
  const [confirmSensitiveExport, setConfirmSensitiveExport] = useState(false);

  const canExportPrivate = !isPartyMode && covertUnlocked;

  const effectiveOptions: MarkdownExportOptions = !canExportPrivate
    ? {
        ...options,
        includePrivateCustom: false,
        includeCovertArc: false,
      }
    : options;

  const includesSensitive =
    canExportPrivate &&
    (effectiveOptions.includePrivateCustom || effectiveOptions.includeCovertArc);

  const exportBlockedByWarning = includesSensitive && !confirmSensitiveExport;

  const previewOptions: MarkdownExportOptions = exportBlockedByWarning
    ? {
        ...effectiveOptions,
        includePrivateCustom: false,
        includeCovertArc: false,
      }
    : effectiveOptions;

  const markdown = useMemo(
    () =>
      generateMarkdownSnapshot(
        isPartyMode ? redactStateForParty(state) : state,
        previewOptions
      ),
    [state, isPartyMode, previewOptions]
  );

  const handleCopy = async () => {
    if (exportBlockedByWarning) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Export Markdown Snapshot"
    >
      <div className="surface-modal rounded w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2e243b] flex items-center justify-between">
          <h2 className="font-display text-sm sm:text-base uppercase tracking-[0.06em] text-[#d4e0da]">
            Export Markdown Snapshot (F6)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Section Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
              Included Sections
            </span>
            <button
              type="button"
              onClick={() =>
                setOptions({
                  includeCore: true,
                  includePersona: true,
                  includeGearAndSpells: true,
                  includeNotesAndLogs: true,
                  includePublicCustom: true,
                  includePrivateCustom: false,
                  includeCovertArc: false,
                })
              }
              className="text-[11px] font-mono text-[#4af626] hover:underline cursor-pointer"
            >
              Apply Party-Safe Preset
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {(
              [
                ['includeCore', 'Core Sheet & Vitals'],
                ['includePersona', 'Persona & Clinical Notes'],
                ['includeGearAndSpells', 'Gear, Spells & Supplies'],
                ['includeNotesAndLogs', 'Scratchpad & Campaign Log'],
                ['includePublicCustom', 'Custom Ledger (Shared)'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 bg-[#080c0a] border border-[#2e243b] rounded px-2.5 py-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={effectiveOptions[key]}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="accent-[#a855f7]"
                />
                <span className="text-[#d4e0da]">{label}</span>
              </label>
            ))}

            {!isPartyMode && (
              <>
                <label
                  className={`flex items-center gap-2 bg-[#171022] border border-[#581c87] rounded px-2.5 py-1.5 ${
                    covertUnlocked ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                  title={
                    covertUnlocked
                      ? 'Include [PRIVATE] panels and private log notes'
                      : 'Unlock Covert Arc (Ctrl+H) first to include [PRIVATE] content'
                  }
                >
                  <input
                    type="checkbox"
                    disabled={!covertUnlocked}
                    checked={options.includePrivateCustom && covertUnlocked}
                    onChange={(e) => {
                      setConfirmSensitiveExport(false);
                      setOptions((prev) => ({
                        ...prev,
                        includePrivateCustom: e.target.checked,
                      }));
                    }}
                    className="accent-[#ff4d4d]"
                  />
                  <span className="text-[#c084fc]">[PRIVATE] Panels &amp; Logs</span>
                </label>

                <label
                  className={`flex items-center gap-2 bg-[#171022] border border-[#581c87] rounded px-2.5 py-1.5 ${
                    covertUnlocked ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                  title={
                    covertUnlocked
                      ? 'Include Covert Arc notes'
                      : 'Unlock Covert Arc first to include covert notes'
                  }
                >
                  <input
                    type="checkbox"
                    disabled={!covertUnlocked}
                    checked={options.includeCovertArc && covertUnlocked}
                    onChange={(e) => {
                      setConfirmSensitiveExport(false);
                      setOptions((prev) => ({
                        ...prev,
                        includeCovertArc: e.target.checked,
                      }));
                    }}
                    className="accent-[#ff4d4d]"
                  />
                  <span className="text-[#c084fc]">Covert Arc Notes</span>
                </label>
              </>
            )}
          </div>

          {/* Explicit Crimson Warning + Mandatory Confirmation Toggle for Private/Covert Content */}
          {includesSensitive && (
            <div className="bg-[#ff4d4d]/10 border border-[#ff4d4d] rounded px-3 py-2.5 flex flex-col gap-2 text-xs text-[#ff4d4d]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Spoiler Warning:</strong> You selected{' '}
                  <strong>[PRIVATE]</strong> or <strong>Covert Arc</strong> records.
                  Confirm below before copying or downloading this snapshot.
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-mono text-[#d4e0da] bg-[#080c0a]/80 border border-[#ff4d4d]/50 rounded px-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={confirmSensitiveExport}
                  onChange={(e) => setConfirmSensitiveExport(e.target.checked)}
                  className="accent-[#ff4d4d]"
                />
                <span>
                  Confirm export of private / covert notes (not for party sharing)
                </span>
              </label>
            </div>
          )}

          {/* Markdown Preview */}
          <pre className="flex-1 min-h-[220px] max-h-[340px] overflow-auto bg-[#080c0a] border border-[#2e243b] rounded p-3 font-mono text-[11px] text-[#d4e0da] whitespace-pre-wrap leading-relaxed">
            {markdown}
          </pre>
        </div>

        <div className="px-4 py-3 border-t border-[#2e243b] flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-[#9eb0a7]">
            {exportBlockedByWarning
              ? 'Toggle warning confirmation above to unlock export'
              : includesSensitive
              ? 'Private / Covert snapshot unlocked'
              : 'Party-safe Markdown snapshot'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exportBlockedByWarning}
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded bg-[#0b100e] border text-xs font-medium flex items-center gap-1.5 ${
                exportBlockedByWarning
                  ? 'border-[#2e243b] text-[#65766e] opacity-60 cursor-not-allowed'
                  : 'border-[#581c87] hover:border-[#c084fc] text-[#d4e0da] cursor-pointer'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4af626]" />
                  <span className="text-[#4af626]">Copied Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={exportBlockedByWarning}
              onClick={() => {
                const mdSlug = slugifyCharacterName(state.identity.name);
                triggerFileDownload(
                  markdown,
                  includesSensitive
                    ? `clinical-ledger-${mdSlug}-private.md`
                    : `clinical-ledger-${mdSlug}-party-safe.md`,
                  'text/markdown'
                );
              }}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${
                exportBlockedByWarning
                  ? 'bg-[#2e243b] text-[#65766e] cursor-not-allowed'
                  : 'bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] cursor-pointer'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
