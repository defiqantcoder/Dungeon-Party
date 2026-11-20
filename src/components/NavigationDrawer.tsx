import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  LayoutGrid,
  Link2,
  Lock,
  Package,
  Search,
  Shield,
  SlidersHorizontal,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react';
import { ActiveScreen, LedgerState, ViewMode } from '../types/ledger';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  state: LedgerState;
  activeScreen: ActiveScreen;
  onSelectScreen: (screen: ActiveScreen) => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  covertUnlocked: boolean;
  onToggleCovert: () => void;
  onUpdateState: (updater: (prev: LedgerState) => LedgerState) => void;
  onNewBlankCharacter: () => void;
  onOpenSearch: () => void;
  onOpenEditor: () => void;
  onOpenExport: () => void;
}

const HOLD_DURATION_MS = 1000;

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  state,
  activeScreen,
  onSelectScreen,
  viewMode,
  onToggleViewMode,
  covertUnlocked,
  onToggleCovert,
  onUpdateState,
  onNewBlankCharacter,
  onOpenSearch,
  onOpenEditor,
  onOpenExport,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmNewBlank, setConfirmNewBlank] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const isPartyMode = viewMode === 'party';

  const cancelHold = () => {
    if (holdTimerRef.current !== null) {
      window.cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    if (isPartyMode) return;
    if (covertUnlocked) {
      onToggleCovert();
      return;
    }
    holdStartRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        holdTimerRef.current = null;
        setHoldProgress(0);
        onToggleCovert();
      } else {
        holdTimerRef.current = window.requestAnimationFrame(tick);
      }
    };
    holdTimerRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!open) {
      cancelHold();
      setConfirmNewBlank(false);
    }
    return () => cancelHold();
  }, [open]);

  const handleCopyPartyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'party');
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  };

  const screens: {
    id: ActiveScreen;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'core',
      label: '1. Core Sheet',
      subtitle: 'Abilities, Vitals, Skills & Persona',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'gear',
      label: '2. Gear & Notes',
      subtitle: 'Attacks, Spells, Supplies & Logs',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'custom',
      label: '3. Custom Ledger',
      subtitle: '6 Modular Panels (2×3 Grid)',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop Scrim */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Left Slide-Over Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and Mode Drawer"
        className={`relative z-10 h-full w-full max-w-sm bg-[#0b100e] border-r border-[#581c87] flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-[#2e243b] flex items-center justify-between gap-2 bg-[#080c0a]">
          <div className="min-w-0">
            <div className="font-display text-sm tracking-[0.06em] text-[#d4e0da] truncate">
              [ THE CLINICAL LEDGER ]
            </div>
            <div className="font-mono text-[10px] text-[#9eb0a7] truncate">
              {[
                state.identity.name.trim() || 'Unnamed Character',
                state.identity.occupation.trim(),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-[#2e243b] hover:border-[#c084fc] text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
            aria-label="Close Navigation Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* 1. Screen Navigation */}
          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#9eb0a7]">
              Screens
            </div>
            <div className="flex flex-col gap-1.5">
              {screens.map((item) => {
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectScreen(item.id);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded border transition-colors flex items-center gap-3 cursor-pointer ${
                      active
                        ? 'bg-[#171022] border-[#c084fc] text-[#d4e0da]'
                        : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87] hover:text-[#d4e0da]'
                    }`}
                  >
                    <span className={active ? 'text-[#c084fc]' : 'text-[#65766e]'}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-[#9eb0a7] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Viewing Mode: Player/DM Full View vs Party Share View (Safe Mode) */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[#2e243b]">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#9eb0a7]">
              Viewing Mode
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onToggleViewMode('player')}
                className={`w-full text-left px-3 py-2 rounded border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  !isPartyMode
                    ? 'bg-[#171022] border-[#a855f7] text-[#d4e0da]'
                    : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-4 h-4 text-[#c084fc] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">
                      Player / DM Full View
                    </div>
                    <div className="text-[10px] text-[#9eb0a7]">
                      Full editing &amp; private ledger access
                    </div>
                  </div>
                </div>
                {!isPartyMode && (
                  <span className="font-mono text-[10px] text-[#c084fc] shrink-0">
                    ACTIVE
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleViewMode('party')}
                className={`w-full text-left px-3 py-2 rounded border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  isPartyMode
                    ? 'bg-[#4af626]/10 border-[#4af626] text-[#4af626]'
                    : 'bg-[#080c0a] border-[#2e243b] text-[#9eb0a7] hover:border-[#4af626]/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">
                      Party Share View (Safe Mode)
                    </div>
                    <div className="text-[10px] opacity-80">
                      Read-only · hides all private sections &amp; notes
                    </div>
                  </div>
                </div>
                {isPartyMode && (
                  <span className="font-mono text-[10px] shrink-0">SAFE</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyPartyLink}
                className="w-full px-3 py-1.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] text-xs text-[#9eb0a7] hover:text-[#d4e0da] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4af626]" />
                    <span className="text-[#4af626]">
                      Copied Party-Safe Link (?mode=party)
                    </span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Copy Party-Safe Link (?mode=party)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Covert Arc Lock (Strictly hidden in Party Share View) */}
          {!isPartyMode && (
            <div className="flex flex-col gap-3 pt-3 border-t border-[#2e243b]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#c084fc]">
                  Covert Arc Lock
                </span>
                <span className="font-mono text-[10px] text-[#9eb0a7]">
                  {covertUnlocked ? 'UNLOCKED' : 'MASKED'}
                </span>
              </div>

              <button
                type="button"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleCovert();
                  }
                }}
                className={`relative overflow-hidden w-full px-3 py-2.5 rounded border text-xs font-mono transition-colors flex items-center justify-between gap-2 select-none cursor-pointer ${
                  covertUnlocked
                    ? 'bg-[#171022] border-[#c084fc] text-[#c084fc]'
                    : 'bg-[#080c0a] border-[#581c87] text-[#d4e0da] hover:border-[#a855f7]'
                }`}
              >
                {holdProgress > 0 && !covertUnlocked && (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#a855f7]/35 pointer-events-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {covertUnlocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Click to Re-Lock Covert Arc</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#9eb0a7]" />
                      <span>
                        {holdProgress > 0
                          ? 'Unlocking Covert Arc…'
                          : 'Hold to Unlock (or Ctrl+H)'}
                      </span>
                    </>
                  )}
                </span>
              </button>

              {!covertUnlocked ? (
                <p className="text-[11px] text-[#9eb0a7] leading-relaxed">
                  While masked, <span className="font-mono text-[#d4e0da]">[PRIVATE]</span>{' '}
                  sections and covert arc notes stay hidden.
                </p>
              ) : (
                <div className="surface-resonant rounded p-3 flex flex-col gap-3">
                  {/* Optional Experimental Clockwork Arc Notes (Only visible when enabled in F5) */}
                  {state.covert.clockworkVesselActive && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#c084fc] mb-1">
                        Alternate Arc — Clockwork / Construct Vessel
                      </label>
                      <textarea
                        rows={3}
                        value={state.covert.clockworkVesselArc}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            covert: {
                              ...prev.covert,
                              clockworkVesselArc: e.target.value,
                            },
                          }))
                        }
                        placeholder="Clockwork / Construct Vessel notes (synced with Screen 1)..."
                        className="ledger-input w-full p-2 text-xs leading-relaxed resize-y"
                      />
                    </div>
                  )}

                  {/* Synced Covert Arc Notes */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9eb0a7] mb-1">
                      Covert Arc — Lichdom / Undying Drift
                    </label>
                    <textarea
                      rows={3}
                      value={state.covert.undyingDriftArc}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          covert: {
                            ...prev.covert,
                            undyingDriftArc: e.target.value,
                          },
                        }))
                      }
                      placeholder="Lichdom / Undying Drift notes (synced with Screen 1)..."
                      className="ledger-input w-full p-2 text-xs leading-relaxed resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Quick Tools */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[#2e243b]">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#9eb0a7]">
              Quick Tools
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full px-3 py-2 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] text-xs text-[#d4e0da] flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Global Search</span>
                </span>
                <span className="font-mono text-[10px] text-[#9eb0a7]">F2</span>
              </button>

              {!isPartyMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditor();
                  }}
                  className="w-full px-3 py-2 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] text-xs text-[#d4e0da] flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>Full Editor &amp; JSON Backup</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#9eb0a7]">F5</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="w-full px-3 py-2 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#581c87] text-xs text-[#d4e0da] flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Export Markdown Snapshot</span>
                </span>
                <span className="font-mono text-[10px] text-[#9eb0a7]">F6</span>
              </button>
            </div>
          </div>

          {/* 5. Character Setup (Player/DM View only) */}
          {!isPartyMode && (
            <div className="flex flex-col gap-2 pt-3 border-t border-[#2e243b]">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#9eb0a7]">
                Character Setup
              </div>

              {!confirmNewBlank ? (
                <button
                  type="button"
                  onClick={() => setConfirmNewBlank(true)}
                  className="w-full px-3 py-2 rounded bg-[#080c0a] border border-[#581c87] hover:border-[#c084fc] text-xs text-[#d4e0da] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>New Blank Character</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#9eb0a7]">
                    RESET
                  </span>
                </button>
              ) : (
                <div className="bg-[#080c0a] border border-[#ff4d4d]/70 rounded p-3 flex flex-col gap-2.5">
                  <p className="text-[11px] text-[#d4e0da] leading-relaxed">
                    Start a fresh blank character? This resets identity, stats,
                    skills, vitals, gear, notes, macros (1–9), custom panels,
                    and roll history in this browser.
                  </p>
                  <p className="text-[10px] text-[#9eb0a7] font-mono">
                    Tip: Export a JSON backup (F5) first if you want to keep the
                    current character.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onNewBlankCharacter();
                        setConfirmNewBlank(false);
                        onClose();
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-[#ff4d4d] hover:bg-[#ff6666] text-[#080c0a] text-xs font-bold cursor-pointer"
                    >
                      Confirm Blank Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmNewBlank(false)}
                      className="px-2.5 py-1.5 rounded border border-[#2e243b] text-xs text-[#9eb0a7] hover:text-[#d4e0da] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
