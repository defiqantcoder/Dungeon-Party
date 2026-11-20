---
name: The Clinical Ledger
colors:
  surface: '#101412'
  surface-dim: '#101412'
  surface-bright: '#363a38'
  surface-container-lowest: '#0b0f0d'
  surface-container-low: '#181c1a'
  surface-container: '#1c211e'
  surface-container-high: '#272b28'
  surface-container-highest: '#313633'
  on-surface: '#e0e3df'
  on-surface-variant: '#cec3d3'
  inverse-surface: '#e0e3df'
  inverse-on-surface: '#2d312f'
  outline: '#978d9d'
  outline-variant: '#4c4452'
  surface-tint: '#ddb8ff'
  primary: '#ddb8ff'
  on-primary: '#490081'
  primary-container: '#c084fc'
  on-primary-container: '#500989'
  inverse-primary: '#7b41b4'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#34e507'
  on-tertiary: '#063900'
  tertiary-container: '#26b800'
  on-tertiary-container: '#074000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f0dbff'
  primary-fixed-dim: '#ddb8ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#62259b'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#79ff59'
  tertiary-fixed-dim: '#34e507'
  on-tertiary-fixed: '#022100'
  on-tertiary-fixed-variant: '#0c5300'
  background: '#101412'
  on-background: '#e0e3df'
  surface-variant: '#313633'
typography:
  headline-xl:
    fontFamily: Metrophobic
    fontSize: 2.5rem
    fontWeight: '400'
    lineHeight: 3rem
    letterSpacing: 0.05em
  headline-lg:
    fontFamily: Metrophobic
    fontSize: 1.75rem
    fontWeight: '400'
    lineHeight: 2.25rem
    letterSpacing: 0.04em
  headline-md:
    fontFamily: Metrophobic
    fontSize: 1.25rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: 0.03em
  headline-sm:
    fontFamily: Metrophobic
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.6rem
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.4rem
  body-sm:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.2rem
  label-lg:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.1rem
    letterSpacing: 0.06em
  label-md:
    fontFamily: Geist
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.95rem
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Geist
    fontSize: 0.625rem
    fontWeight: '600'
    lineHeight: 0.85rem
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies an elevated diagnostic instrument aesthetic designed for archival precision, trauma therapy telemetry, and tactical medical operations. Built specifically for high-stakes tabletop environments, it merges the rigor of a clinical casefile with the arcane biomonitor telemetry of an ancestral practitioner. 

The visual movement sits precisely at the intersection of technical minimalism and calibrated dark-mode brutalism:
- **Atmospheric Obsidian:** Deep, light-absorbent backdrops create absolute contrast against luminous signal readouts.
- **Instrument Precision:** Hairline panel divisions, micro-grid coordinates, and strict technical legibility mimic real-time analytical monitors.
- **Controlled Luminescence:** Spectral violet energy indicates psychic resonance and diagnostic acuity, tempered by clinical state monitors (critical failures and vital surges).

The interface is engineered to evoke analytical focus, clinical authority, and tactile mechanical responsiveness.

## Colors

The chromatic architecture is constructed to prioritize optical hierarchy in low-light environments, treating color strictly as data density and diagnostic telemetry:

- **Canvas & Obsidian Voids:** The root viewport rests on `#080c0a`, a dense obsidian ground that mitigates eye fatigue while isolating tactical elements. Secondary card surfaces shift into `#0b100e` (neutral clinical tier) and `#171022` (resonant memory/trauma tier).
- **Structural Borders & Rulers:** Boundaries are never pure grey. Hairline perimeters use muted violet-plum tones (`#2e243b` for dormant divisions, `#581c87` for active frames and focal modules).
- **Primary & Spectral Violet:** `#c084fc` functions as the high-intensity interactive highlight, drawing instantaneous focus to editable states, vital scores, and active remedies. Secondary structural violet (`#a855f7`) anchors interactive pill fills and medium-emphasis headers.
- **Telemetry Readouts & Status Indicators:**
  - **Success / Critical Surge:** `#4af626` (high-voltage terminal green) reserved exclusively for successful saving throws, natural 20s, and stable vitals.
  - **Critical Failure / Trauma Breach:** `#ff4d4d` (diagnostic crimson) reserved for mortal threshold alerts, stress spikes, and natural 1 roll results.
- **Typographic Slate:** Primary content renders in crisp `#d4e0da`, avoiding stark harsh white, while secondary metadata and axis labels sit in muted clinical slate `#9eb0a7`.

## Typography

The typographic hierarchy balances architectural display headings with sharp tabular engineering:

- **Display & Section Headers (`Metrophobic`):** Chosen for its wide, architectural sans-serif proportion. It acts as an authoritative institutional index stamp. Letter-spacing is intentionally relaxed to maintain legibility when rendered in all-caps across ledger section headers and diagnostic panel caps.
- **Technical Body & Telemetry (`Geist`):** Delivers clean horizontal metrics and tabular figures for complex stats, spell slots, inventory weights, and physiological thresholds.
- **Labels & System Readouts:** Rendered with elevated letter-spacing (`0.06em` to `0.1em`) and medium/semibold weights in uppercase formatting (`label-md`, `label-sm`) to emulate calibration readouts and medical classifications.

## Layout & Spacing

