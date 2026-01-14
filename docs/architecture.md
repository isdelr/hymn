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
- **Library Scanner**: indexes Packs, Plugins, Early Plugins with metadata.
- **Profile Manager**: saves enabled mod sets and load order.
- **Apply Pipeline**: staging, validation, apply, and rollback.
- **Backup Engine**: versioned snapshots with cleanup policies.
- **Validation**: schema checks, missing fields, dependency warnings.

## Renderer Modules
- **Library**: list/grid views + details panel.
- **Profiles**: toggleable profiles with diff preview.
- **Create**: pack wizard, file tree, JSON editor.
- **Diagnostics**: logs, warnings, file health.
- **Settings**: paths, backup strategy, advanced toggles.

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
