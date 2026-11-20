import React, { useEffect, useRef, useState } from 'react';
import {
  Cog,
  Download,
  Eye,
  Link2,
  Lock,
  Menu,
  Pencil,
  Search,
  Shield,
  SlidersHorizontal,
  Unlock,
  Check,
} from 'lucide-react';
import { ActiveScreen, ViewMode } from '../types/ledger';

interface TopHeaderBarProps {
  characterName: string;
  occupation: string;
  setting: string;
  activeScreen: ActiveScreen;
  onSelectScreen: (screen: ActiveScreen) => void;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  isUrlLockedParty: boolean;
  covertUnlocked: boolean;
  clockworkVesselActive: boolean;
  onToggleCovert: () => void;
  onChangeCharacterName: (name: string) => void;
  onOpenDrawer: () => void;
  onOpenSearch: () => void;
  onOpenEditor: () => void;
  onOpenExport: () => void;
}

const HOLD_DURATION_MS = 1100;

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  characterName,
  occupation,
  setting,
  activeScreen,
  onSelectScreen,
  viewMode,
  onToggleViewMode,
  isUrlLockedParty,
  covertUnlocked,
  clockworkVesselActive,
  onToggleCovert,
  onChangeCharacterName,
  onOpenDrawer,
  onOpenSearch,
  onOpenEditor,
  onOpenExport,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(characterName);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const isPartyMode = viewMode === 'party';

  useEffect(() => {
    if (!editingName) {
      setDraftName(characterName);
    }
  }, [characterName, editingName]);

  useEffect(() => {
    if (isPartyMode && editingName) {
      setEditingName(false);
    }
  }, [isPartyMode, editingName]);

  const startEditingName = () => {
    if (isPartyMode) return;
    setDraftName(characterName);
    setEditingName(true);
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const commitName = () => {
    onChangeCharacterName(draftName.trim());
    setEditingName(false);
  };

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
      // Single click immediately re-locks for safety
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
    return () => {
      if (holdTimerRef.current !== null) {
        window.cancelAnimationFrame(holdTimerRef.current);
      }
    };
  }, []);

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

  const screens: { id: ActiveScreen; label: string; shortLabel: string }[] = [
    { id: 'core', label: '1. Core Sheet', shortLabel: '1. Core' },
    { id: 'gear', label: '2. Gear & Notes', shortLabel: '2. Gear' },
    { id: 'custom', label: '3. Custom Ledger', shortLabel: '3. Custom' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080c0a]/95 backdrop-blur-sm border-b border-[#2e243b]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6">
        {/* Primary Row */}
        <div className="min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {/* Drawer Trigger + Brand & Character Stamp */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onOpenDrawer}
              className="h-8 w-8 rounded bg-[#0b100e] border border-[#2e243b] hover:border-[#c084fc] text-[#9eb0a7] hover:text-[#d4e0da] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Open Navigation & Mode Drawer"
              title="Open Navigation & Mode Drawer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-display text-sm sm:text-base tracking-[0.06em] text-[#d4e0da] whitespace-nowrap shrink-0 flex items-center gap-1.5">
                <span>[ THE CLINICAL LEDGER ] —</span>
                {editingName && !isPartyMode ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      onChangeCharacterName(e.target.value);
                    }}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitName();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setDraftName(characterName);
                        setEditingName(false);
                      }
                    }}
                    placeholder="CHARACTER NAME"
                    aria-label="Character name"
                    className="ledger-input h-7 w-36 sm:w-44 px-2 text-sm font-display uppercase tracking-[0.06em] text-[#c084fc]"
                  />
                ) : !isPartyMode ? (
                  <button
                    type="button"
                    onClick={startEditingName}
                    className="group inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded hover:bg-[#171022] border border-transparent hover:border-[#581c87] transition-colors cursor-pointer"
                    title="Click to rename character"
                  >
                    <span
                      className={
                        characterName.trim()
                          ? 'text-[#c084fc]'
                          : 'text-[#9eb0a7] italic'
                      }
                    >
                      {(characterName.trim() || 'UNNAMED').toUpperCase()}
                    </span>
                    <Pencil className="w-3 h-3 text-[#65766e] group-hover:text-[#c084fc] transition-colors" />
                  </button>
                ) : (
                  <span
                    className={
                      characterName.trim()
                        ? 'text-[#c084fc]'
                        : 'text-[#9eb0a7] italic'
                    }
                  >
                    {(characterName.trim() || 'UNNAMED').toUpperCase()}
                  </span>
                )}
              </span>
              {(occupation.trim() || setting.trim()) && (
                <span className="hidden xl:inline text-xs text-[#9eb0a7] truncate">
                  {[occupation.trim(), setting.trim()].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>

          {/* Screen Switcher */}
          <nav
            aria-label="Ledger screens"
            className="flex items-center gap-1 bg-[#0b100e] border border-[#2e243b] rounded p-0.5 order-3 lg:order-2 w-full lg:w-auto justify-between lg:justify-start"
          >
            {screens.map((tab) => {
              const active = activeScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectScreen(tab.id)}
                  className={`flex-1 lg:flex-none px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#a855f7] text-[#080c0a] font-semibold'
                      : 'text-[#9eb0a7] hover:text-[#d4e0da] hover:bg-[#171022]'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 order-2 lg:order-3 shrink-0 flex-wrap">
            {/* View Mode Toggle */}
            <div
              className="flex items-center bg-[#0b100e] border border-[#2e243b] rounded p-0.5"
              role="group"
              aria-label="Viewing mode"
            >
              <button
                type="button"
                onClick={() => onToggleViewMode('player')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  !isPartyMode
                    ? 'bg-[#171022] text-[#c084fc] border border-[#581c87]'
                    : 'text-[#9eb0a7] hover:text-[#d4e0da] border border-transparent'
                }`}
                title={
                  isUrlLockedParty
                    ? 'Switch back to local Player/DM View'
                    : 'Player / DM Full View'
                }
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Player/DM</span>
                <span className="sm:hidden">DM</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('party')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isPartyMode
                    ? 'bg-[#4af626]/15 text-[#4af626] border border-[#4af626]/60'
                    : 'text-[#9eb0a7] hover:text-[#d4e0da] border border-transparent'
                }`}
                title="Party Share View (Safe Mode)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Party Share</span>
                <span className="sm:hidden">Party</span>
              </button>
            </div>

            {/* Copy Party Link */}
            <button
              type="button"
              onClick={handleCopyPartyLink}
              className="h-7 px-2 text-[11px] text-[#9eb0a7] hover:text-[#d4e0da] bg-[#0b100e] border border-[#2e243b] hover:border-[#581c87] rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              title="Copy shareable Party-Safe URL (?mode=party)"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4af626]" />
                  <span className="text-[#4af626] hidden md:inline">Copied</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Share Link</span>
                </>
              )}
            </button>

            {/* Covert / Clockwork Status Indicator */}
            {isPartyMode ? (
              <div
                className="h-7 px-2.5 text-[11px] font-mono tracking-wider uppercase text-[#4af626] bg-[#4af626]/8 border border-[#4af626]/40 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Party Share Safe Mode active — private records hidden"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Party Safe</span>
              </div>
            ) : (
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
                className={`relative overflow-hidden h-7 px-2.5 text-[11px] font-mono tracking-wide rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 select-none cursor-pointer ${
                  covertUnlocked
                    ? clockworkVesselActive
                      ? 'bg-[#171022] border-[#c084fc] text-[#c084fc]'
                      : 'bg-[#171022] border-[#a855f7] text-[#c084fc]'
                    : 'bg-[#0b100e] border-[#2e243b] text-[#9eb0a7] hover:border-[#581c87] hover:text-[#d4e0da]'
                }`}
                title={
                  covertUnlocked
                    ? 'Click or press Ctrl+H to immediately re-lock Covert Arc'
                    : 'Hold 1.1s or press Ctrl+H to unlock Covert Arc'
                }
              >
                {holdProgress > 0 && !covertUnlocked && (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#a855f7]/35 pointer-events-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {covertUnlocked ? (
                    clockworkVesselActive ? (
                      <>
                        <Cog className="w-3.5 h-3.5 text-[#c084fc]" />
                        <span>Vessel Active</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-[#c084fc]" />
                        <span>Unlocked</span>
                      </>
                    )
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>{holdProgress > 0 ? 'Unlocking…' : 'Covert'}</span>
                    </>
                  )}
                </span>
              </button>
            )}

            {/* Utility Modals: F2 / F5 / F6 */}
            <div className="flex items-center gap-1 border-l border-[#2e243b] pl-2">
              <button
                type="button"
                onClick={onOpenSearch}
                className="h-7 px-2 text-[11px] text-[#9eb0a7] hover:text-[#d4e0da] bg-[#0b100e] border border-[#2e243b] hover:border-[#581c87] rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Global Search (F2)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-mono text-[10px]">F2</span>
              </button>
              {!isPartyMode && (
                <button
                  type="button"
                  onClick={onOpenEditor}
                  className="h-7 px-2 text-[11px] text-[#9eb0a7] hover:text-[#d4e0da] bg-[#0b100e] border border-[#2e243b] hover:border-[#581c87] rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Full Editor & Backup (F5)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden md:inline font-mono text-[10px]">F5</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenExport}
                className="h-7 px-2 text-[11px] text-[#9eb0a7] hover:text-[#d4e0da] bg-[#0b100e] border border-[#2e243b] hover:border-[#581c87] rounded transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                title="Export Markdown Snapshot (F6)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-mono text-[10px]">F6</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
