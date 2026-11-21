import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Dices,
  History,
  RotateCcw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { DiceMacro, LedgerState, RollMode, RollRecord } from '../types/ledger';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [animatedRollId, setAnimatedRollId] = useState<string | null>(null);

  const latest = rollHistory[0] ?? null;
  const prevLatestIdRef = useRef<string | null>(latest?.id ?? null);

  useEffect(() => {
    const currentId = latest?.id ?? null;
    if (currentId && currentId !== prevLatestIdRef.current) {
      setAnimatedRollId(currentId);
    }
    prevLatestIdRef.current = currentId;
  }, [latest?.id]);

  const shouldAnimateLatest = Boolean(latest && animatedRollId === latest.id);
  const latestAnimClass = !shouldAnimateLatest
    ? ''
    : latest?.isNat20
    ? 'dice-anim-crit'
    : latest?.isNat1
    ? 'dice-anim-fumble'
    : 'dice-anim-pop';

  // Wire keyboard shortcuts: 1–9, Shift+1..9 (ADV), Alt+1..9 (DIS), Shift+A (Adv), Shift+D (Dis), Shift+N (Norm)
  useEffect(() => {
    if (!hotkeysEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
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

      // Quick roll mode toggle shortcuts
      if (!e.ctrlKey && !e.metaKey && e.shiftKey) {
        if (e.key === 'A' || e.key === 'a') {
          e.preventDefault();
          onChangeRollMode(rollMode === 'adv' ? 'normal' : 'adv');
          return;
        }
        if (e.key === 'D' || e.key === 'd') {
          e.preventDefault();
          onChangeRollMode(rollMode === 'dis' ? 'normal' : 'dis');
          return;
        }
        if (e.key === 'N' || e.key === 'n') {
          e.preventDefault();
          onChangeRollMode('normal');
          return;
        }
      }

      // Quick macro hotkeys 1–9
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        const slotNum = parseInt(e.key, 10);
        const macro = state.customMacros.find((m) => m.slot === slotNum);
        if (macro && macro.label.trim() && macro.expression.trim()) {
          e.preventDefault();
          const effectiveMode: RollMode = e.shiftKey
            ? 'adv'
            : e.altKey
            ? 'dis'
            : macro.mode === 'normal'
            ? rollMode
            : macro.mode;

          onRollExpression(macro.expression, macro.label, effectiveMode);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeysEnabled, rollMode, state.customMacros, onRollExpression, onChangeRollMode]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExpr.trim()) return;
    onRollExpression(customExpr.trim(), customExpr.trim(), rollMode);
    setCustomExpr('');
  };

  const handleMacroRoll = (macro: DiceMacro, e: React.MouseEvent) => {
    const configured = Boolean(macro.label.trim() && macro.expression.trim());
    if (configured) {
      const effectiveMode: RollMode = e.shiftKey
        ? 'adv'
        : e.altKey
        ? 'dis'
        : macro.mode === 'normal'
        ? rollMode
        : macro.mode;
      onRollExpression(macro.expression, macro.label, effectiveMode);
    } else if (!readOnly) {
      onOpenMacroEditor();
    }
  };

  const handleStandardDieRoll = (die: string, e: React.MouseEvent) => {
    const effectiveMode: RollMode = e.shiftKey
      ? 'adv'
      : e.altKey
      ? 'dis'
      : rollMode;
    if (die === 'd20') {
      onRollD20('d20 Roll', 0, effectiveMode);
    } else {
      onRollExpression(`1${die}`, `1${die}`, effectiveMode === 'normal' ? 'normal' : effectiveMode);
    }
  };

  const copyRollResult = (item: RollRecord) => {
    const kept = item.keptIndices
      ? ` (kept ${item.rolls.filter((_, i) => item.keptIndices?.includes(i)).join(', ')})`
      : '';
    const text = `[${state.identity.name.trim() || 'Pip'}] ${item.label}: ${item.expression} = ${item.total} [${item.rolls.join(', ')}]${kept}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const configuredMacros = state.customMacros.filter(
    (m) => m.label.trim() && m.expression.trim()
  );

  return (
    <div className="print-hide fixed bottom-12 md:bottom-0 inset-x-0 z-40 bg-[#0b100e]/98 border-t border-[#581c87] backdrop-blur-sm">
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
                No rolls recorded yet. Click any die, macro (keys 1–9, Shift+1–9 for Adv), ability, save, or skill to roll.
              </p>
            ) : (
              <div className="divide-y divide-[#1d1827]">
                {rollHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`py-1.5 flex items-center justify-between gap-3 text-xs font-mono tabular-nums hover:bg-[#171022]/40 px-1 rounded transition-colors ${
                      idx === 0 && animatedRollId === item.id
                        ? 'dice-history-new bg-[#171022]/35'
                        : ''
                    }`}
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
                          className={`text-[10px] uppercase font-bold shrink-0 ${
                            item.mode === 'adv' ? 'text-[#4af626]' : 'text-[#ff4d4d]'
                          }`}
                        >
                          {item.mode === 'adv' ? 'ADV' : 'DIS'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-[#9eb0a7] flex items-center gap-1">
                        {renderIndividualDice(item)}
                        {item.modifier !== 0 && (
                          <span>{formatSigned(item.modifier)}</span>
                        )}
                      </span>
                      <span
                        className={`text-sm font-bold min-w-[2.2rem] text-right ${
                          item.isNat20
                            ? 'text-[#4af626] drop-shadow-[0_0_8px_rgba(74,246,38,0.5)]'
                            : item.isNat1
                            ? 'text-[#ff4d4d] drop-shadow-[0_0_8px_rgba(255,77,77,0.5)]'
                            : 'text-[#d4e0da]'
                        }`}
                      >
                        {item.total}
                      </span>
                      {item.isNat20 && (
                        <span className="text-[10px] font-bold text-[#4af626] uppercase">
                          NAT 20
                        </span>
                      )}
                      {item.isNat1 && (
                        <span className="text-[10px] font-bold text-[#ff4d4d] uppercase">
                          NAT 1
                        </span>
                      )}

                      {/* Fast Re-Roll & Copy Actions */}
                      <button
                        type="button"
                        onClick={() => onRollExpression(item.expression, item.label, item.mode)}
                        title={`Re-roll ${item.label}`}
                        className="p-1 rounded text-[#9eb0a7] hover:text-[#c084fc] hover:bg-[#171022] cursor-pointer"
                        aria-label={`Re-roll ${item.label}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyRollResult(item)}
                        title="Copy roll result to clipboard"
                        className="p-1 rounded text-[#9eb0a7] hover:text-[#4af626] hover:bg-[#171022] cursor-pointer"
                        aria-label="Copy roll result"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-[#4af626]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
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
        <div className="flex md:hidden items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#d4e0da] cursor-pointer shrink-0"
          >
            <Dices className="w-4 h-4 text-[#a855f7]" />
            <span className="font-mono text-[11px]">Dice</span>
            {mobileOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9eb0a7]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#9eb0a7]" />
            )}
          </button>

          {/* Quick-tap primary macros for mobile without full drawer */}
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5">
            {configuredMacros.slice(0, 3).map((macro) => (
              <button
                key={macro.slot}
                type="button"
                onClick={(e) => handleMacroRoll(macro, e)}
                className="px-2 py-0.5 rounded border border-[#581c87] bg-[#171022] text-[10px] font-mono text-[#d4e0da] shrink-0 truncate max-w-[85px] cursor-pointer"
                title={`Roll ${macro.label} (${macro.expression})`}
              >
                {macro.label}
              </button>
            ))}
          </div>

          {/* Latest roll compact readout + Quick d20 */}
          <div className="flex items-center gap-1.5 shrink-0 dice-result-stage">
            {latest ? (
              <button
                key={latest.id}
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className={`px-1.5 py-0.5 rounded border text-[11px] font-mono tabular-nums flex items-center gap-1 cursor-pointer ${latestAnimClass} ${
                  latest.isNat20
                    ? 'border-[#4af626] text-[#4af626] bg-[#4af626]/10'
                    : latest.isNat1
                    ? 'border-[#ff4d4d] text-[#ff4d4d] bg-[#ff4d4d]/10'
                    : 'border-[#581c87] text-[#d4e0da] bg-[#171022]'
                }`}
              >
                <span className={`font-bold ${shouldAnimateLatest ? 'dice-total-flip' : ''}`}>
                  {latest.total}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={(e) => handleStandardDieRoll('d20', e)}
              className="px-2 py-1 rounded bg-[#a855f7] text-[#080c0a] font-mono text-xs font-bold cursor-pointer"
            >
              d20
            </button>
          </div>
        </div>

        {/* Full Dock Content (Always visible on md+, toggleable on mobile) */}
        <div
          className={`${
            mobileOpen ? 'flex mt-2 pt-2 border-t border-[#2e243b]' : 'hidden'
          } md:flex flex-col gap-2`}
        >
          {/* Row 1: Roll Mode + Standard Dice + Custom Expression + Latest Result */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Adv / Normal / Dis Segmented Control with keyboard hotkey indicators */}
              <div
                className="flex items-center bg-[#080c0a] border border-[#2e243b] rounded p-0.5"
                role="group"
                aria-label="Roll mode"
              >
                {(
                  [
                    { id: 'normal', label: 'Norm', tip: 'Shift+N' },
                    { id: 'adv', label: 'Adv', tip: 'Shift+A' },
                    { id: 'dis', label: 'Dis', tip: 'Shift+D' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeRollMode(m.id)}
                    title={`${m.label} roll mode (${m.tip})`}
                    className={`px-2 py-1 text-[11px] font-mono rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                      rollMode === m.id
                        ? m.id === 'adv'
                          ? 'bg-[#4af626]/20 text-[#4af626] font-semibold border border-[#4af626]/40'
                          : m.id === 'dis'
                          ? 'bg-[#ff4d4d]/20 text-[#ff4d4d] font-semibold border border-[#ff4d4d]/40'
                          : 'bg-[#a855f7] text-[#080c0a] font-semibold'
                        : 'text-[#9eb0a7] hover:text-[#d4e0da]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Standard Dice Buttons (Shift+click = ADV, Alt+click = DIS) */}
              <div className="flex items-center gap-1 flex-wrap">
                {STANDARD_DICE.map((die) => (
                  <button
                    key={die}
                    type="button"
                    onClick={(e) => handleStandardDieRoll(die, e)}
                    title={`Roll 1${die} · Shift+click for ADV · Alt+click for DIS`}
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
                  placeholder="1d20+7, 2d6+3"
                  aria-label="Custom dice expression"
                  title="Supports 1d20+7, 2d20kh1+5 (adv), 2d20kl1+3 (dis), or dice equations"
                  className="ledger-input h-7 w-28 sm:w-36 px-2 text-xs font-mono"
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
            <div className="flex items-center gap-2 dice-result-stage">
              {latest ? (
                <div
                  key={latest.id}
                  className={`px-2.5 py-1 rounded border font-mono text-xs tabular-nums flex items-center gap-2 ${latestAnimClass} ${
                    latest.isNat20
                      ? 'bg-[#4af626]/10 border-[#4af626] text-[#4af626] glow-green'
                      : latest.isNat1
                      ? 'bg-[#ff4d4d]/10 border-[#ff4d4d] text-[#ff4d4d] glow-crimson'
                      : 'bg-[#171022] border-[#581c87] text-[#d4e0da]'
                  }`}
                >
                  <span className="font-sans text-[11px] text-[#9eb0a7] max-w-[130px] truncate">
                    {latest.label}
                  </span>
                  <span className="text-[11px] text-[#9eb0a7] flex items-center gap-0.5">
                    {renderIndividualDice(latest)}
                    {latest.modifier !== 0 && (
                      <span>{formatSigned(latest.modifier)}</span>
                    )}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      shouldAnimateLatest ? 'dice-total-flip' : ''
                    }`}
                  >
                    {latest.total}
                  </span>
                  {latest.isNat20 && (
                    <span className="text-[10px] font-bold text-[#4af626]">NAT 20</span>
                  )}
                  {latest.isNat1 && (
                    <span className="text-[10px] font-bold text-[#ff4d4d]">NAT 1</span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-mono text-[#65766e]">
                  Ready
                </span>
              )}

              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="h-7 px-2.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title={`Toggle 25-roll history (${rollHistory.length}/${MAX_ROLL_HISTORY})`}
              >
                <History className="w-3.5 h-3.5 text-[#c084fc]" />
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

          {/* Row 2: Customizable Quick Macro Bar (Slots 1–9) with Shift+click = ADV, Alt+click = DIS */}
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
                  onClick={(e) => handleMacroRoll(macro, e)}
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
                      ? `Hotkey: ${macro.slot} (Shift+${macro.slot} for ADV, Alt+${macro.slot} for DIS) — ${macro.label} (${macro.expression})`
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
