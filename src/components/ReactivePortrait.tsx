import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { compressImageToDataUrl } from '../utils/storage';

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
  readOnly: boolean;
  onUpdatePortrait: (slot: 'standard' | 'vessel', dataUrl: string | null) => void;
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
  readOnly,
  onUpdatePortrait,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isDown = hpCurrent <= 0;
  const hpRatio = hpMax > 0 ? hpCurrent / hpMax : 1;
  const isStrained = !isDown && hpRatio <= 0.5;
  const isUnlockedStandard = !readOnly && covertUnlocked && !isClockworkMode;

  const activeSlot: 'standard' | 'vessel' = isClockworkMode ? 'vessel' : 'standard';
  const activeImage = isClockworkMode ? portraitVessel : portraitStandard;

  const statusText = isDown
    ? 'CRITICAL · 0 HP'
    : isClockworkMode
    ? 'CLOCKWORK VESSEL'
    : isUnlockedStandard
    ? 'COVERT UNLOCKED'
    : concentrating
    ? 'CONCENTRATING'
    : isStrained
    ? 'STRAINED VITALS'
    : poisoned || frightened
    ? 'CONDITION ACTIVE'
    : 'VITALS NOMINAL';

  const frameClass = isDown
    ? 'border-[#ff4d4d] glow-crimson'
    : isClockworkMode
    ? 'border-[#c084fc] shadow-[inset_0_0_16px_rgba(192,132,252,0.18)]'
    : isUnlockedStandard
    ? 'border-[#a855f7] shadow-[inset_0_0_14px_rgba(168,85,247,0.16)]'
    : concentrating
    ? 'border-[#a855f7]'
    : isStrained
    ? 'border-[#ff4d4d]/70'
    : 'border-[#581c87]';

  const statusColor = isDown
    ? 'text-[#ff4d4d]'
    : isClockworkMode || isUnlockedStandard || concentrating
    ? 'text-[#c084fc]'
    : isStrained
    ? 'text-[#ff4d4d]'
    : 'text-[#4af626]';

  const strokePrimary = isDown
    ? '#ff4d4d'
    : isClockworkMode || isUnlockedStandard
    ? '#c084fc'
    : concentrating
    ? '#c084fc'
    : '#a855f7';

  const strokeSecondary = isDown
    ? '#ff4d4d'
    : isClockworkMode
    ? '#d4e0da'
    : isUnlockedStandard
    ? '#c084fc'
    : '#4af626';

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
          /* Crisp Vector Clinical & Horological Telemetry Emblem */
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full block"
            role="img"
            aria-label={`${name.trim() || 'Character'} diagnostic portrait — ${statusText}`}
          >
            <defs>
              <pattern
                id="clinical-grid"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke={isUnlockedStandard || isClockworkMode ? '#581c87' : '#2e243b'}
                  strokeWidth="0.6"
                  opacity="0.55"
                />
              </pattern>
            </defs>

            <rect width="200" height="200" fill="#080c0a" />
            <rect width="200" height="200" fill="url(#clinical-grid)" />

            {/* Outer diagnostic dial */}
            <circle
              cx="100"
              cy="92"
              r="68"
              fill="none"
              stroke={isUnlockedStandard || isClockworkMode ? '#581c87' : '#2e243b'}
              strokeWidth="1"
            />
            <circle
              cx="100"
              cy="92"
              r="60"
              fill="none"
              stroke={strokePrimary}
              strokeWidth={isUnlockedStandard || isClockworkMode ? '1.5' : '1.2'}
              strokeDasharray={
                isClockworkMode
                  ? '6 3 2 3'
                  : isUnlockedStandard
                  ? '14 4'
                  : '10 6'
              }
              opacity="0.85"
            />

            {/* Secondary unlocked arcane-horological ring */}
            {isUnlockedStandard && (
              <circle
                cx="100"
                cy="92"
                r="52"
                fill="none"
                stroke="#a855f7"
                strokeWidth="0.9"
                strokeDasharray="2 5"
                opacity="0.7"
              />
            )}

            {/* Calibration ticks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 100 + Math.cos(angle) * 63;
              const y1 = 92 + Math.sin(angle) * 63;
              const x2 = 100 + Math.cos(angle) * 68;
              const y2 = 92 + Math.sin(angle) * 68;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={i % 3 === 0 ? strokePrimary : '#581c87'}
                  strokeWidth={i % 3 === 0 ? '1.5' : '1'}
                />
              );
            })}

            {isClockworkMode ? (
              /* Clockwork / Construct Vessel Escapement & Optical Iris */
              <g>
                <circle
                  cx="100"
                  cy="92"
                  r="42"
                  fill="#171022"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                {/* Gear teeth ring */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i * 22.5 * Math.PI) / 180;
                  const x1 = 100 + Math.cos(angle) * 34;
                  const y1 = 92 + Math.sin(angle) * 34;
                  const x2 = 100 + Math.cos(angle) * 40;
                  const y2 = 92 + Math.sin(angle) * 40;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#c084fc"
                      strokeWidth="2.5"
                    />
                  );
                })}
                {/* Inner escapement struts */}
                <circle
                  cx="100"
                  cy="92"
                  r="24"
                  fill="#080c0a"
                  stroke="#a855f7"
                  strokeWidth="1.2"
                />
                <line x1="76" y1="92" x2="124" y2="92" stroke="#581c87" strokeWidth="1" />
                <line x1="100" y1="68" x2="100" y2="116" stroke="#581c87" strokeWidth="1" />
                {/* Twin optic lenses */}
                <circle cx="88" cy="88" r="5" fill="none" stroke="#c084fc" strokeWidth="1.5" />
                <circle cx="88" cy="88" r="1.8" fill={isDown ? '#ff4d4d' : '#c084fc'} />
                <circle cx="112" cy="88" r="5" fill="none" stroke="#c084fc" strokeWidth="1.5" />
                <circle cx="112" cy="88" r="1.8" fill={isDown ? '#ff4d4d' : '#c084fc'} />
                {/* Precision chronometer needle */}
                <line
                  x1="100"
                  y1="92"
                  x2="100"
                  y2="74"
                  stroke="#d4e0da"
                  strokeWidth="1.4"
                />
                <line
                  x1="100"
                  y1="92"
                  x2="114"
                  y2="100"
                  stroke="#a855f7"
                  strokeWidth="1.2"
                />
                <circle cx="100" cy="92" r="2.5" fill="#d4e0da" />
              </g>
            ) : (
              /* Standard & Covert-Unlocked Practitioner Portrait Telemetry */
              <g>
                {/* Silhouette Head & Collar */}
                <path
                  d="M 64 146 C 68 124, 82 118, 100 118 C 118 118, 132 124, 136 146"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.3"
                />
                {/* Gnome pointed ear geometry */}
                <path
                  d="M 73 88 L 62 84 L 72 95 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 127 88 L 138 84 L 128 95 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                {/* Head contour */}
                <ellipse
                  cx="100"
                  cy="88"
                  rx="26"
                  ry="28"
                  fill="#0b100e"
                  stroke={strokePrimary}
                  strokeWidth="1.5"
                />
                {/* Horologist / Medic Spectacles */}
                <circle
                  cx="89"
                  cy="86"
                  r="8"
                  fill="#171022"
                  stroke="#c084fc"
                  strokeWidth="1.3"
                />
                <circle
                  cx="111"
                  cy="86"
                  r="8"
                  fill="#171022"
                  stroke="#c084fc"
                  strokeWidth="1.3"
                />
                <line
                  x1="97"
                  y1="86"
                  x2="103"
                  y2="86"
                  stroke="#c084fc"
                  strokeWidth="1.3"
                />
                {/* Reactive Eyes */}
                {isDown ? (
                  <g stroke="#ff4d4d" strokeWidth="1.6">
                    <line x1="86" y1="83" x2="92" y2="89" />
                    <line x1="92" y1="83" x2="86" y2="89" />
                    <line x1="108" y1="83" x2="114" y2="89" />
                    <line x1="114" y1="83" x2="108" y2="89" />
                  </g>
                ) : (
                  <g>
                    <circle
                      cx="89"
                      cy="86"
                      r={concentrating || isUnlockedStandard ? '2.8' : '2'}
                      fill={
                        concentrating || isUnlockedStandard ? '#c084fc' : '#d4e0da'
                      }
                    />
                    <circle
                      cx="111"
                      cy="86"
                      r={concentrating || isUnlockedStandard ? '2.8' : '2'}
                      fill={
                        concentrating || isUnlockedStandard ? '#c084fc' : '#d4e0da'
                      }
                    />
                  </g>
                )}
                {/* Expression line */}
                {isDown ? (
                  <line
                    x1="93"
                    y1="103"
                    x2="107"
                    y2="103"
                    stroke="#ff4d4d"
                    strokeWidth="1.3"
                  />
                ) : isStrained || frightened || poisoned ? (
                  <path
                    d="M 92 104 Q 100 100 108 104"
                    fill="none"
                    stroke="#d4e0da"
                    strokeWidth="1.3"
                  />
                ) : isUnlockedStandard ? (
                  <line
                    x1="93"
                    y1="103"
                    x2="107"
                    y2="103"
                    stroke="#c084fc"
                    strokeWidth="1.3"
                  />
                ) : (
                  <path
                    d="M 92 102 Q 100 106 108 102"
                    fill="none"
                    stroke="#d4e0da"
                    strokeWidth="1.3"
                  />
                )}
                {/* Subtle clinical lapel cross (shifts to resonant diamond when Covert Unlocked) */}
                {isUnlockedStandard ? (
                  <path
                    d="M 100 125 L 106 131 L 100 137 L 94 131 Z"
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.3"
                  />
                ) : (
                  <path
                    d="M 100 126 V 136 M 95 131 H 105"
                    stroke={strokeSecondary}
                    strokeWidth="1.4"
                    opacity="0.85"
                  />
                )}
              </g>
            )}

            {/* Bottom Biometric Trace */}
            <path
              d={
                isDown
                  ? 'M 14 176 L 186 176'
                  : 'M 14 176 L 56 176 L 64 168 L 72 184 L 80 162 L 88 180 L 96 176 L 186 176'
              }
              fill="none"
              stroke={isDown ? '#ff4d4d' : strokeSecondary}
              strokeWidth="1.3"
              opacity="0.85"
            />
          </svg>
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
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
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
                title="Revert to vector clinical emblem"
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

      {uploadError && (
        <p className="text-[11px] text-[#ff4d4d] text-center">{uploadError}</p>
      )}
    </div>
  );
};
