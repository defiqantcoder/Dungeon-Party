import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  fetchSrdConditionDetail,
  fetchSrdConditionsList,
  fetchSrdEquipmentDetail,
  fetchSrdEquipmentList,
  fetchSrdSpellDetail,
  fetchSrdSpellList,
  hasSrdCacheKey,
  SRD_SPELL_CLASSES,
  SrdConditionDetail,
  SrdEquipmentDetail,
  SrdListItem,
  SrdSpellDetail,
} from '../services/srdApi';
import {
  CustomCondition,
  GearItem,
  SpellEntry,
  SupplyCounter,
} from '../types/ledger';
import { createId } from '../utils/ledgerMath';

export type SrdPickerKind = 'spell' | 'gear' | 'condition';

interface SrdPickerModalProps {
  kind: SrdPickerKind;
  clockworkEnabled?: boolean;
  onClose: () => void;
  onAddSpell: (spell: SpellEntry) => void;
  onAddGear: (item: GearItem) => void;
  onAddSupply?: (supply: SupplyCounter) => void;
  onAddCondition: (cond: CustomCondition) => void;
}

export const SrdPickerModal: React.FC<SrdPickerModalProps> = ({
  kind,
  clockworkEnabled = false,
  onClose,
  onAddSpell,
  onAddGear,
  onAddSupply,
  onAddCondition,
}) => {
  const [tab, setTab] = useState<'srd' | 'custom'>('srd');
  // Spells wait for explicit class filter selection before making any API call
  const [spellClass, setSpellClass] = useState('');
  const [spellLevelFilter, setSpellLevelFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const [items, setItems] = useState<SrdListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [servedFromCache, setServedFromCache] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [spellDetail, setSpellDetail] = useState<SrdSpellDetail | null>(null);
  const [gearDetail, setGearDetail] = useState<SrdEquipmentDetail | null>(null);
  const [condDetail, setCondDetail] = useState<SrdConditionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Custom entry fields
  const [customSpell, setCustomSpell] = useState({
    name: '',
    level: 0,
    school: '',
    castingTime: '1 action',
    range: '',
    duration: '',
    concentration: false,
    description: '',
  });

  const [customGear, setCustomGear] = useState({
    name: '',
    category: 'The Quiet Age / Custom',
    quantity: 1,
    weight: '',
    unit: '',
    equipped: false,
    addAsSupplyCounter: false,
    supplyBucket: 'medical' as 'medical' | 'clockwork' | 'other',
    notes: '',
  });

  const [customCond, setCustomCond] = useState({
    name: '',
    description: '',
  });

  // Trigger on-demand fetch ONLY when a spell class filter is chosen, or when gear/condition lookup opens
  const loadList = async (overrideSpellClass?: string) => {
    const activeSpellClass = overrideSpellClass ?? spellClass;
    if (kind === 'spell' && !activeSpellClass) {
      setItems([]);
      setListError(null);
      setServedFromCache(false);
      return;
    }

    const cacheKey =
      kind === 'spell'
        ? `spells:list:${activeSpellClass.toLowerCase()}`
        : kind === 'gear'
        ? 'equipment:list'
        : 'conditions:list';
    const wasCached = hasSrdCacheKey(cacheKey);

    setLoadingList(true);
    setListError(null);
    setSelectedIndex(null);
    setSpellDetail(null);
    setGearDetail(null);
    setCondDetail(null);

    try {
      if (kind === 'spell') {
        const list = await fetchSrdSpellList(activeSpellClass);
        setItems(list);
      } else if (kind === 'gear') {
        const list = await fetchSrdEquipmentList();
        setItems(list);
      } else {
        const list = await fetchSrdConditionsList();
        setItems(list);
      }
      setServedFromCache(wasCached);
    } catch (err) {
      setListError(
        err instanceof Error
          ? err.message
          : 'Could not reach 5e SRD API. Use Custom Entry below.'
      );
      setItems([]);
      setServedFromCache(false);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (tab === 'srd') {
      if (kind !== 'spell' || spellClass) {
        loadList();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kind, spellClass]);

  const handleSelectItem = async (item: SrdListItem) => {
    setSelectedIndex(item.index);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      if (kind === 'spell') {
        const detail = await fetchSrdSpellDetail(item.index);
        setSpellDetail(detail);
      } else if (kind === 'gear') {
        const detail = await fetchSrdEquipmentDetail(item.index);
        setGearDetail(detail);
      } else {
        const detail = await fetchSrdConditionDetail(item.index);
        setCondDetail(detail);
      }
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Unable to fetch entry details.'
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (
        kind === 'spell' &&
        spellLevelFilter !== 'all' &&
        typeof item.level === 'number' &&
        String(item.level) !== spellLevelFilter
      ) {
        return false;
      }
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [items, query, kind, spellLevelFilter]);

  const handleConfirmSrdAdd = () => {
    if (kind === 'spell' && spellDetail) {
      onAddSpell({
        id: createId('spell'),
        name: spellDetail.name,
        level: spellDetail.level,
        school: spellDetail.school,
        castingTime: spellDetail.castingTime,
        range: spellDetail.range,
        duration: spellDetail.duration,
        prepared: true,
        concentration: spellDetail.concentration,
        description: spellDetail.description,
        source: 'srd',
      });
      onClose();
    } else if (kind === 'gear' && gearDetail) {
      onAddGear({
        id: createId('gear'),
        name: gearDetail.name,
        category: gearDetail.category,
        quantity: 1,
        weight: gearDetail.weight,
        equipped: false,
        notes: gearDetail.description,
        source: 'srd',
      });
      onClose();
    } else if (kind === 'condition' && condDetail) {
      onAddCondition({
        id: createId('cond'),
        name: condDetail.name,
        description: condDetail.description,
      });
      onClose();
    }
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === 'spell') {
      if (!customSpell.name.trim()) return;
      onAddSpell({
        id: createId('spell'),
        name: customSpell.name.trim(),
        level: customSpell.level,
        school: customSpell.school.trim(),
        castingTime: customSpell.castingTime.trim(),
        range: customSpell.range.trim(),
        duration: customSpell.duration.trim(),
        prepared: true,
        concentration: customSpell.concentration,
        description: customSpell.description.trim(),
        source: 'custom',
      });
      onClose();
    } else if (kind === 'gear') {
      if (!customGear.name.trim()) return;
      if (customGear.addAsSupplyCounter && onAddSupply) {
        onAddSupply({
          id: createId('sup'),
          name: customGear.name.trim(),
          category: customGear.supplyBucket,
          quantity: Math.max(0, customGear.quantity),
          unit: customGear.unit.trim(),
          notes: customGear.notes.trim(),
        });
      } else {
        onAddGear({
          id: createId('gear'),
          name: customGear.name.trim(),
          category: customGear.category.trim() || 'Custom',
          quantity: Math.max(1, customGear.quantity),
          weight: customGear.weight.trim(),
          equipped: customGear.equipped,
          notes: customGear.notes.trim(),
          source: 'custom',
        });
      }
      onClose();
    } else {
      if (!customCond.name.trim()) return;
      onAddCondition({
        id: createId('cond'),
        name: customCond.name.trim(),
        description: customCond.description.trim(),
      });
      onClose();
    }
  };

  const titleLabel =
    kind === 'spell'
      ? 'Add Spell — 2014 5e SRD / Custom'
      : kind === 'gear'
      ? 'Add Gear — 2014 5e SRD / Custom'
      : 'Add Condition — 2014 5e SRD / Custom';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel}
    >
      <div className="surface-modal rounded w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#2e243b] flex items-center justify-between gap-3">
          <h2 className="font-display text-sm sm:text-base uppercase tracking-[0.06em] text-[#d4e0da]">
            {titleLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            aria-label="Close picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-[#2e243b]">
          <button
            type="button"
            onClick={() => setTab('srd')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              tab === 'srd'
                ? 'border-[#c084fc] text-[#c084fc]'
                : 'border-transparent text-[#9eb0a7] hover:text-[#d4e0da]'
            }`}
          >
            2014 5e SRD Lookup (On-Demand)
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              tab === 'custom'
                ? 'border-[#c084fc] text-[#c084fc]'
                : 'border-transparent text-[#9eb0a7] hover:text-[#d4e0da]'
            }`}
          >
            Custom / 2014 PHB &amp; Quiet Age
          </button>
        </div>

        {/* Body */}
        {tab === 'srd' ? (
          <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {kind === 'spell' && (
                <>
                  <select
                    value={spellClass}
                    onChange={(e) => setSpellClass(e.target.value)}
                    aria-label="Filter spells by class"
                    className="ledger-input h-8 px-2 text-xs"
                  >
                    <option value="">Choose Class Filter…</option>
                    {SRD_SPELL_CLASSES.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={spellLevelFilter}
                    onChange={(e) => setSpellLevelFilter(e.target.value)}
                    aria-label="Filter spells by level"
                    disabled={!spellClass}
                    className="ledger-input h-8 px-2 text-xs font-mono disabled:opacity-50"
                  >
                    <option value="all">All Levels</option>
                    <option value="0">Cantrip (0)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={String(lvl)}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[#65766e] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={kind === 'spell' && !spellClass}
                  placeholder={
                    kind === 'spell' && !spellClass
                      ? 'Select a class filter first...'
                      : `Search 2014 5e SRD ${kind}s...`
                  }
                  className="ledger-input h-8 w-full pl-8 pr-2 text-xs disabled:opacity-50"
                />
              </div>

              {servedFromCache && items.length > 0 && (
                <span
                  className="h-8 px-2 text-[10px] font-mono text-[#4af626] bg-[#4af626]/10 border border-[#4af626]/30 rounded flex items-center gap-1 whitespace-nowrap"
                  title="Loaded instantly from localStorage 2014 SRD cache"
                >
                  <Database className="w-3 h-3" />
                  <span>Cached</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setTab('custom')}
                className="h-8 px-2.5 text-xs border border-[#581c87] text-[#c084fc] hover:bg-[#171022] rounded cursor-pointer whitespace-nowrap"
              >
                + Custom Entry
              </button>
            </div>

            {/* Split List + Detail Preview */}
            <div className="flex-1 min-h-[280px] grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
              {/* List Column */}
              <div className="md:col-span-5 bg-[#080c0a] border border-[#2e243b] rounded overflow-y-auto p-1.5">
                {kind === 'spell' && !spellClass ? (
                  <div className="p-3 flex flex-col gap-2.5">
                    <p className="text-xs text-[#9eb0a7] leading-relaxed">
                      On-demand 2014 5e SRD lookup stays idle until you choose a class
                      filter (or use Custom Entry for non-SRD 2014 PHB spells &amp; Quiet
                      Age rites).
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SRD_SPELL_CLASSES.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setSpellClass(cls.id)}
                          className="px-2.5 py-1.5 text-xs font-mono text-left rounded bg-[#0b100e] border border-[#2e243b] hover:border-[#c084fc] hover:text-[#c084fc] text-[#d4e0da] transition-colors cursor-pointer"
                        >
                          {cls.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : loadingList ? (
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#9eb0a7]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c084fc]" />
                      <span>Querying 5e SRD…</span>
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-7 rounded bg-[#0b100e] border border-[#2e243b]/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : listError ? (
                  <div className="p-4 flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#ff4d4d]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{listError}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadList()}
                        className="px-2.5 py-1 rounded border border-[#581c87] text-[#d4e0da] hover:border-[#c084fc] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('custom')}
                        className="px-2.5 py-1 rounded bg-[#a855f7] text-[#080c0a] font-semibold cursor-pointer"
                      >
                        Use Custom Entry
                      </button>
                    </div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-4 text-xs text-[#9eb0a7]">
                    No matching 5e SRD entries. Try another filter or switch to Custom
                    Entry.
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {filteredItems.map((item) => {
                      const active = selectedIndex === item.index;
                      return (
                        <button
                          key={item.index}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#171022] border border-[#a855f7] text-[#c084fc]'
                              : 'border border-transparent text-[#d4e0da] hover:bg-[#0b100e]'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          {typeof item.level === 'number' && (
                            <span className="font-mono text-[10px] text-[#9eb0a7] shrink-0">
                              {item.level === 0 ? 'C' : `L${item.level}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detail Preview Column */}
              <div className="md:col-span-7 bg-[#0b100e] border border-[#2e243b] rounded p-3.5 overflow-y-auto flex flex-col justify-between gap-3">
                {!selectedIndex ? (
                  <div className="text-xs text-[#9eb0a7] my-auto text-center px-4">
                    Select an entry from the 5e SRD list to inspect details before
                    adding it to your ledger.
                  </div>
                ) : loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#9eb0a7] my-auto">
                    <Loader2 className="w-4 h-4 animate-spin text-[#c084fc]" />
                    <span>Loading SRD record…</span>
                  </div>
                ) : detailError ? (
                  <div className="text-xs text-[#ff4d4d] my-auto">{detailError}</div>
                ) : kind === 'spell' && spellDetail ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="border-b border-[#2e243b] pb-2">
                        <h3 className="font-display text-base text-[#d4e0da]">
                          {spellDetail.name}
                        </h3>
                        <p className="font-mono text-[11px] text-[#c084fc]">
                          {spellDetail.level === 0
                            ? 'Cantrip'
                            : `Level ${spellDetail.level}`}
                          {spellDetail.school ? ` · ${spellDetail.school}` : ''}
                          {spellDetail.concentration ? ' · Concentration' : ''}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-[#9eb0a7]">
                        Cast: {spellDetail.castingTime} · Range: {spellDetail.range} ·
                        Duration: {spellDetail.duration}
                      </div>
                      <p className="text-xs text-[#d4e0da] whitespace-pre-wrap leading-relaxed">
                        {spellDetail.description}
                      </p>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[#2e243b]">
                      <button
                        type="button"
                        onClick={handleConfirmSrdAdd}
                        className="px-3.5 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Add to Spellbook</span>
                      </button>
                    </div>
                  </>
                ) : kind === 'gear' && gearDetail ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="border-b border-[#2e243b] pb-2">
                        <h3 className="font-display text-base text-[#d4e0da]">
                          {gearDetail.name}
                        </h3>
                        <p className="font-mono text-[11px] text-[#c084fc]">
                          {gearDetail.category}
                          {gearDetail.weight ? ` · ${gearDetail.weight}` : ''}
                          {gearDetail.cost ? ` · ${gearDetail.cost}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-[#d4e0da] leading-relaxed">
                        {gearDetail.description || 'Standard 5e SRD equipment item.'}
                      </p>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[#2e243b]">
                      <button
                        type="button"
                        onClick={handleConfirmSrdAdd}
                        className="px-3.5 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Add to Inventory</span>
                      </button>
                    </div>
                  </>
                ) : kind === 'condition' && condDetail ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-base text-[#d4e0da] border-b border-[#2e243b] pb-2">
                        {condDetail.name}
                      </h3>
                      <p className="text-xs text-[#d4e0da] whitespace-pre-wrap leading-relaxed">
                        {condDetail.description}
                      </p>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[#2e243b]">
                      <button
                        type="button"
                        onClick={handleConfirmSrdAdd}
                        className="px-3.5 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Condition</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* Custom / Freeform Entry Form */
          <form
            onSubmit={handleSubmitCustom}
            className="p-4 flex flex-col gap-3 overflow-y-auto"
          >
            {kind === 'spell' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Spell / Ability Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customSpell.name}
                      onChange={(e) =>
                        setCustomSpell((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Custom spell or memory rite"
                      className="ledger-input w-full px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Level (0 = Cantrip)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={customSpell.level}
                      onChange={(e) =>
                        setCustomSpell((p) => ({
                          ...p,
                          level: Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0)),
                        }))
                      }
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    value={customSpell.school}
                    onChange={(e) =>
                      setCustomSpell((p) => ({ ...p, school: e.target.value }))
                    }
                    placeholder="School"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={customSpell.castingTime}
                    onChange={(e) =>
                      setCustomSpell((p) => ({ ...p, castingTime: e.target.value }))
                    }
                    placeholder="Casting Time"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={customSpell.range}
                    onChange={(e) =>
                      setCustomSpell((p) => ({ ...p, range: e.target.value }))
                    }
                    placeholder="Range"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={customSpell.duration}
                    onChange={(e) =>
                      setCustomSpell((p) => ({ ...p, duration: e.target.value }))
                    }
                    placeholder="Duration"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#d4e0da] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customSpell.concentration}
                    onChange={(e) =>
                      setCustomSpell((p) => ({
                        ...p,
                        concentration: e.target.checked,
                      }))
                    }
                    className="accent-[#a855f7]"
                  />
                  <span>Requires Concentration</span>
                </label>

                <textarea
                  rows={4}
                  value={customSpell.description}
                  onChange={(e) =>
                    setCustomSpell((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Effect description and notes..."
                  className="ledger-input w-full p-2.5 text-xs leading-relaxed resize-y"
                />
              </>
            )}

            {kind === 'gear' && (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mr-1">
                    Quick Preset:
                  </span>
                  {(
                    [
                      {
                        label: '2014 PHB / Non-SRD',
                        category: '2014 PHB / Non-SRD',
                        asSupply: false,
                        bucket: 'other' as const,
                      },
                      {
                        label: 'Miniature Medical Supply',
                        category: 'Miniature Medical Supplies',
                        asSupply: true,
                        bucket: 'medical' as const,
                      },
                      ...(clockworkEnabled
                        ? [
                            {
                              label: 'Clockwork Part',
                              category: 'Clockwork Parts',
                              asSupply: true,
                              bucket: 'clockwork' as const,
                            },
                          ]
                        : []),
                      {
                        label: 'The Quiet Age Item',
                        category: 'The Quiet Age',
                        asSupply: false,
                        bucket: 'other' as const,
                      },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setCustomGear((p) => ({
                          ...p,
                          category: preset.category,
                          addAsSupplyCounter: Boolean(onAddSupply && preset.asSupply),
                          supplyBucket: preset.bucket,
                        }))
                      }
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                        customGear.category === preset.category
                          ? 'bg-[#171022] border-[#c084fc] text-[#c084fc]'
                          : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customGear.name}
                      onChange={(e) =>
                        setCustomGear((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder={
                        clockworkEnabled
                          ? 'e.g. Pocket Chronometer, Micro-Splint Kit, Balance Wheel'
                          : 'e.g. Pocket Chronometer, Micro-Splint Kit, Salve Ampoule'
                      }
                      className="ledger-input w-full px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={customGear.addAsSupplyCounter ? 0 : 1}
                      value={customGear.quantity}
                      onChange={(e) =>
                        setCustomGear((p) => ({
                          ...p,
                          quantity: Math.max(
                            p.addAsSupplyCounter ? 0 : 1,
                            parseInt(e.target.value, 10) || 0
                          ),
                        }))
                      }
                      className="ledger-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={customGear.category}
                    onChange={(e) =>
                      setCustomGear((p) => ({ ...p, category: e.target.value }))
                    }
                    placeholder="Category"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                  {customGear.addAsSupplyCounter ? (
                    <input
                      type="text"
                      value={customGear.unit}
                      onChange={(e) =>
                        setCustomGear((p) => ({ ...p, unit: e.target.value }))
                      }
                      placeholder={
                        clockworkEnabled
                          ? 'Unit (e.g. vials, gears, wraps)'
                          : 'Unit (e.g. vials, wraps, doses)'
                      }
                      className="ledger-input px-2.5 py-1.5 text-xs"
                    />
                  ) : (
                    <input
                      type="text"
                      value={customGear.weight}
                      onChange={(e) =>
                        setCustomGear((p) => ({ ...p, weight: e.target.value }))
                      }
                      placeholder="Weight (optional)"
                      className="ledger-input px-2.5 py-1.5 text-xs"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {onAddSupply && (
                    <label className="inline-flex items-center gap-2 text-xs text-[#c084fc] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customGear.addAsSupplyCounter}
                        onChange={(e) =>
                          setCustomGear((p) => ({
                            ...p,
                            addAsSupplyCounter: e.target.checked,
                          }))
                        }
                        className="accent-[#a855f7]"
                      />
                      <span>
                        {clockworkEnabled
                          ? 'Add to Miniature Medical Supplies & Clockwork Tracker'
                          : 'Add to Miniature Medical Supplies Tracker'}
                      </span>
                    </label>
                  )}

                  {!customGear.addAsSupplyCounter && (
                    <label className="inline-flex items-center gap-2 text-xs text-[#d4e0da] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customGear.equipped}
                        onChange={(e) =>
                          setCustomGear((p) => ({ ...p, equipped: e.target.checked }))
                        }
                        className="accent-[#a855f7]"
                      />
                      <span>Mark as Equipped</span>
                    </label>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={customGear.notes}
                  onChange={(e) =>
                    setCustomGear((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder={
                    clockworkEnabled
                      ? 'Properties, 2014 PHB details, clockwork tolerances, or Quiet Age notes...'
                      : 'Properties, 2014 PHB details, or Quiet Age notes...'
                  }
                  className="ledger-input w-full p-2.5 text-xs leading-relaxed resize-y"
                />
              </>
            )}

            {kind === 'condition' && (
              <>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                    Condition Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customCond.name}
                    onChange={(e) =>
                      setCustomCond((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Shaken, Trauma Strain, Prone"
                    className="ledger-input w-full px-2.5 py-1.5 text-xs"
                  />
                </div>
                <textarea
                  rows={3}
                  value={customCond.description}
                  onChange={(e) =>
                    setCustomCond((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Effect notes (optional)..."
                  className="ledger-input w-full p-2.5 text-xs leading-relaxed resize-y"
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2e243b]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Entry</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
