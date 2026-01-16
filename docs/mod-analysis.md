# Real Mod Analysis (January 2026)

This document contains detailed analysis of real Hytale mods to inform Hymn's implementation.

## Analyzed Mods

### Pack-Only Mods (Asset/Data)

#### NoCube's Bags (v0.0.2)
**Type**: Pack (ZIP archive)
**File**: `NoCube_Bags_0.0.2.zip`
**Size**: ~25KB

```
Structure:
├── manifest.json
├── Common/
│   ├── Icons/ItemsGenerated/
│   │   ├── NoCube_Bag.png
│   │   ├── NoCube_Bag_Greater.png
│   │   └── NoCube_Bag_Lesser.png
│   └── Items/
│       ├── NoCube_Bag.blockymodel
│       ├── NoCube_Bag.png
│       ├── NoCube_Bag_Greater.blockymodel
│       └── NoCube_Bag_Lesser.blockymodel
└── Server/
    ├── Item/Items/
    │   ├── NoCube_Bag.json
    │   ├── NoCube_Bag_Greater.json
    │   └── NoCube_Bag_Lesser.json
    └── Languages/en-US/
        └── server.lang
```

**Key Observations**:
- Simple item mod adding 3 bag variants
- Uses standard Common/Server structure
- No `Main` field in manifest
- Naming convention: `AuthorPrefix_ItemName`

---

#### Violet's Furnishings (v0.1)
**Type**: Pack (ZIP archive)
**File**: `Violets_Furnishings.zip`
**Size**: ~4MB

```
Structure (excerpt):
├── manifest.json
├── Common/
│   └── Blocks/
│       ├── Bench/
│       │   ├── Bench_Violet.blockymodel
│       │   └── Bench_Violet.png
│       └── Furniture/
│           ├── Animation/
│           │   └── LampOn.blockyanim
│           └── Antique/
│               ├── Armchair/
│               ├── Bed/
│               ├── Chair/
│               ├── Clock/
│               ├── Couch/
│               └── ...
```

**Key Observations**:
- Large furniture pack with many block variants
- Uses color variants (Blue, Cream, Green, Pink, Purple, Red, White, Yellow)
- Includes block animations (`.blockyanim`)
- Organized by furniture style (Antique, etc.)

---

#### Aures Livestock (Jan 2026)
**Type**: Pack (ZIP archive)
**File**: `Aures_Livestock_14.01.2026.zip`
**Size**: ~2.7MB

**Key Observations**:
- Entity/NPC-focused pack (livestock animals)
- Date-based versioning in filename

---

### Plugin Mods (Java + Optional Assets)

#### AdminUI (v1.0.3)
**Type**: Plugin with assets
**File**: `AdminUI-1.0.3.jar`
**Size**: ~137KB

```
Structure:
├── META-INF/MANIFEST.MF
├── manifest.json
├── com/buuz135/adminui/
│   ├── AdminUI.class (Main entry point)
│   ├── command/
│   ├── gui/
│   ├── interaction/
│   └── util/
├── Common/UI/Custom/
│   ├── Buuz135_AdminUI.png
│   └── Pages/
│       ├── Buuz135_AdminUI_Index.ui
│       ├── AdminStick/
│       ├── Backup/
│       ├── Ban/
│       └── ...
└── Server/
    ├── Item/Items/Ingredient/
    │   └── Buuz135_AdminUI_Admin_Stick.json
    └── Languages/en-US/
        └── adminui_items.lang
```

**Manifest**:
```json
{
  "Main": "com.buuz135.adminui.AdminUI",
  "IncludesAssetPack": true,
  "Dependencies": {
    "Hytale:AccessControlModule": "*"
  }
}
```

**Key Observations**:
- Plugin JAR with bundled UI assets
- Custom `.ui` page definitions
- Adds in-game admin commands and GUI
- Depends on `Hytale:AccessControlModule`

---

#### Hybrid (v1.4) - Library Mod
**Type**: Plugin with minimal assets
**File**: `hybrid-2026.01.13-1.4.jar`
**Size**: ~68KB

```
Structure:
├── META-INF/MANIFEST.MF
├── manifest.json
├── com/natamus/hybrid/
│   ├── HybridMain.class
│   ├── cmd/
│   ├── config/
│   ├── data/
│   ├── event/
│   │   ├── callback/
│   │   ├── ievent/
│   │   └── system/
│   ├── functions/
│   ├── implementations/event/
│   └── util/
└── Common/UI/Custom/
    └── Serilum_Hybrid.png
```

