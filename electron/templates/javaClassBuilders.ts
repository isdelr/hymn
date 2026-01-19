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
}
