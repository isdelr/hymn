# Hytale Modding Reference (Verified)

This document is based on direct examination of real Hytale mods, the game's Assets.zip, and official documentation.

> **Verified Against:** `HytaleServer.jar` version `2026.01.15-c04fdfe10`
> **Last Updated:** January 2026

## Modding Philosophy (Server-First)

- **One community, one client**: Players never need to install a modded client.
- **Server streams content** to clients; even single-player runs a local server.
- **Benefits**: Instant updates, no modpack friction, improved security.

## Mod Types

Hytale supports three distinct mod types with different capabilities and installation locations:

### 1. Packs (Asset/Data Mods)

**Purpose**: Add or modify game content (blocks, items, NPCs, UI) using JSON data files and art assets. No coding required.

**Characteristics**:
- File formats: `.zip` archives or uncompressed folders
- Contains `Common/` and/or `Server/` directories
- Manifest has NO `Main` field
- Can be edited with Hytale's built-in Asset Editor

**Installation Location**:
- Primary: `%AppData%\Hytale\UserData\Mods\` (as .zip or folder)
- Legacy: `%AppData%\Hytale\UserData\Packs\` (folders only)

**Example Manifest** (NoCube's Bags - pack-only):
```json
{
  "Group": "NoCube",
  "Name": "[NoCube's] Simple Bags",
  "Version": "0.0.2",
  "Description": "Adds bags to carry more items",
  "Authors": [
    { "Name": "NoCube", "Url": "https://www.curseforge.com/members/nocubeyt/projects" }
  ],
  "Website": "https://curseforge.com/hytale/mods/nocubes-bags",
  "ServerVersion": "*",
  "Dependencies": {},
  "OptionalDependencies": {},
  "DisabledByDefault": false
}
```

### 2. Plugins (Java Mods)

**Purpose**: Extend game functionality using Java code and the Hytale Server API. Can include asset packs.

**Characteristics**:
- File format: `.jar` archives (compiled Java)
- Contains Java classes in package structure (e.g., `com/author/modname/`)
- Manifest HAS a `Main` field pointing to the entry class
- May include `IncludesAssetPack: true` if bundled with assets

**Installation Location**: `%AppData%\Hytale\UserData\Mods\`

**Requirements**: Java 25, Gradle 9.2.0 for development

**Example Manifest** (AdminUI - plugin with assets):
```json
{
  "Group": "Buuz135",
  "Name": "AdminUI",
  "Version": "1.0.3",
  "Description": "Adds multiple admin ui pages to the game.",
  "Authors": [{ "Name": "Buuz135" }],
  "Website": "https://buuz135.com",
  "ServerVersion": "*",
  "Dependencies": {
    "Hytale:AccessControlModule": "*"
  },
  "OptionalDependencies": {},
  "DisabledByDefault": false,
  "Main": "com.buuz135.adminui.AdminUI",
  "IncludesAssetPack": true
}
```

### 3. Early Plugins (Bootstrap/Class Transformers)

**Purpose**: Low-level modifications that run before the server starts. Used for bytecode transformation and core system modifications.

**Characteristics**:
- File format: `.jar` archives
- Must implement `com.hypixel.hytale.plugin.early.ClassTransformer`
- Registered via `META-INF/services/com.hypixel.hytale.plugin.early.ClassTransformer`
- NO standard API access during transformation phase
- Requires user acceptance (`--accept-early-plugins` flag)

**Installation Location**: System-specific early plugins folder

**Restrictions**:
- Cannot modify restricted packages: `java`, `javax`, `io.netty`, `org.objectweb.asm`, `com.google.gson`
- Users see a startup warning before loading

**When to Use**: Only when absolutely necessary for features that cannot be achieved through standard plugins or packs.

## Manifest Schema (Complete)

All mods use `manifest.json` at the archive/folder root:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Name` | string | **Yes** | Display name of the mod |
| `Group` | string | No | Author/organization identifier |
| `Version` | string | No | Semantic version (e.g., "1.0.0") |
| `Description` | string | No | Brief description shown in mod lists |
| `Authors` | array | No | Array of author objects |
| `Website` | string | No | URL to mod homepage or documentation |
| `ServerVersion` | string | No | Compatible server version (`"*"` = any) |
| `Dependencies` | object | No | Required mods: `{"ModId": "version"}` |
| `OptionalDependencies` | object | No | Optional mods: `{"ModId": "version"}` |
| `LoadBefore` | object | No | Mods that should load after this one |
| `DisabledByDefault` | boolean | No | If true, mod starts disabled |
| `Main` | string | Plugins | Entry point class (e.g., `"com.author.MyPlugin"`) |
| `IncludesAssetPack` | boolean | No | True if plugin includes `Common/`/`Server/` assets |
| `SubPlugins` | array | No | Array of sub-plugin identifiers |

