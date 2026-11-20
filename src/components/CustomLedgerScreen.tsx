import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Clock,
  EyeOff,
  FileText,
  Lock,
  RotateCcw,
  Search,
  Unlock,
  X,
} from 'lucide-react';
import { LedgerState } from '../types/ledger';
import { formatTimestamp } from '../utils/ledgerMath';

interface CustomLedgerScreenProps {
  state: LedgerState;
  readOnly: boolean; // True in Party Share View
  covertUnlocked: boolean; // True ONLY when Covert Arc Lock is unlocked in Player/DM View
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onOpenDrawer: () => void;
}

type PresetId =
  | 'observation-log'
  | 'clockwork-diagnostic'
  | 'medical-inventory'
  | 'person-of-interest';

interface LedgerTemplatePreset {
  id: PresetId;
  label: string;
  hint: string;
  title: string;
  accentClass: string;
  buildContent: () => string;
}

const PresetSymbolSvg: React.FC<{ id: PresetId; className?: string }> = ({
  id,
  className = 'w-3.5 h-3.5',
}) => {
  switch (id) {
    case 'observation-log':
      // Observation: Clinical Ocular Lens
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      );
    case 'clockwork-diagnostic':
      // Diagnostic: Precision Escapement Gear
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M12.42 3.58l-1.06 1.06M4.64 11.36l-1.06 1.06" />
          <circle cx="8" cy="8" r="4.6" strokeDasharray="2 1.8" />
        </svg>
      );
    case 'medical-inventory':
      // Inventory: Clinical Satchel / Cross Case
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="2" y="4.5" width="12" height="9" rx="1.5" />
          <path d="M5.75 4.5V3.25A1.25 1.25 0 0 1 7 2h2a1.25 1.25 0 0 1 1.25 1.25V4.5" />
          <path d="M8 7v4M6 9h4" />
        </svg>
      );
    case 'person-of-interest':
      // Person of Interest: Subject Dossier Reticle
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="8" cy="5.5" r="2.3" />
          <path d="M3.25 13.5c.7-2.2 2.45-3.4 4.75-3.4s4.05 1.2 4.75 3.4" />
          <path d="M2 3.75V2h1.75M14 3.75V2h-1.75" />
        </svg>
      );
  }
};

const TEMPLATE_PRESETS: LedgerTemplatePreset[] = [
  {
    id: 'observation-log',
    label: 'Observation Log',
    hint: 'Timestamped field notes',
    title: 'Observation Log',
    accentClass: 'text-[#c084fc]',
    buildContent: () =>
      `${formatTimestamp()} Location: \nSubject / Event: \nSensory Details: \nClinical Assessment: \nFollow-Up: `,
  },
  {
    id: 'clockwork-diagnostic',
    label: 'Clockwork Diagnostic',
    hint: 'Mechanism & fault log',
    title: 'Clockwork Diagnostic',
    accentClass: 'text-[#a855f7]',
    buildContent: () =>
      `Assembly / Mechanism: \nCalibrated Spec: \nObserved Drift / Fault: \nParts Required:\n- \nBench Notes: `,
  },
  {
    id: 'medical-inventory',
    label: 'Medical Inventory',
    hint: 'Stock & restock checklist',
    title: 'Medical Inventory',
    accentClass: 'text-[#4af626]',
    buildContent: () =>
      `[ STOCK CHECK ${formatTimestamp()} ]\n- Bandages / Dressings: \n- Salves & Tinctures: \n- Field Instruments: \n- Restock Priority: `,
  },
  {
    id: 'person-of-interest',
    label: 'Person of Interest',
    hint: 'Subject dossier card',
    title: 'Person of Interest',
    accentClass: 'text-[#d4e0da]',
    buildContent: () =>
      `Name / Alias: \nAffiliation / Role: \nLast Seen: \nDemeanor & Tell: \nKnown Ties: \nNotes: `,
  },
];

