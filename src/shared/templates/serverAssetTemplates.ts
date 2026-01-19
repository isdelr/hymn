import type { ServerAssetTemplate } from '../hymn-types'

/**
 * Server asset template category for UI grouping.
 */
export type ServerAssetCategory =
  | 'Items'
  | 'Tools'
  | 'Armor'
  | 'Consumables'
  | 'Blocks'
  | 'Entities'
  | 'Data'
  | 'Audio'
  | 'Interface'

/**
 * Icon names for server asset templates.
 * Maps to lucide-react icon names.
 */
export type ServerAssetIconName =
  | 'Sword'
  | 'Pickaxe'
  | 'Box'
  | 'UserPlus'
  | 'Ghost'
  | 'Music'
  | 'Layout'
  | 'FileJson'
  | 'Droplets'
  | 'Axe'
  | 'Shovel'
  | 'Wheat'
  | 'Fish'
  | 'HardHat'
  | 'Shirt'
  | 'Footprints'
  | 'Apple'
  | 'FlaskConical'
  | 'Puzzle'
  | 'Crosshair'
  | 'Sparkles'
  | 'Sofa'
  | 'Sprout'
  | 'Archive'
  | 'Bird'
  | 'Waves'
  | 'Crown'
  | 'Rabbit'
  | 'Dice5'
  | 'Grid3X3'
  | 'Shuffle'
  | 'Store'
  | 'Rocket'

/**
 * Server asset template metadata.
 */
export interface ServerAssetTemplateInfo {
  id: ServerAssetTemplate
  label: string
  description: string
  iconName: ServerAssetIconName
  category: ServerAssetCategory
  /**
   * Subfolder within server_content where this template type is stored.
   */
  subfolder: string
}

/**
 * All server asset templates with their metadata.
 * Single source of truth for both frontend display and backend file operations.
 */
