# AGENTS.md — The Clinical Ledger (Web App)

## Project Purpose
Interactive dark-mode character ledger web app for **Pip** (Lawful Good ~300-year-old Gnome Community Wellness Practitioner & Memory/Trauma Care Medic in Veyr, from *The Quiet Age: A Red Star Rebellion Before the Awakening*), supporting **Player/DM Full View** and **Party Share View**.

## Non-Negotiable Rules
1. **Strict Blank Slate:** Never seed dummy patient cases, fake quotes, made-up percentages, or invented lore. Keep unentered fields clean/empty and make sections editable.
2. **Party vs. Private/Covert Safety:** Default to safe/covert state on load. In **Party Share View**, hide `[PRIVATE]` sections, covert arc notes, and `[UNLOCKED]` undying/clockwork states.
3. **On-Demand 5e API Only:** Query external 5e APIs (`dnd5eapi.co` / `open5e`) only when a user opens a dropdown or selects a filter (such as filtering spells by class), cache locally, and always support custom/freeform text entry (for miniature medical supplies, watch/automaton parts, and *The Quiet Age* elements).
4. **Aesthetic & Responsiveness:** Maintain the dark obsidian (`#080c0a`) + violet (`#a855f7` / `#c084fc`) clinical ledger theme with `#4af626` (nat 20 / success) and `#ff4d4d` (nat 1 / 0 HP / alert) accents across desktop and mobile viewports.
