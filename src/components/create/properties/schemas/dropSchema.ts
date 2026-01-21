import {
  Dice5,
  Layers,
  Settings,
  Filter,
  Package,
} from 'lucide-react'
import type { AssetSchema } from '../types'

export const dropSchema: AssetSchema = {
  kind: 'drop',
  displayName: 'Drop Table',
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
          description: 'Parent drop table to inherit from',
          placeholder: 'Optional parent asset',
        },
      ],
      condition: (data) => data.Parent !== undefined,
    },
    {
      id: 'identity',
      title: 'Drop Table Identity',
      icon: Dice5,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Id',
          label: 'Drop Table ID',
          type: 'string',
          description: 'Unique identifier for this drop table',
          required: true,
        },
      ],
    },
    {
      id: 'settings',
      title: 'Roll Settings',
      icon: Settings,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'TotalRolls',
          label: 'Total Rolls',
          type: 'number',
          description: 'Number of times to roll the drop table',
          defaultValue: 1,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'BonusRolls',
          label: 'Bonus Rolls',
          type: 'number',
          description: 'Additional rolls based on luck',
          defaultValue: 0,
          numberConfig: { min: 0, step: 1 },
        },
      ],
    },
    {
      id: 'conditions',
      title: 'Conditions',
      icon: Filter,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.Conditions !== undefined || data.RequiredTool !== undefined,
      properties: [
        {
          key: 'RequiredTool',
          label: 'Required Tool',
          type: 'select',
          description: 'Tool type required to get these drops',
          selectConfig: {
            options: [
              { value: 'None', label: 'None (Any)' },
              { value: 'Pickaxe', label: 'Pickaxe' },
              { value: 'Axe', label: 'Axe' },
              { value: 'Shovel', label: 'Shovel' },
              { value: 'Hoe', label: 'Hoe' },
              { value: 'Shears', label: 'Shears' },
              { value: 'Sword', label: 'Sword' },
            ],
          },
        },
        {
          key: 'MinToolLevel',
          label: 'Min Tool Level',
          type: 'number',
          description: 'Minimum tool tier required',
          defaultValue: 0,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'RequiresSilkTouch',
          label: 'Requires Silk Touch',
          type: 'boolean',
          description: 'Only drop with silk touch enchantment',
          defaultValue: false,
        },
      ],
    },
    {
      id: 'items',
      title: 'Drop Items',
      icon: Package,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Items',
          label: 'Items',
          type: 'array',
          description: 'Items that can drop from this table',
          arrayConfig: {
            itemSchema: {
              key: 'dropItem',
              label: 'Drop Entry',
              type: 'object',
              objectSchema: [
                {
                  key: 'ItemId',
                  label: 'Item ID',
                  type: 'string',
                  description: 'ID of the item to drop',
                  placeholder: 'e.g., hytale:stone',
                  required: true,
                },
                {
                  key: 'Weight',
                  label: 'Weight',
                  type: 'number',
                  description: 'Selection weight (higher = more common)',
                  defaultValue: 1,
                  numberConfig: { min: 0, step: 0.1 },
                },
                {
                  key: 'Min',
                  label: 'Min Count',
                  type: 'number',
                  description: 'Minimum quantity dropped',
                  defaultValue: 1,
                  numberConfig: { min: 0, step: 1 },
                },
                {
                  key: 'Max',
                  label: 'Max Count',
                  type: 'number',
                  description: 'Maximum quantity dropped',
                  defaultValue: 1,
                  numberConfig: { min: 0, step: 1 },
                },
                {
                  key: 'Chance',
                  label: 'Chance',
                  type: 'number',
                  description: 'Drop chance (0-1, 1 = always)',
                  defaultValue: 1,
                  numberConfig: { min: 0, max: 1, step: 0.01 },
                },
                {
                  key: 'LuckMultiplier',
                  label: 'Luck Multiplier',
                  type: 'number',
                  description: 'How much luck affects this drop',
                  defaultValue: 0,
                  numberConfig: { min: 0, step: 0.1 },
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'nestedTables',
      title: 'Nested Tables',
      icon: Layers,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) => data.NestedTables !== undefined,
      properties: [
        {
          key: 'NestedTables',
          label: 'Nested Tables',
          type: 'array',
          description: 'Other drop tables to include',
          arrayConfig: {
            itemSchema: {
              key: 'nestedTable',
              label: 'Nested Table',
              type: 'object',
              objectSchema: [
                {
                  key: 'TableId',
                  label: 'Table ID',
                  type: 'string',
                  description: 'ID of the nested drop table',
                  placeholder: 'e.g., common_ores',
                },
                {
                  key: 'Weight',
                  label: 'Weight',
                  type: 'number',
                  description: 'Selection weight',
                  defaultValue: 1,
                  numberConfig: { min: 0, step: 0.1 },
                },
              ],
            },
          },
        },
      ],
    },
  ],
}