function matchPresetByTitle(title: string): LedgerTemplatePreset | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;
  return (
    TEMPLATE_PRESETS.find((p) => p.title.toLowerCase() === normalized) ?? null
  );
}

export const CustomLedgerScreen: React.FC<CustomLedgerScreenProps> = ({
  state,
  readOnly,
  covertUnlocked,
  onUpdateState,
  onOpenDrawer,
}) => {
  // Currently open Template Presets dropdown menu (at most one card open at a time)
  const [openMenuSectionId, setOpenMenuSectionId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Quick panel search / filter
  const [panelSearch, setPanelSearch] = useState('');

  // Undo / Revert snapshot for accidental preset replacements
  const [undoSnapshot, setUndoSnapshot] = useState<{
    sectionId: string;
    sectionTitle: string;
    previousTitle: string;
    previousContent: string;
  } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  // Pending confirmation when applying a preset to a section that already has content
  const [pendingPreset, setPendingPreset] = useState<{
    sectionId: string;
    presetId: PresetId;
  } | null>(null);

  // Close open preset dropdown on outside click or Escape
  useEffect(() => {
    if (!openMenuSectionId) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-preset-dropdown]')) {
        setOpenMenuSectionId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuSectionId(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuSectionId]);

  // Unified strict visibility predicate: private sections stay masked in Party Share View OR while Covert Arc Lock is active
  const canViewPrivate = !readOnly && covertUnlocked;
  const maskedPrivateCount = state.customLedger.filter(
    (sec) => sec.isPrivate && !canViewPrivate
  ).length;

  const filteredCustomLedger = useMemo(() => {
    const q = panelSearch.trim().toLowerCase();
    if (!q) return state.customLedger;
    return state.customLedger.filter((sec) => {
      const isMasked = sec.isPrivate && !canViewPrivate;
      if (isMasked) return false;
      return (
        sec.title.toLowerCase().includes(q) ||
        sec.content.toLowerCase().includes(q)
      );
    });
  }, [state.customLedger, panelSearch, canViewPrivate]);

  const handleInsertTimestamp = (sectionId: string) => {
    if (readOnly) return;
    const stamp = `${formatTimestamp()} `;
    const textarea = textareaRefs.current[sectionId];
    if (textarea) {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const currentVal = textarea.value;
      const updated = currentVal.slice(0, start) + stamp + currentVal.slice(end);
      onUpdateState((prev) => ({
        ...prev,
        customLedger: prev.customLedger.map((sec) =>
          sec.id === sectionId ? { ...sec, content: updated } : sec
        ),
      }));
      window.requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + stamp.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    } else {
      onUpdateState((prev) => ({
        ...prev,
        customLedger: prev.customLedger.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                content: sec.content ? `${sec.content}\n${stamp}` : stamp,
              }
            : sec
        ),
      }));
    }
  };

  const applyPreset = (
    sectionId: string,
    presetId: PresetId,
    mode: 'replace' | 'append'
  ) => {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const seededBody = preset.buildContent();
    const currentSec = state.customLedger.find((s) => s.id === sectionId);

    if (mode === 'replace' && currentSec) {
      setUndoSnapshot({
        sectionId,
        sectionTitle: preset.title,
        previousTitle: currentSec.title,
        previousContent: currentSec.content,
      });
      if (undoTimeoutRef.current !== null) {
        window.clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = window.setTimeout(() => {
        setUndoSnapshot(null);
        undoTimeoutRef.current = null;
      }, 8000);
    }

    onUpdateState((prev) => ({
      ...prev,
      customLedger: prev.customLedger.map((sec) => {
        if (sec.id !== sectionId) return sec;
        if (mode === 'append') {
          return {
            ...sec,
            title: sec.title.trim() ? sec.title : preset.title,
            content: sec.content.trim()
              ? `${sec.content.trimEnd()}\n\n${seededBody}`
              : seededBody,
          };
        }
        return {
          ...sec,
          title: preset.title,
          content: seededBody,
        };
      }),
    }));
    setPendingPreset(null);
    setOpenMenuSectionId(null);
  };

  const handleUndoPreset = () => {
    if (!undoSnapshot) return;
    const { sectionId, previousTitle, previousContent } = undoSnapshot;
    onUpdateState((prev) => ({
      ...prev,
      customLedger: prev.customLedger.map((sec) =>
        sec.id === sectionId
          ? { ...sec, title: previousTitle, content: previousContent }
          : sec
      ),
    }));
    setUndoSnapshot(null);
    if (undoTimeoutRef.current !== null) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

  const handleSelectPreset = (sectionId: string, presetId: PresetId) => {
    if (readOnly) return;
    setOpenMenuSectionId(null);
    const target = state.customLedger.find((sec) => sec.id === sectionId);
    if (!target) return;

    const hasExistingText = Boolean(
      target.title.trim() || target.content.trim()
    );
    if (hasExistingText) {
      setPendingPreset({ sectionId, presetId });
    } else {
      applyPreset(sectionId, presetId, 'replace');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="font-display text-base uppercase tracking-[0.06em] text-[#d4e0da]">
            Custom Ledger
          </h2>
          <p className="text-xs text-[#9eb0a7]">
            {readOnly ? (
              <>
                Six modular ledger panels. Private sections are redacted in Party
                Share View.
              </>
            ) : (
              <>
                Six modular panels starting blank and untitled. Use{' '}
                <span className="font-mono text-[#d4e0da]">Template Presets</span>{' '}
                to seed titles and formatting, or lock panels as{' '}
                <span className="font-mono text-[#c084fc]">[PRIVATE]</span>.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#65766e] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Search custom panels..."
              aria-label="Search custom panels"
              className="ledger-input w-full pl-8 pr-7 py-1 text-xs"
            />
            {panelSearch.trim() && (
              <button
                type="button"
                onClick={() => setPanelSearch('')}
                aria-label="Clear panel search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#65766e] hover:text-[#d4e0da] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {!readOnly && !covertUnlocked && maskedPrivateCount > 0 && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] text-[#c084fc] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3 h-3" />
              <span>
                {maskedPrivateCount} Private Masked · Unlock (Ctrl+H)
              </span>
            </button>
          )}
        </div>
      </div>

      {panelSearch.trim() && (
        <div className="flex items-center justify-between text-[11px] text-[#9eb0a7] px-1">
          <span>
            Showing {filteredCustomLedger.length} of {state.customLedger.length} panels
          </span>
          <button
            type="button"
            onClick={() => setPanelSearch('')}
            className="text-[#c084fc] hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Responsive 2×3 Grid of 6 Customizable Sections */}
      {filteredCustomLedger.length === 0 ? (
        <div className="surface-clinical rounded p-8 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs text-[#9eb0a7]">
            No custom panels match &ldquo;{panelSearch}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setPanelSearch('')}
            className="px-3 py-1 text-xs rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] text-[#c084fc] cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredCustomLedger.map((section) => {
            const idx = state.customLedger.findIndex((s) => s.id === section.id);
            const isMasked = section.isPrivate && !canViewPrivate;
            const matchedPreset = matchPresetByTitle(section.title);
            const isMenuOpen = openMenuSectionId === section.id;
            const pendingForCard =
              pendingPreset?.sectionId === section.id ? pendingPreset : null;
            const pendingTemplate = pendingForCard
              ? TEMPLATE_PRESETS.find((p) => p.id === pendingForCard.presetId)
              : null;

          if (isMasked) {
            return (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className="surface-clinical rounded p-4 min-h-[260px] flex flex-col items-center justify-center text-center gap-2 border-dashed border-[#2e243b]"
              >
                <EyeOff className="w-5 h-5 text-[#65766e]" />
                <div className="font-mono text-xs uppercase tracking-wider text-[#9eb0a7]">
                  {readOnly
                    ? '[ Redacted · Party Safe Mode ]'
                    : '[ Masked · Covert Arc Locked ]'}
                </div>
                <p className="text-[11px] text-[#65766e] max-w-[26ch]">
                  {readOnly
                    ? 'This private panel is hidden while Party Share View is active.'
                    : 'Unlock Covert Arc via Ctrl+H or the Navigation Drawer to view or edit.'}
                </p>
              </section>
            );
          }

          return (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className={`rounded p-4 flex flex-col gap-2.5 min-h-[260px] transition-colors ${
                section.isPrivate ? 'surface-resonant' : 'surface-clinical'
              }`}
            >
              {/* Minimal Panel Header: Index + Matched Type Icon + Inline Title + Timestamp + [PRIVATE] Toggle */}
              <div className="flex items-center justify-between gap-2 border-b border-[#2e243b] pb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-[#65766e] shrink-0">
                    0{idx + 1}
                  </span>
                  {matchedPreset && (
                    <span
                      className={`${matchedPreset.accentClass} shrink-0`}
                      title={matchedPreset.label}
                    >
                      <PresetSymbolSvg id={matchedPreset.id} className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {readOnly ? (
                    <h3 className="font-display text-sm tracking-wide text-[#d4e0da] truncate">
                      {section.title.trim() || (
                        <span className="text-[#65766e]">Untitled Section</span>
                      )}
                    </h3>
                  ) : (
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customLedger: prev.customLedger.map((sec) =>
                            sec.id === section.id
                              ? { ...sec, title: e.target.value }
                              : sec
                          ),
                        }))
                      }
                      placeholder={`Untitled Section ${idx + 1}`}
                      aria-label={`Section ${idx + 1} title`}
                      className="w-full bg-transparent font-display text-sm tracking-wide text-[#d4e0da] placeholder:text-[#65766e] focus:outline-none focus:text-[#c084fc]"
                    />
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInsertTimestamp(section.id)}
                      className="p-1 text-[#9eb0a7] hover:text-[#c084fc] cursor-pointer"
                      title="Insert timestamp"
                      aria-label={`Insert timestamp in section ${idx + 1}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          customLedger: prev.customLedger.map((sec) =>
                            sec.id === section.id
                              ? { ...sec, isPrivate: !sec.isPrivate }
                              : sec
                          ),
                        }))
                      }
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                        section.isPrivate
                          ? 'bg-[#a855f7]/20 border-[#c084fc] text-[#c084fc]'
                          : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                      }`}
                      title={
                        section.isPrivate
                          ? 'Private — hidden in Party Share View and while Covert Arc Lock is active'
                          : 'Shared — visible in all modes'
                      }
                    >
                      {section.isPrivate ? (
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

              {/* Template Presets Custom Icon Dropdown */}
              {!readOnly && (
                <div
                  className="relative flex items-center justify-between gap-2"
                  data-preset-dropdown
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] flex items-center gap-1 shrink-0">
                    <FileText className="w-3 h-3 text-[#c084fc]" />
                    <span>Template Presets</span>
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isMenuOpen}
                      aria-label={`Template Presets for section ${idx + 1}`}
                      onClick={() =>
                        setOpenMenuSectionId((prev) =>
                          prev === section.id ? null : section.id
                        )
                      }
                      className={`h-7 px-2.5 rounded border text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isMenuOpen
                          ? 'bg-[#171022] border-[#c084fc] text-[#d4e0da]'
                          : 'bg-[#080c0a] border-[#2e243b] hover:border-[#581c87] text-[#d4e0da]'
                      }`}
                    >
                      {matchedPreset ? (
                        <span className={matchedPreset.accentClass}>
                          <PresetSymbolSvg
                            id={matchedPreset.id}
                            className="w-3.5 h-3.5"
                          />
                        </span>
                      ) : (
                        <span className="text-[#65766e]">
                          <PresetSymbolSvg
                            id="observation-log"
                            className="w-3.5 h-3.5 opacity-60"
                          />
                        </span>
                      )}
                      <span className="max-w-[130px] truncate">
                        {matchedPreset ? matchedPreset.label : 'Choose preset…'}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-[#9eb0a7] transition-transform ${
                          isMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="listbox"
                        aria-label={`Select template preset for section ${idx + 1}`}
                        className="absolute right-0 top-full mt-1 z-30 w-60 rounded bg-[#080c0a] border border-[#581c87] shadow-xl p-1 flex flex-col gap-0.5"
                      >
                        {TEMPLATE_PRESETS.map((preset) => {
                          const isSelected = matchedPreset?.id === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() =>
                                handleSelectPreset(section.id, preset.id)
                              }
                              className={`w-full text-left px-2.5 py-2 rounded transition-colors flex items-center gap-2.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#171022] border border-[#a855f7]/60 text-[#d4e0da]'
                                  : 'border border-transparent text-[#d4e0da] hover:bg-[#171022] hover:border-[#2e243b]'
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded bg-[#0b100e] border border-[#2e243b] flex items-center justify-center shrink-0 ${preset.accentClass}`}
                              >
                                <PresetSymbolSvg
                                  id={preset.id}
                                  className="w-3.5 h-3.5"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-medium text-[#d4e0da] truncate">
                                  {preset.label}
                                </span>
                                <span className="block text-[10px] font-mono text-[#9eb0a7] truncate">
                                  {preset.hint}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safe Inline Confirmation when Panel Already Has Text */}
              {!readOnly && pendingForCard && pendingTemplate && (
                <div className="bg-[#171022] border border-[#a855f7] rounded px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#d4e0da] inline-flex items-center gap-1.5">
                    <span className={pendingTemplate.accentClass}>
                      <PresetSymbolSvg
                        id={pendingTemplate.id}
                        className="w-3.5 h-3.5"
                      />
                    </span>
                    <span>
                      Apply{' '}
                      <span className="font-mono text-[#c084fc]">
                        {pendingTemplate.label}
                      </span>
                      ?
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        applyPreset(
                          section.id,
                          pendingForCard.presetId,
                          'append'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-[#080c0a] border border-[#581c87] hover:border-[#c084fc] text-[#d4e0da] font-mono text-[10px] cursor-pointer"
                    >
                      Append
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyPreset(
                          section.id,
                          pendingForCard.presetId,
                          'replace'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] font-mono text-[10px] font-semibold cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPreset(null)}
                      className="px-1.5 py-0.5 text-[#9eb0a7] hover:text-[#d4e0da] text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-Saved Note Body */}
              {readOnly ? (
                <div className="flex-1 bg-[#080c0a] border border-[#2e243b] rounded p-2.5 text-xs text-[#d4e0da] whitespace-pre-wrap leading-relaxed">
                  {section.content.trim() || (
                    <span className="text-[#65766e] italic">Empty panel</span>
                  )}
                </div>
              ) : (
                <textarea
                  ref={(el) => {
                    textareaRefs.current[section.id] = el;
                  }}
                  value={section.content}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      customLedger: prev.customLedger.map((sec) =>
                        sec.id === section.id
                          ? { ...sec, content: e.target.value }
                          : sec
                      ),
                    }))
                  }
                  placeholder="Write custom ledger notes, tables, or trackers..."
                  className="ledger-input flex-1 w-full p-2.5 text-xs leading-relaxed resize-y min-h-[185px]"
                />
              )}
            </section>
          );
        })}
      </div>
    )}

      {/* Accidental Preset Replacement Revert / Undo Floating Toast */}
      {undoSnapshot && !readOnly && (
        <aside
          aria-label="Undo preset replacement notice"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#171022] border border-[#c084fc] text-[#d4e0da] px-3.5 py-2 rounded-lg shadow-2xl flex items-center gap-3 text-xs"
        >
          <span>
            Replaced with{' '}
            <strong className="text-[#c084fc]">{undoSnapshot.sectionTitle}</strong>
          </span>
          <button
            type="button"
            onClick={handleUndoPreset}
            className="px-2.5 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] font-bold cursor-pointer transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoSnapshot(null)}
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
