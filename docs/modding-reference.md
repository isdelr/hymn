# Hytale Modding Reference (Summary)

This summary merges the official CurseForge guides you supplied with additional HytaleDocs references. It preserves key details while keeping the text scannable.

## Modding Philosophy (Server-First)
- **One community, one client**: players never install a modded client.
- **Server streams content** to clients; even single-player runs a local server.
- **Benefits**: instant updates, no modpack friction, improved security.

## Mod Types
- **Packs (Data Assets)**: JSON-based assets for blocks/items/NPCs; edited via Asset Editor.
- **Plugins (Java)**: `.jar` mods built with Java 25 + Gradle 9.2.0.
- **Bootstrap/Early Plugins**: low-level bytecode transformers loaded before the server.
- **Visual Scripting**: node-based system (coming soon).

## Default Locations (Windows)
- Root: `%AppData%\Hytale`
- Packs: `...\UserData\Packs\YourPackName`
- Plugins (mods): `...\\UserData\\Mods` (observed `.jar` + `.zip` mods)
- Early plugins: `...\earlyplugins` (create manually or use `--early-plugins`)
- Dedicated server layout: `/hytale-server/mods`, `/plugins`, `/config`, `/worlds`

## Observed Packaging (Local Install)
- Mods in `UserData/Mods` commonly ship as **archives** with `manifest.json` at root.
- Pack-only mods: `Common/` + `Server/` (no Java classes).
- Plugin mods: Java classes + `manifest.json`, sometimes with `Common/` assets (`IncludesAssetPack`).

### Example Manifests (from real mods)

