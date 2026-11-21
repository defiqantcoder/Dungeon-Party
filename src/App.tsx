import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, LayoutGrid, Package, X } from 'lucide-react';
import { CoreSheetScreen } from './components/CoreSheetScreen';
import { CustomLedgerScreen } from './components/CustomLedgerScreen';
import { DiceDock } from './components/DiceDock';
import { GearNotesScreen } from './components/GearNotesScreen';
import {
  EditorTab,
  ExportMarkdownModal,
  FullEditorModal,
  GlobalSearchModal,
} from './components/GlobalModals';
import { NavigationDrawer } from './components/NavigationDrawer';
import { NewCharacterModal } from './components/NewCharacterModal';
import { SrdPickerKind, SrdPickerModal } from './components/SrdPickerModal';
import { TopHeaderBar } from './components/TopHeaderBar';
import {
  BlankCharacterOptions,
  createBlankCharacterState,
} from './data/defaultState';
import {
  ActiveScreen,
  CharacterRoster,
  CharacterSlot,
  CustomCondition,
  GearItem,
  LedgerState,
  RollMode,
  RollRecord,
  SpellEntry,
  SupplyCounter,
  UiDensity,
  ViewMode,
} from './types/ledger';
import { createId, rollD20Check, rollDiceExpression } from './utils/ledgerMath';
import {
  loadCharacterRoster,
  loadUiDensity,
  MAX_ROLL_HISTORY,
  saveCharacterRoster,
  saveUiDensity,
} from './utils/storage';

function detectInitialPartyParam(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode')?.toLowerCase() === 'party';
  } catch {
    return false;
  }
}