This design system employs a structured 12-column analytical grid modeled after tactical telemetry displays and laboratory specimen registers:

- **Desktop (>= 1200px):** 12-column layout with fixed 1rem gutters and 1.5rem margins. Primary panels (Vitality, Trauma Ledger, Arcane Reagents) divide cleanly across 4-column and 8-column modules, with static peripheral readouts along the viewport edge.
- **Tablet (768px - 1199px):** Reflows to an 8-column matrix with collapsible diagnostic drawers. Margins reduce to 1rem.
- **Mobile (< 768px):** Single-column stacked deck with persistent sticky status headers displaying real-time HP, Memory Strain, and critical condition pills. Gutters adjust to 0.75rem; margins compress to 0.75rem.

Spacing relies on strict mathematical increments. Element gaps inside stat blocks never exceed `space-sm` (0.5rem) to maintain immediate visual correlation between a label and its monitored value.

## Elevation & Depth

Visual hierarchy does not use soft drop shadows. Instead, it relies on tonal stacking, hairline luminescent borders, and localized ambient glows:

- **Surface Ground Tier (Floor):** Pure `#080c0a` base canvas.
- **Level 1 (Data Cards & Registers):** `#0b100e` solid surface framed with a 1px border of `#2e243b`. No drop shadow.
- **Level 2 (Active Monitors & Diagnostic Nodes):** `#171022` elevated surface with a 1px border of `#581c87`. Subtle inner edge glow (`inset 0 0 12px rgba(168, 85, 247, 0.08)`).
- **Level 3 (Modal Overlays & Critical Interventions):** `#0e0d16` with a crisp 1px stroke of `#c084fc` and an outer halo (`0 0 24px rgba(192, 132, 252, 0.15)`).
- **Alert States:**
  - Critical Surge / Advantage: Outer glow `0 0 16px rgba(74, 246, 38, 0.2)`.
  - Trauma Alert / Nat 1: Outer glow `0 0 16px rgba(255, 77, 77, 0.25)`.

## Shapes

The design system employs a subtle geometric roundness (`roundedness: 1`), softening razor-sharp edges just enough to preserve readability while maintaining an industrial, machined finish:

- **Base Elements & Badges:** Use `rounded` (0.25rem / 4px) for cards, data rows, action triggers, and stat containers.
- **Diagnostic Badges & Pills:** Interactive tag chips, saving throw states, and HP status tags use `rounded-lg` (0.5rem / 8px) or strict pill geometry for bounded status identifiers.
- **Inputs & Sliders:** Micro-notched styling with precise 4px corners to ground tactile thumb points without appearing playful or bubbly.

## Components

### Action Triggers & Tactical Buttons
- **Primary Diagnostics (Solid):** Background of `#a855f7`, text `#080c0a` (bold), 0.25rem border-radius, 1px border of `#c084fc`. On hover, the background lightens to `#c084fc` with an ambient glow of `rgba(192, 132, 252, 0.3)`.
- **Secondary Ledger Actions (Outlined):** Transparent background, 1px border of `#581c87`, text `#d4e0da`. On hover, background shifts to `rgba(88, 28, 135, 0.25)` and border transitions to `#a855f7`.
- **Critical Action (Destructive / Adrenaline):** Hairline border in `#ff4d4d`, text `#ff4d4d`. Focus and active states introduce a micro-pulse of diagnostic red.

### Diagnostic Chips & Tactical Badges
- **Status Pills:** Background `#171022`, border 1px solid `#2e243b`, text `#9eb0a7` in `label-sm`.
- **Success / Inspiration Chip:** Green glow accent with 1px border `#4af626`, text `#4af626`, background `rgba(74, 246, 38, 0.08)`.
- **Trauma Strain Flag:** 1px border `#ff4d4d`, text `#ff4d4d`, background `rgba(255, 77, 77, 0.08)`.

### RPG Stat Readout Cards
- Container built with `#0b100e` background and 1px `#2e243b` border.
- Card caps feature an uppercase `label-md` header in `#9eb0a7` with a horizontal divider line across the card width.
- Core numerical values use `headline-lg` in `#d4e0da`, centered with a dedicated modifier badge (`label-lg`) anchored beneath in `#c084fc`.

### Terminal Input Fields & Steppers
- Background `#080c0a`, border 1px solid `#2e243b`, text `#d4e0da`.
- Focus state switches border to `#c084fc` with an inset micro-shadow `inset 0 0 6px rgba(192, 132, 252, 0.15)`.
- Numeric steppers (Hit Dice, Memory Spells) feature low-profile tactile step buttons flanked on right/left with subtle divider strokes.

### Lists & Ledger Rows
- Tabular data rows with alternating micro-tint backgrounds (`#080c0a` to `#0b100e`).
- 1px hairline bottom borders in `#1d1827`.
- Left-side indicator bar (2px width) that ignites in `#a855f7` or `#4af626` when an item is readied, charged, or attuned.

### Checkboxes & Segmented Toggles
- Custom square checkboxes (0.875rem) with 0.125rem rounded corners, 1px border of `#581c87`.
- Checked state fills with `#c084fc` featuring an obsidian core dot or check indicator.
- Memory Strain Trackers: Segmented pill tracks where filled stress pips shift progressively from `#a855f7` into `#ff4d4d` as thresholds hit critical bounds.