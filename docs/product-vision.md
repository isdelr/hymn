# Product Vision

## Mission
Give players and creators a safe, delightful way to manage, configure, and build Hytale mods without manual file wrangling.

## Target Users
- **Players** who want easy install/enable/disable of mods and modpacks.
- **Creators** building Packs (data assets) and Plugins (Java).
- **Server hosts** running local or community servers.

## Product Pillars
- **Safety first:** backups, validation, rollback, no destructive operations.
- **Clarity:** surface mod type, version, dependencies, and conflicts.
- **Creativity:** visual tools for asset editing and mod creation.
- **Speed:** fast scans, instant toggles, low-friction workflows.

## Must-Have Features (MVP)
1. **Auto-detect install path** with manual override and health checks.
2. **Mod library scan** across Packs, Plugins, Early Plugins.
3. **Profiles** with enable/disable sets, load order, and conflict warnings.
4. **Apply/rollback pipeline** with automatic backups and restore points.
5. **Mod Playground (Creation)**
   - **Projects Dashboard**: Manage local source packs/plugins.
   - **Integrated IDE**: Visual file explorer, split-view editors (Visual/Code), and asset previewer.
   - **Smart Editors**: Schema-aware forms for Items, Blocks, and Manifests.
6. **Import/Export** zipped modpacks with metadata.
7. **Diagnostics** view: logs, missing paths, invalid manifests.

## Phase 2 (Nice-to-Have)
- Plugin build runner (Gradle tasks).
- Mod browser integration (CurseForge links/downloads).
- Visual scripting support when released by Hytale.

## Non-Goals
- No light theme or theme switcher.
- No client patching/injection.
- No storefront or payments in-app (initially).

## Success Criteria
- A new user enables a mod in **under 2 minutes**.
- Restore from backup is **one-click and reliable**.
- Creators can scaffold a pack without touching the file system.