export default function App() {
  const [urlPartyParam] = useState<boolean>(() => detectInitialPartyParam());
  const [roster, setRoster] = useState<CharacterRoster>(() =>
    loadCharacterRoster()
  );
  const [uiDensity, setUiDensity] = useState<UiDensity>(() => loadUiDensity());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('core');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    urlPartyParam ? 'party' : 'player'
  );
  // Covert Arc ALWAYS defaults to locked/masked on every load
  const [covertUnlocked, setCovertUnlocked] = useState<boolean>(false);

  // Dice Dock mode
  const [rollMode, setRollMode] = useState<RollMode>('normal');

  // Drawer & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState<EditorTab>('stats');
  const [exportOpen, setExportOpen] = useState(false);
  const [newCharModalOpen, setNewCharModalOpen] = useState(false);
  const [srdPickerKind, setSrdPickerKind] = useState<SrdPickerKind | null>(null);

  const isPartyMode = viewMode === 'party';

  const activeSlot = useMemo<CharacterSlot>(
    () => roster.slots.find((s) => s.id === roster.activeId) ?? roster.slots[0],
    [roster]
  );

  const state = activeSlot.state;
  const rollHistory = activeSlot.rollHistory;

  // Subtle "Saved" indicator triggered whenever localStorage is updated (skipped on initial mount)
  const [savedVisible, setSavedVisible] = useState(false);
  const hasMountedRosterRef = useRef(false);
  const savedTimerRef = useRef<number | null>(null);

  const flashSavedIndicator = useCallback(() => {
    setSavedVisible(true);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = window.setTimeout(() => {
      setSavedVisible(false);
      savedTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // Persist character roster automatically to localStorage
  useEffect(() => {
    saveCharacterRoster(roster);
    if (!hasMountedRosterRef.current) {
      hasMountedRosterRef.current = true;
      return;
    }
    flashSavedIndicator();
  }, [roster, flashSavedIndicator]);

  // Persist display density preference
  useEffect(() => {
    saveUiDensity(uiDensity);
  }, [uiDensity]);

  // Enforce Covert Lock whenever entering Party Share View
  const handleToggleViewMode = useCallback((nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (nextMode === 'party') {
      setCovertUnlocked(false);
      setEditorOpen(false);
      setNewCharModalOpen(false);
      setSrdPickerKind(null);
    }
  }, []);

  const handleToggleCovert = useCallback(() => {
    if (viewMode === 'party') return;
    setCovertUnlocked((prev) => !prev);
  }, [viewMode]);

  const handleUpdateState = useCallback(
    (updater: (prev: LedgerState) => LedgerState) => {
      setRoster((prevRoster) => ({
        ...prevRoster,
        slots: prevRoster.slots.map((slot) =>
          slot.id === prevRoster.activeId
            ? {
                ...slot,
                state: updater(slot.state),
                updatedAt: new Date().toISOString(),
              }
            : slot
        ),
      }));
    },
    []
  );

  const updateActiveRolls = useCallback(
    (updater: (prev: RollRecord[]) => RollRecord[]) => {
      setRoster((prevRoster) => ({
        ...prevRoster,
        slots: prevRoster.slots.map((slot) =>
          slot.id === prevRoster.activeId
            ? {
                ...slot,
                rollHistory: updater(slot.rollHistory),
              }
            : slot
        ),
      }));
    },
    []
  );

  const [undoSnapshot, setUndoSnapshot] = useState<{
    roster: CharacterRoster;
    label: string;
  } | null>(null);

  const handleCreateBlankCharacter = useCallback(() => {
    setUndoSnapshot({
      roster,
      label: state.identity.name.trim() || 'Character Sheet',
    });
    setRoster((prevRoster) => ({
      ...prevRoster,
      slots: prevRoster.slots.map((slot) =>
        slot.id === prevRoster.activeId
          ? {
              ...slot,
              state: createBlankCharacterState(),
              rollHistory: [],
              updatedAt: new Date().toISOString(),
            }
          : slot
      ),
    }));
    setCovertUnlocked(false);
    setActiveScreen('core');
  }, [roster, state.identity.name]);

  const handleAddCharacterSlot = useCallback((options: BlankCharacterOptions) => {
    const newSlotId = createId('char');
    const newSlot: CharacterSlot = {
      id: newSlotId,
      state: createBlankCharacterState(options),
      rollHistory: [],
      updatedAt: new Date().toISOString(),
    };
    setRoster((prevRoster) => ({
      activeId: newSlotId,
      slots: [...prevRoster.slots, newSlot],
    }));
    setCovertUnlocked(false);
    setActiveScreen('core');
    setNewCharModalOpen(false);
  }, []);

  const handleSelectSlot = useCallback((slotId: string) => {
    setRoster((prevRoster) => {
      if (!prevRoster.slots.some((s) => s.id === slotId)) return prevRoster;
      return {
        ...prevRoster,
        activeId: slotId,
      };
    });
    // Always re-lock Covert Arc when switching characters for safety
    setCovertUnlocked(false);
  }, []);

  const handleDeleteSlot = useCallback(
    (slotId: string) => {
      if (roster.slots.length <= 1) return;
      const target = roster.slots.find((s) => s.id === slotId);
      setUndoSnapshot({
        roster,
        label: target?.state.identity.name.trim() || 'Deleted Character',
      });
      setRoster((prevRoster) => {
        const remaining = prevRoster.slots.filter((s) => s.id !== slotId);
        if (remaining.length === 0) return prevRoster;
        const nextActiveId =
          prevRoster.activeId === slotId
            ? remaining[0].id
            : prevRoster.activeId;
        return {
          activeId: nextActiveId,
          slots: remaining,
        };
      });
      setCovertUnlocked(false);
    },
    [roster]
  );

  const handleReplaceState = useCallback(
    (next: LedgerState) => {
      setUndoSnapshot({
        roster,
        label: state.identity.name.trim() || 'Character Sheet',
      });
      handleUpdateState(() => next);
    },
    [roster, state.identity.name, handleUpdateState]
  );

  const handleUndoReset = useCallback(() => {
    if (!undoSnapshot) return;
    setRoster(undoSnapshot.roster);
    setUndoSnapshot(null);
  }, [undoSnapshot]);

  // Auto-clear undo snapshot after 14 seconds
  useEffect(() => {
    if (!undoSnapshot) return;
    const timer = window.setTimeout(() => setUndoSnapshot(null), 14000);
    return () => window.clearTimeout(timer);
  }, [undoSnapshot]);

  const pushRoll = useCallback(
    (record: RollRecord) => {
      updateActiveRolls((prev) => [record, ...prev].slice(0, MAX_ROLL_HISTORY));
    },
    [updateActiveRolls]
  );

  const handleRollD20 = useCallback(
    (label: string, modifier: number, overrideMode?: RollMode) => {
      const record = rollD20Check(label, modifier, overrideMode ?? rollMode);
      pushRoll(record);
    },
    [rollMode, pushRoll]
  );

  const handleRollExpression = useCallback(
    (expression: string, label?: string, overrideMode?: RollMode) => {
      const record = rollDiceExpression(
        expression,
        label ?? expression,
        overrideMode ?? rollMode
      );
      pushRoll(record);
    },
    [rollMode, pushRoll]
  );

  const handleJumpToResult = useCallback(
    (screen: ActiveScreen, sectionId: string) => {
      setActiveScreen(screen);
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#c084fc]');
          window.setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#c084fc]');
          }, 1200);
        }
      }, 60);
    },
    []
  );

  const handlePrintDossier = useCallback(() => {
    window.setTimeout(() => {
      window.print();
    }, 60);
  }, []);

  // Global keyboard shortcuts: F2 Search, F5 Editor, F6 Export, Ctrl+H / Ctrl+Shift+U / Alt+Shift+L Covert Lock, Esc close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setSearchOpen(false);
        setEditorOpen(false);
        setExportOpen(false);
        setNewCharModalOpen(false);
        setSrdPickerKind(null);
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        if (!isPartyMode) {
          setEditorInitialTab('stats');
          setEditorOpen((prev) => !prev);
        }
        return;
      }

      if (e.key === 'F6') {
        e.preventDefault();
        setExportOpen((prev) => !prev);
        return;
      }

      const isCovertShortcut =
        ((e.ctrlKey || e.metaKey) &&
          !e.shiftKey &&
          !e.altKey &&
          e.key.toLowerCase() === 'h') ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === 'u') ||
        (e.altKey && e.shiftKey && e.key.toLowerCase() === 'l');

      if (isCovertShortcut && !isPartyMode) {
        e.preventDefault();
        setCovertUnlocked((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPartyMode]);

  const handleAddSpell = (spell: SpellEntry) => {
    handleUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        spells: [...prev.gearAndNotes.spells, spell],
      },
    }));
  };

  const handleAddGear = (item: GearItem) => {
    handleUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        gear: [...prev.gearAndNotes.gear, item],
      },
    }));
  };

  const handleAddSupply = (supply: SupplyCounter) => {
    handleUpdateState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        miniatureSupplies: [...prev.gearAndNotes.miniatureSupplies, supply],
      },
    }));
  };

  const handleAddCondition = (cond: CustomCondition) => {
    handleUpdateState((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        conditions: {
          ...prev.vitals.conditions,
          extra: [...prev.vitals.conditions.extra, cond],
        },
      },
    }));
  };

  return (
    <div
      data-density={uiDensity}
      className="min-h-screen bg-[#080c0a] text-[#d4e0da] flex flex-col"
    >
      {/* Persistent Top Header Bar */}
      <TopHeaderBar
        characterName={state.identity.name}
        occupation={state.identity.occupation}
        setting={state.identity.setting}
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        isUrlLockedParty={urlPartyParam}
        covertUnlocked={covertUnlocked}
        clockworkVesselActive={state.covert.clockworkVesselActive}
        onToggleCovert={handleToggleCovert}
        onChangeCharacterName={(name) =>
          handleUpdateState((prev) => ({
            ...prev,
            identity: { ...prev.identity, name },
          }))
        }
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenEditor={() => {
          setEditorInitialTab('stats');
          setEditorOpen(true);
        }}
        onOpenExport={() => setExportOpen(true)}
        isSavedVisible={savedVisible && !isPartyMode}
      />

      {/* Party Share Mode Banner */}
      {isPartyMode && (
        <div className="print-hide bg-[#4af626]/8 border-b border-[#4af626]/30">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#4af626]">
            <span>
              PARTY SHARE VIEW (SAFE MODE) — Read-only shared view. Private
              sections and editing controls are hidden.
            </span>
            <button
              type="button"
              onClick={() => handleToggleViewMode('player')}
              className="underline hover:text-[#d4e0da] cursor-pointer"
            >
              Return to Player/DM View
            </button>
          </div>
        </div>
      )}

      {/* Undo / Revert Toast for Accidental Reset, Delete, or Replace */}
      {undoSnapshot && !isPartyMode && (
        <div className="print-hide bg-[#171022] border-b border-[#a855f7] px-4 py-2 flex items-center justify-between gap-3 text-xs text-[#d4e0da] shadow-lg animate-in fade-in duration-150">
          <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between gap-2">
            <span>
              Character updated or removed. Revert back to{' '}
              <strong className="text-[#c084fc]">{undoSnapshot.label}</strong>?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleUndoReset}
                className="px-2.5 py-1 rounded bg-[#a855f7] hover:bg-[#c084fc] text-[#080c0a] font-bold cursor-pointer"
              >
                Undo / Restore
              </button>
              <button
                type="button"
                onClick={() => setUndoSnapshot(null)}
                className="text-[#9eb0a7] hover:text-[#d4e0da] p-1 cursor-pointer"
                aria-label="Dismiss undo toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 pb-44 md:pb-32">
        {activeScreen === 'core' && (
          <CoreSheetScreen
            state={state}
            readOnly={isPartyMode}
            covertUnlocked={covertUnlocked}
            rollMode={rollMode}
            onUpdateState={handleUpdateState}
            onRollD20={handleRollD20}
            onRollExpression={handleRollExpression}
            onOpenConditionPicker={() => setSrdPickerKind('condition')}
            onOpenEditor={(tab) => {
              setEditorInitialTab(tab);
              setEditorOpen(true);
            }}
          />
        )}

        {activeScreen === 'gear' && (
          <GearNotesScreen
            state={state}
            readOnly={isPartyMode}
            covertUnlocked={covertUnlocked}
            rollMode={rollMode}
            onUpdateState={handleUpdateState}
            onRollD20={handleRollD20}
            onRollExpression={handleRollExpression}
            onOpenSrdPicker={(kind) => setSrdPickerKind(kind)}
          />
        )}

        {activeScreen === 'custom' && (
          <CustomLedgerScreen
            state={state}
            readOnly={isPartyMode}
            covertUnlocked={covertUnlocked}
            onUpdateState={handleUpdateState}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
        )}
      </main>

      {/* Left Slide-Over Navigation, Roster & Mode Drawer */}
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        state={state}
        rosterSlots={roster.slots}
        activeSlotId={roster.activeId}
        onSelectSlot={handleSelectSlot}
        onDeleteSlot={handleDeleteSlot}
        onOpenNewCharacterModal={() => setNewCharModalOpen(true)}
        uiDensity={uiDensity}
        onChangeUiDensity={setUiDensity}
        onPrintDossier={handlePrintDossier}
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        covertUnlocked={covertUnlocked}
        onToggleCovert={handleToggleCovert}
        onUpdateState={handleUpdateState}
        onNewBlankCharacter={handleCreateBlankCharacter}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenEditor={() => {
          setEditorInitialTab('stats');
          setEditorOpen(true);
        }}
        onOpenExport={() => setExportOpen(true)}
      />

      {/* Persistent Bottom Dice Dock (sits cleanly above mobile tab bar on < md) */}
      <DiceDock
        state={state}
        rollMode={rollMode}
        onChangeRollMode={setRollMode}
        rollHistory={rollHistory}
        onRollD20={handleRollD20}
        onRollExpression={handleRollExpression}
        onClearHistory={() => updateActiveRolls(() => [])}
        onOpenMacroEditor={() => {
          setEditorInitialTab('macros');
          setEditorOpen(true);
        }}
        readOnly={isPartyMode}
        hotkeysEnabled={
          !drawerOpen &&
          !searchOpen &&
          !editorOpen &&
          !exportOpen &&
          !newCharModalOpen &&
          !srdPickerKind
        }
      />

      {/* Streamlined Mobile Bottom Tab Bar (< md viewports) */}
      <nav
        aria-label="Mobile screen navigation"
        className="print-hide md:hidden fixed bottom-0 inset-x-0 z-40 h-12 bg-[#080c0a]/98 border-t border-[#2e243b] grid grid-cols-3"
      >
        {(
          [
            {
              id: 'core',
              label: 'Core Sheet',
              icon: <FileSpreadsheet className="w-4 h-4" />,
            },
            {
              id: 'gear',
              label: 'Gear & Notes',
              icon: <Package className="w-4 h-4" />,
            },
            {
              id: 'custom',
              label: 'Custom',
              icon: <LayoutGrid className="w-4 h-4" />,
            },
          ] as const
        ).map((tab) => {
          const active = activeScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveScreen(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono transition-colors cursor-pointer ${
                active
                  ? 'text-[#c084fc] bg-[#171022]/80 border-t-2 border-[#a855f7]'
                  : 'text-[#9eb0a7] hover:text-[#d4e0da] border-t-2 border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* New Character Creator Modal (12 Races × Male/Female HP-Reactive Sprites) */}
      {newCharModalOpen && !isPartyMode && (
        <NewCharacterModal
          onClose={() => setNewCharModalOpen(false)}
          onCreateCharacter={handleAddCharacterSlot}
        />
      )}

      {/* Contextual On-Demand 2014 5e SRD / Custom Picker Modal */}
      {srdPickerKind && !isPartyMode && (
        <SrdPickerModal
          kind={srdPickerKind}
          clockworkEnabled={!isPartyMode && state.covert.clockworkVesselActive}
          onClose={() => setSrdPickerKind(null)}
          onAddSpell={handleAddSpell}
          onAddGear={handleAddGear}
          onAddSupply={handleAddSupply}
          onAddCondition={handleAddCondition}
        />
      )}

      {/* F2 Global Search Modal */}
      {searchOpen && (
        <GlobalSearchModal
          state={state}
          isPartyMode={isPartyMode}
          covertUnlocked={covertUnlocked}
          onClose={() => setSearchOpen(false)}
          onJump={handleJumpToResult}
        />
      )}

      {/* F5 Full Editor & Backup Modal */}
      {editorOpen && !isPartyMode && (
        <FullEditorModal
          state={state}
          initialTab={editorInitialTab}
          covertUnlocked={covertUnlocked}
          onClose={() => setEditorOpen(false)}
          onUpdateState={handleUpdateState}
          onReplaceState={handleReplaceState}
          onNewBlankCharacter={handleCreateBlankCharacter}
          onOpenNewCharacterModal={() => setNewCharModalOpen(true)}
        />
      )}

      {/* F6 Export Markdown Modal */}
      {exportOpen && (
        <ExportMarkdownModal
          state={state}
          isPartyMode={isPartyMode}
          covertUnlocked={covertUnlocked}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
