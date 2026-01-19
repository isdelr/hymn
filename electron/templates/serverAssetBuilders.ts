import type { ServerAssetTemplate } from '../../src/shared/hymn-types'

type ServerAssetBuilder = (id: string, label: string) => Record<string, unknown>

export const SERVER_ASSET_TEMPLATE_BUILDERS: Record<ServerAssetTemplate, ServerAssetBuilder> = {
  item: (id) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Misc'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`
  }),
  item_sword: (id, label) => ({
    PlayerAnimationsId: 'OneHanded',
    Categories: ['Items.Weapons'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`,
    TranslationProperties: {
      Name: label
    },
    Attacks: [
      {
        Damage: 10,
        Reach: 2.5,
        Time: 0.6
      }
    ],
    Durability: 250
  }),
  item_pickaxe: (id, label) => ({
    PlayerAnimationsId: 'Pickaxe',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    Texture: `Icons/ItemsGenerated/${id}.png`,
    TranslationProperties: {
      Name: label
    },
    GatheringAttributes: {
      Type: "Pickaxe",
      Level: 1,
      Efficiency: 5.0
    },
    Durability: 500
  }),
  block: (id, label) => ({
    BlockType: id,
    TranslationProperties: {
      Name: label
    },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true
    }
  }),
  block_simple: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true,
      Hardness: 1.0,
      Resistance: 5.0
    }
  }),
  block_liquid: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Fluid",
      Collidable: false,
      Liquid: true,
      Viscosity: 0.1
    }
  }),
  entity: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral"
  }),
  entity_npc: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral",
    Goals: ["Wander", "LookAround"]
  }),
  entity_mob: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Hostile",
    Goals: ["Wander", "LookAround", "AttackTarget"],
    Sensors: ["Sight", "Hearing"]
  }),
  entity_flying: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral",
    MovementType: "Flying",
    FlightProperties: {
      MaxAltitude: 100,
      HoverSpeed: 2.0,
      CanLand: true
    },
    Goals: ["Fly", "Wander", "LookAround"]
  }),
  entity_swimming: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Neutral",
    MovementType: "Swimming",
    SwimmingProperties: {
      MaxDepth: 50,
      CanBreathUnderwater: true,
      SwimSpeed: 3.0
    },
    Goals: ["Swim", "Wander"]
  }),
  entity_boss: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 2.0
    },
    Faction: "Hostile",
    BossProperties: {
      ShowHealthBar: true,
      Phases: 1,
      MusicId: null
    },
    Health: 500,
    Goals: ["AttackTarget", "LookAround"],
    Sensors: ["Sight", "Hearing"]
  }),
  entity_passive: (id, label) => ({
    Prefab: id,
    TranslationProperties: { Name: label },
    Character: {
      Model: `Lookups/Characters/${id}.blockymodel`,
      Scale: 1.0
    },
    Faction: "Passive",
    Goals: ["Wander", "Graze", "Flee"]
  }),
  // Tools
  item_axe: (id, label) => ({
    PlayerAnimationsId: 'TwoHanded',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    GatheringAttributes: {
      Type: "Axe",
      Level: 1,
      Efficiency: 5.0
    },
    Durability: 500
  }),
  item_shovel: (id, label) => ({
    PlayerAnimationsId: 'TwoHanded',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    GatheringAttributes: {
      Type: "Shovel",
      Level: 1,
      Efficiency: 5.0
    },
    Durability: 500
  }),
  item_hoe: (id, label) => ({
    PlayerAnimationsId: 'TwoHanded',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    GatheringAttributes: {
      Type: "Hoe",
      Level: 1,
      Efficiency: 5.0
    },
    Durability: 250
  }),
  item_fishing_rod: (id, label) => ({
    PlayerAnimationsId: 'FishingRod',
    Categories: ['Items.Tools'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    FishingProperties: {
      CastDistance: 10.0,
      ReelSpeed: 1.0,
      LureAttraction: 1.0
    },
    Durability: 100
  }),
  // Armor
  item_armor_helmet: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Armor'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    ArmorProperties: {
      Slot: "Head",
      Defense: 2,
      Toughness: 0
    },
    Durability: 165
  }),
  item_armor_chestplate: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Armor'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    ArmorProperties: {
      Slot: "Chest",
      Defense: 6,
      Toughness: 0
    },
    Durability: 240
  }),
  item_armor_leggings: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Armor'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    ArmorProperties: {
      Slot: "Legs",
      Defense: 5,
      Toughness: 0
    },
    Durability: 225
  }),
  item_armor_boots: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Armor'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    ArmorProperties: {
      Slot: "Feet",
      Defense: 2,
      Toughness: 0
    },
    Durability: 195
  }),
  // Consumables
  item_food: (id, label) => ({
    PlayerAnimationsId: 'Consumable',
    Categories: ['Items.Consumables', 'Items.Food'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    FoodProperties: {
      Nutrition: 4,
      Saturation: 2.4,
      ConsumeTime: 1.6,
      CanAlwaysEat: false
    }
  }),
  item_potion: (id, label) => ({
    PlayerAnimationsId: 'Consumable',
    Categories: ['Items.Consumables', 'Items.Potions'],
    MaxStack: 16,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    PotionProperties: {
      Duration: 60.0,
      ConsumeTime: 1.2,
      Effects: []
    }
  }),
  // Other Items
  item_ingredient: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Ingredients'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label }
  }),
  item_projectile: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Ammunition'],
    MaxStack: 64,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    ProjectileProperties: {
      Damage: 5,
      Velocity: 30.0,
      Gravity: 0.05
    }
  }),
  item_cosmetic: (id, label) => ({
    PlayerAnimationsId: 'Item',
    Categories: ['Items.Cosmetics'],
    MaxStack: 1,
    Icon: `Icons/ItemsGenerated/${id}.png`,
    Model: `Items/${id}.blockymodel`,
    TranslationProperties: { Name: label },
    CosmeticProperties: {
      Slot: "Back",
      ClientOnly: true
    }
  }),
  // New Blocks
  block_furniture: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true,
      Hardness: 0.5,
      Resistance: 2.0
    },
    FurnitureProperties: {
      CanSit: false,
      CanInteract: true
    }
  }),
  block_crop: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Cutout",
      Collidable: false,
      Hardness: 0.0,
      Resistance: 0.0
    },
    CropProperties: {
      GrowthStages: 4,
      GrowthTime: 300.0,
      RequiresWater: true,
      DropItem: id
    }
  }),
  block_container: (id, label) => ({
    BlockType: id,
    TranslationProperties: { Name: label },
    ExampleState: {
      RenderType: "Solid",
      Collidable: true,
      Hardness: 2.0,
      Resistance: 5.0
    },
    ContainerProperties: {
      Slots: 27,
      Rows: 3,
      Columns: 9
    }
  }),
  // Data Types
  drop_weighted: (id) => ({
    Id: id,
    TotalRolls: 1,
    Items: [
      {
        ItemId: "Example_Item",
        Weight: 1.0,
        Min: 1,
        Max: 1
      }
    ]
  }),
  recipe_shaped: (id) => ({
    Id: id,
    Type: "Shaped",
    Pattern: [
      "###",
      " | ",
      " | "
    ],
    Key: {
      "#": "Example_Material",
      "|": "Example_Stick"
    },
    Result: {
      ItemId: "Example_Output",
      Count: 1
    }
  }),
  recipe_shapeless: (id) => ({
    Id: id,
    Type: "Shapeless",
    Ingredients: [
      "Example_Item_A",
      "Example_Item_B"
    ],
    Result: {
      ItemId: "Example_Output",
      Count: 1
    }
  }),
  barter_shop: (id) => ({
    Id: id,
    Trades: [
      {
        Input: [{ ItemId: "Currency", Count: 10 }],
        Output: [{ ItemId: "Example_Item", Count: 1 }],
        Stock: 16,
        MaxStock: 16,
        RestockTime: 1200.0
      }
    ]
  }),
  projectile: (id) => ({
    Id: id,
    Physics: {
      Velocity: 30.0,
      Gravity: 0.05,
      Drag: 0.01
    },
    Damage: 5,
    Lifetime: 60.0,
    Model: `Projectiles/${id}.blockymodel`,
    HitEffects: []
  }),
  // Audio & UI
  audio: () => ({
    Events: []
  }),
  audio_sfx: (id) => ({
    Name: id,
    Events: []
  }),
  ui: () => ({
    Type: "Panel"
  }),
  ui_page: (id) => ({
    Name: id,
    Type: "Panel",
    Layout: "Vertical"
  }),
  category: (id) => ({
    Icon: `Icons/${id}.png`,
    Order: 0,
    Children: [],
  }),
  empty: () => ({}),
}

/**
 * Normalize a filename to an asset ID.
 */
export function normalizeAssetId(name: string): string {
  return name.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+/, '')
}

/**
 * Format a filename as a display label.
 */
export function formatAssetLabel(name: string): string {
  const stripped = name.replace(/\.json$/i, '')
  return stripped.replace(/[-_]+/g, ' ').trim() || stripped
}
