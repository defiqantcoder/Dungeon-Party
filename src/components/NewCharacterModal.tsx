import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import {
  AVATAR_RACE_OPTIONS,
  BlankCharacterOptions,
} from '../data/defaultState';
import { AvatarGender, AvatarRace } from '../types/ledger';
import { RaceAvatarSvg } from './RaceAvatarSvg';

interface NewCharacterModalProps {
  onClose: () => void;
  onCreateCharacter: (options: BlankCharacterOptions) => void;
}

export const NewCharacterModal: React.FC<NewCharacterModalProps> = ({
  onClose,
  onCreateCharacter,
}) => {
  const [name, setName] = useState('');
  const [player, setPlayer] = useState('');
  const [occupation, setOccupation] = useState('');
  const [hpMax, setHpMax] = useState(10);
  const [avatarRace, setAvatarRace] = useState<AvatarRace>('human');
  const [avatarGender, setAvatarGender] = useState<AvatarGender>('male');
  const [previewHpPct, setPreviewHpPct] = useState(100);

  const selectedRaceMeta =
    AVATAR_RACE_OPTIONS.find((r) => r.id === avatarRace) ?? AVATAR_RACE_OPTIONS[0];
  const previewHpCurrent = Math.round((previewHpPct / 100) * 10);

  const previewMoodLabel =
    previewHpCurrent <= 0
      ? '0 HP · Downed'
      : previewHpPct <= 25
      ? 'Critical (≤25%)'
      : previewHpPct <= 50
      ? 'Bloodied (≤50%)'
      : previewHpPct <= 75
      ? 'Focused (≤75%)'
      : 'Healthy (100%)';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateCharacter({
      name: name.trim(),
      player: player.trim(),
      occupation: occupation.trim(),
      avatarRace,
      avatarGender,
      hpMax: Math.max(1, hpMax || 1),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create New Character"
        className="surface-modal rounded w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2e243b] bg-[#080c0a] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#c084fc]" />
            <h2 className="font-display text-sm uppercase tracking-[0.08em] text-[#d4e0da]">
              New Character &amp; Reactive Sprite
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new character creator"
            className="p-1 text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-5"
        >
          {/* Left Column: Live Reactive Sprite Preview + HP Expression Tester */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="rounded bg-[#080c0a] border border-[#581c87] p-3 flex flex-col items-center gap-2.5">
              <div className="w-44 h-44 rounded border border-[#2e243b] overflow-hidden bg-[#080c0a]">
                <RaceAvatarSvg
                  race={avatarRace}
                  gender={avatarGender}
                  hpCurrent={previewHpCurrent}
                  hpMax={10}
                  label={`${selectedRaceMeta.label} ${avatarGender} preview`}
                />
              </div>

              <div className="text-center">
                <div className="font-display text-sm text-[#d4e0da]">
                  {selectedRaceMeta.label} ·{' '}
                  <span className="capitalize text-[#c084fc]">{avatarGender}</span>
                </div>
                <div className="font-mono text-[10px] text-[#9eb0a7]">
                  Default Speed: {selectedRaceMeta.defaultSpeed}
                </div>
              </div>

              {/* Male / Female Toggle */}
              <div className="w-full grid grid-cols-2 gap-1.5">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setAvatarGender(g)}
                    className={`py-1.5 rounded text-xs font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      avatarGender === g
                        ? 'bg-[#a855f7] border-[#c084fc] text-[#080c0a] font-bold'
                        : 'bg-[#0b100e] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87] hover:text-[#d4e0da]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Interactive HP Expression Tester */}
              <div className="w-full pt-2 border-t border-[#2e243b] flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#9eb0a7] uppercase">Test HP Expression</span>
                  <span
                    className={
                      previewHpCurrent <= 0 || previewHpPct <= 25
                        ? 'text-[#ff4d4d]'
                        : previewHpPct <= 50
                        ? 'text-[#c084fc]'
                        : 'text-[#4af626]'
                    }
                  >
                    {previewMoodLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={previewHpPct}
                  onChange={(e) => setPreviewHpPct(parseInt(e.target.value, 10))}
                  aria-label="Preview sprite HP expression"
                  className="w-full accent-[#a855f7] cursor-pointer"
                />
              </div>
            </div>

            {/* Identity Basics */}
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Character Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Leave blank or enter name..."
                  autoFocus
                  className="ledger-input px-2.5 py-1.5 text-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Class / Role
                  </span>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Wizard, Cleric"
                    className="ledger-input px-2.5 py-1.5 text-xs"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                    Starting Max HP
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={hpMax}
                    onChange={(e) =>
                      setHpMax(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="ledger-input px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7]">
                  Player Name (Optional)
                </span>
                <input
                  type="text"
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                  placeholder="Player name"
                  className="ledger-input px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Major 5e Races Grid */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-2">
                Choose Ancestry Sprite ({AVATAR_RACE_OPTIONS.length} Major Races · Male &amp; Female)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {AVATAR_RACE_OPTIONS.map((opt) => {
                  const selected = avatarRace === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAvatarRace(opt.id)}
                      className={`p-1.5 rounded border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#171022] border-[#c084fc] text-[#d4e0da]'
                          : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87] hover:text-[#d4e0da]'
                      }`}
                    >
                      <div className="w-14 h-14 rounded overflow-hidden border border-[#2e243b]/70">
                        <RaceAvatarSvg
                          race={opt.id}
                          gender={avatarGender}
                          hpCurrent={10}
                          hpMax={10}
                          label={`${opt.label} ${avatarGender}`}
                        />
                      </div>
                      <span className="text-[11px] font-medium truncate w-full text-center">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-[#2e243b] flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[#9eb0a7]">
                Adds a new character slot to your local roster without overwriting existing sheets.
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] text-xs font-bold cursor-pointer"
                >
                  Create Character
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
