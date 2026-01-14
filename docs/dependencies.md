# Suggested Dependencies

These are optional additions to make development faster and safer. None are required unless the feature is implemented.

## File System + Indexing
- `chokidar` – watch pack/plugin folders for changes.
- `fast-glob` – fast directory scans for mod discovery.
- `semver` – compare version ranges and dependencies.
- `ajv` – JSON schema validation for manifests.

## Storage + Settings
- `electron-store` or `conf` – persistent app settings.
- `dexie` – lightweight local index (optional alternative).

## Editors + UX
- `@uiw/react-codemirror` or `monaco-editor` – JSON editor with highlighting.
- `react-virtual` – virtualized lists for large mod libraries.
- `cmdk` – already installed, great for command palette.

## Packaging
- `archiver` or `yauzl` – zip import/export for modpacks.

## State + Data
- `zustand` – simple global state.
- `@tanstack/react-query` – async data orchestration.
