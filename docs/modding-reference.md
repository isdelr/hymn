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

### Example Manifests (Local)
- **Pack-only** (Macaw’s Hy Paintings)
  - `Group`: `SketchMacaw`
  - `Name`: `Macaw's Hy Paintings`
  - `Version`: `1.0.0`
  - No `Main` or `IncludesAssetPack` fields
- **Pack-only** (Violet’s Furnishings)
  - `Group`: `Violet`
  - `Name`: `Violet's Furnishings`
  - `Version`: `0.1`
  - No `Main` or `IncludesAssetPack` fields
- **Plugin + assets** (Ymmersive Statues)
  - `Group`: `Conczin`
  - `Name`: `Ymmersive Statues`
  - `Version`: `1.0.1`
  - `Main`: `net.conczin.YmmersiveStatues`
  - `IncludesAssetPack`: `true`

## Packs: Getting Started
1. Create folder: `UserData/Packs/YourPackName`.
2. Create `manifest.json` with core fields:
   - `Group`, `Name`, `Version`, `Description`
   - `Authors` (Name, Email, Url)
   - `Website`, `ServerVersion`, `Dependencies`, `OptionalDependencies`
   - `DisabledByDefault` (boolean)
3. Create **Common** and **Server** folders:
   - `Common` for models/textures
   - `Server` for items/blocks/translations/particles

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
- **Common**: `Group`, `Version`, `Description`, `Main`, `Authors`, `ServerVersion`
- **Dependencies**: `Dependencies`, `OptionalDependencies`, `LoadBefore`
- **Flags**: `DisabledByDefault`, `IncludesAssetPack`

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
