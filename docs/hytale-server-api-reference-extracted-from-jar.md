# Hytale Server API Reference

This document provides a comprehensive reference for the Hytale Server API, extracted from `HytaleServer.jar`.

**Total API Classes:** 2,959 classes across 664 packages

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Plugin System](#plugin-system)
3. [HytaleServer](#hytaleserver)
4. [Server Configuration](#server-configuration)
5. [Universe & World](#universe--world)
6. [Players](#players)
7. [Entities](#entities)a
8. [Components](#components)
9. [Commands](#commands)
10. [Events](#events)
11. [Scheduling & Tasks](#scheduling--tasks)
12. [Permissions](#permissions)
13. [Time System](#time-system)
14. [Blocks & Items](#blocks--items)
15. [Inventory](#inventory)
16. [Messages](#messages)
17. [Interactions](#interactions)
18. [Built-in Modules](#built-in-modules)
19. [Math Utilities](#math-utilities)
20. [Network Protocol](#network-protocol)
21. [Built-in Commands](#built-in-commands)
22. [Adventure System](#adventure-system)

---

## Core Concepts

### Package Structure

```
com.hypixel.hytale.server.core          - Core server functionality
com.hypixel.hytale.server.core.universe - Universe, World, Players
com.hypixel.hytale.server.core.entity   - Entity system
com.hypixel.hytale.server.core.command  - Command system
com.hypixel.hytale.server.core.event    - Event system
com.hypixel.hytale.server.core.modules  - Server modules (time, weather, etc.)
com.hypixel.hytale.server.core.plugin   - Plugin API
com.hypixel.hytale.builtin              - Built-in game features
com.hypixel.hytale.component            - ECS component system
com.hypixel.hytale.protocol             - Network packets
com.hypixel.hytale.math                 - Math utilities (vectors, transforms)
```

---

## Plugin System

### JavaPlugin (Base Class)

**Package:** `com.hypixel.hytale.server.core.plugin`

```kotlin
class MyPlugin(init: JavaPluginInit) : JavaPlugin(init) {
    override fun setup() { /* Called during plugin setup phase */ }
    override fun start() { /* Called when plugin enables */ }
    override fun shutdown() { /* Called when plugin disables */ }
}
```

**Key Properties (from PluginBase):**
- `logger: HytaleLogger` - Plugin logger
- `manifest: PluginManifest?` - Plugin manifest info
- `eventRegistry: EventRegistry` - Register event listeners
- `commandRegistry: CommandRegistry` - Register commands
- `dataDirectory: Path` - Plugin data directory (use `getDataDirectory()`)
- `taskRegistry: TaskRegistry` - Register scheduled tasks
- `entityStoreRegistry: ComponentRegistryProxy<EntityStore>` - Register entity components
- `chunkStoreRegistry: ComponentRegistryProxy<ChunkStore>` - Register chunk components
- `blockStateRegistry: BlockStateRegistry` - Register block states
- `entityRegistry: EntityRegistry` - Register custom entities
- `assetRegistry: AssetRegistry` - Register custom assets
- `clientFeatureRegistry: ClientFeatureRegistry` - Register client features

**PluginBase Methods:**
```kotlin
fun getName(): String                    // Plugin name
fun getLogger(): HytaleLogger           // Get logger
fun getIdentifier(): PluginIdentifier   // Plugin identifier
fun getManifest(): PluginManifest?      // Plugin manifest
fun getDataDirectory(): Path            // Data directory path
fun getState(): PluginState             // Current state
fun getCommandRegistry(): CommandRegistry
fun getEventRegistry(): EventRegistry
fun getTaskRegistry(): TaskRegistry
fun getEntityRegistry(): EntityRegistry
fun getBlockStateRegistry(): BlockStateRegistry
fun getAssetRegistry(): AssetRegistry
fun getBasePermission(): String         // Base permission node
fun isDisabled(): Boolean
fun isEnabled(): Boolean
```

**Config Helper:**
```kotlin
// Create a config file for your plugin
val config: Config<MyConfigClass> = withConfig(MyConfigClass.CODEC)
val config: Config<MyConfigClass> = withConfig("custom-name.json", MyConfigClass.CODEC)
```

### JavaPluginInit

Passed to plugin constructor, contains initialization data.

### Plugin Lifecycle

1. **Construction** - Plugin instantiated with `JavaPluginInit`
2. **PreLoad** - `preLoad()` called (async, returns CompletableFuture)
3. **Setup** - `setup()` called for registrations
4. **Start** - `start()` called when server ready
5. **Shutdown** - `shutdown()` called on server stop

---

## HytaleServer

**Package:** `com.hypixel.hytale.server.core`

The main server singleton providing access to core systems.

```kotlin
// Access the global scheduled executor for background tasks
val executor: ScheduledExecutorService = HytaleServer.SCHEDULED_EXECUTOR

// Schedule a repeating task
executor.scheduleAtFixedRate({
    // Your task code
}, 0, 1, TimeUnit.SECONDS)
```

**Key Fields:**
- `DEFAULT_PORT: Int` - Default server port
- `SCHEDULED_EXECUTOR: ScheduledExecutorService` - Global scheduler for background tasks

**Key Methods:**
- `getEventBus(): EventBus` - Global event bus
- `getPluginManager(): PluginManager` - Plugin management
- `getCommandManager(): CommandManager` - Command management
- `getConfig(): HytaleServerConfig` - Server configuration
- `shutdownServer()` - Shutdown the server
- `shutdownServer(ShutdownReason)` - Shutdown with reason

---

## Server Configuration

### HytaleServerConfig

**Package:** `com.hypixel.hytale.server.core`

Server-wide configuration accessible at runtime.

```kotlin
// Access via static PATH
val configPath = HytaleServerConfig.PATH
```

**Constants:**
- `VERSION: Int` - Config version
- `DEFAULT_MAX_VIEW_RADIUS: Int` - Default view radius
- `PATH: Path` - Config file path

**Key Methods:**
```kotlin
fun getServerName(): String
fun setServerName(String)
fun getMotd(): String
fun setMotd(String)
fun getPassword(): String
fun setPassword(String)
fun getMaxPlayers(): Int
fun setMaxPlayers(Int)
fun getMaxViewRadius(): Int
fun setMaxViewRadius(Int)
fun isLocalCompressionEnabled(): Boolean
fun setLocalCompressionEnabled(Boolean)
fun getDefaults(): Defaults
fun setDefaults(Defaults)
fun getConnectionTimeouts(): ConnectionTimeouts
fun setConnectionTimeouts(ConnectionTimeouts)
fun getRateLimitConfig(): RateLimitConfig
fun setRateLimitConfig(RateLimitConfig)
fun getModules(): Map<String, Module>
fun getModule(String): Module
fun setModules(Map<String, Module>)
```

### WorldConfig

**Package:** `com.hypixel.hytale.server.core.universe.world`

Per-world configuration.

```kotlin
val worldConfig = world.worldConfig
```

---

## Universe & World

### Universe

**Package:** `com.hypixel.hytale.server.core.universe`

The Universe is the top-level container for all worlds and players. Extends `JavaPlugin`.

```kotlin
val universe = Universe.get()
val players: List<PlayerRef> = universe.players
val defaultWorld: World? = universe.defaultWorld
val worlds: Map<String, World> = universe.worlds
```

**Key Methods:**
```kotlin
// Singleton access
fun get(): Universe

// Player management
fun getPlayers(): List<PlayerRef>
fun getPlayer(uuid: UUID): PlayerRef?
fun getPlayer(username: String, matching: NameMatching): PlayerRef?
fun getPlayerByUsername(username: String, matching: NameMatching): PlayerRef?
fun getPlayerCount(): Int
fun addPlayer(...): CompletableFuture<PlayerRef>
fun removePlayer(PlayerRef)
fun resetPlayer(PlayerRef): CompletableFuture<PlayerRef>

// World management
fun getWorlds(): Map<String, World>
fun getWorld(name: String): World?
fun getWorld(uuid: UUID): World?
fun getDefaultWorld(): World?
fun isWorldLoadable(name: String): Boolean
fun addWorld(name: String): CompletableFuture<World>
fun addWorld(name: String, template: String, generator: String): CompletableFuture<World>
fun makeWorld(name: String, path: Path, config: WorldConfig): CompletableFuture<World>
fun loadWorld(name: String): CompletableFuture<World>
fun removeWorld(name: String): Boolean

// Messaging
fun sendMessage(Message)                    // Broadcast to all players
fun broadcastPacket(Packet)                 // Broadcast packet
fun broadcastPacket(vararg Packet)

// Other
fun getPath(): Path                         // Universe directory path
fun getPlayerStorage(): PlayerStorage
fun runBackup(): CompletableFuture<Void>
```

### World

**Package:** `com.hypixel.hytale.server.core.universe.world`

A World is a separate dimension/instance. Extends `TickingThread` and implements `Executor`.

```kotlin
val world: World = universe.defaultWorld!!
world.execute { /* Run on world thread */ }
val entityStore: EntityStore = world.entityStore
val players: List<Player> = world.players
```

**Constants:**
- `DEFAULT: String` - Default world name
- `SAVE_INTERVAL: Float` - Save interval

**Key Methods:**
```kotlin
// Thread execution (REQUIRED for component access)
fun execute(Runnable)                       // Run code on world thread

// Basic info
fun getName(): String
fun isAlive(): Boolean
fun getLogger(): HytaleLogger
fun getTick(): Long                         // Current tick number
fun getWorldConfig(): WorldConfig
fun getDeathConfig(): DeathConfig
fun getDaytimeDurationSeconds(): Int
fun getNighttimeDurationSeconds(): Int

// Pause/Tick control
fun isPaused(): Boolean
fun setPaused(Boolean)
fun isTicking(): Boolean
fun setTicking(Boolean)
fun setTps(Int)

// Time dilation (slow-mo/speed-up)
static fun setTimeDilation(Float, ComponentAccessor<EntityStore>)

// Players
fun getPlayers(): List<Player>
fun getPlayerRefs(): Collection<PlayerRef>
fun getPlayerCount(): Int
fun addPlayer(PlayerRef): CompletableFuture<PlayerRef>
fun addPlayer(PlayerRef, Transform): CompletableFuture<PlayerRef>
fun trackPlayerRef(PlayerRef)
fun untrackPlayerRef(PlayerRef)

// Entities
fun getEntity(uuid: UUID): Entity?
fun getEntityRef(uuid: UUID): Ref<EntityStore>?
fun <T: Entity> spawnEntity(T, Vector3d, Vector3f): T
fun <T: Entity> addEntity(T, Vector3d, Vector3f, AddReason): T

// Stores and systems
fun getEntityStore(): EntityStore
fun getChunkStore(): ChunkStore
fun getChunkLighting(): ChunkLightingManager
fun getWorldMapManager(): WorldMapManager
fun getWorldPathConfig(): WorldPathConfig
fun getNotificationHandler(): WorldNotificationHandler
fun getEventRegistry(): EventRegistry

// Messaging
fun sendMessage(Message)                    // Broadcast to world

// Chunks
fun getChunkIfInMemory(long): WorldChunk?
fun getChunkIfLoaded(long): WorldChunk?
fun getChunkAsync(long): CompletableFuture<WorldChunk>
fun loadChunkIfInMemory(long): WorldChunk?

// Compass
fun isCompassUpdating(): Boolean
fun setCompassUpdating(Boolean)
```

### EntityStore

**Package:** `com.hypixel.hytale.server.core.universe.world.storage`

```kotlin
val store: Store<EntityStore> = entityStore.store
val resource = store.getResource(ResourceType)
```

**Key Methods:**
- `getStore(): Store<EntityStore>` - Get the component store
- `getRefFromUUID(uuid: UUID): Ref?` - Get entity ref by UUID
- `getWorld(): World` - Get parent world

---

## Players

### PlayerRef

**Package:** `com.hypixel.hytale.server.core.universe`

Reference to a player that persists across worlds. Implements `Component<EntityStore>`, `IMessageReceiver`.

```kotlin
val player: PlayerRef = universe.players.first()
val uuid: UUID = player.uuid
val username: String = player.username
player.sendMessage(Message.raw("Hello!"))
```

**Key Methods:**
```kotlin
// Identity
fun getUuid(): UUID
fun getUsername(): String
fun getLanguage(): String
fun setLanguage(String)

// Components
fun getHolder(): Holder<EntityStore>?
fun <T: Component<EntityStore>> getComponent(ComponentType<EntityStore, T>): T?
fun getReference(): Ref<EntityStore>
fun isValid(): Boolean

// Position
fun getTransform(): Transform
fun getWorldUuid(): UUID
fun getHeadRotation(): Vector3f
fun updatePosition(World, Transform, Vector3f)

// Messaging
fun sendMessage(Message)

// Network
fun getPacketHandler(): PacketHandler
fun getChunkTracker(): ChunkTracker
fun getHiddenPlayersManager(): HiddenPlayersManager
fun referToServer(host: String, port: Int)  // Transfer to another server
fun referToServer(host: String, port: Int, data: ByteArray)

// Permissions (via hasPermission - inherited)
// Kicking (via kick(Message) - if exposed)
```

**Static:**
- `getComponentType(): ComponentType<EntityStore, PlayerRef>`

### Player (Entity)

**Package:** `com.hypixel.hytale.server.core.entity.entities`

The actual player entity in the world. Extends `LivingEntity`, implements `CommandSender`, `PermissionHolder`.

```kotlin
val players: List<Player> = world.players
val player: Player = players.first()
```

**Constants:**
- `DEFAULT_VIEW_RADIUS_CHUNKS: Int`
- `RESPAWN_INVULNERABILITY_TIME_NANOS: Long`
- `MAX_TELEPORT_INVULNERABILITY_MILLIS: Long`

**Key Methods:**
```kotlin
// Basic
fun getNetworkId(): Int
fun getPlayerConfigData(): PlayerConfigData
fun isFirstSpawn(): Boolean
fun setFirstSpawn(Boolean)
fun hasSpawnProtection(): Boolean

// Inventory
fun getInventory(): Inventory
fun setInventory(Inventory): Inventory
fun sendInventory()
fun getHotbarManager(): HotbarManager

// UI/Pages
fun getWindowManager(): WindowManager
fun getPageManager(): PageManager
fun getHudManager(): HudManager
fun getWorldMapTracker(): WorldMapTracker

// Position
fun moveTo(Ref<EntityStore>, x: Double, y: Double, z: Double, ComponentAccessor<EntityStore>)
fun addLocationChange(Ref<EntityStore>, x: Double, y: Double, z: Double, ComponentAccessor<EntityStore>)

// State
fun isOverrideBlockPlacementRestrictions(): Boolean
fun setOverrideBlockPlacementRestrictions(Ref<EntityStore>, Boolean, ComponentAccessor<EntityStore>)

// Permissions (CommandSender interface)
fun sendMessage(Message)
fun hasPermission(String): Boolean
fun hasPermission(String, default: Boolean): Boolean

// Lifecycle
fun remove(): Boolean
fun unloadFromWorld()
fun saveConfig(World, Holder<EntityStore>): CompletableFuture<Void>

// Respawn
static fun getRespawnPosition(Ref<EntityStore>, worldName: String, ComponentAccessor<EntityStore>): Transform
```

**Static:**
- `getComponentType(): ComponentType<EntityStore, Player>`

---

## Entities

### Entity

**Package:** `com.hypixel.hytale.server.core.entity`

Abstract base class for all entities. Implements `Component<EntityStore>`.

**Constants:**
- `VERSION: Int` - Entity version
- `UNASSIGNED_ID: Int` - Unassigned network ID

**Key Methods:**
```kotlin
// Identity
fun getUuid(): UUID
fun getNetworkId(): Int
fun getLegacyDisplayName(): String

// Position/Transform
fun getTransformComponent(): TransformComponent
fun setTransformComponent(TransformComponent)
fun moveTo(Ref<EntityStore>, x: Double, y: Double, z: Double, ComponentAccessor<EntityStore>)

// World
fun getWorld(): World
fun loadIntoWorld(World)
fun unloadFromWorld()

// Lifecycle
fun remove(): Boolean
fun wasRemoved(): Boolean
fun markNeedsSave()

// Components
fun getReference(): Ref<EntityStore>
fun setReference(Ref<EntityStore>)
fun clearReference()
fun toHolder(): Holder<EntityStore>

// Collision
fun isCollidable(): Boolean
fun isHiddenFromLivingEntity(Ref<EntityStore>, Ref<EntityStore>, ComponentAccessor<EntityStore>): Boolean
```

### LivingEntity

**Package:** `com.hypixel.hytale.server.core.entity`

Abstract base class for entities with health/inventory. Extends `Entity`.

**Constants:**
- `DEFAULT_ITEM_THROW_SPEED: Int`

**Key Methods:**
```kotlin
// Inventory
fun getInventory(): Inventory
fun setInventory(Inventory): Inventory
fun setInventory(Inventory, silent: Boolean): Inventory
fun setInventory(Inventory, silent: Boolean, overflow: List<ItemStack>): Inventory

// Stats
fun getStatModifiersManager(): StatModifiersManager

// Durability
fun canBreathe(Ref<EntityStore>, BlockMaterial, fluidLevel: Int, ComponentAccessor<EntityStore>): Boolean
fun canDecreaseItemStackDurability(Ref<EntityStore>, ComponentAccessor<EntityStore>): Boolean
fun canApplyItemStackPenalties(Ref<EntityStore>, ComponentAccessor<EntityStore>): Boolean
fun decreaseItemStackDurability(...): ItemStackSlotTransaction
fun updateItemStackDurability(...): ItemStackSlotTransaction

// Fall damage
fun getCurrentFallDistance(): Double
fun setCurrentFallDistance(Double)

// Equipment
fun invalidateEquipmentNetwork()
fun consumeEquipmentNetworkOutdated(): Boolean
```

### Common Entity Types

- `Player` - Player entity (see [Players](#players))
- `LivingEntity` - Base for living entities
- `BlockEntity` - Entities tied to blocks
- `ProjectileComponent` - Projectile behavior component

---

## Components

### Component System (ECS)

Hytale uses an Entity-Component-System architecture.

```kotlin
// Get a component from a player
val componentType = PlayerSomnolence.getComponentType()
val component = player.getComponent(componentType)

// Get a resource from world store
val resourceType = WorldTimeResource.getResourceType()
val resource = store.getResource(resourceType)
```

### ComponentType

**Package:** `com.hypixel.hytale.component`

```kotlin
val type: ComponentType<ECS, T> = MyComponent.getComponentType()
```

### Store

**Package:** `com.hypixel.hytale.component`

```kotlin
val store: Store<EntityStore> = entityStore.store
store.getResource(resourceType)
store.getComponent(ref, componentType)
```

**Key Methods:**
- `getResource(ResourceType): Resource` - Get a world resource
- `getComponent(Ref, ComponentType): Component?` - Get entity component
- `addComponent(Ref, ComponentType): Component` - Add component to entity
- `removeComponent(Ref, ComponentType)` - Remove component

### Ref

Reference to an entity in the store.

### Holder

Holds component data for an entity.

---

## Commands

### CommandManager

**Package:** `com.hypixel.hytale.server.core.command.system`

```kotlin
val commandManager = CommandManager.get()
commandManager.handleCommand(sender, "time day")
```

### CommandSender

Interface for command execution context.

```kotlin
val sender = object : CommandSender {
    override fun getDisplayName(): String = "MyPlugin"
    override fun getUuid(): UUID = UUID(0, 0)
    override fun sendMessage(message: Message) { /* handle output */ }
    override fun hasPermission(permission: String): Boolean = true
    override fun hasPermission(permission: String, default: Boolean): Boolean = true
}
```

### Creating Commands

**Package:** `com.hypixel.hytale.server.core.command`

```kotlin
class MyCommand : Command {
    override fun getName(): String = "mycommand"
    override fun execute(sender: CommandSender, args: Array<String>) {
        sender.sendMessage(Message.raw("Hello!"))
    }
}

// Register in plugin
commandRegistry.registerCommand(MyCommand())
```

---

## Events

### EventRegistry

**Package:** `com.hypixel.hytale.event`

```kotlin
// Basic event registration
eventRegistry.register(PlayerConnectEvent::class.java) { event ->
    val player = event.playerRef
    logger.info("Player connected: ${player.username}")
}

// With priority
eventRegistry.register(EventPriority.HIGH, PlayerConnectEvent::class.java) { event ->
    // Handle with high priority
}

// With key (for keyed events)
eventRegistry.register(SomeKeyedEvent::class.java, "myKey") { event ->
    // Only fires for events with this key
}

// Async event registration
eventRegistry.registerAsync(PlayerChatEvent::class.java) { future ->
    future.thenApply { event ->
        // Process async
        event
    }
}

// Global registration (all keys)
eventRegistry.registerGlobal(SomeKeyedEvent::class.java) { event ->
    // Fires for all keys
}
```

**EventRegistry Methods:**
```kotlin
// Synchronous registration
fun <E: IBaseEvent<Void>> register(Class<E>, Consumer<E>): EventRegistration
fun <E: IBaseEvent<Void>> register(EventPriority, Class<E>, Consumer<E>): EventRegistration
fun <K, E: IBaseEvent<K>> register(Class<E>, key: K, Consumer<E>): EventRegistration
fun <K, E: IBaseEvent<K>> registerGlobal(Class<E>, Consumer<E>): EventRegistration

// Asynchronous registration
fun <E: IAsyncEvent<Void>> registerAsync(Class<E>, Function<CompletableFuture<E>, CompletableFuture<E>>): EventRegistration
fun <K, E: IAsyncEvent<K>> registerAsync(Class<E>, key: K, Function<...>): EventRegistration
fun <K, E: IAsyncEvent<K>> registerAsyncGlobal(Class<E>, Function<...>): EventRegistration
```

### Cancellable Events

Many events implement `ICancellable`:

```kotlin
eventRegistry.register(PlayerInteractEvent::class.java) { event ->
    if (shouldCancel) {
        event.setCancelled(true)
    }
}
```

### Common Events

**Player Events** (`com.hypixel.hytale.server.core.event.events.player`):

| Event | Cancellable | Key Properties |
|-------|-------------|----------------|
| `PlayerConnectEvent` | No | `playerRef`, `player`, `world`, `holder` |
| `PlayerDisconnectEvent` | No | `playerRef`, `disconnectReason` |
| `PlayerChatEvent` | Yes (Async) | `sender`, `targets`, `content`, `formatter` |
| `PlayerInteractEvent` | Yes | `player`, `actionType`, `itemInHand`, `targetBlock`, `targetEntity` |
| `PlayerCraftEvent` | No | `player`, `craftedRecipe`, `quantity` |
| `PlayerDeathEvent` | No | `player` |
| `PlayerRespawnEvent` | No | `player` |

**PlayerConnectEvent:**
```kotlin
eventRegistry.register(PlayerConnectEvent::class.java) { event ->
    val playerRef: PlayerRef = event.playerRef
    val player: Player = event.player
    val world: World = event.world
    event.setWorld(anotherWorld)  // Change spawn world
}
```

**PlayerChatEvent (Async):**
```kotlin
eventRegistry.registerAsync(PlayerChatEvent::class.java) { future ->
    future.thenApply { event ->
        event.setContent("[Modified] " + event.content)
        event.setCancelled(false)
        event
    }
}
```

**PlayerInteractEvent:**
```kotlin
eventRegistry.register(PlayerInteractEvent::class.java) { event ->
    val actionType: InteractionType = event.actionType
    val itemInHand: ItemStack = event.itemInHand
    val targetBlock: Vector3i? = event.targetBlock
    val targetEntity: Entity? = event.targetEntity
    event.setCancelled(true)  // Cancel the interaction
}
```

**ECS Events** (`com.hypixel.hytale.server.core.event.events.ecs`):

| Event | Cancellable | Key Properties |
|-------|-------------|----------------|
| `BreakBlockEvent` | Yes | `itemInHand`, `targetBlock`, `blockType` |
| `PlaceBlockEvent` | Yes | `itemInHand`, `targetBlock`, `rotation` |
| `DamageBlockEvent` | Yes | `itemInHand`, `targetBlock`, `blockType`, `currentDamage`, `damage` |
| `UseBlockEvent` | No | `interactionType`, `context`, `targetBlock`, `blockType` |
| `DropItemEvent` | Yes | - |
| `InteractivelyPickupItemEvent` | Yes | `itemStack` |
| `CraftRecipeEvent` | Yes | `craftedRecipe`, `quantity` |
| `ChangeGameModeEvent` | Yes | `gameMode` |
| `SwitchActiveSlotEvent` | Yes | `previousSlot`, `newSlot`, `isServerRequest`, `isClientRequest` |
| `DiscoverZoneEvent` | No | `discoveryInfo` |

**World Events** (`com.hypixel.hytale.server.core.universe.world.events`):
- `AddWorldEvent` - World added to universe
- `RemoveWorldEvent` - World removed from universe
- `StartWorldEvent` - World started
- `AllWorldsLoadedEvent` - All worlds finished loading
- `ChunkEvent` - Base chunk event
- `ChunkPreLoadProcessEvent` - Before chunk loads

**Server Events** (`com.hypixel.hytale.server.core.event.events`):

| Event | Description |
|-------|-------------|
| `BootEvent` | Server is booting |
| `ShutdownEvent` | Server is shutting down |
| `PrepareUniverseEvent` | Universe preparing (can modify WorldConfigProvider) |

**Permission Events** (`com.hypixel.hytale.server.core.event.events.permissions`):
- `PlayerGroupEvent` - Player added/removed from group
- `GroupPermissionChangeEvent` - Group permission modified
- `PlayerPermissionChangeEvent` - Player permission modified

---

## Scheduling & Tasks

### Using HytaleServer.SCHEDULED_EXECUTOR

The primary way to schedule background tasks:

```kotlin
import com.hypixel.hytale.server.core.HytaleServer
import java.util.concurrent.TimeUnit

// Schedule a one-time delayed task
HytaleServer.SCHEDULED_EXECUTOR.schedule({
    logger.info("This runs after 5 seconds")
}, 5, TimeUnit.SECONDS)

// Schedule a repeating task
val future = HytaleServer.SCHEDULED_EXECUTOR.scheduleAtFixedRate({
    logger.info("This runs every second")
}, 0, 1, TimeUnit.SECONDS)

// Cancel the repeating task later
future.cancel(false)
```

### TaskRegistry

**Package:** `com.hypixel.hytale.server.core.task`

Register tasks with your plugin for automatic cleanup:

```kotlin
// In your plugin
val taskRegistry = getTaskRegistry()

// Register a CompletableFuture task
val task: TaskRegistration = taskRegistry.registerTask(myCompletableFuture)

// Register a ScheduledFuture task
val task: TaskRegistration = taskRegistry.registerTask(myScheduledFuture)
```

### World.execute() for Thread Safety

**IMPORTANT:** Component access must happen on the world thread:

```kotlin
val world = Universe.get().defaultWorld ?: return

// CORRECT: Access components on world thread
world.execute {
    val store = world.entityStore.store
    val timeResource = store.getResource(WorldTimeResource.getResourceType())
    val hour = timeResource.currentHour
}

// Schedule periodic checks
HytaleServer.SCHEDULED_EXECUTOR.scheduleAtFixedRate({
    world.execute {
        // Safe to access components here
        checkSomething()
    }
}, 0, 1, TimeUnit.SECONDS)
```

---

## Permissions

### PermissionsModule

**Package:** `com.hypixel.hytale.server.core.permissions`

```kotlin
// Check permission on player
val hasPermission = player.hasPermission("myplugin.admin")
val hasPermissionWithDefault = player.hasPermission("myplugin.use", true)
```

### HytalePermissions

Built-in permission constants.

### PermissionHolder

**Package:** `com.hypixel.hytale.server.core.permissions`

Interface for entities that can hold permissions.

### Permission Commands

- `/op add <player>` - Add operator
- `/op remove <player>` - Remove operator
- `/op self` - Op yourself
- `/perm user <player>` - Manage user permissions
- `/perm group <group>` - Manage group permissions
- `/perm test <permission>` - Test a permission

---

## Time System

### WorldTimeResource

**Package:** `com.hypixel.hytale.server.core.modules.time`

```kotlin
val timeResourceType = WorldTimeResource.getResourceType()
val timeResource = store.getResource(timeResourceType)

val currentHour: Int = timeResource.currentHour  // 0-23
val gameTime: Instant = timeResource.gameTime
val dayProgress: Float = timeResource.dayProgress  // 0.0-1.0
val sunlightFactor: Double = timeResource.sunlightFactor
val moonPhase: Int = timeResource.moonPhase
```

**Key Methods:**
- `getCurrentHour(): Int` - Current hour (0-23)
- `getGameTime(): Instant` - Full game time
- `getGameDateTime(): LocalDateTime` - Game date/time
- `getDayProgress(): Float` - Progress through day (0-1)
- `getSunlightFactor(): Double` - Current sunlight level
- `getMoonPhase(): Int` - Current moon phase
- `setGameTime(Instant, World, Store)` - Set game time
- `setDayTime(Double, World, Store)` - Set day time
- `isDayTimeWithinRange(Double, Double): Boolean` - Check time range

**Constants:**
- `NANOS_PER_DAY: Long`
- `SECONDS_PER_DAY: Int`
- `HOURS_PER_DAY: Int`
- `DAYS_PER_YEAR: Int`
- `DAYTIME_SECONDS: Int`
- `NIGHTTIME_SECONDS: Int`

---

## Blocks & Items

### BlockType

**Package:** `com.hypixel.hytale.server.core.asset.type.block`

Represents a type of block.

### ItemType

**Package:** `com.hypixel.hytale.server.core.asset.type.item`

Represents a type of item.

### ItemStack

Represents an item with quantity and data.

---

## Inventory

### ItemStack

**Package:** `com.hypixel.hytale.server.core.inventory`

Represents an item stack with type, quantity, and data.

```kotlin
// Create item stacks
val stack1 = ItemStack("item_id")
val stack2 = ItemStack("item_id", 64)
val stack3 = ItemStack("item_id", 64, metadata)

// Check properties
val isEmpty = stack.isEmpty()
val isValid = stack.isValid()
val isBroken = stack.isBroken()
val isUnbreakable = stack.isUnbreakable()
```

**Constants:**
- `EMPTY: ItemStack` - Empty item stack singleton
- `EMPTY_ARRAY: ItemStack[]` - Empty array

**Key Methods:**
```kotlin
fun getItemId(): String
fun getQuantity(): Int
fun getMetadata(): BsonDocument
fun getDurability(): Double
fun getMaxDurability(): Double
fun isEmpty(): Boolean
fun isValid(): Boolean
fun isBroken(): Boolean
fun isUnbreakable(): Boolean
fun getBlockKey(): String?
fun getItem(): Item?
fun withDurability(Double): ItemStack
fun getOverrideDroppedItemAnimation(): Boolean
fun setOverrideDroppedItemAnimation(Boolean)
```

### Inventory

**Package:** `com.hypixel.hytale.server.core.inventory`

Player inventory with multiple sections.

**Section IDs:**
- `HOTBAR_SECTION_ID: Int` - Hotbar section
- `STORAGE_SECTION_ID: Int` - Main storage
- `ARMOR_SECTION_ID: Int` - Armor slots
- `UTILITY_SECTION_ID: Int` - Utility slots
- `TOOLS_SECTION_ID: Int` - Tools section
- `BACKPACK_SECTION_ID: Int` - Backpack

**Default Capacities:**
- `DEFAULT_HOTBAR_CAPACITY: Short`
- `DEFAULT_UTILITY_CAPACITY: Short`
- `DEFAULT_TOOLS_CAPACITY: Short`
- `DEFAULT_ARMOR_CAPACITY: Short`
- `DEFAULT_STORAGE_ROWS: Short`
- `DEFAULT_STORAGE_COLUMNS: Short`
- `DEFAULT_STORAGE_CAPACITY: Short`

**Constants:**
- `INACTIVE_SLOT_INDEX: Byte` - Inactive slot marker

**Key Methods:**
```kotlin
fun markChanged()
fun unregister()
fun moveItem(fromSection: Int, fromSlot: Int, toSection: Int, toSlot: Int, quantity: Int)
fun smartMoveItem(section: Int, slot: Int, quantity: Int, SmartMoveType)
fun takeAll(sectionId: Int): ListTransaction<...>
fun putAll(sectionId: Int): ListTransaction<...>
fun quickStack(sectionId: Int): ListTransaction<...>
```

### ItemContainer

**Package:** `com.hypixel.hytale.server.core.inventory.container`

Interface for item containers (inventories, chests, etc.)

**Key Methods:**
- `getSize(): Int` - Container size
- `getItem(slot: Int): ItemStack?` - Get item at slot
- `setItem(slot: Int, item: ItemStack?)` - Set item at slot
- `addItem(item: ItemStack): Boolean` - Add item to container
- `removeItem(item: ItemStack): Boolean` - Remove item
- `clear()` - Clear all items

### Container Types

- `SimpleItemContainer` - Basic container implementation
- `CombinedItemContainer` - Multiple containers combined
- `DelegateItemContainer` - Delegating container
- `EmptyItemContainer` - Empty/null container singleton

### Slot Filters

**Package:** `com.hypixel.hytale.server.core.inventory.container.filter`

- `SlotFilter` - Base slot filter interface
- `TagFilter` - Filter by item tags
- `ArmorSlotAddFilter` - Armor slot restrictions
- `ResourceFilter` - Resource-based filter
- `NoDuplicateFilter` - Prevent duplicates

---

## Messages

### Message

**Package:** `com.hypixel.hytale.server.core`

```kotlin
// Simple text
val msg = Message.raw("Hello, world!")

// With formatting
val styled = Message.raw("Important!")
    .color("red")
    .bold(true)
    .italic(false)
    .monospace(true)

// With parameters (for localization)
val parameterized = Message.raw("Welcome, {name}!")
    .param("name", "Player123")
    .param("count", 42)
    .param("enabled", true)

// With link
val linked = Message.raw("Click here")
    .link("https://example.com")

// Insert another message
val combined = Message.raw("Prefix: ").insert(anotherMessage)

// Send to player
player.sendMessage(msg)

// Broadcast to world
world.sendMessage(msg)

// Broadcast to universe (all players)
Universe.get().sendMessage(msg)
```

**Key Methods:**
```kotlin
// Creation
static fun raw(String): Message
fun Message(FormattedMessage)

// Parameters (for localized strings)
fun param(key: String, value: String): Message
fun param(key: String, value: Boolean): Message
fun param(key: String, value: Double): Message
fun param(key: String, value: Int): Message
fun param(key: String, value: Long): Message
fun param(key: String, value: Float): Message
fun param(key: String, value: Message): Message

// Formatting
fun bold(Boolean): Message
fun italic(Boolean): Message
fun monospace(Boolean): Message
fun color(String): Message          // Color by name
fun color(java.awt.Color): Message  // Color by RGB

// Links & insertion
fun link(String): Message           // Add clickable URL
fun insert(Message): Message        // Insert another message
```

---

## Interactions

### Interaction System

**Package:** `com.hypixel.hytale.server.core.modules.interaction`

Hytale uses an interaction system for handling player actions on blocks, entities, and items.

### Interaction Types

**None Interactions** (no target required):
- `SendMessageInteraction` - Send a message
- `RemoveEntityInteraction` - Remove an entity
- `ApplyEffectInteraction` - Apply an effect
- `ConditionInteraction` - Conditional logic
- `SerialInteraction` - Execute interactions in sequence
- `ParallelInteraction` - Execute interactions in parallel
- `RepeatInteraction` - Repeat an interaction
- `SelectInteraction` - Select from options

**Client Interactions** (client-side):
- `ChangeBlockInteraction` - Change a block
- `DestroyBlockInteraction` - Destroy a block
- `PlaceBlockInteraction` - Place a block
- `UseEntityInteraction` - Use an entity
- `WieldingInteraction` - Wielding-related

**Selector Types** (`interaction.config.selector`):
- `AOECircleSelector` - Area of effect circle
- `AOECylinderSelector` - Area of effect cylinder
- `RaycastSelector` - Raycast selection
- `HorizontalSelector` - Horizontal selection
- `StabSelector` - Stab/thrust selection

---

## Built-in Modules

### Sleep System

**Package:** `com.hypixel.hytale.builtin.beds.sleep`

#### PlayerSomnolence (Component)

```kotlin
val somnolenceType = PlayerSomnolence.getComponentType()
val somnolence = player.getComponent(somnolenceType)
val sleepState: PlayerSleep? = somnolence?.getSleepState()
```

#### PlayerSleep (States)

```kotlin
// Sleep states
PlayerSleep.FullyAwake    // Not in bed
PlayerSleep.NoddingOff    // Getting into bed
PlayerSleep.Slumber       // Fully asleep
PlayerSleep.MorningWakeUp // Waking up
```

### Weather System

**Package:** `com.hypixel.hytale.server.core.modules.weather`

### Damage System

**Package:** `com.hypixel.hytale.server.core.modules.entity.damage`

### Spawning System

**Package:** `com.hypixel.hytale.server.core.modules.spawning`

### Portals

**Package:** `com.hypixel.hytale.builtin.portals`

### NPCs

**Package:** `com.hypixel.hytale.builtin.npcs`

### Farming

**Package:** `com.hypixel.hytale.builtin.adventure.farming`

### Combat

**Package:** `com.hypixel.hytale.builtin.combat`

### Crafting

**Package:** `com.hypixel.hytale.builtin.crafting`

Recipe and crafting system.

### Mounts

**Package:** `com.hypixel.hytale.builtin.mounts`

Mount and riding system.

### Fluid System

**Package:** `com.hypixel.hytale.builtin.fluid`

Water, lava, and other fluid mechanics.

### Block Physics

**Package:** `com.hypixel.hytale.builtin.blockphysics`

Falling blocks, physics simulation.

### Deployables

**Package:** `com.hypixel.hytale.builtin.deployables`

Placeable items/structures.

### Teleport

**Package:** `com.hypixel.hytale.builtin.teleport`

Teleportation system.

### Parkour

**Package:** `com.hypixel.hytale.builtin.parkour`

Parkour movement mechanics.

### Mantling

**Package:** `com.hypixel.hytale.builtin.mantling`

Climbing/mantling mechanics.

### Crouch Slide

**Package:** `com.hypixel.hytale.builtin.crouchslide`

Sliding movement.

### Safety Roll

**Package:** `com.hypixel.hytale.builtin.safetyroll`

Fall damage reduction through rolling.

### World Generation

**Package:** `com.hypixel.hytale.builtin.worldgen`
**Package:** `com.hypixel.hytale.builtin.hytalegenerator`

Procedural world generation.

### Instances

**Package:** `com.hypixel.hytale.builtin.instances`

Instanced dungeons/areas.

### Block Spawner

**Package:** `com.hypixel.hytale.builtin.blockspawner`

Block-based entity spawners.

### Block Tick

**Package:** `com.hypixel.hytale.builtin.blocktick`

Block update ticking system.

### Land Discovery

**Package:** `com.hypixel.hytale.builtin.landiscovery`

Area/zone discovery system.

### NPC Editor

**Package:** `com.hypixel.hytale.builtin.npceditor`

NPC creation and editing tools.

### Asset Editor

**Package:** `com.hypixel.hytale.builtin.asseteditor`

In-game asset editing system.

### Builder Tools

**Package:** `com.hypixel.hytale.builtin.buildertools`

Creative building tools.

### Command Macro

**Package:** `com.hypixel.hytale.builtin.commandmacro`

Command macro system.

### Tag Set

**Package:** `com.hypixel.hytale.builtin.tagset`

Entity/block tagging system.

### Ambience

**Package:** `com.hypixel.hytale.builtin.ambience`

Environmental ambience (sounds, particles).

---

## Math Utilities

### Vector3d (Double precision)

**Package:** `com.hypixel.hytale.math.vector`

```kotlin
val pos = Vector3d(x, y, z)
val length = pos.length()
val normalized = pos.normalize()
val added = pos.add(other)
```

### Vector3f (Float precision)

```kotlin
val rotation = Vector3f(pitch, yaw, roll)
```

### Vector3i (Integer)

```kotlin
val blockPos = Vector3i(x, y, z)
```

### Transform

```kotlin
val transform = Transform(position, rotation, scale)
```

### Additional Math Classes

**Package:** `com.hypixel.hytale.math`

- `Axis` - Axis enumeration (X, Y, Z)
- `Mat4f` - 4x4 float matrix
- `Quatf` - Quaternion (rotation)
- `Vec2f` - 2D float vector
- `Vec4f` - 4D float vector
- `Range` - Numeric range

**Subpackages:**
- `math.block` - Block position utilities
- `math.hitdetection` - Hit detection math
- `math.raycast` - Raycast utilities
- `math.shape` - Shape definitions (boxes, spheres)
- `math.random` - Random utilities
- `math.range` - Range utilities

---

## Network Protocol

### Packets

**Package:** `com.hypixel.hytale.protocol.packets`

Common packet categories:
- `packets.player` - Player-related packets
- `packets.world` - World updates (including `UpdateTime`, `UpdateTimeSettings`)
- `packets.entity` - Entity updates
- `packets.block` - Block changes
- `packets.inventory` - Inventory operations
- `packets.setup` - Connection setup (including `SetTimeDilation`)
- `packets.interface_` - UI/interface packets
- `packets.asseteditor` - Asset editor packets

---

## Access Control

### Ban System

**Package:** `com.hypixel.hytale.server.core.modules.accesscontrol`

```kotlin
// Built-in commands
// /ban <player> [reason]
// /unban <player>
```

**Ban Types:**
- `InfiniteBan` - Permanent ban
- `TimedBan` - Temporary ban

### Whitelist

```kotlin
// Built-in commands
// /whitelist enable
// /whitelist disable
// /whitelist add <player>
// /whitelist remove <player>
// /whitelist list
// /whitelist clear
// /whitelist status
```

---

## Best Practices

### Thread Safety

Always access components on the world thread:

```kotlin
world.execute {
    // Safe to access components here
    val component = player.getComponent(type)
}
```

### Resource Access Pattern

```kotlin
val world = Universe.get().defaultWorld ?: return
val store = world.entityStore.store
val resource = store.getResource(resourceType)
```

### Event Registration

```kotlin
override fun start() {
    eventRegistry.register(PlayerConnectEvent::class.java) { event ->
        // Handle event
    }
}
```

### Command Execution

```kotlin
fun executeAsConsole(command: String) {
    val sender = object : CommandSender {
        override fun getDisplayName() = "MyPlugin"
        override fun getUuid() = UUID(0, 0)
        override fun sendMessage(msg: Message) { }
        override fun hasPermission(p: String) = true
        override fun hasPermission(p: String, d: Boolean) = true
    }
    CommandManager.get().handleCommand(sender, command)
}
```

---

## Built-in Commands

### Time Commands

```
/time <day|night|noon|midnight|sunrise|sunset>  - Set time of day
/time set <hour>                                 - Set specific hour (0-23)
/time query                                      - Query current time
```

### Gamemode Commands

```
/gamemode <survival|creative|spectator|adventure> [player]  - Set gamemode
/gm <s|c|sp|a> [player]                                     - Shorthand
```

### Teleport Commands

```
/tp <player> <target>               - Teleport player to target
/tp <player> <x> <y> <z>           - Teleport to coordinates
/tphere <player>                    - Teleport player to you
```

### Player Management

```
/kick <player> [reason]             - Kick a player
/ban <player> [reason]              - Ban a player
/unban <player>                     - Unban a player
/op add <player>                    - Make player operator
/op remove <player>                 - Remove operator status
/op self                            - Op yourself (if allowed)
```

### Whitelist Commands

```
/whitelist enable                   - Enable whitelist
/whitelist disable                  - Disable whitelist
/whitelist add <player>             - Add player to whitelist
/whitelist remove <player>          - Remove from whitelist
/whitelist list                     - List whitelisted players
/whitelist clear                    - Clear whitelist
/whitelist status                   - Show whitelist status
```

### Permission Commands

```
/perm user <player> add <permission>     - Add permission to user
/perm user <player> remove <permission>  - Remove permission
/perm group <group> add <permission>     - Add permission to group
/perm group <group> remove <permission>  - Remove from group
/perm test <permission>                  - Test if you have permission
```

### World Commands

```
/world list                         - List all worlds
/world tp <world>                   - Teleport to world
/world create <name>                - Create new world
/world remove <name>                - Remove world
```

### Item Commands

```
/give <player> <item> [quantity]    - Give items to player
/clear <player> [item]              - Clear inventory
```

### Entity Commands

```
/summon <entity> [x] [y] [z]        - Summon entity
/kill <entity|@e|@a|@p>             - Kill entities
```

### Weather Commands

```
/weather clear                      - Clear weather
/weather rain                       - Make it rain
/weather storm                      - Start storm
```

### Server Commands

```
/stop                               - Stop the server
/save-all                           - Save all worlds
/reload                             - Reload plugins
```

---

## Adventure System

### Quests

**Package:** `com.hypixel.hytale.builtin.adventure.quests`

Quest system for creating narrative content.

### Dialogues

**Package:** `com.hypixel.hytale.builtin.adventure.dialogues`

NPC dialogue system.

### Farming

**Package:** `com.hypixel.hytale.builtin.adventure.farming`

Crop growing and farming mechanics.

### Objectives

**Package:** `com.hypixel.hytale.builtin.adventure.objectives`

Quest objectives and tracking.

---

## UI System

### Pages

**Package:** `com.hypixel.hytale.server.core.entity.entities.player.pages`

Custom UI pages for players.

```kotlin
val pageManager = player.getPageManager()
// Use to show custom UI pages to players
```

### Windows

**Package:** `com.hypixel.hytale.server.core.entity.entities.player.windows`

Window management for UI containers.

```kotlin
val windowManager = player.getWindowManager()
// Manage inventory windows, crafting UIs, etc.
```

### HUD

**Package:** `com.hypixel.hytale.server.core.entity.entities.player.hud`

HUD management for custom UI elements.

```kotlin
val hudManager = player.getHudManager()
// Add custom HUD elements
```

### UI Builder

**Package:** `com.hypixel.hytale.server.core.ui.builder`

- `UICommandBuilder` - Build UI commands
- `UIEventBuilder` - Build UI event handlers

---

## Codecs & Serialization

**Package:** `com.hypixel.hytale.codec`

Hytale uses a codec system for serialization/deserialization.

### BuilderCodec

```kotlin
// Define a codec for your config class
companion object {
    val CODEC: BuilderCodec<MyConfig> = BuilderCodec.builder(::MyConfig)
        .field("name", MyConfig::name, Codec.STRING)
        .field("count", MyConfig::count, Codec.INT)
        .build()
}
```

### Common Codecs

- `Codec.STRING` - String codec
- `Codec.INT` - Integer codec
- `Codec.LONG` - Long codec
- `Codec.FLOAT` - Float codec
- `Codec.DOUBLE` - Double codec
- `Codec.BOOLEAN` - Boolean codec
- `Codec.UUID` - UUID codec

---

## Complete Package Index

### Core Packages

| Package | Description |
|---------|-------------|
| `com.hypixel.hytale.server.core` | Core server classes |
| `com.hypixel.hytale.server.core.universe` | Universe, World, PlayerRef |
| `com.hypixel.hytale.server.core.entity` | Entity system |
| `com.hypixel.hytale.server.core.command` | Command system |
| `com.hypixel.hytale.server.core.event` | Event system |
| `com.hypixel.hytale.server.core.modules` | Server modules |
| `com.hypixel.hytale.server.core.plugin` | Plugin API |
| `com.hypixel.hytale.server.core.inventory` | Inventory system |
| `com.hypixel.hytale.server.core.permissions` | Permissions |
| `com.hypixel.hytale.server.core.task` | Task scheduling |

### Component System

| Package | Description |
|---------|-------------|
| `com.hypixel.hytale.component` | ECS component system |
| `com.hypixel.hytale.component.system` | ECS systems |

### Built-in Modules

| Package | Description |
|---------|-------------|
| `com.hypixel.hytale.builtin.beds` | Sleep & respawn |
| `com.hypixel.hytale.builtin.combat` | Combat system |
| `com.hypixel.hytale.builtin.crafting` | Crafting system |
| `com.hypixel.hytale.builtin.npcs` | NPC system |
| `com.hypixel.hytale.builtin.portals` | Portal system |
| `com.hypixel.hytale.builtin.teleport` | Teleportation |
| `com.hypixel.hytale.builtin.mounts` | Mount system |
| `com.hypixel.hytale.builtin.fluid` | Fluid mechanics |
| `com.hypixel.hytale.builtin.blockphysics` | Block physics |
| `com.hypixel.hytale.builtin.worldgen` | World generation |
| `com.hypixel.hytale.builtin.instances` | Instanced areas |
| `com.hypixel.hytale.builtin.adventure` | Adventure content |

### Utilities

| Package | Description |
|---------|-------------|
| `com.hypixel.hytale.math` | Math utilities |
| `com.hypixel.hytale.math.vector` | Vectors (Vector3d, Vector3f, Vector3i) |
| `com.hypixel.hytale.protocol` | Network protocol |
| `com.hypixel.hytale.codec` | Serialization codecs |
| `com.hypixel.hytale.event` | Event framework |
| `com.hypixel.hytale.logger` | Logging |