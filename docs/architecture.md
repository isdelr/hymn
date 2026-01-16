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

## Archive Classification (Verified January 2026)

Archives ship with a root `manifest.json` plus optional `Common/` and/or `Server/` directories.

### Detection Logic
```
IF manifest.Main exists:       → Plugin
ELSE IF has .class files:      → Plugin
ELSE IF manifest exists:       → Pack
ELSE IF location == "packs":   → Pack
ELSE:                          → Unknown
```

### Storage Locations (Reality)
| Type | Location | Formats |
|------|----------|---------|
| Packs | `UserData/Packs/` | Directories only |
| Packs | `UserData/Mods/` | ZIP, directories |
| Plugins | `UserData/Mods/` | JAR files |
| Early Plugins | System-specific | JAR files |

**Key Insight**: Both packs (.zip) and plugins (.jar) live in `UserData/Mods/`. The `UserData/Packs/` folder is legacy/directory-only.

### Real Mod Examples (Analyzed)
- **NoCube_Bags_0.0.2.zip** (Pack)
  - 25KB, adds 3 bag items
  - `Common/Icons/`, `Common/Items/`, `Server/Item/Items/`
  - No `Main` field

- **AdminUI-1.0.3.jar** (Plugin + Assets)
  - 137KB, admin GUI pages
  - `Main: "com.buuz135.adminui.AdminUI"`
  - `IncludesAssetPack: true`
  - Dependencies: `Hytale:AccessControlModule`

- **Hybrid-1.4.jar** (Library Plugin)
  - 68KB, shared library for other mods
  - Event system, utility functions
  - Minimal assets (just icon)

### Hytale Built-in Modules
Plugins can depend on these:
- `Hytale:EntityModule` - Entity management
- `Hytale:AssetModule` - Asset handling
- `Hytale:AccessControlModule` - Permissions

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
