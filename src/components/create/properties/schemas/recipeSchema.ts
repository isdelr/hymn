import {
  Grid3X3,
  Layers,
  Settings,
  Package,
  Hammer,
  Clock,
} from 'lucide-react'
import type { AssetSchema } from '../types'

export const recipeSchema: AssetSchema = {
  kind: 'recipe',
  displayName: 'Recipe',
  sections: [
    {
      id: 'inheritance',
      title: 'Inheritance',
      icon: Layers,
      collapsible: true,
      defaultExpanded: false,
      properties: [
        {
          key: 'Parent',
          label: 'Parent Asset',
          type: 'string',
          description: 'Parent recipe to inherit from',
          placeholder: 'Optional parent asset',
        },
      ],
      condition: (data) => data.Parent !== undefined,
    },
    {
      id: 'identity',
      title: 'Recipe Identity',
      icon: Grid3X3,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Id',
          label: 'Recipe ID',
          type: 'string',
          description: 'Unique identifier for this recipe',
          required: true,
        },
        {
          key: 'Type',
          label: 'Recipe Type',
          type: 'select',
          description: 'How ingredients are arranged',
          required: true,
          selectConfig: {
            options: [
              { value: 'Shaped', label: 'Shaped (Pattern)' },
              { value: 'Shapeless', label: 'Shapeless (Any order)' },
              { value: 'Smelting', label: 'Smelting (Furnace)' },
              { value: 'Smithing', label: 'Smithing (Anvil)' },
            ],
          },
        },
        {
          key: 'Group',
          label: 'Recipe Group',
          type: 'string',
          description: 'Group for recipe book organization',
          placeholder: 'e.g., wooden_planks',
        },
      ],
    },
    {
      id: 'bench',
      title: 'Bench Requirements',
      icon: Hammer,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'BenchRequirement',
          label: 'Required Bench',
          type: 'string',
          description: 'Bench type required to craft this',
          placeholder: 'e.g., hytale:workbench, hytale:forge',
        },
        {
          key: 'BenchTierLevel',
          label: 'Bench Tier Level',
          type: 'number',
          description: 'Minimum bench tier required',
          defaultValue: 0,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'Category',
          label: 'Crafting Category',
          type: 'string',
          description: 'Category shown in bench UI',
          placeholder: 'e.g., Tools, Weapons, Building',
        },
      ],
    },
    {
      id: 'pattern',
      title: 'Shaped Pattern',
      icon: Grid3X3,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.Type === 'Shaped' || data.Pattern !== undefined,
      properties: [
        {
          key: 'Pattern',
          label: 'Pattern',
          type: 'array',
          description: 'Crafting grid pattern (use symbols like #, |, etc.)',
          arrayConfig: {
            itemSchema: {
              key: 'row',
              label: 'Row',
              type: 'string',
              placeholder: 'e.g., ###, | |, ...',
            },
            minItems: 1,
            maxItems: 3,
          },
        },
        {
          key: 'Key',
          label: 'Key Mapping',
          type: 'array',
          description: 'Map pattern symbols to item IDs',
          arrayConfig: {
            itemSchema: {
              key: 'keyEntry',
              label: 'Key Entry',
              type: 'object',
              objectSchema: [
                {
                  key: 'Symbol',
                  label: 'Symbol',
                  type: 'string',
                  description: 'The symbol used in the pattern',
                  placeholder: 'e.g., #, |, X',
                },
                {
                  key: 'ItemId',
                  label: 'Item ID',
                  type: 'string',
                  description: 'Item that this symbol represents',
                  placeholder: 'e.g., hytale:iron_ingot',
                },
                {
                  key: 'Tag',
                  label: 'Item Tag',
                  type: 'string',
                  description: 'Or use a tag for multiple items',
                  placeholder: 'e.g., #planks',
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'shapeless',
      title: 'Shapeless Ingredients',
      icon: Package,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.Type === 'Shapeless' || data.Ingredients !== undefined,
      properties: [
        {
          key: 'Ingredients',
          label: 'Ingredients',
          type: 'array',
          description: 'Items required in any arrangement',
          arrayConfig: {
            itemSchema: {
              key: 'ingredient',
              label: 'Ingredient',
              type: 'object',
              objectSchema: [
                {
                  key: 'ItemId',
                  label: 'Item ID',
                  type: 'string',
                  description: 'Item required',
                  placeholder: 'e.g., hytale:wheat',
                },
                {
                  key: 'Tag',
                  label: 'Item Tag',
                  type: 'string',
                  description: 'Or use a tag for multiple items',
                  placeholder: 'e.g., #logs',
                },
                {
                  key: 'Count',
                  label: 'Count',
                  type: 'number',
                  description: 'Number of this item required',
                  defaultValue: 1,
                  numberConfig: { min: 1, step: 1 },
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'smelting',
      title: 'Smelting Input',
      icon: Settings,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.Type === 'Smelting' || data.Input !== undefined,
      properties: [
        {
          key: 'Input',
          label: 'Input Item',
          type: 'string',
          description: 'Item to smelt',
          placeholder: 'e.g., hytale:iron_ore',
        },
        {
          key: 'InputTag',
          label: 'Input Tag',
          type: 'string',
          description: 'Or use a tag for multiple inputs',
          placeholder: 'e.g., #ores',
        },
      ],
    },
    {
      id: 'timing',
      title: 'Timing',
      icon: Clock,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.TimeSeconds !== undefined ||
        data.CookingTime !== undefined ||
        data.Experience !== undefined,
      properties: [
        {
          key: 'TimeSeconds',
          label: 'Craft Time',
          type: 'number',
          description: 'Time to craft in seconds',
          defaultValue: 0,
          numberConfig: { min: 0, step: 0.5, unit: 's' },
        },
        {
          key: 'CookingTime',
          label: 'Cooking Time',
          type: 'number',
          description: 'Smelting time in ticks',
          defaultValue: 200,
          numberConfig: { min: 1, step: 10 },
        },
        {
          key: 'Experience',
          label: 'Experience',
          type: 'number',
          description: 'XP granted on craft',
          defaultValue: 0,
          numberConfig: { min: 0, step: 0.1 },
        },
      ],
    },
    {
      id: 'result',
      title: 'Result',
      icon: Package,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Result.ItemId',
          label: 'Result Item',
          type: 'string',
          description: 'Item produced by this recipe',
          placeholder: 'e.g., hytale:iron_sword',
          required: true,
        },
        {
          key: 'Result.Count',
          label: 'Result Count',
          type: 'number',
          description: 'Number of items produced',
          defaultValue: 1,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'Result.Data',
          label: 'Result Data',
          type: 'string',
          description: 'Additional data for the result item',
          placeholder: 'Optional NBT/metadata',
        },
      ],
    },
  ],
}