**Pack-only mod** (NoCube's Bags - .zip):
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

**Plugin mod with dependencies** (AdvancedItemInfo - .jar):
```json
{
  "Group": "Buuz135",
  "Name": "AdvancedItemInfo",
  "Version": "1.0.4",
  "Description": "Adds a command to open a GUI with all the items in the game and their info",
  "Authors": [{ "Name": "Buuz135" }],
  "Website": "website",
  "ServerVersion": "*",
  "Dependencies": {
    "Hytale:EntityModule": "*"
  },
  "OptionalDependencies": {},
  "DisabledByDefault": false,
  "Main": "com.buuz135.advancediteminfo.Main",
  "IncludesAssetPack": true
}
```

**Plugin mod with multiple dependencies** (EyeSpy - .jar):
```json
{
  "Group": "JarHax",
  "Name": "EyeSpy",
  "Version": "2026.1.14-55560",
  "Authors": [
    { "Name": "Jaredlll08", "Url": "https://blamejared.com" },
    { "Name": "Darkhax", "Url": "https://darkhax.net" }
  ],
  "Website": "https://www.curseforge.com/hytale/mods/eyespy",
  "ServerVersion": "*",
  "Dependencies": {
    "Hytale:EntityModule": "*",
    "Hytale:AssetModule": "*"
  },
  "OptionalDependencies": {},
  "DisabledByDefault": false,
  "Main": "com.jarhax.eyespy.EyeSpy",
  "IncludesAssetPack": true
}
```

## Packs: Getting Started
1. Create folder: `UserData/Packs/YourPackName`.
2. Create `manifest.json` with core fields:
   - `Group`, `Name`, `Version`, `Description`
   - `Authors` (array of `{Name, Email?, Url?}` objects)
   - `Website`, `ServerVersion`
   - `Dependencies`, `OptionalDependencies` (object format: `{"ModId": "version"}`)
   - `DisabledByDefault` (boolean)
3. Create **Common** and **Server** folders:
   - `Common` for models/textures/UI/particles/animations
   - `Server` for items/blocks/translations/audio/entities

### Server Folder Structure (observed from real mods)
```
Server/
├── Audio/
│   └── SoundEvents/SFX/          # Sound event definitions
├── Entity/
│   └── Effects/                   # Entity effect definitions
├── Item/
│   ├── Animations/               # Item animation definitions
│   ├── Block/
│   │   ├── Blocks/               # Block definitions
│   │   └── Hitboxes/             # Hitbox definitions
│   ├── Category/CreativeLibrary/ # Item categories
│   ├── Groups/                   # Item groups (for variants)
│   ├── Interactions/             # Item interactions
│   └── Items/                    # Item definitions
├── Languages/
│   └── en-US/                    # Translations (.lang files)
│       ├── server.lang           # Core translations
│       ├── items.lang            # Item name translations
│       └── ...
└── NPC/
    └── Roles/                    # NPC role definitions
```

### Common Folder Structure (observed from real mods)
```
Common/
├── Blocks/                       # Block models and textures
├── BlockTextures/                # Block textures
├── Characters/
│   └── Animations/Items/         # Character item animations
├── Icons/ItemsGenerated/         # Generated item icons
├── Items/                        # Item models and textures
├── Models/                       # General models
├── Particles/Textures/           # Particle textures
├── ScreenEffects/                # Screen effect textures
└── UI/                           # Custom UI elements
    └── Custom/Pages/             # Custom UI pages (.ui files)
```

### Adding a Block (Summary)
- Create JSON in `Server/Item/Items/your_block.json`.
- Define `TranslationProperties`, `MaxStack`, `Icon`, `Categories`, `BlockType`, etc.
- Add texture in `Common/BlockTextures/your_block_texture.png`.
- Add translation in `Server/Languages/<locale>/server.lang` (e.g. `Example_Block.name = Example Block`).
- Edit/preview in the **Asset Editor** in-game.

### Block State Changes
- Use `Interactions -> Use -> ChangeState` to cycle states.
- Define `State.Definitions` for textures, models, animations, hints, particles.

### Block Animations
- Set `CustomModelAnimation` on states.
- Animations are `.blockyanim` files created in Blockbench.
- Animation groups must match model group names.

### Item Categories
- Create `Server/Item/Category/CreativeLibrary/MyItemCategory.json` with `Icon`, `Order`, `Children`.
- Add translations in `Server/Languages/en-US/ui.lang`.
- Assign categories in item JSON: `"Categories": ["MyCategory.Example_Category"]`.

## Data Assets: Blocks, Items, NPCs
HytaleDocs uses a `mods/<pack>/data` and `mods/<pack>/assets` structure, while the current Early Access tooling exposes `UserData/Packs/.../Server` and `Common` folders. Treat them as **equivalent concepts** (server/data vs common/assets).

### Block Properties + Behaviors
- **Core properties**: `hardness`, `resistance`, `material`, `transparent`, `solid`.
- **Visuals**: `renderType`, `color`, `luminance`, `opacity`.
- **Sound**: `soundGroup`, `breakSound`, `placeSound`, `stepSound`.
- **Behaviors**: gravity, liquid, emissive, interactive, rotatable, connectable, breakable.

### Items
- **Core properties**: `maxStackSize`, `durability`, `rarity`, `category`.
- **Weapon properties**: `damage`, `attackSpeed`, `knockback`, `reach`, `critChance`.
- **Tool properties**: `miningSpeed`, `harvestLevel`, `toolType`, `efficiency`.
- **Armor properties**: `defense`, `toughness`, `slot`, `weight`.
- **Consumables**: `consumeTime`, `nutrition`, `saturation`, `effects`.
- **Behaviors**: onUse, onHit, onBlockBreak, onEquip, passive, throwable, placeable, fuel.

### NPCs + AI
- **Stats**: `health`, `damage`, `speed`, `armor`, `knockbackResistance`.
- **AI**: behavior trees, goals, sensors, targeting, movement, combat.
- **Common goals**: attackTarget, wander, patrol, guard, idle, lookAround.
- **Common sensors**: sight, hearing, damage, proximity, time, health.

## Plugins (Java)
**Requirements:** Java 25, Gradle 9.2.0, IntelliJ IDEA (recommended).

### Project Setup
- Use the community template by Darkhax & Jared (includes run configs and assets).
- Update `settings.gradle`, `gradle.properties`, and `src/main/resources/manifest.json`.

### Plugin Basics
- Extend `JavaPlugin` and include a `JavaPluginInit` constructor.
- Lifecycle: `preLoad()` → `setup()` → `start()` → `shutdown()`.
- Plugin IDs use `Group:Name` format.
- Install by placing `.jar` in `%AppData%/Hytale/UserData/Mods`.

### Manifest.json (Key Fields)
- **Required**: `Name`
- **Common**: `Group`, `Version`, `Description`, `Main`, `Authors`, `ServerVersion`, `Website`
- **Dependencies**: `Dependencies`, `OptionalDependencies`, `LoadBefore` — all use **object format**: `{"ModId": "version"}` where `"*"` means any version (e.g., `"Dependencies": {"Hytale:EntityModule": "*"}`)
- **Flags**: `DisabledByDefault`, `IncludesAssetPack`
- **Advanced**: `SubPlugins` (array of sub-plugin identifiers)

### Registries (Examples)
Plugins can register commands, events, assets, block states, entities, tasks, and more.

### Example Command
Plugins can issue UI titles with utilities like `EventTitleUtil.showEventTitleToPlayer(...)`.

### Custom Config Files (Codec)
- Define a config model using `BuilderCodec`.
- Register with `withConfig("ExamplePlugin", ExampleConfig.CODEC)`.
- Files are generated under `{Group}_{Name}/{ConfigName}.example.json` in the plugin folder.

## Bootstrap / Early Plugins
- Loaded before server; **no standard API access**.
- Must implement `com.hypixel.hytale.plugin.early.ClassTransformer`.
- Register transformer via `META-INF/services/com.hypixel.hytale.plugin.early.ClassTransformer`.
- **Restricted packages** cannot be modified (e.g. `java`, `javax`, `io.netty`, `org.objectweb.asm`, `com.google.gson`).
- Users must accept a startup warning (`--accept-early-plugins`).

## Art Assets
- Formats: `.blockymodel`, `.blockyanim`, `.png`, `.ogg`.
- Primary tool: **Blockbench** with the official Hytale plugin.
- Textures: PNG, dimensions multiples of 32px; 32px/unit for blocks, 64px/unit for characters.

## Server Internals (Advanced)
- **Architecture**: ECS, event bus, plugin manager.
- **Network**: QUIC/UDP, default port 5520.
- **Server jars** are not obfuscated; source code release planned 1–2 months after launch.

## Distribution + Monetization
- CurseForge is the official distribution partner.
- **0% commission** for first 2 years; up to **20%** after.
- Cosmetic mods are allowed but players must install them to see changes.

## Early Access Caveats
- Documentation incomplete; workflows still rough.
- Asset Graph Editor is in development.
- **Backups are mandatory**; crashes possible.

## References
- CurseForge Hytale Modding articles (packs, blocks, animations, plugins).
- HytaleDocs: modding overview, plugins, art assets, server internals.
