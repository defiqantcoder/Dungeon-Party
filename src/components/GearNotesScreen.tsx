import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Clock,
  Cog,
  Coins,
  Dices,
  EyeOff,
  FileText,
  Lock,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
  Trash2,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import {
  AttackEntry,
  CampaignLogEntry,
  GearItem,
  LedgerState,
  RollMode,
  SessionCostLine,
  SpellEntry,
  SupplyCounter,
} from '../types/ledger';
import {
  createId,
  formatSigned,
  formatTimestamp,
  getSpellAttackBonus,
  getSpellSaveDc,
} from '../utils/ledgerMath';

interface GearNotesScreenProps {
  state: LedgerState;
  readOnly: boolean; // True in Party Share View
  covertUnlocked: boolean; // True ONLY when Covert Arc Lock is unlocked in Player/DM View
  rollMode: RollMode;
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onRollD20: (label: string, modifier: number, overrideMode?: RollMode) => void;
  onRollExpression: (expression: string, label?: string, overrideMode?: RollMode) => void;
  onOpenSrdPicker: (kind: 'spell' | 'gear') => void;
}

const INLINE_INPUT_CLASS =
  'bg-transparent border border-transparent hover:border-[#2e243b] focus:bg-[#080c0a] focus:border-[#c084fc] rounded px-1 py-0.5 focus:outline-none transition-colors';