### Author Object Format
```json
{
  "Name": "AuthorName",
  "Email": "optional@email.com",
  "Url": "https://optional-website.com"
}
```

### Dependency Version Format
- `"*"` - Any version
- `"1.0.0"` - Exact version
- `">=1.0.0"` - Minimum version

## Asset Structure

### Common/ (Client-Side Assets)

Assets that clients download and render locally.

```
Common/
├── Blocks/                    # Block models (.blockymodel) and textures
├── BlockTextures/             # Block texture files (.png)
├── Characters/
│   └── Animations/Items/      # Character item animations
├── Cosmetics/
│   └── CharacterCreator/      # Character customization assets
├── Icons/
│   └── ItemsGenerated/        # Auto-generated item icons
├── Items/                     # Item models and textures
├── Languages/                 # Client-side translations
├── Models/                    # General 3D models
├── Music/                     # Background music
├── NPC/                       # NPC visual assets
├── NotificationIcons/         # UI notification icons
├── Particles/
│   └── Textures/              # Particle effect textures
├── Resources/                 # Miscellaneous resources
├── ScreenEffects/             # Full-screen effect textures
├── Sky/                       # Skybox textures
├── Sounds/                    # Sound effects
├── TintGradients/             # Color gradient maps
├── Trails/                    # Trail effect assets
├── UI/
│   └── Custom/
│       └── Pages/             # Custom UI definitions (.ui files)
└── VFX/                       # Visual effects
```

### Server/ (Server-Side Data)

Game logic and configuration processed by the server.

```
Server/
├── Audio/
│   └── SoundEvents/SFX/       # Sound event definitions
├── BarterShops/               # NPC shop configurations
├── BlockTypeList/             # Block type definitions
├── Camera/                    # Camera configurations
├── Drops/                     # Loot table definitions
├── Entity/
│   └── Effects/               # Entity effect definitions
├── Environments/              # Environment configurations
├── Farming/                   # Farming system data
├── GameplayConfigs/           # Game rule configurations
├── HytaleGenerator/           # World generation configs
├── Instances/                 # Instance definitions
├── Item/
│   ├── Animations/            # Item animation definitions
│   ├── Block/
│   │   ├── Blocks/            # Block definitions (.json)
│   │   └── Hitboxes/          # Block hitbox definitions
│   ├── Category/
│   │   └── CreativeLibrary/   # Creative mode categories
│   ├── Groups/                # Item variant groups
│   ├── Interactions/          # Item interaction definitions
│   │   ├── Block/             # Block interactions
│   │   └── Item/              # Item-on-item interactions
│   ├── Items/                 # Item definitions (.json)
│   │   ├── Ingredient/        # Crafting ingredients
│   │   └── Tool/
│   │       └── Pickaxe/       # Tool type definitions
│   └── RootInteractions/      # Base interaction handlers
├── Languages/
│   └── en-US/                 # Server-side translations
│       ├── server.lang        # Core translations
│       ├── items.lang         # Item names
│       └── ui.lang            # UI text
├── MacroCommands/             # Command macros
├── Models/                    # Server-side model references
├── NPC/
│   └── Roles/                 # NPC role definitions
├── Objective/                 # Objective/quest definitions
├── Particles/                 # Particle system configs
├── PortalTypes/               # Portal type definitions
├── PrefabEditorCreationSettings/
├── PrefabList/                # Prefab references
├── Prefabs/                   # Structure prefabs
├── ProjectileConfigs/         # Projectile configurations
├── Projectiles/               # Projectile definitions
├── ResponseCurves/            # Animation response curves
├── ScriptedBrushes/           # World editor brushes
├── TagPatterns/               # Tag pattern definitions
├── Weathers/                  # Weather configurations
├── WordLists/                 # Word list data
└── World/                     # World configuration
```

