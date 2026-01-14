# Hymn Mod Manager Documentation

Hymn is a dark-mode mod manager for **Hytale (Early Access)**. It installs, enables, configures, and visually edits mods (packs, plugins, early plugins) with a UI inspired by **Mini Motorways** and **Hytale**.

## Quick Start (Dev)
- Install Node.js 20+ and bun.
- `bun install`
- `bun run dev`
- `bun run build`

## Key Paths (Windows)
- Hytale root: `C:\Users\isaia\AppData\Roaming\Hytale`
- Packs: `C:\Users\isaia\AppData\Roaming\Hytale\UserData\Packs`
- Plugins (mods): `C:\Users\isaia\AppData\Roaming\Hytale\UserData\Mods` (commonly `.jar` and `.zip`)
- Early plugins: `C:\Users\isaia\AppData\Roaming\Hytale\earlyplugins` (create if missing)
- Proposed Hymn data: `%AppData%\Hymn` (profiles, backups, index)

## Docs Map
- `docs/product-vision.md`
- `docs/ui-ux.md`
- `docs/modding-reference.md`
- `docs/architecture.md`
- `docs/data-models.md`
- `docs/dependencies.md`

## Design Notes
- Dark mode only (no theme switch).
- Reference images: `docs/assets/mini-motorways-ui.png`, `docs/assets/mini-motorways-ui-2.png`, `docs/assets/hytale-settings-ui.png`.
