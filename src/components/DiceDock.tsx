import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Dices,
  History,
  Settings2,
  Trash2,
} from 'lucide-react';
import { LedgerState, RollMode, RollRecord } from '../types/ledger';
import { formatSigned } from '../utils/ledgerMath';
import { MAX_ROLL_HISTORY } from '../utils/storage';

interface DiceDockProps {
  state: LedgerState;
  rollMode: RollMode;
  onChangeRollMode: (mode: RollMode) => void;
  rollHistory: RollRecord[];
  onRollD20: (label: string, modifier: number, overrideMode?: RollMode) => void;
  onRollExpression: (expression: string, label?: string, overrideMode?: RollMode) => void;
  onClearHistory: () => void;
  onOpenMacroEditor: () => void;
  readOnly: boolean;
  hotkeysEnabled?: boolean;
}

const STANDARD_DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

function renderIndividualDice(record: RollRecord) {
  const keptSet = record.keptIndices
    ? new Set(record.keptIndices)
    : null;
  const hasDropped = keptSet !== null && keptSet.size < record.rolls.length;

  return (
    <span className="inline-flex items-center gap-0.5">
      <span>[</span>
      {record.rolls.map((die, idx) => {
        const isKept = !keptSet || keptSet.has(idx);
        const isD20Roll = record.expression.includes('d20');
        const dieClass = !isKept && hasDropped
          ? 'text-[#65766e] line-through opacity-70'
          : isD20Roll && die === 20
          ? 'text-[#4af626] font-bold'
          : isD20Roll && die === 1
          ? 'text-[#ff4d4d] font-bold'
          : hasDropped
          ? 'text-[#d4e0da] font-semibold'
          : 'text-[#9eb0a7]';
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-[#65766e]">,</span>}
            <span className={dieClass}>{die}</span>
          </React.Fragment>
        );
      })}
      <span>]</span>
    </span>
  );
}

