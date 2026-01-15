# Architecture Overview

## High-Level Design
Hymn is an Electron app with a secure main/renderer split. The main process owns file-system access and indexing. The renderer focuses on UI and workflow orchestration.

## Process Boundaries
- **Main Process**
  - File system access (scan, copy, backup, apply).
  - Mod registry/index and dependency analysis.
  - IPC API surface (whitelisted actions only).
- **Preload**
  - `contextBridge` exposes a typed API to the renderer.
  - No direct Node access in the renderer.
- **Renderer**
  - React UI (shadcn/ui + Tailwind).
  - State management and view routing.

## Core Modules (Main)
- **Install Path Resolver**: detects `AppData\Roaming\Hytale`, supports manual override.
- **Library Scanner**: indexes Packs, Plugins, Early Plugins (folders, `.jar`, `.zip`).
- **Profile Manager**: saves enabled mod sets and load order.
- **Apply Pipeline**: staging, validation, apply, and rollback.
- **Backup Engine**: versioned snapshots with cleanup policies.
- **Validation**: schema checks, missing fields, dependency warnings.

## Archive Classification (Observed)
- Archives ship with a root `manifest.json` plus `Common/` + `Server/` data.
- `.zip` files are often **pack-only** (no Java classes).
- `.jar` files can include Java plugin classes and may also include assets (`IncludesAssetPack`).
- Detect type by manifest fields (`Main`, `IncludesAssetPack`) and presence of Java classes.

### Local Examples (Installed Mods)
- **McwHyPaintings_1.0.0.zip**
  - Pack-only archive with `Common/Blocks/...`, `Server/Item/...`, and `Server/Languages/...`.
  - Manifest has no `Main` entry.
- **Violets_Furnishings.zip**
  - Pack-only archive with extensive `Common/Blocks/...` art assets and `Server/...` data.
  - Manifest has no `Main` entry.
- **ymmersive-statues-1.0.1.jar**
  - Java plugin class `net.conczin.YmmersiveStatues` with `IncludesAssetPack: true`.
  - Has `Common/` and `Server/` assets plus Java classes.

## Renderer Modules (UI Sections)

The UI uses a **3-section navigation** for simplicity:

- **Mods** (unified view)
  - Combines former Library and Profiles views
  - Card-based mod grid with search/filter
  - Profile sidebar with load order management
  - Drag-and-drop load order reordering
  - Apply/Rollback with confirmation dialogs

- **Create** (tabbed interface)
  - Pack wizard with manifest generation
  - Manifest JSON editor with validation
  - Asset browser with previews
  - Server data management (items, blocks)
  - Gradle build runner

- **Settings** (combined configuration)
  - Install path configuration
  - Import/Export modpacks
  - Diagnostics panel (formerly separate section)
  - Backup management
  - About information

### Welcome Screen
- Shown when no install path is configured
- Guides new users through initial setup
- Feature highlights and single CTA

## Data Flow (Happy Path)
1. Resolve install path.
2. Scan `UserData` folders.
3. Build mod index + warnings.
4. User toggles mods or profile.
5. Apply pipeline creates backup and writes changes.

## File Operations Strategy
- **Staging first**: write to a temp/staging folder.
- **Atomic apply**: move/replace only after validation.
- **Rollback**: restore from last good backup.

## Security Guardrails
- `contextIsolation` enabled.
- Allowlisted IPC calls only.
- No remote code execution.

## Theme
- Dark mode only (no theme switch).
