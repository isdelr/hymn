# Hymn Mod Manager Documentation

Hymn is a dark-mode mod manager for **Hytale (Early Access)**. It installs, enables, configures, and visually edits mods (packs, plugins, early plugins) with a UI inspired by **Mini Motorways** and **Hytale**.

## Quick Start (Dev)
- Install Node.js 20+
- `npm install`
- `npm run dev`
- `npm run build`

## Key Paths (Windows)
- Hytale root: `%AppData%\Hytale`
- Packs: `%AppData%\Hytale\UserData\Packs`
- Plugins (mods): `%AppData%\Hytale\UserData\Mods` (commonly `.jar` and `.zip`)
- Early plugins: `%AppData%\Hytale\earlyplugins` (create if missing)
- Hymn data: `%AppData%\Hymn` (profiles, backups, index)

## Docs Map
- `docs/product-vision.md` - Mission, target users, MVP checklist
- `docs/ui-ux.md` - Visual design direction and components
- `docs/modding-reference.md` - Hytale modding primer (verified with real mods)
- `docs/mod-analysis.md` - **NEW**: Detailed analysis of real Hytale mods
- `docs/architecture.md` - System design and data flow
- `docs/data-models.md` - JSON schemas for data entities
- `docs/dependencies.md` - Development dependencies

## Design Notes
- Dark mode only (no theme switch).
- Reference images: `docs/assets/mini-motorways-ui.png`, `docs/assets/mini-motorways-ui-2.png`, `docs/assets/hytale-settings-ui.png`.