**Key Observations**:
- Library mod providing common code for other mods
- Event system implementation
- Utility functions (Block, Color, Config, Entity, Inventory, etc.)
- Minimal assets (just icon)

---

#### ThePickaxesPlaceTorches (v1.0.0)
**Type**: Plugin with assets
**File**: `ThePickaxesPlaceTorches-1.0.0.jar`
**Size**: ~269KB

**Manifest Dependencies**:
```json
{
  "Dependencies": {
    "Hytale:EntityModule": "*"
  }
}
```

**Key Observations**:
- Simple functionality mod (pickaxe places torches)
- Overrides vanilla item interactions
- Depends on `Hytale:EntityModule`

---

#### EyeSpy (v2026.1.14)
**Type**: Plugin
**File**: `EyeSpy-2026.1.14-55560.jar`
**Size**: ~169KB

**Manifest Dependencies**:
```json
{
  "Dependencies": {
    "Hytale:EntityModule": "*",
    "Hytale:AssetModule": "*"
  }
}
```

**Key Observations**:
- Multiple dependencies
- Version includes build number (55560)
- Dual author attribution (Jaredlll08, Darkhax)

---

### Code-Heavy Mods

#### Ymmersive Melodies (v1.0.2)
**Type**: Plugin
**File**: `ymmersive-melodies-1.0.2.jar`
**Size**: ~13MB

**Key Observations**:
- Very large JAR (likely includes many audio assets)
- Music/sound enhancement mod

---

## Detected Hytale Modules

From analyzing plugin dependencies, these built-in Hytale modules exist:

| Module ID | Purpose |
|-----------|---------|
| `Hytale:EntityModule` | Entity management, interactions |
| `Hytale:AssetModule` | Asset loading, registration |
| `Hytale:AccessControlModule` | Permissions, admin controls |

## File Naming Conventions

### Mod Archives
- **Packs**: `ModName_Version.zip` or `AuthorName_ModName.zip`
- **Plugins**: `ModName-Version.jar` or `modname-date-version.jar`

### Internal Assets
- Prefix with author/mod identifier: `Buuz135_AdminUI_`, `NoCube_`
- Use underscores for multi-word names
- Follow vanilla patterns where possible

## UI Files (.ui)

Custom UI pages are defined as `.ui` files in `Common/UI/Custom/Pages/`:

```
Buuz135_AdminUI_Index.ui
Buuz135_AdminUI_IndexEntry.ui
Buuz135_AdminUI_TopNavigationBar.ui
```

These appear to be structured data files (likely JSON or custom format) defining UI layouts.

## Translation Files (.lang)

Server-side translations in `Server/Languages/{locale}/`:

Format: `Key.subkey = Translated Text`

Example from `adminui_items.lang`:
```
Item.Buuz135_AdminUI_Admin_Stick.name = Admin Stick
Item.Buuz135_AdminUI_Admin_Stick.description = Right-click to open admin UI
```

## Mod Detection Heuristics

Based on this analysis, the detection logic should be:

```
IF manifest.Main exists AND is string:
    type = "plugin"
ELSE IF hasJavaClasses (any .class file):
    type = "plugin"
ELSE IF manifest exists:
    type = "pack"
ELSE IF location == "packs" OR format == "directory":
    type = "pack"
ELSE:
    type = "unknown"
```

**Note**: The current implementation in `electron/main.ts:resolveModType` follows this logic correctly.

## Storage Location Reality

**Observation**: Both `.zip` packs and `.jar` plugins are stored in `UserData/Mods/`. The `UserData/Packs/` folder appears to be for directory-based packs only.

Current scanning behavior:
- `scanPacksFolder`: Only scans directories (correct for Packs folder)
- `scanModsFolder`: Scans directories, .zip, and .jar (correct for Mods folder)

## Recommendations for Hymn

1. **UI should distinguish mod types clearly** with badges (Pack/Plugin/Early Plugin)
2. **Show asset inclusion** for plugins (`IncludesAssetPack: true`)
3. **Display dependencies** prominently (some mods require Hytale modules)
4. **Support version formats**: semver, date-based, build numbers
5. **Handle large files gracefully** (some mods are 10MB+)
6. **Preserve mod-specific naming conventions** when creating new mods
