# Data Models (Draft)

## App Settings
```json
{
  "installPath": "%AppData%/Hytale",
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
  "id": "SketchMacaw:Macaw's Hy Paintings",
  "type": "pack",
  "path": "%AppData%/Hytale/UserData/Mods/McwHyPaintings_1.0.0.zip",
  "name": "Macaw's Hy Paintings",
  "group": "SketchMacaw",
  "version": "1.0.0",
  "format": "zip",
  "entryPoint": null,
  "includesAssetPack": false,
  "enabled": true,
  "dependencies": [],
  "optionalDependencies": [],
  "warnings": []
}
```

## Plugin Mod Entry (with dependencies)
```json
{
  "id": "Buuz135:AdvancedItemInfo",
  "type": "plugin",
  "path": "%AppData%/Hytale/UserData/Mods/AdvancedItemInfo-1.0.4.jar",
  "name": "AdvancedItemInfo",
  "group": "Buuz135",
  "version": "1.0.4",
  "description": "Adds a command to open a GUI with all the items in the game and their info",
  "format": "jar",
  "entryPoint": "com.buuz135.advancediteminfo.Main",
  "includesAssetPack": true,
  "enabled": true,
  "dependencies": ["Hytale:EntityModule"],
  "optionalDependencies": [],
  "warnings": []
}
```

## Profile
```json
{
  "id": "creative-build",
  "name": "Creative Build",
  "enabledMods": ["SketchMacaw:Macaw's Hy Paintings", "Conczin:Ymmersive Statues"],
  "loadOrder": ["SketchMacaw:Macaw's Hy Paintings", "Conczin:Ymmersive Statues"],
  "notes": "Builder tools + QoL"
}
```

## Backup Snapshot
```json
{
  "id": "2026-01-14T13-32-10Z",
  "profileId": "creative-build",
  "createdAt": "2026-01-14T13:32:10Z",
  "location": "%AppData%/Hymn/backups/2026-01-14T13-32-10Z",
  "mods": ["SketchMacaw:Macaw's Hy Paintings"]
}
```

## Workspace (Pack)
```json
{
  "id": "workspace-pack-1",
  "type": "pack",
  "root": "%AppData%/Hymn/workspaces/MyPack",
  "manifestPath": "manifest.json",
  "status": "draft"
}
```

## Notes
- **Type values**: `pack`, `plugin`, `early-plugin`, `unknown`.
- **Format values**: `directory`, `zip`, `jar`.
- **Location values**: `packs`, `mods`, `earlyplugins`.
- `entryPoint` uses the plugin `Main` class (or null for pack-only).
- `includesAssetPack` mirrors the manifest flag.
- **ID format**: `Group:Name` when Group is present, otherwise just `Name`.
- **Manifest Dependencies/OptionalDependencies**: Use object format `{"ModId": "version"}` (e.g., `{"Hytale:EntityModule": "*"}`). The `*` means any version. Internally converted to string arrays of mod IDs.
