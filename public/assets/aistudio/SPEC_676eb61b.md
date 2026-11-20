# spec.md — The Clinical Ledger (Web App)

## Overview
An interactive, responsive dark-mode character ledger web application built for **Pip** (Player: Sinnoh), a Lawful Good ~300-year-old Gnome Community Wellness Practitioner and Memory/Trauma Care Medic in Veyr, set in *The Quiet Age: A Red Star Rebellion Before the Awakening*. Designed for desktop and mobile browsers across operating systems so Pip's sheet and shared session notes can be viewed by party members while keeping private and covert layers protected.

## Data Policy (Strict Blank Slate & Full Editability)
- Pre-populate **only** verified character sheet facts, stats, skills, saves, traits, ideals, bonds, flaws, and campaign context confirmed for Pip.
- Never generate or seed dummy patient cases, fake quotes, made-up percentages, or placeholder lore.
- Keep unentered lists, custom panels, and optional trackers clean/empty by default, and allow every stat, rank, item, note, and custom section to be edited directly in the UI with local persistence (`localStorage` and JSON/Markdown import/export).

## Visual Theme & Layout
- **Palette:** Deep obsidian background (`#080c0a`), elevated surfaces (`#0b100e` and `#171022`), violet/plum borders (`#2e243b` and `#581c87`), primary violet (`#a855f7`), bright lavender (`#c084fc`), slate text (`#d4e0da`), muted labels (`#9eb0a7`), green (`#4af626`) for natural 20s/successes, and crimson (`#ff4d4d`) for natural 1s, `0 HP`, or alerts.
- **Persistent Top Header & Bottom Dice Dock:**
  - Top bar displays `[ THE CLINICAL LEDGER ] — PIP`, campaign/role context, screen tabs (`1. Core Sheet`, `2. Gear & Notes`, `3. Custom Ledger`), viewing mode switch (`Player/DM View` vs. `Party Share View`), and covert status indicator.
  - Bottom dock provides dice rolling (standard rolls, advantage, disadvantage), quick macro buttons (`Medicine +7`, `Investigation +5`, `History +5`, `WIS Magic Save Adv`, plus customizable slots `5`–`9`), and a scrollable roll history showing individual dice and totals.

## Views & Sharing Modes
1. **Player / DM Full View:** Full editing access across sheets, gear, notes, custom sections, dice macros, and covert/vessel state controls.
2. **Party Share View (Safe Mode):** Read-only/party-safe view for sharing with party members. Automatically strips or masks `[PRIVATE]` custom sections, covert arc notes, and `[UNLOCKED]` undying/clockwork states while keeping public character stats, status, and party-shared notes accessible.
3. **Covert Arc Lock & Clockwork Vessel State:**
   - Defaults to masked/covert state on load.
   - Unlocking reveals private notes/arc details (including Pip's **Clockwork / Construct Vessel** primary backup arc and secondary **Lichdom / Undying Drift** notes) and supports switching the portrait/badge into Clockwork Vessel mode when unlocked.

## Three Core Screens
1. **Screen 1 — Core Sheet, Vitals & Persona (`1. Core Sheet`):**
   - **Ability Scores:** `STR 14 (+2)`, `DEX 16 (+3)`, `CON 16 (+3)`, `INT 16 (+3)`, `WIS 16 (+3)`, `CHA 15 (+2)` with automatic modifier calculation and Gnome Cunning advantage note on `INT`, `WIS`, and `CHA` saves against magic.
   - **Skills & Passive Senses:** Dynamically calculated skills including `Medicine +7 [EXP]` (*Memory & Trauma Care; crafting miniature medical supplies*), `Investigation +5 [PROF]`, `History +5 [PROF]`, `Insight +5 [PROF]`, and `Perception +5 [PROF]`, plus Passive Perception `15`.
   - **Combat Vitals, Rests & Conditions:** Editable `HP` (`11 / 11`), `Temp HP`, `Hit Dice` (`1d8`), interactive 3-pip Death Saves, Short/Long Rest actions, and Condition Toggle Pills (`Poisoned`, `Frightened`, `Concentrating`, `Exhaustion`).
   - **Identity, Portrait & Persona:** Editable identity fields (`Name: Pip`, `Race: Gnome ~300 yrs`, `Class/Role: Community Wellness Practitioner`, `Alignment: Lawful Good`, `Player: Sinnoh`), combat quick-stats (`AC 13`, `Init +3`, `Speed 25 ft.`, `Prof +2`), reactive portrait/face state, editable Traits (including *Clockwork & Watchmaking Hobbyist* — pocket watches, precision chronometers, and tiny clockwork automatons), Ideals, Bonds, Flaws, and editable `Clinical & Roleplay Notes` with timestamp insertion.
2. **Screen 2 — Actions, Spells, Gear & Scratchpad (`2. Gear & Notes`):**
   - **Attacks & Spellbook:** Editable attacks list and unawakened/editable spell list + spell slot pip tracker.
   - **Gear, Miniature Supplies & Ledger Costs:** Editable Equipped Gear, Inventory, a dedicated **Miniature Medical Supplies & Clockwork Parts** tracker with quick increment/decrement controls, and editable Currency (`GP`, `SP`, `CP`) + session cost lines.
   - **Scratchpad & Campaign Log:** Editable `Quick Session Scratchpad` and `Campaign & Case Log` with timestamp insertion, search, and tag filtering.
3. **Screen 3 — Custom Modular Workspace (`3. Custom Ledger`):**
   - Responsive 2×3 grid of 6 customizable sections starting clean/untitled with inline title editing, timestamp insertion, and a per-section `[PRIVATE]` lock toggle.

## On-Demand 5e SRD Dropdowns & Modals
- **Contextual SRD Picker:** When adding spells, gear, or conditions, query `dnd5eapi.co` or `api.open5e.com` on demand (e.g., filtering spells by selected class such as `Cleric` or `Wizard`, and optionally by spell level), cache results locally, and always provide a custom/freeform text option for *The Quiet Age* items, miniature medical supplies, and clockwork parts.
- **Global Search Modal (`F2`):** Searches across sheet entries, gear, scratchpad, campaign log, and custom sections (respecting Party Share View and Covert Lock visibility) with jump-to-result navigation.
- **Full Editor Modal (`F5`):** Centralized editor for ability scores, skill ranks, custom macros (`5`–`9`), identity/vitals, persona, gear/supplies, custom section titles, and covert/clockwork flags.
- **Export Markdown Modal (`F6`):** Builds a clean Markdown snapshot with section toggles (including an explicit warning before including private/covert notes), clipboard copy, and `.md` file download.
