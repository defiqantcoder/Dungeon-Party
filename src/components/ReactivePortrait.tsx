import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { AVATAR_RACE_OPTIONS } from '../data/defaultState';
import { AvatarGender, AvatarRace } from '../types/ledger';
import { compressImageToDataUrl } from '../utils/storage';
import { RaceAvatarSvg } from './RaceAvatarSvg';

interface ReactivePortraitProps {
  name: string;
  hpCurrent: number;
  hpMax: number;
  concentrating: boolean;
  poisoned: boolean;
  frightened: boolean;
  covertUnlocked: boolean; // True ONLY in Player/DM View when unlocked via Ctrl+H or hold
  isClockworkMode: boolean; // True ONLY when covertUnlocked && clockworkVesselActive
  portraitStandard: string | null;
  portraitVessel: string | null;
  avatarRace?: AvatarRace;
  avatarGender?: AvatarGender;
  occupation?: string;
  isEditing?: boolean;
  readOnly: boolean;
  onUpdatePortrait: (slot: 'standard' | 'vessel', dataUrl: string | null) => void;
  onUpdateAvatar?: (patch: { avatarRace?: AvatarRace; avatarGender?: AvatarGender }) => void;
}

export const ReactivePortrait: React.FC<ReactivePortraitProps> = ({
  name,
  hpCurrent,
  hpMax,
  concentrating,
  poisoned,
  frightened,
  covertUnlocked,
  isClockworkMode,
  portraitStandard,
  portraitVessel,
  avatarRace = 'gnome',
  avatarGender = 'male',
  occupation = '',
  isEditing = false,
  readOnly,
  onUpdatePortrait,
  onUpdateAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isDown = hpCurrent <= 0;
  const hpRatio = hpMax > 0 ? hpCurrent / hpMax : 1;
  const isCritical = !isDown && hpRatio <= 0.25;
  const isStrained = !isDown && !isCritical && hpRatio <= 0.5;
  const isUnlockedStandard = !readOnly && covertUnlocked && !isClockworkMode;

  const activeSlot: 'standard' | 'vessel' = isClockworkMode ? 'vessel' : 'standard';
  const activeImage = isClockworkMode ? portraitVessel : portraitStandard;

  const showMedicSpectacles =
    avatarRace === 'gnome' &&
    (name.trim().toLowerCase() === 'pip' ||
      occupation.toLowerCase().includes('medic') ||
      occupation.toLowerCase().includes('wellness'));

  const statusText = isDown
    ? 'CRITICAL · 0 HP'
    : isClockworkMode
    ? 'CLOCKWORK VESSEL'
    : isUnlockedStandard
    ? 'COVERT UNLOCKED'
    : isCritical
    ? 'CRITICAL VITALS'
    : concentrating
    ? 'CONCENTRATING'
    : isStrained
    ? 'STRAINED VITALS'
    : poisoned || frightened
    ? 'CONDITION ACTIVE'
    : 'VITALS NOMINAL';

  const frameClass = isDown
    ? 'border-[#ff4d4d] glow-crimson'
    : isCritical
    ? 'border-[#ff4d4d]/90 shadow-[inset_0_0_14px_rgba(255,77,77,0.18)]'
    : isClockworkMode
    ? 'border-[#c084fc] shadow-[inset_0_0_16px_rgba(192,132,252,0.18)]'
    : isUnlockedStandard
    ? 'border-[#a855f7] shadow-[inset_0_0_14px_rgba(168,85,247,0.16)]'
    : concentrating
    ? 'border-[#c084fc]'
    : isStrained
    ? 'border-[#ff4d4d]/70'
    : 'border-[#581c87]';

  const statusColor =
    isDown || isCritical || isStrained
      ? 'text-[#ff4d4d]'
      : isClockworkMode || isUnlockedStandard || concentrating
      ? 'text-[#c084fc]'
      : 'text-[#4af626]';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, 420);
      onUpdatePortrait(activeSlot, dataUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to process image.'
      );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative aspect-square w-full max-w-[196px] mx-auto rounded bg-[#080c0a] border overflow-hidden transition-colors ${frameClass}`}
      >
        {activeImage ? (
          <img
            src={activeImage}
            alt={
              isClockworkMode
                ? `${name.trim() || 'Character'} — Clockwork Vessel Portrait`
                : `${name.trim() || 'Character'} Portrait`
            }
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${
              isDown ? 'grayscale contrast-125 opacity-75' : ''
            }`}
          />
        ) : (
          <RaceAvatarSvg
            race={avatarRace}
            gender={avatarGender}
            hpCurrent={hpCurrent}
            hpMax={hpMax}
            concentrating={concentrating}
            poisoned={poisoned}
            frightened={frightened}
            isClockworkMode={isClockworkMode}
            isUnlockedStandard={isUnlockedStandard}
            showSpectacles={showMedicSpectacles}
            label={`${name.trim() || 'Character'} diagnostic portrait — ${statusText}`}
          />
        )}

        {/* Corner Telemetry Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080c0a]/95 via-[#080c0a]/75 to-transparent px-2.5 py-1.5 flex items-center justify-between">
          <span
            className={`font-mono text-[10px] font-semibold tracking-wider ${statusColor}`}
          >
            {statusText}
          </span>
          <span className="font-mono text-[10px] text-[#9eb0a7] tabular-nums">
            {hpCurrent}/{hpMax}
          </span>
        </div>

        {/* Image Upload / Clear Overlay Controls (Player/DM View only) */}
        {!readOnly && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 print:hidden">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded bg-[#080c0a]/85 border border-[#2e243b] hover:border-[#c084fc] text-[#9eb0a7] hover:text-[#d4e0da] transition-colors cursor-pointer"
              title={
                isClockworkMode
                  ? 'Upload custom Clockwork Vessel portrait'
                  : 'Upload custom portrait image'
              }
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            {activeImage && (
              <button
                type="button"
                onClick={() => onUpdatePortrait(activeSlot, null)}
                className="p-1.5 rounded bg-[#080c0a]/85 border border-[#2e243b] hover:border-[#ff4d4d] text-[#9eb0a7] hover:text-[#ff4d4d] transition-colors cursor-pointer"
                title="Revert to reactive vector sprite"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Inline Sprite Race & Gender Picker in Edit Mode (when no custom photo overrides it) */}
      {isEditing && !readOnly && !activeImage && onUpdateAvatar && (
        <div className="max-w-[196px] mx-auto w-full flex flex-col gap-1.5 print:hidden">
          <select
            value={avatarRace}
            onChange={(e) =>
              onUpdateAvatar({ avatarRace: e.target.value as AvatarRace })
            }
            aria-label="Sprite ancestry"
            className="ledger-input w-full px-1.5 py-1 text-[11px] font-mono"
          >
            {AVATAR_RACE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                Sprite: {opt.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdateAvatar({ avatarGender: g })}
                className={`py-0.5 text-[10px] font-mono uppercase rounded border transition-colors cursor-pointer ${
                  avatarGender === g
                    ? 'bg-[#a855f7] border-[#c084fc] text-[#080c0a] font-bold'
                    : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] text-[#ff4d4d] text-center">{uploadError}</p>
      )}
    </div>
  );
};
