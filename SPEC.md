Overview

An interactive, responsive dark-mode character ledger web application built initially around Pip (Player: Sinnoh), a Lawful Good ~300-year-old Gnome Community Wellness Practitioner and Memory/Trauma Care Specialist in Veyr (The Quiet Age: A Red Star Rebellion Before the Awakening), while supporting clean blank-slate character creation so any party member can set up and manage their own 5e (2014 PHB) character across desktop and mobile browsers.

Data Policy (Strict Blank Slate, Multi-Character & Full Editability)

Initial Default Preset (Pip): On first load with empty localStorage, pre-populate only verified character sheet facts, stats, skills, saves, traits, ideals, bonds, flaws, and campaign context confirmed for Pip.

Zero Invented Content: Never generate or seed dummy patient cases, fake quotes, made-up percentages, or placeholder lore.

New Blank Character Flow: Provide a "New Blank Character" action in the Navigation Drawer and F5 modal (with a confirmation step) that resets identity, ability scores (10s), vitals (1 / 1 HP), skills, saves, gear, notes, macros, and custom sections into a clean, unpopulated template so other players can build their own character from scratch.

Full Editability & Local Persistence: Make the top header character name, identity fields, stats, skill list/ranks, saving throw proficiencies, quick-roll macros (1–9), items, notes, and custom sections completely editable and saved per-browser in localStorage with full JSON import/export support.

Visual Theme & Layout

Palette: Deep obsidian background (#080c0a), elevated surfaces (#0b100e and #171022), violet/plum borders (#2e243b and #581c87), primary violet (#a855f7), bright lavender (#c084fc), slate text (#d4e0da), muted labels (#9eb0a7), green (#4af626) for natural 20s/successes, and crimson (#ff4d4d) for natural 1s, 0 HP, or alerts.

Persistent Top Header & Bottom Dice Dock:

Top bar displays [ THE CLINICAL LEDGER ] — <CHARACTER NAME>, campaign/role context, screen tabs (1. Core Sheet, 2. Gear & Notes, 3. Custom Ledger), viewing mode switch (Player/DM View vs. Party Share View), and covert lock status indicator.

Bottom dock provides dice rolling (standard rolls, advantage, disadvantage), customizable quick macro buttons (1–9, pre-configured on Pip's preset with Medicine +7, Investigation +5, History +5, and WIS Magic Save Adv), and a scrollable 25-roll history showing individual dice and totals.

Views, Sharing Modes & Experimental Toggles

Player / DM Full View: Full editing access across sheets, gear, notes, custom sections, dice macros, and covert lock controls.

Party Share View (Safe Mode): Read-only/party-safe view for sharing with party members. Automatically strips or masks [PRIVATE] custom sections, covert arc notes, and [UNLOCKED] private states while keeping public character stats, status, and party-shared notes accessible.

Covert Arc Lock:

Defaults to masked/covert state on load ([COVERT]).

Unlocking reveals private notes/arc details (such as Glassfall Reach clinical logs or private character twists) without leaking them into Party Share View.

Experimental / Alternate Arcs (Hidden & Off by Default):

Optional mechanics—such as the Clockwork Vessel mode—default to false and remain hidden from the main Navigation Drawer, Screen 1/Screen 2 quick controls, Party Share View, and Markdown exports.

Can only be enabled via an explicit toggle under Advanced / Optional Mechanics inside the F5 Full Sheet & Macro Editor modal for future characters or campaigns.

Three Core Screens

Screen 1 — Core Sheet, Vitals & Persona (1. Core Sheet):

Ability Scores: Editable scores (STR 14 (+2), DEX 16 (+3), CON 16 (+3), INT 16 (+3), WIS 16 (+3), CHA 15 (+2) on Pip's preset) with automatic modifier calculation and racial/feature save notes (e.g., Gnome Cunning advantage on INT, WIS, and CHA saves against magic).

Skills & Passive Senses: Fully customizable and dynamically calculated skills (including Medicine +7 [EXP] — Memory & Trauma Care; crafting miniature medical supplies, Investigation +5 [PROF], History +5 [PROF], Insight +5 [PROF], and Perception +5 [PROF] on Pip's preset), plus auto-calculated Passive Perception (15).

Combat Vitals, Rests & Conditions: Editable HP (11 / 11), Temp HP, Hit Dice (1d8), interactive 3-pip Death Saves, Short/Long Rest actions, and Condition Toggle Pills (Poisoned, Frightened, Concentrating, Exhaustion).

Identity, Portrait & Persona: Editable identity fields (Name, Race, Class/Role, Alignment, Player), combat quick-stats (AC 13, Init +3, Speed 25 ft., Prof +2), reactive portrait/face state (reflecting HP health thresholds and Covert Lock state), editable Traits (including Clockwork & Watchmaking Hobbyist — pocket watches, precision chronometers, and tiny clockwork automatons), Ideals, Bonds, Flaws, and editable Clinical & Roleplay Notes with timestamp insertion.

Screen 2 — Actions, Spells, Gear & Scratchpad (2. Gear & Notes):

Attacks & Spellbook: Editable attacks list and editable spell list + spell slot pip tracker.

Gear, Miniature Supplies & Ledger Costs: Editable Equipped Gear, Inventory, a dedicated Miniature Medical Supplies & Tinkering Parts tracker with quick -1 / +1 controls, and editable Currency (GP, SP, CP) + session cost lines.

Scratchpad & Campaign Log: Editable Quick Session Scratchpad and Campaign & Case Log with timestamp insertion, search, and tag filtering.

Screen 3 — Custom Modular Workspace (3. Custom Ledger):

Responsive 2×3 grid of 6 customizable sections starting clean/untitled with inline title editing, timestamp insertion, and a per-section [PRIVATE] lock toggle.

On-Demand 2014 5e SRD Dropdowns & Modals

Contextual SRD Picker (2014 PHB Ruleset): When adding spells, gear, or conditions, query the 2014 5e SRD API (https://www.dnd5eapi.co/api/2014/, e.g., /api/2014/classes/{class}/spells, /api/2014/equipment, /api/2014/conditions) on demand—only when a user opens a dropdown or selects a filter—cache responses in localStorage, and always provide a custom/freeform text option for non-SRD 2014 PHB entries, The Quiet Age items, and miniature medical supplies.

Global Search Modal (F2): Searches across sheet entries, gear, scratchpad, campaign log, and custom sections (respecting Party Share View and Covert Lock visibility) with jump-to-result navigation.

Full Editor Modal (F5): Centralized editor for ability scores, skill ranks, custom macros (1–9), identity/vitals, persona, gear/supplies, custom section titles, New Blank Character reset, and Advanced / Optional Mechanics toggles.

Export Markdown Modal (F6): Builds a clean Markdown snapshot with section toggles (including an explicit warning before including private/covert notes), clipboard copy, and .md file download.
