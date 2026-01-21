import type { JavaClassTemplate } from '../../src/shared/hymn-types'

type JavaClassTemplateBuilder = (packageName: string, className: string) => string

export const JAVA_CLASS_TEMPLATE_BUILDERS: Record<JavaClassTemplate, JavaClassTemplateBuilder> = {
  command: (packageName, className) => {
    const commandName = className.replace(/Command$/i, '').toLowerCase()
    return `package ${packageName};

import com.hypixel.hytale.server.core.command.system.basecommands.AbstractPlayerCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.universe.PlayerRef;

import javax.annotation.Nonnull;

/**
 * A chat command handler for "/${commandName}".
 */
public class ${className} extends AbstractPlayerCommand {

    public ${className}() {
        super("${commandName}", "Description for ${commandName} command");
    }

    @Override
    protected void execute(@Nonnull CommandContext commandContext, @Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref, @Nonnull PlayerRef playerRef, @Nonnull World world) {
        Player player = store.getComponent(ref, Player.getComponentType());
        player.sendMessage(Message.raw("Hello from ${className}!"));
    }
}
`
  },

  event_listener: (packageName, className) => {
    return `package ${packageName};

import com.hypixel.hytale.server.core.event.events.player.PlayerConnectEvent;
import com.hypixel.hytale.server.core.universe.PlayerRef;

/**
 * Event handlers for ${className}.
 * Register in your plugin's setup() method:
 *   getEventRegistry().register(PlayerConnectEvent.class, ${className}::onPlayerConnect);
 */
public class ${className} {

    public static void onPlayerConnect(PlayerConnectEvent event) {
        PlayerRef playerRef = event.getPlayerRef();
        // Handle player connection
    }
}
`
  },

  component: (packageName, className) => {
    return `package ${packageName};

import com.hypixel.hytale.server.core.entity.component.EntityComponent;

/**
 * A custom entity component.
 */
public class ${className} extends EntityComponent {

    @Override
    protected void onAttach() {
        // Called when this component is attached to an entity
    }

    @Override
    protected void onDetach() {
        // Called when this component is detached from an entity
    }
}
`
  },

  custom_class: (packageName, className) => {
    return `package ${packageName};

/**
 * ${className}
 */
public class ${className} {

    public ${className}() {
        // Constructor
    }
}
`
  },

  gui_page: (packageName, className) => {
    const pageName = className.replace(/(?:Page|Gui|GUI)$/i, '').toLowerCase()
    return `package ${packageName};

import com.hypixel.hytale.server.core.universe.PlayerRef;

/**
 * Custom GUI page handler for ${className}.
 *
 * Requires a corresponding .ui file in Common/UI/Custom/Pages/
 */
public class ${className} {

    /**
     * Internal GUI state data.
     */
    public static class GuiData {
        public String title = "${pageName}";
        public boolean isOpen = false;
        // Add your GUI state fields here
    }

    private GuiData data;

    public ${className}() {
        this.data = new GuiData();
    }

    /**
     * Open this GUI page for a player.
     * @param playerRef The player to show the GUI to
     */
    public void open(PlayerRef playerRef) {
        this.data.isOpen = true;
        // Implementation: Use Hytale's GUI API to display the page
        // Example: GuiManager.open(playerRef, "${pageName}");
    }

    /**
     * Close this GUI page for a player.
     * @param playerRef The player to close the GUI for
     */
    public void close(PlayerRef playerRef) {
        this.data.isOpen = false;
        // Implementation: Use Hytale's GUI API to close the page
    }

    /**
     * Handle a UI element interaction.
     * @param elementId The ID of the element that was interacted with
     * @param playerRef The player who interacted
     */
    public void onElementClick(String elementId, PlayerRef playerRef) {
        // Handle UI element clicks by element ID
        switch (elementId) {
            case "close_button":
                close(playerRef);
                break;
            default:
                // Handle other elements
                break;
        }
    }

    public GuiData getData() {
        return data;
    }
}
`
  },

  config: (packageName, className) => {
    const configName = className.replace(/Config$/i, '').toLowerCase()
    return `package ${packageName};

import java.nio.file.Path;

/**
 * Configuration manager for plugin settings.
 * Handles loading and saving persistent configuration.
 */
public class ${className} {

    /**
     * Configuration data structure.
     * Add your configuration fields here.
     */
    public static class ConfigData {
        public boolean enabled = true;
        public int maxValue = 100;
        public String prefix = "[${configName}]";
        // Add more configuration fields as needed
    }

    private ConfigData config;
    private Path configPath;

    public ${className}(Path dataFolder) {
        this.configPath = dataFolder.resolve("${configName}.json");
        this.config = new ConfigData();
    }

    /**
     * Load configuration from disk.
     * Creates default config if file doesn't exist.
     */
    public void load() {
        // Implementation: Read JSON from configPath
        // If file doesn't exist, use defaults and save
        if (!configPath.toFile().exists()) {
            save();
        }
        // Parse JSON and populate config fields
    }

    /**
     * Save current configuration to disk.
     */
    public void save() {
        // Implementation: Write config as JSON to configPath
        // Ensure parent directories exist
    }

    /**
     * Reset configuration to default values.
     */
    public void reset() {
        this.config = new ConfigData();
        save();
    }

    // Getters for configuration values

    public boolean isEnabled() {
        return config.enabled;
    }

    public int getMaxValue() {
        return config.maxValue;
    }

    public String getPrefix() {
        return config.prefix;
    }

    // Setters for configuration values

    public void setEnabled(boolean enabled) {
        config.enabled = enabled;
    }

    public void setMaxValue(int maxValue) {
        config.maxValue = maxValue;
    }

    public void setPrefix(String prefix) {
        config.prefix = prefix;
    }

    public ConfigData getConfig() {
        return config;
    }
}
`
  },

  event_system: (packageName, className) => {
    const systemName = className.replace(/(?:System|EventSystem)$/i, '')
    return `package ${packageName};

import com.hypixel.hytale.server.core.event.events.block.BlockBreakEvent;
import com.hypixel.hytale.server.core.event.events.entity.EntityDamageEvent;
import com.hypixel.hytale.server.core.event.events.player.PlayerConnectEvent;
import com.hypixel.hytale.server.core.universe.PlayerRef;

/**
 * Event system for ${systemName} functionality.
 *
 * Register these handlers in your plugin's setup() method:
 *   getEventRegistry().register(BlockBreakEvent.class, ${className}::onBlockBreak);
 *   getEventRegistry().register(EntityDamageEvent.class, ${className}::onEntityDamage);
 *   getEventRegistry().register(PlayerConnectEvent.class, ${className}::onPlayerConnect);
 */
public class ${className} {

    /**
     * Called when a block is broken.
     * @param event The block break event
     */
    public static void onBlockBreak(BlockBreakEvent event) {
        // Get the player who broke the block
        PlayerRef playerRef = event.getPlayerRef();

        // Get block information
        // var blockPos = event.getBlockPos();
        // var blockType = event.getBlockType();

        // Implement your block break logic here
    }

    /**
     * Called when an entity takes damage.
     * @param event The entity damage event
     */
    public static void onEntityDamage(EntityDamageEvent event) {
        // Get damage information
        // var source = event.getDamageSource();
        // var amount = event.getDamage();

        // Implement your damage handling logic here
        // event.setCancelled(true); // Cancel the damage if needed
    }

    /**
     * Called when a player connects to the server.
     * @param event The player connect event
     */
    public static void onPlayerConnect(PlayerConnectEvent event) {
        PlayerRef playerRef = event.getPlayerRef();

        // Implement your player connection logic here
    }
}
`
  },

  interaction: (packageName, className) => {
    const interactionName = className.replace(/(?:Interaction)$/i, '').toLowerCase()
    return `package ${packageName};

import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/**
 * Custom item interaction handler for ${interactionName}.
 *
 * Register this interaction in Server/Item/RootInteractions/ as a JSON file
 * that references this class.
 */
public class ${className} {

    /**
     * Called when the item is used (primary action).
     * @param playerRef The player using the item
     * @param world The world context
     * @param entityRef The entity reference
     */
    public static void onUse(PlayerRef playerRef, World world, Ref<EntityStore> entityRef) {
        // Implement primary use action
        // Example: Cast a spell, activate an ability, etc.
    }

    /**
     * Called when the item is used with alternate action.
     * @param playerRef The player using the item
     * @param world The world context
     * @param entityRef The entity reference
     */
    public static void onAlternateUse(PlayerRef playerRef, World world, Ref<EntityStore> entityRef) {
        // Implement alternate use action
        // Example: Block, aim, secondary mode, etc.
    }

    /**
     * Called when the item is dropped.
     * @param playerRef The player dropping the item
     * @param world The world context
     */
    public static void onDrop(PlayerRef playerRef, World world) {
        // Implement drop behavior
        // Example: Clean up, spawn entity, etc.
    }

    /**
     * Called when the item is equipped/held.
     * @param playerRef The player equipping the item
     */
    public static void onEquip(PlayerRef playerRef) {
        // Implement equip behavior
        // Example: Apply buffs, show effects, etc.
    }

    /**
     * Called when the item is unequipped.
     * @param playerRef The player unequipping the item
     */
    public static void onUnequip(PlayerRef playerRef) {
        // Implement unequip behavior
        // Example: Remove buffs, clean up effects, etc.
    }
}
`
  },
}