export const GearNotesScreen: React.FC<GearNotesScreenProps> = ({
  state,
  readOnly,
  covertUnlocked,
  rollMode,
  onUpdateState,
  onRollD20,
  onRollExpression,
  onOpenSrdPicker,
}) => {
  const canViewPrivate = !readOnly && covertUnlocked;
  // Add Attack / Cantrip form state
  const [showAttackForm, setShowAttackForm] = useState(false);
  const [newAttack, setNewAttack] = useState({
    name: '',
    attackBonus: '+3',
    damage: '1d4+3',
    damageType: '',
    notes: '',
    quickRoll: true,
  });

  // Spell slot editor toggle
  const [editingSlots, setEditingSlots] = useState(false);

  // Add Miniature Supply / Clockwork Part state
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [newSupply, setNewSupply] = useState<{
    name: string;
    category: 'medical' | 'clockwork' | 'other';
    quantity: number;
    unit: string;
    notes: string;
  }>({
    name: '',
    category: 'medical',
    quantity: 0,
    unit: '',
    notes: '',
  });

  // Add Session Cost state
  const [costDesc, setCostDesc] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState<'GP' | 'SP' | 'CP'>('GP');
  const [applyCostToWallet, setApplyCostToWallet] = useState(true);

  // Campaign Log filter & new entry state
  const [logSearch, setLogSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('ALL');
  const [showLogForm, setShowLogForm] = useState(false);
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogBody, setNewLogBody] = useState('');
  const [newLogTags, setNewLogTags] = useState('');
  const [newLogPrivate, setNewLogPrivate] = useState(false);

  // Undo / Revert snapshot for accidental deletions during live play
  const [deletedSnapshot, setDeletedSnapshot] = useState<{
    kind: 'attack' | 'spell' | 'gear' | 'supply' | 'cost' | 'log';
    name: string;
    item: any;
  } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const scratchpadRef = useRef<HTMLTextAreaElement | null>(null);

  const handleDeleteWithUndo = (
    kind: 'attack' | 'spell' | 'gear' | 'supply' | 'cost' | 'log',
    name: string,
    item: any,
    deleteFn: () => void
  ) => {
    deleteFn();
    setDeletedSnapshot({ kind, name, item });
    if (undoTimeoutRef.current !== null) {
      window.clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = window.setTimeout(() => {
      setDeletedSnapshot(null);
      undoTimeoutRef.current = null;
    }, 7000);
  };

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return;
    const { kind, item } = deletedSnapshot;
    onUpdateState((prev) => {
      switch (kind) {
        case 'attack':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              attacks: [...prev.gearAndNotes.attacks, item],
            },
          };
        case 'spell':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              spells: [...prev.gearAndNotes.spells, item],
            },
          };
        case 'gear':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              gear: [...prev.gearAndNotes.gear, item],
            },
          };
        case 'supply':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              miniatureSupplies: [...prev.gearAndNotes.miniatureSupplies, item],
            },
          };
        case 'cost':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              sessionCosts: [item, ...prev.gearAndNotes.sessionCosts],
            },
          };
        case 'log':
          return {
            ...prev,
            gearAndNotes: {
              ...prev.gearAndNotes,
              campaignLog: [item, ...prev.gearAndNotes.campaignLog],
            },
          };
        default:
          return prev;
      }
    });
    setDeletedSnapshot(null);
    if (undoTimeoutRef.current !== null) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  const equippedGear = useMemo(
    () => state.gearAndNotes.gear.filter((g) => g.equipped),
    [state.gearAndNotes.gear]
  );
  const stowedInventory = useMemo(
    () => state.gearAndNotes.gear.filter((g) => !g.equipped),
    [state.gearAndNotes.gear]
  );

  // Respect Party Share View AND Covert Arc Lock before computing tags or filtered logs
  const visibleCampaignLogs = useMemo(
    () =>
      !canViewPrivate
        ? state.gearAndNotes.campaignLog.filter((entry) => !entry.isPrivate)
        : state.gearAndNotes.campaignLog,
    [state.gearAndNotes.campaignLog, canViewPrivate]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    visibleCampaignLogs.forEach((entry) =>
      entry.tags.forEach((t) => tagSet.add(t))
    );
    return Array.from(tagSet).sort();
  }, [visibleCampaignLogs]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleCampaignLogs.forEach((entry) => {
      entry.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [visibleCampaignLogs]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return visibleCampaignLogs.filter((entry) => {
      const matchesTag = activeTag === 'ALL' || entry.tags.includes(activeTag);
      const matchesQuery =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.body.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesQuery;
    });
  }, [visibleCampaignLogs, logSearch, activeTag]);

  const activeSpellSlotLevels = state.gearAndNotes.spellSlots.filter(
    (s) => s.max > 0
  );

  /* ---- Handlers: Attacks & Cantrips ---- */
  const handleAddAttack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttack.name.trim()) return;
    const item: AttackEntry = {
      id: createId('atk'),
      name: newAttack.name.trim(),
      attackBonus: newAttack.attackBonus.trim() || '+0',
      damage: newAttack.damage.trim() || '1d4',
      damageType: newAttack.damageType.trim(),
      notes: newAttack.notes.trim(),
      quickRoll: newAttack.quickRoll,
    };
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        attacks: [...prev.gearAndNotes.attacks, item],
      },
    }));
    setNewAttack({
      name: '',
      attackBonus: '+3',
      damage: '1d4+3',
      damageType: '',
      notes: '',
      quickRoll: true,
    });
    setShowAttackForm(false);
  };

  const updateAttackField = (
    id: string,
    patch: Partial<AttackEntry>
  ) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        attacks: prev.gearAndNotes.attacks.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        ),
      },
    }));
  };

  /* ---- Handlers: Spells ---- */
  const updateSpellField = (id: string, patch: Partial<SpellEntry>) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        spells: prev.gearAndNotes.spells.map((sp) =>
          sp.id === id ? { ...sp, ...patch } : sp
        ),
      },
    }));
  };

  /* ---- Handlers: Gear & Inventory ---- */
  const updateGearField = (id: string, patch: Partial<GearItem>) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        gear: prev.gearAndNotes.gear.map((g) =>
          g.id === id ? { ...g, ...patch } : g
        ),
      },
    }));
  };

  /* ---- Handlers: Miniature Supplies & Clockwork Parts ---- */
  const handleAddSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupply.name.trim()) return;
    const safeCategory =
      !state.covert.clockworkVesselActive && newSupply.category === 'clockwork'
        ? 'medical'
        : newSupply.category;
    const item: SupplyCounter = {
      id: createId('sup'),
      name: newSupply.name.trim(),
      category: safeCategory,
      quantity: Math.max(0, newSupply.quantity),
      unit: newSupply.unit.trim(),
      notes: newSupply.notes.trim(),
    };
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        miniatureSupplies: [...prev.gearAndNotes.miniatureSupplies, item],
      },
    }));
    setNewSupply({
      name: '',
      category: 'medical',
      quantity: 0,
      unit: '',
      notes: '',
    });
    setShowSupplyForm(false);
  };

  const updateSupplyField = (id: string, patch: Partial<SupplyCounter>) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        miniatureSupplies: prev.gearAndNotes.miniatureSupplies.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      },
    }));
  };

  /* ---- Handlers: Currency & Session Costs ---- */
  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costDesc.trim() || !costAmount.trim()) return;

    const rawTrimmed = costAmount.trim();
    const entry: SessionCostLine = {
      id: createId('cost'),
      timestamp: formatTimestamp(),
      description: costDesc.trim(),
      amount: rawTrimmed,
      currency: costCurrency,
    };

    onUpdateState((prev) => {
      let nextCurrency = prev.gearAndNotes.currency;
      if (applyCostToWallet) {
        const parsed = parseInt(rawTrimmed.replace(/[^0-9+-]/g, ''), 10);
        if (!Number.isNaN(parsed) && parsed !== 0) {
          // Signed "+10" adds; "-5" or unsigned "5" deducts as a cost
          const delta = rawTrimmed.startsWith('+')
            ? Math.abs(parsed)
            : rawTrimmed.startsWith('-')
            ? -Math.abs(parsed)
            : -Math.abs(parsed);
          const key = costCurrency.toLowerCase() as 'gp' | 'sp' | 'cp';
          nextCurrency = {
            ...prev.gearAndNotes.currency,
            [key]: Math.max(0, prev.gearAndNotes.currency[key] + delta),
          };
        }
      }

      return {
        ...prev,
        gearAndNotes: {
          ...prev.gearAndNotes,
          currency: nextCurrency,
          sessionCosts: [entry, ...prev.gearAndNotes.sessionCosts],
        },
      };
    });

    setCostDesc('');
    setCostAmount('');
  };

  const updateCostField = (id: string, patch: Partial<SessionCostLine>) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        sessionCosts: prev.gearAndNotes.sessionCosts.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  };

  /* ---- Handlers: Scratchpad & Campaign Log ---- */
  const insertScratchpadTimestamp = () => {
    if (readOnly) return;
    const stamp = `${formatTimestamp()} `;
    const el = scratchpadRef.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const current = state.gearAndNotes.scratchpad;
      const next = current.slice(0, start) + stamp + current.slice(end);
      onUpdateState((prev) => ({
        ...prev,
        gearAndNotes: {
          ...prev.gearAndNotes,
          scratchpad: next,
        },
      }));
      window.setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + stamp.length, start + stamp.length);
      }, 0);
    } else {
      onUpdateState((prev) => ({
        ...prev,
        gearAndNotes: {
          ...prev.gearAndNotes,
          scratchpad: prev.gearAndNotes.scratchpad
            ? `${prev.gearAndNotes.scratchpad}\n${stamp}`
            : stamp,
        },
      }));
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim() && !newLogBody.trim()) return;
    const parsedTags = newLogTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const entry: CampaignLogEntry = {
      id: createId('log'),
      timestamp: formatTimestamp(),
      title: newLogTitle.trim() || 'Untitled Entry',
      body: newLogBody.trim(),
      tags: parsedTags,
      isPrivate: newLogPrivate,
    };
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        campaignLog: [entry, ...prev.gearAndNotes.campaignLog],
      },
    }));
    setNewLogTitle('');
    setNewLogBody('');
    setNewLogTags('');
    setNewLogPrivate(false);
    setShowLogForm(false);
  };

  const updateLogField = (id: string, patch: Partial<CampaignLogEntry>) => {
    if (readOnly) return;
    onUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        campaignLog: prev.gearAndNotes.campaignLog.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry
        ),
      },
    }));
  };

  const renderGearRow = (item: GearItem) => (
    <div
      key={item.id}
      className="py-2 flex flex-col gap-1 text-xs border-b border-[#1d1827] last:border-b-0"
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {!readOnly && (
            <button
              type="button"
              onClick={() => updateGearField(item.id, { equipped: !item.equipped })}
              title={item.equipped ? 'Move to Inventory' : 'Move to Equipped Gear'}
              className={`p-1 rounded border transition-colors shrink-0 cursor-pointer ${
                item.equipped
                  ? 'bg-[#4af626]/10 border-[#4af626]/50 text-[#4af626] hover:border-[#c084fc]'
                  : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:text-[#c084fc] hover:border-[#a855f7]'
              }`}
            >
              {item.equipped ? (
                <ArrowDownToLine className="w-3 h-3" />
              ) : (
                <ArrowUpFromLine className="w-3 h-3" />
              )}
            </button>
          )}

          {readOnly ? (
            <span className="text-[#d4e0da] font-medium truncate">
              {item.name}
            </span>
          ) : (
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateGearField(item.id, { name: e.target.value })}
              aria-label="Gear item name"
              className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 font-medium text-[#d4e0da]`}
            />
          )}
        </div>

        {/* Quantity Controls (-1 / qty / +1) & Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                updateGearField(item.id, {
                  quantity: Math.max(0, item.quantity - 1),
                })
              }
              className="px-1.5 h-6 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] font-mono text-[10px] text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
              aria-label={`Decrease ${item.name} quantity`}
            >
              -1
            </button>
          )}
          <span className="font-mono text-xs tabular-nums min-w-[1.8rem] text-center text-[#d4e0da]">
            ×{item.quantity}
          </span>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() =>
                  updateGearField(item.id, { quantity: item.quantity + 1 })
                }
                className="px-1.5 h-6 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] font-mono text-[10px] text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                aria-label={`Increase ${item.name} quantity`}
              >
                +1
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDeleteWithUndo('gear', item.name, item, () => {
                    onUpdateState((prev) => ({
                      ...prev,
                      gearAndNotes: {
                        ...prev.gearAndNotes,
                        gear: prev.gearAndNotes.gear.filter((g) => g.id !== item.id),
                      },
                    }));
                  })
                }
                className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Weight & Notes Row */}
      {(item.weight || item.notes || !readOnly) && (
        <div className="flex items-center gap-1.5 pl-6 text-[11px]">
          {readOnly ? (
            <span className="text-[#9eb0a7] truncate">
              {[item.weight, item.notes].filter(Boolean).join(' · ')}
            </span>
          ) : (
            <>
              <input
                type="text"
                value={item.weight}
                onChange={(e) =>
                  updateGearField(item.id, { weight: e.target.value })
                }
                placeholder="Wt."
                aria-label={`${item.name} weight`}
                className={`${INLINE_INPUT_CLASS} w-14 font-mono text-[10px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
              />
              <input
                type="text"
                value={item.notes}
                onChange={(e) =>
                  updateGearField(item.id, { notes: e.target.value })
                }
                placeholder="Notes..."
                aria-label={`${item.name} notes`}
                className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 text-[11px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-start">
      {/* ====================================================================
          LEFT COLUMN (4 cols): Attacks & Cantrips + Spells & Slots
         ==================================================================== */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        {/* Attacks & Cantrips */}
        <section
          id="section-attacks"
          className="surface-clinical rounded p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Attacks &amp; Cantrips</span>
            </h2>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowAttackForm((prev) => !prev)}
                className="text-xs text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
            )}
          </div>

          {showAttackForm && !readOnly && (
            <form
              onSubmit={handleAddAttack}
              className="bg-[#080c0a] border border-[#581c87] rounded p-3 flex flex-col gap-2"
            >
              <input
                type="text"
                required
                value={newAttack.name}
                onChange={(e) =>
                  setNewAttack((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Attack, Tool, or Cantrip Name"
                className="ledger-input px-2 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAttack.attackBonus}
                  onChange={(e) =>
                    setNewAttack((p) => ({ ...p, attackBonus: e.target.value }))
                  }
                  placeholder="Hit / DC (+3)"
                  className="ledger-input px-2 py-1.5 text-xs font-mono"
                />
                <input
                  type="text"
                  value={newAttack.damage}
                  onChange={(e) =>
                    setNewAttack((p) => ({ ...p, damage: e.target.value }))
                  }
                  placeholder="Damage (1d4+3)"
                  className="ledger-input px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAttack.damageType}
                  onChange={(e) =>
                    setNewAttack((p) => ({ ...p, damageType: e.target.value }))
                  }
                  placeholder="Type (Piercing, etc.)"
                  className="ledger-input px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={newAttack.notes}
                  onChange={(e) =>
                    setNewAttack((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Range / Properties"
                  className="ledger-input px-2 py-1.5 text-xs"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-[#9eb0a7] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAttack.quickRoll}
                    onChange={(e) =>
                      setNewAttack((p) => ({ ...p, quickRoll: e.target.checked }))
                    }
                    className="accent-[#a855f7]"
                  />
                  <span>Enable quick-roll triggers</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttackForm(false)}
                    className="px-2 py-1 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-semibold rounded bg-[#a855f7] text-[#080c0a] hover:bg-[#c084fc] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          {state.gearAndNotes.attacks.length === 0 ? (
            <p className="text-xs text-[#65766e] py-2">
              No attacks or cantrips recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#1d1827]">
              {state.gearAndNotes.attacks.map((atk) => {
                const parsedMod = parseInt(atk.attackBonus, 10);
                const hasNumericMod = !Number.isNaN(parsedMod);
                const showQuickRoll = atk.quickRoll !== false;

                return (
                  <div
                    key={atk.id}
                    className="py-2.5 flex flex-col gap-1.5 text-xs"
                  >
                    {/* Top row: Name + Roll Toggle + Delete */}
                    <div className="flex items-center justify-between gap-1.5">
                      {readOnly ? (
                        <span className="font-medium text-[#d4e0da] truncate">
                          {atk.name}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={atk.name}
                          onChange={(e) =>
                            updateAttackField(atk.id, { name: e.target.value })
                          }
                          aria-label="Attack name"
                          className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 font-medium text-[#d4e0da]`}
                        />
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              updateAttackField(atk.id, {
                                quickRoll: !showQuickRoll,
                              })
                            }
                            title={
                              showQuickRoll
                                ? 'Quick-roll triggers enabled (click to hide)'
                                : 'Quick-roll triggers hidden (click to show)'
                            }
                            className={`p-1 rounded border transition-colors cursor-pointer ${
                              showQuickRoll
                                ? 'border-[#581c87] text-[#c084fc] bg-[#171022]'
                                : 'border-[#2e243b] text-[#65766e] bg-[#080c0a]'
                            }`}
                          >
                            <Dices className="w-3 h-3" />
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteWithUndo('attack', atk.name, atk, () => {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  gearAndNotes: {
                                    ...prev.gearAndNotes,
                                    attacks: prev.gearAndNotes.attacks.filter(
                                      (a) => a.id !== atk.id
                                    ),
                                  },
                                }));
                              })
                            }
                            aria-label={`Delete ${atk.name}`}
                            className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Editable Stats Row */}
                    <div className="grid grid-cols-12 gap-1.5 items-center">
                      {readOnly ? (
                        <div className="col-span-12 font-mono text-[11px] text-[#9eb0a7]">
                          {atk.attackBonus} · {atk.damage}{' '}
                          {atk.damageType && <span>{atk.damageType}</span>}
                          {atk.notes && (
                            <span className="font-sans"> — {atk.notes}</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={atk.attackBonus}
                            onChange={(e) =>
                              updateAttackField(atk.id, {
                                attackBonus: e.target.value,
                              })
                            }
                            placeholder="+0"
                            aria-label={`${atk.name} hit bonus`}
                            className={`${INLINE_INPUT_CLASS} col-span-3 font-mono text-[11px] text-[#c084fc]`}
                          />
                          <input
                            type="text"
                            value={atk.damage}
                            onChange={(e) =>
                              updateAttackField(atk.id, {
                                damage: e.target.value,
                              })
                            }
                            placeholder="1d4"
                            aria-label={`${atk.name} damage`}
                            className={`${INLINE_INPUT_CLASS} col-span-4 font-mono text-[11px] text-[#d4e0da]`}
                          />
                          <input
                            type="text"
                            value={atk.damageType}
                            onChange={(e) =>
                              updateAttackField(atk.id, {
                                damageType: e.target.value,
                              })
                            }
                            placeholder="Type"
                            aria-label={`${atk.name} damage type`}
                            className={`${INLINE_INPUT_CLASS} col-span-5 text-[11px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                          />
                          <input
                            type="text"
                            value={atk.notes}
                            onChange={(e) =>
                              updateAttackField(atk.id, {
                                notes: e.target.value,
                              })
                            }
                            placeholder="Range / Notes..."
                            aria-label={`${atk.name} notes`}
                            className={`${INLINE_INPUT_CLASS} col-span-12 text-[11px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                          />
                        </>
                      )}
                    </div>

                    {/* Optional Quick-Roll Triggers */}
                    {showQuickRoll && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onRollD20(
                              `${atk.name} (To Hit)`,
                              hasNumericMod ? parsedMod : 0,
                              rollMode
                            )
                          }
                          className="px-2 py-0.5 rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] font-mono text-[11px] text-[#c084fc] cursor-pointer flex items-center gap-1"
                        >
                          <Dices className="w-3 h-3" />
                          <span>Hit {atk.attackBonus}</span>
                        </button>
                        {atk.damage.trim() && (
                          <button
                            type="button"
                            onClick={() =>
                              onRollExpression(
                                atk.damage,
                                `${atk.name} Damage${
                                  atk.damageType ? ` (${atk.damageType})` : ''
                                }`
                              )
                            }
                            className="px-2 py-0.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#a855f7] font-mono text-[11px] text-[#d4e0da] cursor-pointer"
                          >
                            Dmg {atk.damage}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Spells & Slots */}
        <section
          id="section-spells"
          className="surface-clinical rounded p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>Spells &amp; Slots</span>
              </h2>
              <span
                className="font-mono text-[10px] text-[#c084fc] bg-[#171022] border border-[#2e243b] px-1.5 py-0.5 rounded"
                title="Spell Save DC and Spell Attack Bonus (INT)"
              >
                DC {getSpellSaveDc(state, 'INT')} · {formatSigned(getSpellAttackBonus(state, 'INT'))}
              </span>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSlots((prev) => !prev)}
                  className="text-[11px] text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                >
                  {editingSlots ? 'Done' : 'Slots'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSrdPicker('spell')}
                  className="text-xs text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Spell</span>
                </button>
              </div>
            )}
          </div>

          {/* Spell Slot Max Configurator */}
          {editingSlots && !readOnly && (
            <div className="bg-[#080c0a] border border-[#581c87] rounded p-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-2">
                Max Slots by Level (1–9)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {state.gearAndNotes.spellSlots.map((slot) => (
                  <div
                    key={slot.level}
                    className="flex items-center justify-between bg-[#0b100e] border border-[#2e243b] rounded px-2 py-1"
                  >
                    <span className="font-mono text-[10px] text-[#9eb0a7]">
                      L{slot.level}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={slot.max}
                      onChange={(e) => {
                        const max = Math.max(
                          0,
                          Math.min(9, parseInt(e.target.value, 10) || 0)
                        );
                        onUpdateState((prev) => ({
                          ...prev,
                          gearAndNotes: {
                            ...prev.gearAndNotes,
                            spellSlots: prev.gearAndNotes.spellSlots.map((s) =>
                              s.level === slot.level
                                ? { ...s, max, used: Math.min(s.used, max) }
                                : s
                            ),
                          },
                        }));
                      }}
                      className="w-10 bg-transparent text-right font-mono text-xs text-[#c084fc] focus:outline-none tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Spell Slot Pip Trackers */}
          {activeSpellSlotLevels.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {activeSpellSlotLevels.map((slot) => (
                <div
                  key={slot.level}
                  className="bg-[#080c0a] border border-[#2e243b] rounded px-2.5 py-1.5 flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-[11px] text-[#9eb0a7] tabular-nums">
                    Level {slot.level} ({slot.max - slot.used}/{slot.max})
                  </span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: slot.max }).map((_, i) => {
                      const pipIndex = i + 1;
                      const isAvailable = pipIndex <= slot.max - slot.used;
                      return (
                        <button
                          key={pipIndex}
                          type="button"
                          disabled={readOnly}
                          onClick={() =>
                            onUpdateState((prev) => ({
                              ...prev,
                              gearAndNotes: {
                                ...prev.gearAndNotes,
                                spellSlots: prev.gearAndNotes.spellSlots.map((s) =>
                                  s.level === slot.level
                                    ? {
                                        ...s,
                                        used: isAvailable
                                          ? Math.min(s.max, s.used + 1)
                                          : Math.max(0, s.used - 1),
                                      }
                                    : s
                                ),
                              },
                            }))
                          }
                          aria-label={`Level ${slot.level} spell slot ${pipIndex}`}
                          className={`w-3.5 h-3.5 rounded-xs border transition-colors ${
                            isAvailable
                              ? 'bg-[#c084fc] border-[#c084fc]'
                              : 'bg-transparent border-[#581c87]'
                          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spell List */}
          {state.gearAndNotes.spells.length === 0 ? (
            <p className="text-xs text-[#65766e] py-2 leading-relaxed">
              Unawakened — no spells or slots configured yet. Click{' '}
              <span className="text-[#9eb0a7]">+ Add Spell</span> to search the 5e
              SRD by class or log a custom entry.
            </p>
          ) : (
            <div className="divide-y divide-[#1d1827] max-h-[380px] overflow-y-auto pr-1">
              {state.gearAndNotes.spells.map((spell) => (
                <div key={spell.id} className="py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          updateSpellField(spell.id, {
                            prepared: !spell.prepared,
                          })
                        }
                        title={spell.prepared ? 'Prepared' : 'Unprepared'}
                        className={`w-3.5 h-3.5 rounded-xs border shrink-0 ${
                          spell.prepared
                            ? 'bg-[#c084fc] border-[#c084fc]'
                            : 'bg-transparent border-[#581c87]'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      />
                      {readOnly ? (
                        <span className="text-xs font-medium text-[#d4e0da] truncate">
                          {spell.name}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={spell.name}
                          onChange={(e) =>
                            updateSpellField(spell.id, { name: e.target.value })
                          }
                          aria-label="Spell name"
                          className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 text-xs font-medium text-[#d4e0da]`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {readOnly ? (
                        <span className="font-mono text-[10px] text-[#c084fc]">
                          {spell.level === 0 ? 'C' : `L${spell.level}`}
                        </span>
                      ) : (
                        <select
                          value={spell.level}
                          onChange={(e) =>
                            updateSpellField(spell.id, {
                              level: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          aria-label={`${spell.name} level`}
                          className="bg-[#080c0a] border border-[#2e243b] rounded px-1 py-0.5 font-mono text-[10px] text-[#c084fc]"
                        >
                          <option value={0}>Cantrip</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                            <option key={lvl} value={lvl}>
                              L{lvl}
                            </option>
                          ))}
                        </select>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteWithUndo('spell', spell.name, spell, () => {
                              onUpdateState((prev) => ({
                                ...prev,
                                gearAndNotes: {
                                  ...prev.gearAndNotes,
                                  spells: prev.gearAndNotes.spells.filter(
                                    (s) => s.id !== spell.id
                                  ),
                                },
                              }));
                            })
                          }
                          className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                          aria-label={`Delete ${spell.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata line */}
                  {readOnly ? (
                    <div className="text-[11px] font-mono text-[#9eb0a7] pl-5">
                      {[
                        spell.school,
                        spell.castingTime,
                        spell.range,
                        spell.duration,
                        spell.concentration ? 'Conc.' : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  ) : (
                    <div className="pl-5 grid grid-cols-3 gap-1 text-[10px] font-mono">
                      <input
                        type="text"
                        value={spell.castingTime}
                        onChange={(e) =>
                          updateSpellField(spell.id, {
                            castingTime: e.target.value,
                          })
                        }
                        placeholder="Cast time"
                        className={`${INLINE_INPUT_CLASS} text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                      />
                      <input
                        type="text"
                        value={spell.range}
                        onChange={(e) =>
                          updateSpellField(spell.id, { range: e.target.value })
                        }
                        placeholder="Range"
                        className={`${INLINE_INPUT_CLASS} text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                      />
                      <input
                        type="text"
                        value={spell.duration}
                        onChange={(e) =>
                          updateSpellField(spell.id, {
                            duration: e.target.value,
                          })
                        }
                        placeholder="Duration"
                        className={`${INLINE_INPUT_CLASS} text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                      />
                    </div>
                  )}

                  {/* Description */}
                  {readOnly ? (
                    spell.description && (
                      <p className="text-[11px] text-[#9eb0a7] pl-5 leading-relaxed whitespace-pre-wrap">
                        {spell.description}
                      </p>
                    )
                  ) : (
                    <textarea
                      rows={2}
                      value={spell.description}
                      onChange={(e) =>
                        updateSpellField(spell.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Spell effect & notes..."
                      className={`${INLINE_INPUT_CLASS} ml-5 text-[11px] text-[#9eb0a7] placeholder:text-[#4d5c55] leading-relaxed resize-y`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ====================================================================
          CENTER COLUMN (4 cols): Equipped Gear, Inventory, Miniature Supplies &
          Clockwork Parts, Currency & Session Costs
         ==================================================================== */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        {/* Equipped Gear & Inventory Card */}
        <section
          id="section-gear"
          className="surface-clinical rounded p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Equipped Gear &amp; Inventory</span>
            </h2>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onOpenSrdPicker('gear')}
                className="text-xs text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Gear</span>
              </button>
            )}
          </div>

          {/* Equipped Gear Subsection */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#4af626]">
                Equipped Gear ({equippedGear.length})
              </span>
            </div>
            {equippedGear.length === 0 ? (
              <p className="text-xs text-[#65766e] py-1.5">
                No equipped items recorded yet.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto pr-1">
                {equippedGear.map(renderGearRow)}
              </div>
            )}
          </div>

          <div className="border-t border-[#2e243b]" />

          {/* Inventory Subsection */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                Inventory ({stowedInventory.length})
              </span>
            </div>
            {stowedInventory.length === 0 ? (
              <p className="text-xs text-[#65766e] py-1.5">
                Pack inventory is empty. Add 5e SRD equipment or custom{' '}
                <em>The Quiet Age</em> gear.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto pr-1">
                {stowedInventory.map(renderGearRow)}
              </div>
            )}
          </div>
        </section>

        {/* Dedicated Miniature Medical Supplies Tracker (Clockwork Parts hidden unless enabled in F5) */}
        {(() => {
          const clockworkEnabled = !readOnly && state.covert.clockworkVesselActive;
          const visibleSupplies = state.gearAndNotes.miniatureSupplies.filter(
            (sup) => clockworkEnabled || sup.category !== 'clockwork'
          );
          return (
            <section
              id="section-supplies"
              className="surface-resonant rounded p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#581c87]/70 pb-2">
                <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#d4e0da] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
                  <span>
                    {clockworkEnabled
                      ? 'Miniature Medical Supplies & Clockwork Parts'
                      : 'Miniature Medical Supplies'}
                  </span>
                </h2>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowSupplyForm((prev) => !prev)}
                    className="text-xs text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {showSupplyForm && !readOnly && (
                <form
                  onSubmit={handleAddSupply}
                  className="bg-[#080c0a] border border-[#581c87] rounded p-3 flex flex-col gap-2"
                >
                  <input
                    type="text"
                    required
                    value={newSupply.name}
                    onChange={(e) =>
                      setNewSupply((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder={
                      clockworkEnabled
                        ? 'Supply or Clockwork Part Name'
                        : 'Miniature Medical Supply Name'
                    }
                    className="ledger-input px-2 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-12 gap-2">
                    <select
                      value={
                        !clockworkEnabled && newSupply.category === 'clockwork'
                          ? 'medical'
                          : newSupply.category
                      }
                      onChange={(e) =>
                        setNewSupply((p) => ({
                          ...p,
                          category: e.target.value as 'medical' | 'clockwork' | 'other',
                        }))
                      }
                      className="ledger-input px-2 py-1.5 text-xs col-span-6"
                    >
                      <option value="medical">Medical</option>
                      {clockworkEnabled && <option value="clockwork">Clockwork</option>}
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={newSupply.quantity}
                      onChange={(e) =>
                        setNewSupply((p) => ({
                          ...p,
                          quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="ledger-input px-2 py-1.5 text-xs font-mono col-span-3"
                    />
                    <input
                      type="text"
                      value={newSupply.unit}
                      onChange={(e) =>
                        setNewSupply((p) => ({ ...p, unit: e.target.value }))
                      }
                      placeholder="Unit"
                      className="ledger-input px-2 py-1.5 text-xs col-span-3"
                    />
                  </div>
                  <input
                    type="text"
                    value={newSupply.notes}
                    onChange={(e) =>
                      setNewSupply((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Craft or usage notes (optional)"
                    className="ledger-input px-2 py-1.5 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSupplyForm(false)}
                      className="px-2 py-1 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold rounded bg-[#a855f7] text-[#080c0a] hover:bg-[#c084fc] cursor-pointer"
                    >
                      Add Counter
                    </button>
                  </div>
                </form>
              )}

              {visibleSupplies.length === 0 ? (
                <p className="text-xs text-[#9eb0a7] py-2">
                  {clockworkEnabled
                    ? 'No miniature medical supplies or clockwork parts tracked.'
                    : 'No miniature medical supplies tracked.'}
                </p>
              ) : (
                <div className="divide-y divide-[#2e243b]">
                  {visibleSupplies.map((sup) => (
                    <div key={sup.id} className="py-2 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {readOnly ? (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[#c084fc] shrink-0">
                              {sup.category === 'clockwork' ? (
                                <span className="inline-flex items-center gap-1">
                                  <Cog className="w-3 h-3" /> CLK
                                </span>
                              ) : sup.category === 'medical' ? (
                                'MED'
                              ) : (
                                'OTH'
                              )}
                            </span>
                          ) : (
                            <select
                              value={sup.category}
                              onChange={(e) =>
                                updateSupplyField(sup.id, {
                                  category: e.target.value as
                                    | 'medical'
                                    | 'clockwork'
                                    | 'other',
                                })
                              }
                              aria-label={`${sup.name} category`}
                              className="bg-[#080c0a] border border-[#2e243b] rounded px-1 py-0.5 font-mono text-[10px] text-[#c084fc] shrink-0"
                            >
                              <option value="medical">MED</option>
                              {clockworkEnabled && <option value="clockwork">CLK</option>}
                              <option value="other">OTH</option>
                            </select>
                          )}

                          {readOnly ? (
                            <span className="text-[#d4e0da] font-medium truncate">
                              {sup.name}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={sup.name}
                              onChange={(e) =>
                                updateSupplyField(sup.id, { name: e.target.value })
                              }
                              aria-label="Supply name"
                              className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 text-[#d4e0da] font-medium`}
                            />
                          )}
                        </div>

                    {/* Explicit -1 / qty / +1 Counter Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSupplyField(sup.id, {
                              quantity: Math.max(0, sup.quantity - 1),
                            })
                          }
                          className="px-1.5 h-6 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#ff4d4d] font-mono text-[10px] text-[#d4e0da] hover:text-[#ff4d4d] cursor-pointer"
                          aria-label={`Decrement ${sup.name} by 1`}
                        >
                          -1
                        </button>
                      )}
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums min-w-[2.1rem] text-center ${
                          sup.quantity > 0 ? 'text-[#d4e0da]' : 'text-[#65766e]'
                        }`}
                      >
                        {sup.quantity}
                      </span>
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateSupplyField(sup.id, {
                                quantity: sup.quantity + 1,
                              })
                            }
                            className="px-1.5 h-6 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#4af626] font-mono text-[10px] text-[#d4e0da] hover:text-[#4af626] cursor-pointer"
                            aria-label={`Increment ${sup.name} by 1`}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteWithUndo('supply', sup.name, sup, () => {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  gearAndNotes: {
                                    ...prev.gearAndNotes,
                                    miniatureSupplies:
                                      prev.gearAndNotes.miniatureSupplies.filter(
                                        (item) => item.id !== sup.id
                                      ),
                                  },
                                }));
                              })
                            }
                            className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                            aria-label={`Delete ${sup.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Unit & Notes */}
                  {(sup.unit || sup.notes || !readOnly) && (
                    <div className="flex items-center gap-1.5 pl-11 text-[11px]">
                      {readOnly ? (
                        <span className="text-[#9eb0a7] truncate">
                          {[sup.unit, sup.notes].filter(Boolean).join(' · ')}
                        </span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={sup.unit}
                            onChange={(e) =>
                              updateSupplyField(sup.id, { unit: e.target.value })
                            }
                            placeholder="Unit"
                            aria-label={`${sup.name} unit`}
                            className={`${INLINE_INPUT_CLASS} w-14 font-mono text-[10px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                          />
                          <input
                            type="text"
                            value={sup.notes}
                            onChange={(e) =>
                              updateSupplyField(sup.id, { notes: e.target.value })
                            }
                            placeholder="Craft / stock notes..."
                            aria-label={`${sup.name} notes`}
                            className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 text-[11px] text-[#9eb0a7] placeholder:text-[#4d5c55]`}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
          );
        })()}

        {/* Currency & Session Costs */}
        <section
          id="section-currency"
          className="surface-clinical rounded p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-[#2e243b] pb-2">
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Currency &amp; Session Costs</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'gp', label: 'GP' },
                { key: 'sp', label: 'SP' },
                { key: 'cp', label: 'CP' },
              ] as const
            ).map((coin) => (
              <div
                key={coin.key}
                className="bg-[#080c0a] border border-[#2e243b] rounded px-2.5 py-2 flex items-center justify-between"
              >
                <span className="font-mono text-xs text-[#9eb0a7]">
                  {coin.label}
                </span>
                {readOnly ? (
                  <span className="font-mono text-sm font-semibold text-[#d4e0da] tabular-nums">
                    {state.gearAndNotes.currency[coin.key]}
                  </span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={state.gearAndNotes.currency[coin.key]}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        gearAndNotes: {
                          ...prev.gearAndNotes,
                          currency: {
                            ...prev.gearAndNotes.currency,
                            [coin.key]: Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0
                            ),
                          },
                        },
                      }))
                    }
                    className="w-14 bg-transparent text-right font-mono text-sm font-semibold text-[#d4e0da] tabular-nums focus:outline-none focus:text-[#c084fc]"
                  />
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <form onSubmit={handleAddCost} className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <input
                  type="text"
                  value={costDesc}
                  onChange={(e) => setCostDesc(e.target.value)}
                  placeholder="Cost or reimbursement..."
                  className="ledger-input flex-1 min-w-[130px] px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  placeholder="-5 / +10"
                  className="ledger-input w-18 px-2 py-1 text-xs font-mono tabular-nums"
                />
                <select
                  value={costCurrency}
                  onChange={(e) =>
                    setCostCurrency(e.target.value as 'GP' | 'SP' | 'CP')
                  }
                  className="ledger-input px-1.5 py-1 text-xs font-mono"
                >
                  <option value="GP">GP</option>
                  <option value="SP">SP</option>
                  <option value="CP">CP</option>
                </select>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-medium rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] text-[#d4e0da] cursor-pointer"
                >
                  Log
                </button>
              </div>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#9eb0a7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCostToWallet}
                  onChange={(e) => setApplyCostToWallet(e.target.checked)}
                  className="accent-[#a855f7]"
                />
                <span>
                  Auto-update GP/SP/CP wallet (<span className="font-mono">+</span> adds,{' '}
                  <span className="font-mono">-</span> or plain deducts)
                </span>
              </label>
            </form>
          )}

          {state.gearAndNotes.sessionCosts.length === 0 ? (
            <p className="text-xs text-[#65766e] py-1">
              No session cost entries logged yet.
            </p>
          ) : (
            <div className="divide-y divide-[#1d1827] max-h-40 overflow-y-auto pr-1">
              {state.gearAndNotes.sessionCosts.map((c) => (
                <div
                  key={c.id}
                  className="py-1.5 flex items-center justify-between gap-1.5 text-xs"
                >
                  <div className="min-w-0 flex items-center gap-1.5 flex-1">
                    <span className="font-mono text-[10px] text-[#65766e] shrink-0">
                      {c.timestamp.slice(1, 17)}
                    </span>
                    {readOnly ? (
                      <span className="text-[#d4e0da] truncate">
                        {c.description}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={c.description}
                        onChange={(e) =>
                          updateCostField(c.id, { description: e.target.value })
                        }
                        aria-label="Session cost description"
                        className={`${INLINE_INPUT_CLASS} flex-1 min-w-0 text-[#d4e0da]`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {readOnly ? (
                      <span className="font-mono text-xs text-[#c084fc] tabular-nums">
                        {c.amount} {c.currency}
                      </span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={c.amount}
                          onChange={(e) =>
                            updateCostField(c.id, { amount: e.target.value })
                          }
                          aria-label="Session cost amount"
                          className={`${INLINE_INPUT_CLASS} w-12 text-right font-mono text-xs text-[#c084fc] tabular-nums`}
                        />
                        <select
                          value={c.currency}
                          onChange={(e) =>
                            updateCostField(c.id, {
                              currency: e.target.value as 'GP' | 'SP' | 'CP',
                            })
                          }
                          aria-label="Session cost currency"
                          className="bg-[#080c0a] border border-[#2e243b] rounded px-1 py-0.5 font-mono text-[10px] text-[#9eb0a7]"
                        >
                          <option value="GP">GP</option>
                          <option value="SP">SP</option>
                          <option value="CP">CP</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteWithUndo('cost', c.description || 'cost entry', c, () => {
                              onUpdateState((prev) => ({
                                ...prev,
                                gearAndNotes: {
                                  ...prev.gearAndNotes,
                                  sessionCosts: prev.gearAndNotes.sessionCosts.filter(
                                    (item) => item.id !== c.id
                                  ),
                                },
                              }));
                            })
                          }
                          className="text-[#65766e] hover:text-[#ff4d4d] cursor-pointer p-0.5"
                          aria-label={`Delete cost ${c.description}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ====================================================================
          RIGHT COLUMN (4 cols): Quick Session Scratchpad + Campaign & Case Log
         ==================================================================== */}
      <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-4">
        {/* Quick Session Scratchpad */}
        <section
          id="section-scratchpad"
          className={`rounded p-4 flex flex-col gap-2.5 transition-colors ${
            !readOnly && state.gearAndNotes.scratchpadPrivate
              ? 'surface-resonant'
              : 'surface-clinical'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Quick Session Scratchpad</span>
            </h2>
            {!readOnly && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={insertScratchpadTimestamp}
                  className="text-[11px] font-mono text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>+ TS</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      gearAndNotes: {
                        ...prev.gearAndNotes,
                        scratchpadPrivate: !prev.gearAndNotes.scratchpadPrivate,
                      },
                    }))
                  }
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                    state.gearAndNotes.scratchpadPrivate
                      ? 'bg-[#a855f7]/20 border-[#c084fc] text-[#c084fc]'
                      : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                  }`}
                  title={
                    state.gearAndNotes.scratchpadPrivate
                      ? 'Private — redacted in Party Share View'
                      : 'Shared — visible in Party Share View'
                  }
                >
                  {state.gearAndNotes.scratchpadPrivate ? (
                    <>
                      <Lock className="w-2.5 h-2.5" />
                      <span>PRIVATE</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-2.5 h-2.5" />
                      <span>SHARED</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {state.gearAndNotes.scratchpadPrivate && !canViewPrivate ? (
            <div className="bg-[#080c0a] border border-dashed border-[#2e243b] rounded p-5 flex flex-col items-center justify-center text-center gap-1.5 min-h-[112px]">
              <EyeOff className="w-4 h-4 text-[#65766e]" />
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7]">
                {readOnly
                  ? '[ Redacted · Party Safe Mode ]'
                  : '[ Masked · Covert Arc Locked ]'}
              </div>
              <p className="text-[11px] text-[#65766e]">
                {readOnly
                  ? 'Scratchpad is marked private.'
                  : 'Unlock Covert Arc (Ctrl+H) to view private scratchpad.'}
              </p>
            </div>
          ) : readOnly ? (
            <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3 text-xs text-[#d4e0da] min-h-[112px] whitespace-pre-wrap leading-relaxed">
              {state.gearAndNotes.scratchpad.trim() || (
                <span className="text-[#65766e] italic">Scratchpad is empty.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={scratchpadRef}
              rows={5}
              value={state.gearAndNotes.scratchpad}
              onChange={(e) =>
                onUpdateState((prev) => ({
                  ...prev,
                  gearAndNotes: {
                    ...prev.gearAndNotes,
                    scratchpad: e.target.value,
                  },
                }))
              }
              placeholder="Jot down live session notes, NPC names, leads, or reminders..."
              className="ledger-input w-full p-2.5 text-xs leading-relaxed resize-y"
            />
          )}
        </section>

        {/* Campaign & Case Log */}
        <section
          id="section-campaign-log"
          className="surface-clinical rounded p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#9eb0a7] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#a855f7]" />
              <span>Campaign &amp; Case Log</span>
            </h2>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowLogForm((prev) => !prev)}
                className="text-xs text-[#c084fc] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </button>
            )}
          </div>

          {/* Search & Dynamic Tag Filter */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#65766e] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search log entries or tags..."
                className="ledger-input w-full pl-8 pr-8 py-1.5 text-xs"
              />
              {logSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setLogSearch('')}
                  aria-label="Clear log search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#65766e] hover:text-[#d4e0da] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTag('ALL')}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border cursor-pointer ${
                    activeTag === 'ALL'
                      ? 'bg-[#a855f7] border-[#c084fc] text-[#080c0a] font-semibold'
                      : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7]'
                  }`}
                >
                  All ({visibleCampaignLogs.length})
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border cursor-pointer ${
                      activeTag === tag
                        ? 'bg-[#a855f7] border-[#c084fc] text-[#080c0a] font-semibold'
                        : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7]'
                    }`}
                  >
                    #{tag} ({tagCounts[tag] ?? 0})
                  </button>
                ))}
              </div>
            )}

            {(logSearch.trim() || activeTag !== 'ALL') && (
              <div className="flex items-center justify-between text-[11px] text-[#9eb0a7] px-0.5">
                <span>
                  Showing {filteredLogs.length} of {visibleCampaignLogs.length} entries
                  {activeTag !== 'ALL' && (
                    <span className="font-mono text-[#c084fc] ml-1">#{activeTag}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLogSearch('');
                    setActiveTag('ALL');
                  }}
                  className="text-[#c084fc] hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* New Log Entry Form */}
          {showLogForm && !readOnly && (
            <form
              onSubmit={handleAddLog}
              className="bg-[#080c0a] border border-[#581c87] rounded p-3 flex flex-col gap-2"
            >
              <input
                type="text"
                value={newLogTitle}
                onChange={(e) => setNewLogTitle(e.target.value)}
                placeholder="Entry Title"
                className="ledger-input px-2 py-1.5 text-xs"
              />
              <textarea
                rows={3}
                value={newLogBody}
                onChange={(e) => setNewLogBody(e.target.value)}
                placeholder="Write session or case record..."
                className="ledger-input px-2 py-1.5 text-xs leading-relaxed resize-y"
              />
              <input
                type="text"
                value={newLogTags}
                onChange={(e) => setNewLogTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="ledger-input px-2 py-1.5 text-xs font-mono"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#c084fc] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLogPrivate}
                    onChange={(e) => setNewLogPrivate(e.target.checked)}
                    className="accent-[#a855f7]"
                  />
                  <span>Mark [PRIVATE]</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="px-2 py-1 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-semibold rounded bg-[#a855f7] text-[#080c0a] hover:bg-[#c084fc] cursor-pointer"
                  >
                    Record Entry
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Log Entries List (Inline Editable in Player/DM View) */}
          {filteredLogs.length === 0 ? (
            <p className="text-xs text-[#65766e] py-2">
              {visibleCampaignLogs.length === 0
                ? 'No campaign or case log entries recorded yet.'
                : 'No entries match your current search or tag filter.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredLogs.map((entry) => (
                <article
                  key={entry.id}
                  className={`rounded p-2.5 flex flex-col gap-1.5 border ${
                    entry.isPrivate
                      ? 'bg-[#171022] border-[#581c87]'
                      : 'bg-[#080c0a] border-[#2e243b]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-[10px] text-[#65766e]">
                      {entry.timestamp}
                    </span>

                    {!readOnly && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateLogField(entry.id, {
                              body: entry.body
                                ? `${entry.body}\n${formatTimestamp()} `
                                : `${formatTimestamp()} `,
                            })
                          }
                          className="p-1 text-[#9eb0a7] hover:text-[#c084fc] cursor-pointer"
                          title="Append timestamp to entry"
                        >
                          <Clock className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateLogField(entry.id, {
                              isPrivate: !entry.isPrivate,
                            })
                          }
                          className={`px-1.5 py-0.5 text-[9px] font-mono rounded border flex items-center gap-1 cursor-pointer ${
                            entry.isPrivate
                              ? 'bg-[#a855f7]/20 border-[#c084fc] text-[#c084fc]'
                              : 'bg-[#0b100e] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                          }`}
                          title={
                            entry.isPrivate
                              ? 'Private — hidden in Party Share View'
                              : 'Shared — visible in Party Share View'
                          }
                        >
                          {entry.isPrivate ? (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>PRIV</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>PUB</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteWithUndo('log', entry.title || 'log entry', entry, () => {
                              onUpdateState((prev) => ({
                                ...prev,
                                gearAndNotes: {
                                  ...prev.gearAndNotes,
                                  campaignLog: prev.gearAndNotes.campaignLog.filter(
                                    (item) => item.id !== entry.id
                                  ),
                                },
                              }));
                            })
                          }
                          className="p-1 text-[#65766e] hover:text-[#ff4d4d] cursor-pointer"
                          aria-label={`Delete ${entry.title}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {readOnly ? (
                    <h3 className="text-xs font-semibold text-[#d4e0da]">
                      {entry.title}
                    </h3>
                  ) : (
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) =>
                        updateLogField(entry.id, { title: e.target.value })
                      }
                      aria-label="Log entry title"
                      className={`${INLINE_INPUT_CLASS} text-xs font-semibold text-[#d4e0da]`}
                    />
                  )}

                  {readOnly ? (
                    entry.body && (
                      <p className="text-xs text-[#9eb0a7] whitespace-pre-wrap leading-relaxed">
                        {entry.body}
                      </p>
                    )
                  ) : (
                    <textarea
                      rows={2}
                      value={entry.body}
                      onChange={(e) =>
                        updateLogField(entry.id, { body: e.target.value })
                      }
                      placeholder="Write entry details..."
                      className={`${INLINE_INPUT_CLASS} text-xs text-[#9eb0a7] placeholder:text-[#4d5c55] leading-relaxed resize-y`}
                    />
                  )}

                  {readOnly ? (
                    entry.tags.length > 0 && (
                      <div className="text-[10px] font-mono text-[#c084fc]">
                        {entry.tags.map((t) => `#${t}`).join(' · ')}
                      </div>
                    )
                  ) : (
                    <input
                      type="text"
                      value={entry.tags.join(', ')}
                      onChange={(e) =>
                        updateLogField(entry.id, {
                          tags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Tags (comma-separated)..."
                      aria-label={`${entry.title} tags`}
                      className={`${INLINE_INPUT_CLASS} font-mono text-[10px] text-[#c084fc] placeholder:text-[#4d5c55]`}
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Accidental Deletion Revert / Undo Floating Toast */}
      {deletedSnapshot && !readOnly && (
        <aside
          aria-label="Undo deletion notice"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#171022] border border-[#c084fc] text-[#d4e0da] px-3.5 py-2 rounded-lg shadow-2xl flex items-center gap-3 text-xs"
        >
          <span>
            Deleted <strong className="text-[#c084fc]">{deletedSnapshot.name}</strong>
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="px-2.5 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] font-bold cursor-pointer transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setDeletedSnapshot(null)}
            className="text-[#9eb0a7] hover:text-[#d4e0da] p-0.5 cursor-pointer"
            aria-label="Dismiss undo notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </div>
  );
};
