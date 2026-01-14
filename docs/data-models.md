# Data Models (Draft)

## App Settings
```json
{
  "installPath": "C:/Users/isaia/AppData/Roaming/Hytale",
  "lastProfileId": "default",
  "backupPolicy": {
    "enabled": true,
    "maxSnapshots": 10
  },
  "theme": "dark"
}
```

## Mod Entry
```json
{
  "id": "com.example:my-pack",
  "type": "pack",
  "path": "C:/Users/isaia/AppData/Roaming/Hytale/UserData/Packs/MyPack",
  "name": "MyPack",
  "version": "1.0.0",
  "format": "directory",
  "entryPoint": null,
  "includesAssetPack": false,
  "enabled": true,
  "dependencies": [],
  "optionalDependencies": [],
  "warnings": []
}
```

## Profile
```json
{
  "id": "creative-build",
  "name": "Creative Build",
  "enabledMods": ["com.example:my-pack", "Hytale:BlockSpawnerPlugin"],
  "loadOrder": ["com.example:my-pack"],
  "notes": "Builder tools + QoL"
}
```

## Backup Snapshot
```json
{
  "id": "2026-01-14T13-32-10Z",
  "profileId": "creative-build",
  "createdAt": "2026-01-14T13:32:10Z",
  "location": "%AppData%/Hymn/backups/2026-01-14",
  "mods": ["com.example:my-pack"]
}
```

## Workspace (Pack)
```json
{
  "id": "workspace-pack-1",
  "type": "pack",
  "root": "%AppData%/Hymn/workspaces/MyPack",
  "manifestPath": "Server/manifest.json",
  "status": "draft"
}
```

## Notes
- **Type values**: `pack`, `plugin`, `early-plugin`.
- **Format values**: `directory`, `zip`, `jar`.
- `entryPoint` uses the plugin `Main` class (or null for pack-only).
- `includesAssetPack` mirrors the manifest flag.
- Prefer **stable IDs** (`Group:Name`) from manifest files.
