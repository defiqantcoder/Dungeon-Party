import { useCallback, useEffect, useState } from 'react';
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
import { SrdPickerKind, SrdPickerModal } from './components/SrdPickerModal';
import { NavigationDrawer } from './components/NavigationDrawer';
import { TopHeaderBar } from './components/TopHeaderBar';
import { createBlankCharacterState } from './data/defaultState';
import {
  ActiveScreen,
  CustomCondition,
  GearItem,
  LedgerState,
  RollMode,
  RollRecord,
  SpellEntry,
  SupplyCounter,
  ViewMode,
} from './types/ledger';
import { rollD20Check, rollDiceExpression } from './utils/ledgerMath';
import {
  loadLedgerState,
  loadRollHistory,
  MAX_ROLL_HISTORY,
  saveLedgerState,
  saveRollHistory,
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
  const [state, setState] = useState<LedgerState>(() => loadLedgerState());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('core');
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    urlPartyParam ? 'party' : 'player'
  );
  // Covert Arc ALWAYS defaults to locked/masked on every load
  const [covertUnlocked, setCovertUnlocked] = useState<boolean>(false);

  // Dice Dock state
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [rollHistory, setRollHistory] = useState<RollRecord[]>(() =>
    loadRollHistory()
  );

  // Drawer & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState<EditorTab>('stats');
  const [exportOpen, setExportOpen] = useState(false);
  const [srdPickerKind, setSrdPickerKind] = useState<SrdPickerKind | null>(null);

  const isPartyMode = viewMode === 'party';

  // Persist state automatically to localStorage
  useEffect(() => {
    saveLedgerState(state);
  }, [state]);

  // Persist roll history automatically
  useEffect(() => {
    saveRollHistory(rollHistory);
  }, [rollHistory]);

  // Enforce Covert Lock whenever entering Party Share View
  const handleToggleViewMode = useCallback((nextMode: ViewMode) => {
    setViewMode(nextMode);
    if (nextMode === 'party') {
      setCovertUnlocked(false);
      setEditorOpen(false);
      setSrdPickerKind(null);
    }
  }, []);

  const handleToggleCovert = useCallback(() => {
    if (viewMode === 'party') return;
    setCovertUnlocked((prev) => !prev);
  }, [viewMode]);

  const handleUpdateState = useCallback(
    (updater: (prev: LedgerState) => LedgerState) => {
      setState((prev) => updater(prev));
    },
    []
  );

  const handleCreateBlankCharacter = useCallback(() => {
    setState(createBlankCharacterState());
    setRollHistory([]);
    setCovertUnlocked(false);
    setActiveScreen('core');
  }, []);

  const pushRoll = useCallback((record: RollRecord) => {
    setRollHistory((prev) => [record, ...prev].slice(0, MAX_ROLL_HISTORY));
  }, []);

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

  // Global keyboard shortcuts: F2 Search, F5 Editor, F6 Export, Ctrl+Shift+U / Alt+Shift+L Covert Lock, Esc close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setSearchOpen(false);
        setEditorOpen(false);
        setExportOpen(false);
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
    setState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        spells: [...prev.gearAndNotes.spells, spell],
      },
    }));
  };

  const handleAddGear = (item: GearItem) => {
    setState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        gear: [...prev.gearAndNotes.gear, item],
      },
    }));
  };

  const handleAddSupply = (supply: SupplyCounter) => {
    setState((prev) => ({
      ...prev,
      gearAndNotes: {
        ...prev.gearAndNotes,
        miniatureSupplies: [...prev.gearAndNotes.miniatureSupplies, supply],
      },
    }));
  };

  const handleAddCondition = (cond: CustomCondition) => {
    setState((prev) => ({
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
    <div className="min-h-screen bg-[#080c0a] text-[#d4e0da] flex flex-col">
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
      />

      {/* Party Share Mode Banner */}
      {isPartyMode && (
        <div className="bg-[#4af626]/8 border-b border-[#4af626]/30">
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

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 pb-36 md:pb-32">
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

      {/* Left Slide-Over Navigation & Mode Drawer */}
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        state={state}
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

      {/* Persistent Bottom Dice Dock */}
      <DiceDock
        state={state}
        rollMode={rollMode}
        onChangeRollMode={setRollMode}
        rollHistory={rollHistory}
        onRollD20={handleRollD20}
        onRollExpression={handleRollExpression}
        onClearHistory={() => setRollHistory([])}
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
          !srdPickerKind
        }
      />

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
          onReplaceState={(next) => setState(next)}
          onNewBlankCharacter={handleCreateBlankCharacter}
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