## World-Based Mod Configuration

Hytale uses per-world mod configuration stored in `Saves/{WorldName}/config.json`:

```json
{
  "Mods": {
    "Buuz135:AdminUI": { "Enabled": true },
    "NoCube:[NoCube's] Simple Bags": { "Enabled": false }
  }
}
```

Mods are **disabled by default** unless explicitly enabled in the world config.

## Plugin Development

### Requirements
- **Java 25** (required SDK)
- **Gradle 9.2.0** (build system)
- **IntelliJ IDEA** (recommended IDE)

### Project Setup
Use the official example project template: https://github.com/Build-9/Hytale-Example-Project

Key features:
- Gradle automatically updates `Version` and `IncludesAssetPack` in manifest
- Creates `HytaleServer` run configuration on import
- VS Code support via `./gradlew generateVSCodeLaunch`

### Plugin Lifecycle
1. `preLoad()` - Early initialization
2. `setup()` - Register commands, events, assets
3. `start()` - Server ready, begin operation
4. `shutdown()` - Clean up resources

### Event Registration

Events are registered using functional callbacks (no `EventListener` interface):

```java
// In your plugin's setup() method
getEventRegistry().register(PlayerConnectEvent.class, event -> {
    PlayerRef playerRef = event.getPlayerRef();
    // Handle player connection
});

// Or using method references
getEventRegistry().register(PlayerConnectEvent.class, this::onPlayerConnect);
```

**Key Event Classes:**
- `com.hypixel.hytale.server.core.event.events.player.PlayerConnectEvent`
- `com.hypixel.hytale.server.core.event.events.player.PlayerDisconnectEvent`
- `com.hypixel.hytale.server.core.event.events.player.PlayerChatEvent` (async)
- `com.hypixel.hytale.server.core.event.events.player.PlayerInteractEvent`

### Available Hytale Modules
Plugins can depend on built-in modules:
- `Hytale:EntityModule` - Entity management
- `Hytale:AssetModule` - Asset handling
- `Hytale:AccessControlModule` - Permission system

## Art Assets

### File Formats
- **Models**: `.blockymodel` (Blockbench format)
- **Animations**: `.blockyanim` (Blockbench animation)
- **Textures**: `.png` (power-of-2 dimensions preferred)
- **Audio**: `.ogg` (Vorbis)
- **UI**: `.ui` (Hytale UI definition)

### Texture Guidelines
- Block textures: 32px per unit
- Character textures: 64px per unit
- Dimensions should be multiples of 32px

### Tools
- **Blockbench** with official Hytale plugin for models/animations
- **Asset Editor** (in-game) for quick edits
- **World Tools** (in-game) for world editing

## Distribution

- **CurseForge** is the official distribution platform
- **0% commission** for first 2 years; up to 20% after
- Cosmetic-only mods require client installation to view

## Important Notes

1. **Documentation may be outdated**: Official docs sometimes reference `pack.json` but real mods use `manifest.json`
2. **Early Access caveats**: APIs and file formats may change
3. **Always backup**: Crashes are possible during development
4. **Server source planned**: Hypixel plans to release server source code 1-2 months after full launch

## References

- CurseForge Hytale Modding Support: https://support.curseforge.com/en/support/solutions/articles/9000273178-hytale-modding
- Hytale Example Project: https://github.com/Build-9/Hytale-Example-Project
- HytaleDocs (community): https://hytale-docs.com