export const SERVER_ASSET_TEMPLATES: ServerAssetTemplateInfo[] = [
  // Items - Weapons
  { id: 'item_sword', label: 'Sword', description: 'Melee weapon', iconName: 'Sword', category: 'Items', subfolder: 'items' },
  { id: 'item_pickaxe', label: 'Pickaxe', description: 'Mining tool', iconName: 'Pickaxe', category: 'Items', subfolder: 'items' },
  { id: 'item', label: 'Basic Item', description: 'Generic item', iconName: 'FileJson', category: 'Items', subfolder: 'items' },

  // Items - Tools
  { id: 'item_axe', label: 'Axe', description: 'Woodcutting tool', iconName: 'Axe', category: 'Tools', subfolder: 'items' },
  { id: 'item_shovel', label: 'Shovel', description: 'Digging tool', iconName: 'Shovel', category: 'Tools', subfolder: 'items' },
  { id: 'item_hoe', label: 'Hoe', description: 'Farming tool', iconName: 'Wheat', category: 'Tools', subfolder: 'items' },
  { id: 'item_fishing_rod', label: 'Fishing Rod', description: 'Fishing tool', iconName: 'Fish', category: 'Tools', subfolder: 'items' },

  // Items - Armor
  { id: 'item_armor_helmet', label: 'Helmet', description: 'Head protection', iconName: 'HardHat', category: 'Armor', subfolder: 'items' },
  { id: 'item_armor_chestplate', label: 'Chestplate', description: 'Chest armor', iconName: 'Shirt', category: 'Armor', subfolder: 'items' },
  { id: 'item_armor_leggings', label: 'Leggings', description: 'Leg protection', iconName: 'FileJson', category: 'Armor', subfolder: 'items' },
  { id: 'item_armor_boots', label: 'Boots', description: 'Foot armor', iconName: 'Footprints', category: 'Armor', subfolder: 'items' },

  // Items - Consumables
  { id: 'item_food', label: 'Food', description: 'Edible item', iconName: 'Apple', category: 'Consumables', subfolder: 'items' },
  { id: 'item_potion', label: 'Potion', description: 'Drinkable effect', iconName: 'FlaskConical', category: 'Consumables', subfolder: 'items' },

  // Items - Other
  { id: 'item_ingredient', label: 'Ingredient', description: 'Crafting material', iconName: 'Puzzle', category: 'Items', subfolder: 'items' },
  { id: 'item_projectile', label: 'Ammo', description: 'Ammunition item', iconName: 'Crosshair', category: 'Items', subfolder: 'items' },
  { id: 'item_cosmetic', label: 'Cosmetic', description: 'Cosmetic item', iconName: 'Sparkles', category: 'Items', subfolder: 'items' },

  // Blocks
  { id: 'block_simple', label: 'Block', description: 'Solid cube', iconName: 'Box', category: 'Blocks', subfolder: 'blocks' },
  { id: 'block_liquid', label: 'Liquid', description: 'Fluid block', iconName: 'Droplets', category: 'Blocks', subfolder: 'blocks' },
  { id: 'block_furniture', label: 'Furniture', description: 'Decorative block', iconName: 'Sofa', category: 'Blocks', subfolder: 'blocks' },
  { id: 'block_crop', label: 'Crop', description: 'Growable plant', iconName: 'Sprout', category: 'Blocks', subfolder: 'blocks' },
  { id: 'block_container', label: 'Container', description: 'Storage block', iconName: 'Archive', category: 'Blocks', subfolder: 'blocks' },

  // Entities
  { id: 'entity_npc', label: 'Neutral NPC', description: 'Friendly character', iconName: 'UserPlus', category: 'Entities', subfolder: 'entities' },
  { id: 'entity_mob', label: 'Hostile Mob', description: 'Enemy creature', iconName: 'Ghost', category: 'Entities', subfolder: 'entities' },
  { id: 'entity_flying', label: 'Flying Creature', description: 'Aerial creature', iconName: 'Bird', category: 'Entities', subfolder: 'entities' },
  { id: 'entity_swimming', label: 'Swimming Creature', description: 'Aquatic creature', iconName: 'Waves', category: 'Entities', subfolder: 'entities' },
  { id: 'entity_boss', label: 'Boss', description: 'Boss enemy', iconName: 'Crown', category: 'Entities', subfolder: 'entities' },
  { id: 'entity_passive', label: 'Passive Animal', description: 'Peaceful creature', iconName: 'Rabbit', category: 'Entities', subfolder: 'entities' },

  // Data Types
  { id: 'drop_weighted', label: 'Loot Table', description: 'Weighted drop list', iconName: 'Dice5', category: 'Data', subfolder: 'drops' },
  { id: 'recipe_shaped', label: 'Shaped Recipe', description: 'Crafting pattern', iconName: 'Grid3X3', category: 'Data', subfolder: 'recipes' },
  { id: 'recipe_shapeless', label: 'Shapeless Recipe', description: 'Unordered recipe', iconName: 'Shuffle', category: 'Data', subfolder: 'recipes' },
  { id: 'barter_shop', label: 'Shop', description: 'NPC trades', iconName: 'Store', category: 'Data', subfolder: 'barters' },
  { id: 'projectile', label: 'Projectile', description: 'Flying object', iconName: 'Rocket', category: 'Data', subfolder: 'projectiles' },

  // Audio & UI
  { id: 'audio_sfx', label: 'Sound FX', description: 'Audio event', iconName: 'Music', category: 'Audio', subfolder: 'audio' },
  { id: 'ui_page', label: 'UI Page', description: 'Interface screen', iconName: 'Layout', category: 'Interface', subfolder: 'ui' },
]

/**
 * Get template info by ID.
 */
export function getServerAssetTemplate(id: ServerAssetTemplate): ServerAssetTemplateInfo | undefined {
  return SERVER_ASSET_TEMPLATES.find(t => t.id === id)
}

/**
 * Get templates by category.
 */
export function getServerAssetTemplatesByCategory(category: ServerAssetCategory): ServerAssetTemplateInfo[] {
  return SERVER_ASSET_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get subfolder for a template type.
 */
export function getTemplateSubfolder(templateId: ServerAssetTemplate): string {
  const template = getServerAssetTemplate(templateId)
  return template?.subfolder ?? 'misc'
}

/**
 * Map workspace category IDs to template categories for filtering.
 */
export function filterTemplatesByWorkspaceCategory(
  categoryId: string
): ServerAssetTemplateInfo[] {
  if (!categoryId || categoryId === 'all' || categoryId === 'files') {
    return SERVER_ASSET_TEMPLATES
  }

  return SERVER_ASSET_TEMPLATES.filter(t => {
    switch (categoryId) {
      case 'item':
        return ['Items', 'Tools', 'Armor', 'Consumables'].includes(t.category)
      case 'block':
        return t.category === 'Blocks'
      case 'entity':
        return t.category === 'Entities'
      case 'audio':
        return t.category === 'Audio'
      case 'ui':
        return t.category === 'Interface'
      case 'projectile':
        return t.id === 'projectile'
      case 'drop':
        return t.id === 'drop_weighted'
      case 'recipe':
        return t.id === 'recipe_shaped' || t.id === 'recipe_shapeless'
      case 'barter':
        return t.id === 'barter_shop'
      default:
        return false
    }
  })
}
