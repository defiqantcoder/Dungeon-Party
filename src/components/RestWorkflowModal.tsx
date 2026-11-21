import React, { useState } from 'react';
import { Check, Dices, Moon, Sun, X } from 'lucide-react';
import { LedgerState } from '../types/ledger';
import {
  calculateHitDieHeal,
  calculateRestoredHitDice,
  createId,
  formatSigned,
  formatTimestamp,
  getAbilityMod,
  parseHitDieSides,
} from '../utils/ledgerMath';

interface RestWorkflowModalProps {
  initialType: 'short' | 'long';
  state: LedgerState;
  onClose: () => void;
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onRollExpression: (expression: string, label?: string) => void;
}

export const RestWorkflowModal: React.FC<RestWorkflowModalProps> = ({
  initialType,
  state,
  onClose,
  onUpdateState,
  onRollExpression,
}) => {
  const [restTab, setRestTab] = useState<'short' | 'long'>(initialType);
  const [logToCampaign, setLogToCampaign] = useState(false);
  const [reduceExhaustion, setReduceExhaustion] = useState(true);
  const [spentThisRest, setSpentThisRest] = useState(0);
  const [healedThisRest, setHealedThisRest] = useState(0);

  const conMod = getAbilityMod(state.abilities.CON);
  const hitDiceRemaining = Math.max(
    0,
    state.vitals.hitDiceTotal - state.vitals.hitDiceSpent
  );
  const features = state.features ?? [];
  const shortFeatures = features.filter((f) => f.recharge === 'short' && f.used > 0);
  const longFeatures = features.filter(
    (f) => (f.recharge === 'short' || f.recharge === 'long') && f.used > 0
  );
  const spentSpellSlotsCount = state.gearAndNotes.spellSlots.reduce(
    (acc, slot) => acc + slot.used,
    0
  );
  const recoveredHdCount = calculateRestoredHitDice(state.vitals.hitDiceTotal);

  const handleSpendOneHitDie = () => {
    if (hitDiceRemaining <= 0) return;
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
        hitDiceSpent: Math.min(prev.vitals.hitDiceTotal, prev.vitals.hitDiceSpent + 1),
        deathSaves: { successes: 0, failures: 0 },
      },
    }));

    setSpentThisRest((n) => n + 1);
    setHealedThisRest((n) => n + healed);
  };

  const handleCompleteShortRest = () => {
    onUpdateState((prev) => {
      const nextFeatures = (prev.features ?? []).map((f) =>
        f.recharge === 'short' ? { ...f, used: 0 } : f
      );
      const nextLogs = logToCampaign
        ? [
            {
              id: createId('log'),
              timestamp: formatTimestamp(),
              title: 'Short Rest Completed',
              body: [
                spentThisRest > 0
                  ? `Spent ${spentThisRest} Hit ${spentThisRest === 1 ? 'Die' : 'Dice'} (+${healedThisRest} HP).`
                  : 'No Hit Dice expended.',
                shortFeatures.length > 0
                  ? `Recharged: ${shortFeatures.map((f) => f.name).join(', ')}.`
                  : '',
              ]
                .filter(Boolean)
                .join(' '),
              tags: ['rest'],
              isPrivate: false,
            },
            ...prev.gearAndNotes.campaignLog,
          ]
        : prev.gearAndNotes.campaignLog;

      return {
        ...prev,
        features: nextFeatures,
        gearAndNotes: {
          ...prev.gearAndNotes,
          campaignLog: nextLogs,
        },
      };
    });
    onClose();
  };

  const handleCompleteLongRest = () => {
    onUpdateState((prev) => {
      const restoredHd = calculateRestoredHitDice(prev.vitals.hitDiceTotal);
      const nextExhaustion =
        reduceExhaustion && prev.vitals.conditions.exhaustion > 0
          ? prev.vitals.conditions.exhaustion - 1
          : prev.vitals.conditions.exhaustion;

      const nextFeatures = (prev.features ?? []).map((f) =>
        f.recharge === 'short' || f.recharge === 'long' ? { ...f, used: 0 } : f
      );

      const nextLogs = logToCampaign
        ? [
            {
              id: createId('log'),
              timestamp: formatTimestamp(),
              title: 'Long Rest Completed',
              body: `Restored HP to ${prev.vitals.hpMax}/${prev.vitals.hpMax}, cleared Temp HP & Death Saves, restored spell slots, recovered up to ${restoredHd} Hit Dice${
                reduceExhaustion && prev.vitals.conditions.exhaustion > 0
                  ? `, reduced Exhaustion to L${nextExhaustion}`
                  : ''
              }.`,
              tags: ['rest'],
              isPrivate: false,
            },
            ...prev.gearAndNotes.campaignLog,
          ]
        : prev.gearAndNotes.campaignLog;

      return {
        ...prev,
        vitals: {
          ...prev.vitals,
          hpCurrent: prev.vitals.hpMax,
          tempHp: 0,
          hitDiceSpent: Math.max(0, prev.vitals.hitDiceSpent - restoredHd),
          deathSaves: { successes: 0, failures: 0 },
          conditions: {
            ...prev.vitals.conditions,
            exhaustion: nextExhaustion,
          },
          actionEconomy: {
            actionUsed: false,
            bonusActionUsed: false,
            reactionUsed: false,
            movementUsed: 0,
          },
        },
        features: nextFeatures,
        gearAndNotes: {
          ...prev.gearAndNotes,
          spellSlots: prev.gearAndNotes.spellSlots.map((slot) => ({
            ...slot,
            used: 0,
          })),
          campaignLog: nextLogs,
        },
      };
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guided Rest Workflow"
        className="surface-modal rounded w-full max-w-lg flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2e243b] bg-[#080c0a] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {restTab === 'short' ? (
              <Sun className="w-4 h-4 text-[#c084fc]" />
            ) : (
              <Moon className="w-4 h-4 text-[#c084fc]" />
            )}
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#d4e0da]">
              Guided Rest Recovery
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rest modal"
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-4 pt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRestTab('short')}
            className={`flex-1 py-1.5 rounded text-xs font-mono border flex items-center justify-center gap-1.5 cursor-pointer ${
              restTab === 'short'
                ? 'bg-[#171022] border-[#c084fc] text-[#c084fc] font-semibold'
                : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Short Rest</span>
          </button>
          <button
            type="button"
            onClick={() => setRestTab('long')}
            className={`flex-1 py-1.5 rounded text-xs font-mono border flex items-center justify-center gap-1.5 cursor-pointer ${
              restTab === 'long'
                ? 'bg-[#171022] border-[#c084fc] text-[#c084fc] font-semibold'
                : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Long Rest</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3.5">
          {restTab === 'short' ? (
            <>
              {/* Current HP + Hit Dice Spender */}
              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9eb0a7]">Current Hit Points</span>
                  <span className="font-mono font-semibold text-[#d4e0da] tabular-nums">
                    {state.vitals.hpCurrent} / {state.vitals.hpMax}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9eb0a7]">
                    Available Hit Dice ({state.vitals.hitDiceDie}{' '}
                    {formatSigned(conMod)} CON)
                  </span>
                  <span className="font-mono font-semibold text-[#c084fc] tabular-nums">
                    {hitDiceRemaining} / {state.vitals.hitDiceTotal}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={hitDiceRemaining <= 0 || state.vitals.hpCurrent >= state.vitals.hpMax}
                  onClick={handleSpendOneHitDie}
                  className="w-full py-2 rounded bg-[#171022] border border-[#581c87] hover:border-[#c084fc] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono text-[#d4e0da] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>
                    Spend 1 Hit Die ({state.vitals.hitDiceDie} {formatSigned(conMod)})
                  </span>
                </button>
                {spentThisRest > 0 && (
                  <p className="text-[11px] font-mono text-[#4af626] text-center">
                    Spent {spentThisRest} Hit {spentThisRest === 1 ? 'Die' : 'Dice'} · +{healedThisRest} HP healed
                  </p>
                )}
              </div>

              {/* Short Rest Features */}
              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3 flex flex-col gap-1.5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Short Rest Recharges
                </div>
                {shortFeatures.length === 0 ? (
                  <p className="text-xs text-[#65766e]">
                    No spent Short Rest feature charges to restore.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-xs text-[#d4e0da]">
                    {shortFeatures.map((f) => (
                      <li key={f.id} className="flex items-center justify-between">
                        <span>{f.name}</span>
                        <span className="font-mono text-[11px] text-[#4af626] tabular-nums">
                          {f.max - f.used}/{f.max} → {f.max}/{f.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Long Rest Checklist */}
              <div className="bg-[#080c0a] border border-[#2e243b] rounded p-3 flex flex-col gap-2 text-xs">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Long Rest Checklist
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4e0da]">Restore Hit Points</span>
                  <span className="font-mono text-[#4af626] tabular-nums">
                    {state.vitals.hpCurrent} → {state.vitals.hpMax}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4e0da]">Clear Temp HP &amp; Death Saves</span>
                  <span className="font-mono text-[#9eb0a7]">Reset to 0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4e0da]">Restore Spell Slots</span>
                  <span className="font-mono text-[#c084fc] tabular-nums">
                    {spentSpellSlotsCount} spent → Full
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4e0da]">Recover Hit Dice</span>
                  <span className="font-mono text-[#c084fc] tabular-nums">
                    +{Math.min(state.vitals.hitDiceSpent, recoveredHdCount)} HD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4e0da]">Recharge Short &amp; Long Features</span>
                  <span className="font-mono text-[#4af626] tabular-nums">
                    {longFeatures.length} tracker{longFeatures.length === 1 ? '' : 's'}
                  </span>
                </div>

                {state.vitals.conditions.exhaustion > 0 && (
                  <label className="pt-2 mt-1 border-t border-[#2e243b] flex items-center justify-between cursor-pointer">
                    <span className="text-[#d4e0da]">
                      Reduce Exhaustion (L{state.vitals.conditions.exhaustion} → L
                      {state.vitals.conditions.exhaustion - 1})
                    </span>
                    <input
                      type="checkbox"
                      checked={reduceExhaustion}
                      onChange={(e) => setReduceExhaustion(e.target.checked)}
                      className="accent-[#a855f7]"
                    />
                  </label>
                )}
              </div>
            </>
          )}

          {/* Optional Campaign Log Stamp */}
          <label className="inline-flex items-center gap-2 text-xs text-[#9eb0a7] cursor-pointer">
            <input
              type="checkbox"
              checked={logToCampaign}
              onChange={(e) => setLogToCampaign(e.target.checked)}
              className="accent-[#a855f7]"
            />
            <span>Record a timestamped rest entry in the Campaign &amp; Case Log</span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2e243b]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={
                restTab === 'short'
                  ? handleCompleteShortRest
                  : handleCompleteLongRest
              }
              className="px-4 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {restTab === 'short' ? 'Finish Short Rest' : 'Complete Long Rest'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