export const DiceDock: React.FC<DiceDockProps> = ({
  state,
  rollMode,
  onChangeRollMode,
  rollHistory,
  onRollD20,
  onRollExpression,
  onClearHistory,
  onOpenMacroEditor,
  readOnly,
  hotkeysEnabled = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customExpr, setCustomExpr] = useState('');

  const latest = rollHistory[0] ?? null;

  // Wire keyboard shortcuts 1–9 for all customizable quick macros when not typing in an input
  useEffect(() => {
    if (!hotkeysEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const slotNum = parseInt(e.key, 10);
        const macro = state.customMacros.find((m) => m.slot === slotNum);
        if (macro && macro.label.trim() && macro.expression.trim()) {
          e.preventDefault();
          onRollExpression(
            macro.expression,
            macro.label,
            macro.mode === 'normal' ? rollMode : macro.mode
          );
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeysEnabled, rollMode, state.customMacros, onRollExpression]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExpr.trim()) return;
    onRollExpression(customExpr.trim(), customExpr.trim(), rollMode);
    setCustomExpr('');
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0b100e]/98 border-t border-[#581c87] backdrop-blur-sm">
      {/* Expandable 25-Roll History Drawer */}
      {expanded && (
        <div className="border-b border-[#2e243b] bg-[#080c0a] max-h-56 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9eb0a7]">
                Roll History ({rollHistory.length} / {MAX_ROLL_HISTORY})
              </span>
              {rollHistory.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] text-[#9eb0a7] hover:text-[#ff4d4d] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {rollHistory.length === 0 ? (
              <p className="text-xs text-[#9eb0a7] py-3">
                No rolls recorded yet. Click any die, macro (keys 1–9), ability, save, or skill to roll.
              </p>
            ) : (
              <div className="divide-y divide-[#1d1827]">
                {rollHistory.map((item) => (
                  <div
                    key={item.id}
                    className="py-1.5 flex items-center justify-between gap-3 text-xs font-mono tabular-nums"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] text-[#65766e] shrink-0">
                        {item.timestamp}
                      </span>
                      <span className="text-[#d4e0da] truncate font-sans font-medium">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[#9eb0a7] shrink-0">
                        ({item.expression})
                      </span>
                      {item.mode !== 'normal' && (
                        <span
                          className={`text-[10px] uppercase shrink-0 ${
                            item.mode === 'adv' ? 'text-[#4af626]' : 'text-[#ff4d4d]'
                          }`}
                        >
                          {item.mode === 'adv' ? 'ADV' : 'DIS'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-[#9eb0a7] flex items-center gap-1">
                        {renderIndividualDice(item)}
                        {item.modifier !== 0 && (
                          <span>{formatSigned(item.modifier)}</span>
                        )}
                      </span>
                      <span
                        className={`text-sm font-bold min-w-[2.2rem] text-right ${
                          item.isNat20
                            ? 'text-[#4af626]'
                            : item.isNat1
                            ? 'text-[#ff4d4d]'
                            : 'text-[#d4e0da]'
                        }`}
                      >
                        {item.total}
                      </span>
                      {item.isNat20 && (
                        <span className="text-[10px] font-semibold text-[#4af626] uppercase">
                          NAT 20
                        </span>
                      )}
                      {item.isNat1 && (
                        <span className="text-[10px] font-semibold text-[#ff4d4d] uppercase">
                          NAT 1
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Dock Strip */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2">
        {/* Mobile Compact Bar */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-medium text-[#d4e0da] cursor-pointer"
          >
            <Dices className="w-4 h-4 text-[#a855f7]" />
            <span>Dice Dock</span>
            {mobileOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9eb0a7]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#9eb0a7]" />
            )}
          </button>

          {/* Latest roll compact readout */}
          <div className="flex items-center gap-2 min-w-0">
            {latest ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className={`px-2 py-0.5 rounded border text-xs font-mono tabular-nums flex items-center gap-1.5 cursor-pointer ${
                  latest.isNat20
                    ? 'border-[#4af626] text-[#4af626] bg-[#4af626]/10'
                    : latest.isNat1
                    ? 'border-[#ff4d4d] text-[#ff4d4d] bg-[#ff4d4d]/10'
                    : 'border-[#581c87] text-[#d4e0da] bg-[#171022]'
                }`}
              >
                <span className="truncate max-w-[110px] font-sans text-[11px]">
                  {latest.label}
                </span>
                <span className="font-bold">{latest.total}</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#9eb0a7] font-mono">Ready</span>
            )}
            <button
              type="button"
              onClick={() => onRollD20('Quick d20', 0, rollMode)}
              className="px-2.5 py-1 rounded bg-[#a855f7] text-[#080c0a] font-mono text-xs font-bold cursor-pointer"
            >
              d20
            </button>
          </div>
        </div>

        {/* Full Dock Content (Always visible on md+, toggleable on mobile) */}
        <div
          className={`${
            mobileOpen ? 'flex mt-2.5 pt-2.5 border-t border-[#2e243b]' : 'hidden'
          } md:flex flex-col gap-2`}
        >
          {/* Row 1: Roll Mode + Standard Dice + Custom Expression + Latest Result */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Adv / Normal / Dis Segmented Control */}
              <div
                className="flex items-center bg-[#080c0a] border border-[#2e243b] rounded p-0.5"
                role="group"
                aria-label="Roll mode"
              >
                {(
                  [
                    { id: 'normal', label: 'Norm' },
                    { id: 'adv', label: 'Adv' },
                    { id: 'dis', label: 'Dis' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeRollMode(m.id)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                      rollMode === m.id
                        ? m.id === 'adv'
                          ? 'bg-[#4af626]/20 text-[#4af626] font-semibold'
                          : m.id === 'dis'
                          ? 'bg-[#ff4d4d]/20 text-[#ff4d4d] font-semibold'
                          : 'bg-[#a855f7] text-[#080c0a] font-semibold'
                        : 'text-[#9eb0a7] hover:text-[#d4e0da]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Standard Dice Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {STANDARD_DICE.map((die) => (
                  <button
                    key={die}
                    type="button"
                    onClick={() =>
                      die === 'd20'
                        ? onRollD20('d20 Roll', 0, rollMode)
                        : onRollExpression(`1${die}`, `1${die}`, 'normal')
                    }
                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer whitespace-nowrap ${
                      die === 'd20'
                        ? 'bg-[#171022] border-[#a855f7] text-[#c084fc] hover:bg-[#a855f7] hover:text-[#080c0a] font-semibold'
                        : 'bg-[#080c0a] border-[#2e243b] text-[#d4e0da] hover:border-[#a855f7] hover:text-[#c084fc]'
                    }`}
                  >
                    {die}
                  </button>
                ))}
              </div>

              {/* Custom Dice Expression */}
              <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={customExpr}
                  onChange={(e) => setCustomExpr(e.target.value)}
                  placeholder="1d20+7, 2d20kh1+5"
                  aria-label="Custom dice expression"
                  title="Supports standard rolls (1d20+7, 1d8+3), advantage (2d20kh1+5), and disadvantage (2d20kl1+3)"
                  className="ledger-input h-7 w-32 sm:w-36 px-2 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="h-7 px-2.5 text-xs font-medium bg-[#171022] border border-[#581c87] text-[#d4e0da] hover:border-[#c084fc] rounded cursor-pointer whitespace-nowrap"
                >
                  Roll
                </button>
              </form>
            </div>

            {/* Latest Roll Readout & History Toggle */}
            <div className="flex items-center gap-2">
              {latest ? (
                <div
                  className={`px-2.5 py-1 rounded border font-mono text-xs tabular-nums flex items-center gap-2 ${
                    latest.isNat20
                      ? 'bg-[#4af626]/10 border-[#4af626] text-[#4af626] glow-green'
                      : latest.isNat1
                      ? 'bg-[#ff4d4d]/10 border-[#ff4d4d] text-[#ff4d4d] glow-crimson'
                      : 'bg-[#171022] border-[#581c87] text-[#d4e0da]'
                  }`}
                >
                  <span className="font-sans text-[11px] text-[#9eb0a7] max-w-[140px] truncate">
                    {latest.label}
                  </span>
                  <span className="text-[11px] text-[#9eb0a7] flex items-center gap-0.5">
                    {renderIndividualDice(latest)}
                    {latest.modifier !== 0 && (
                      <span>{formatSigned(latest.modifier)}</span>
                    )}
                  </span>
                  <span className="text-sm font-bold">
                    {latest.total}
                  </span>
                  {latest.isNat20 && (
                    <span className="text-[10px] font-bold">NAT 20</span>
                  )}
                  {latest.isNat1 && (
                    <span className="text-[10px] font-bold">NAT 1</span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-mono text-[#65766e]">
                  No rolls yet
                </span>
              )}

              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="h-7 px-2.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title={`Toggle 25-roll history (${rollHistory.length}/${MAX_ROLL_HISTORY})`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  {rollHistory.length}/{MAX_ROLL_HISTORY}
                </span>
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Customizable Quick Macro Bar (Slots 1–9) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {state.customMacros.map((macro) => {
              const configured = Boolean(
                macro.label.trim() && macro.expression.trim()
              );
              const isPrimaryGroup = macro.slot <= 4;
              return (
                <button
                  key={macro.slot}
                  type="button"
                  onClick={() => {
                    if (configured) {
                      onRollExpression(
                        macro.expression,
                        macro.label,
                        macro.mode === 'normal' ? rollMode : macro.mode
                      );
                    } else if (!readOnly) {
                      onOpenMacroEditor();
                    }
                  }}
                  disabled={!configured && readOnly}
                  className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    configured
                      ? macro.mode === 'adv'
                        ? 'bg-[#171022] border-[#581c87] hover:border-[#4af626] text-[#d4e0da] cursor-pointer'
                        : macro.mode === 'dis'
                        ? 'bg-[#171022] border-[#581c87] hover:border-[#ff4d4d] text-[#d4e0da] cursor-pointer'
                        : isPrimaryGroup
                        ? 'bg-[#171022] border-[#581c87] hover:border-[#c084fc] text-[#d4e0da] cursor-pointer'
                        : 'bg-[#080c0a] border-[#2e243b] hover:border-[#a855f7] text-[#d4e0da] cursor-pointer'
                      : readOnly
                      ? 'bg-[#080c0a]/40 border-[#2e243b]/40 text-[#65766e] cursor-default'
                      : 'bg-[#080c0a] border-dashed border-[#2e243b] hover:border-[#581c87] text-[#65766e] hover:text-[#9eb0a7] cursor-pointer'
                  }`}
                  title={
                    configured
                      ? `Hotkey: ${macro.slot} — ${macro.label} (${macro.expression}${
                          macro.mode !== 'normal'
                            ? ` · ${macro.mode.toUpperCase()}`
                            : ''
                        })`
                      : readOnly
                      ? `Empty Macro Slot ${macro.slot}`
                      : `Configure Macro Slot ${macro.slot}`
                  }
                >
                  <span className="font-mono text-[10px] text-[#9eb0a7]">
                    {macro.slot}
                  </span>
                  <span>{configured ? macro.label : 'Empty'}</span>
                  {configured && (
                    <span
                      className={`font-mono text-[10px] font-semibold tabular-nums ${
                        macro.mode === 'adv'
                          ? 'text-[#4af626]'
                          : macro.mode === 'dis'
                          ? 'text-[#ff4d4d]'
                          : 'text-[#c084fc]'
                      }`}
                    >
                      {macro.expression}
                      {macro.mode === 'adv'
                        ? ' ADV'
                        : macro.mode === 'dis'
                        ? ' DIS'
                        : ''}
                    </span>
                  )}
                </button>
              );
            })}

            {!readOnly && (
              <button
                type="button"
                onClick={onOpenMacroEditor}
                className="p-1.5 text-[#9eb0a7] hover:text-[#c084fc] cursor-pointer shrink-0"
                title="Customize quick-roll macros (1–9)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
