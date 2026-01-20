import {
  Layers,
  Sparkles,
  Shield,
  Zap,
  Sprout,
  Archive,
  Box,
  Paintbrush,
  Volume2,
  Lightbulb,
  Flag,
  ArrowDown,
  Settings,
  MousePointer,
  RotateCcw,
  Hammer,
} from 'lucide-react'
import type { AssetSchema } from '../types'

export const blockSchema: AssetSchema = {
  kind: 'block',
  displayName: 'Block',
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
          description: 'Parent asset ID to inherit properties from',
          placeholder: 'Optional parent asset',
        },
      ],
      condition: (data) => data.Parent !== undefined,
    },
    {
      id: 'translation',
      title: 'Translation',
      icon: Sparkles,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'TranslationProperties.Name',
          label: 'Display Name',
          type: 'string',
          placeholder: 'In-game name',
        },
        {
          key: 'TranslationProperties.Description',
          label: 'Description',
          type: 'string',
          placeholder: 'Block description',
        },
        {
          key: 'NameKey',
          label: 'Name Key',
          type: 'string',
          placeholder: 'blocks.my_block.name',
        },
        {
          key: 'DescriptionKey',
          label: 'Description Key',
          type: 'string',
          placeholder: 'blocks.my_block.desc',
        },
      ],
    },
    {
      id: 'identity',
      title: 'Block Identity',
      icon: Layers,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'BlockType',
          label: 'Block Type ID',
          type: 'string',
          required: true,
        },
        {
          key: 'BlockType.Group',
          label: 'Block Group',
          type: 'string',
          description: 'Category group for the block',
          placeholder: 'e.g., Natural, Building, Decoration',
        },
      ],
    },
    {
      id: 'material',
      title: 'Material & Rendering',
      icon: Paintbrush,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'BlockType.Material',
          label: 'Material',
          type: 'select',
          description: 'Physical material type',
          selectConfig: {
            options: [
              { value: 'Stone', label: 'Stone' },
              { value: 'Wood', label: 'Wood' },
              { value: 'Metal', label: 'Metal' },
              { value: 'Glass', label: 'Glass' },
              { value: 'Plant', label: 'Plant' },
              { value: 'Dirt', label: 'Dirt' },
              { value: 'Sand', label: 'Sand' },
              { value: 'Cloth', label: 'Cloth' },
              { value: 'Liquid', label: 'Liquid' },
            ],
          },
        },
        {
          key: 'BlockType.DrawType',
          label: 'Draw Type',
          type: 'select',
          description: 'How the block is rendered',
          selectConfig: {
            options: [
              { value: 'Cube', label: 'Cube' },
              { value: 'CustomModel', label: 'Custom Model' },
              { value: 'Cross', label: 'Cross (X-shaped)' },
              { value: 'Flat', label: 'Flat' },
              { value: 'Slab', label: 'Slab' },
              { value: 'Stairs', label: 'Stairs' },
              { value: 'Fence', label: 'Fence' },
              { value: 'Liquid', label: 'Liquid' },
            ],
          },
        },
        {
          key: 'BlockType.Opacity',
          label: 'Opacity',
          type: 'select',
          description: 'Transparency level',
          selectConfig: {
            options: [
              { value: 'Opaque', label: 'Opaque' },
              { value: 'Transparent', label: 'Transparent' },
              { value: 'Translucent', label: 'Translucent' },
              { value: 'Semitransparent', label: 'Semitransparent' },
              { value: 'Cutout', label: 'Cutout' },
            ],
          },
        },
        {
          key: 'BlockType.RandomRotation',
          label: 'Random Rotation',
          type: 'select',
          description: 'How block rotates when placed',
          selectConfig: {
            options: [
              { value: 'None', label: 'None' },
              { value: 'Y', label: 'Y-axis only' },
              { value: 'XYZ', label: 'All axes' },
            ],
          },
        },
      ],
    },
    {
      id: 'model',
      title: 'Model & Texture',
      icon: Box,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.CustomModel'] !== undefined ||
        data['BlockType.CustomModelTexture'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null),
      properties: [
        {
          key: 'BlockType.CustomModel',
          label: 'Custom Model',
          type: 'path',
          description: '3D model for non-cube blocks',
          placeholder: 'Blocks/Models/...',
          pathConfig: {
            previewType: 'none',
            filters: [{ name: 'Blocky Models', extensions: ['blockymodel'] }],
            suggestedFolder: 'Common/Blocks/Models',
            pathPrefix: 'Common',
          },
        },
        {
          key: 'BlockType.CustomModelScale',
          label: 'Model Scale',
          type: 'number',
          description: 'Scale multiplier for custom model',
          defaultValue: 1.0,
          numberConfig: { min: 0.1, max: 10, step: 0.1 },
        },
        {
          key: 'BlockType.CustomModelTexture',
          label: 'Model Textures',
          type: 'array',
          description: 'Textures with optional weights for variation',
          arrayConfig: {
            itemSchema: {
              key: 'texture',
              label: 'Texture',
              type: 'object',
              objectSchema: [
                {
                  key: 'Texture',
                  label: 'Texture Path',
                  type: 'path',
                  pathConfig: {
                    previewType: 'image',
                    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tga', 'dds'] }],
                    suggestedFolder: 'Common/Textures/Blocks',
                    pathPrefix: 'Common',
                  },
                },
                {
                  key: 'Weight',
                  label: 'Weight',
                  type: 'number',
                  description: 'Selection weight for random variation',
                  defaultValue: 1,
                  numberConfig: { min: 0, step: 1 },
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'collision',
      title: 'Collision & Hitbox',
      icon: Shield,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'BlockType.HitboxType',
          label: 'Hitbox Type',
          type: 'select',
          description: 'Collision shape',
          selectConfig: {
            options: [
              { value: 'Full', label: 'Full Block' },
              { value: 'None', label: 'None (No Collision)' },
              { value: 'Custom', label: 'Custom' },
              { value: 'Slab', label: 'Slab' },
              { value: 'Stairs', label: 'Stairs' },
            ],
          },
        },
        {
          key: 'ExampleState.Collidable',
          label: 'Collidable',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'physical',
      title: 'Physical Properties',
      icon: Shield,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'ExampleState.Hardness',
          label: 'Hardness',
          type: 'number',
          description: 'How long it takes to break',
          numberConfig: { min: 0, step: 0.5 },
        },
        {
          key: 'ExampleState.Resistance',
          label: 'Resistance',
          type: 'number',
          description: 'Explosion resistance',
          numberConfig: { min: 0, step: 0.5 },
        },
      ],
    },
    {
      id: 'state',
      title: 'Render State',
      icon: Zap,
      collapsible: true,
      defaultExpanded: false,
      properties: [
        {
          key: 'ExampleState.RenderType',
          label: 'Render Type',
          type: 'select',
          selectConfig: {
            options: [
              { value: 'Solid', label: 'Solid' },
              { value: 'Cutout', label: 'Cutout' },
              { value: 'Translucent', label: 'Translucent' },
              { value: 'Fluid', label: 'Fluid' },
              { value: 'Invisible', label: 'Invisible' },
            ],
          },
        },
      ],
    },
    {
      id: 'particlesSound',
      title: 'Particles & Sound',
      icon: Volume2,
      collapsible: true,
      defaultExpanded: false,
      properties: [
        {
          key: 'BlockType.ParticleColor',
          label: 'Particle Color',
          type: 'string',
          description: 'Hex color for break/hit particles',
          placeholder: '#FFFFFF',
        },
        {
          key: 'BlockType.BlockParticleSetId',
          label: 'Particle Set ID',
          type: 'string',
          description: 'Particle effect set',
          placeholder: 'Particle set identifier',
        },
        {
          key: 'BlockType.BlockSoundSetId',
          label: 'Sound Set ID',
          type: 'string',
          description: 'Sound set for block interactions',
          placeholder: 'e.g., Stone, Wood, Plant',
        },
      ],
    },
    {
      id: 'light',
      title: 'Lighting',
      icon: Lightbulb,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Light'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Light !== undefined),
      properties: [
        {
          key: 'BlockType.Light.Color',
          label: 'Light Color',
          type: 'string',
          description: 'Hex color of emitted light',
          placeholder: '#FFCC00',
        },
        {
          key: 'BlockType.Light.Intensity',
          label: 'Light Intensity',
          type: 'number',
          description: 'Brightness level (0-15)',
          defaultValue: 15,
          numberConfig: { min: 0, max: 15, step: 1 },
        },
        {
          key: 'BlockType.Light.Radius',
          label: 'Light Radius',
          type: 'number',
          description: 'How far light reaches',
          defaultValue: 15,
          numberConfig: { min: 1, max: 32, step: 1 },
        },
      ],
    },
    {
      id: 'flags',
      title: 'Block Flags',
      icon: Flag,
      collapsible: true,
      defaultExpanded: false,
      properties: [
        {
          key: 'BlockType.Flags.IsUsable',
          label: 'Is Usable',
          type: 'boolean',
          description: 'Can be interacted with (right-click)',
          defaultValue: false,
        },
        {
          key: 'BlockType.Flags.IsStackable',
          label: 'Is Stackable',
          type: 'boolean',
          description: 'Can be stacked on top of each other',
          defaultValue: true,
        },
        {
          key: 'BlockType.Flags.IsReplaceable',
          label: 'Is Replaceable',
          type: 'boolean',
          description: 'Can be replaced when placing other blocks',
          defaultValue: false,
        },
        {
          key: 'BlockType.Flags.IsFlammable',
          label: 'Is Flammable',
          type: 'boolean',
          description: 'Can catch fire',
          defaultValue: false,
        },
      ],
    },
    {
      id: 'support',
      title: 'Support Requirements',
      icon: ArrowDown,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Support'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Support !== undefined),
      properties: [
        {
          key: 'BlockType.Support.Down',
          label: 'Support Down',
          type: 'array',
          description: 'Support requirements from blocks below',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Support.Up',
          label: 'Support Up',
          type: 'array',
          description: 'Support requirements from blocks above',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Support.North',
          label: 'Support North',
          type: 'array',
          description: 'Support requirements from north direction',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Support.South',
          label: 'Support South',
          type: 'array',
          description: 'Support requirements from south direction',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Support.East',
          label: 'Support East',
          type: 'array',
          description: 'Support requirements from east direction',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Support.West',
          label: 'Support West',
          type: 'array',
          description: 'Support requirements from west direction',
          arrayConfig: {
            itemSchema: {
              key: 'support',
              label: 'Support',
              type: 'object',
              objectSchema: [
                {
                  key: 'FaceType',
                  label: 'Face Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'Full', label: 'Full' },
                      { value: 'Branch', label: 'Branch' },
                      { value: 'Rope', label: 'Rope' },
                    ],
                  },
                },
                {
                  key: 'Filler',
                  label: 'Filler',
                  type: 'array',
                  arrayConfig: {
                    itemSchema: {
                      key: 'filler',
                      label: 'Filler',
                      type: 'string',
                      placeholder: 'Filler block type',
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'gathering',
      title: 'Gathering & Harvesting',
      icon: Zap,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Gathering'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Gathering !== undefined),
      properties: [
        {
          key: 'BlockType.Gathering.RequiredTool',
          label: 'Required Tool',
          type: 'select',
          description: 'Tool type needed to harvest',
          selectConfig: {
            options: [
              { value: 'None', label: 'None (Any)' },
              { value: 'Pickaxe', label: 'Pickaxe' },
              { value: 'Axe', label: 'Axe' },
              { value: 'Shovel', label: 'Shovel' },
              { value: 'Hoe', label: 'Hoe' },
              { value: 'Shears', label: 'Shears' },
            ],
          },
        },
        {
          key: 'BlockType.Gathering.MinToolLevel',
          label: 'Min Tool Level',
          type: 'number',
          description: 'Minimum tool tier required',
          defaultValue: 0,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'BlockType.Gathering.DropItem',
          label: 'Drop Item',
          type: 'string',
          description: 'Item ID dropped when broken',
          placeholder: 'Item ID',
        },
        {
          key: 'BlockType.Gathering.DropCount',
          label: 'Drop Count',
          type: 'number',
          description: 'Number of items dropped',
          defaultValue: 1,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'BlockType.Gathering.Experience',
          label: 'Experience',
          type: 'number',
          description: 'XP granted when broken',
          defaultValue: 0,
          numberConfig: { min: 0, step: 1 },
        },
      ],
    },
    {
      id: 'stateDefinitions',
      title: 'State Definitions',
      icon: Settings,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['State.Definitions'] !== undefined ||
        (data.State !== undefined && typeof data.State === 'object' && data.State !== null && (data.State as Record<string, unknown>).Definitions !== undefined),
      properties: [
        {
          key: 'State.Definitions',
          label: 'State Definitions',
          type: 'array',
          description: 'Multi-state configurations (e.g., powered on/off)',
          arrayConfig: {
            itemSchema: {
              key: 'state',
              label: 'State',
              type: 'object',
              objectSchema: [
                { key: 'Name', label: 'State Name', type: 'string', placeholder: 'e.g., powered, open' },
                { key: 'Default', label: 'Default Value', type: 'string', placeholder: 'e.g., false, closed' },
                {
                  key: 'Type',
                  label: 'Value Type',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'boolean', label: 'Boolean' },
                      { value: 'int', label: 'Integer' },
                      { value: 'string', label: 'String' },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'crop',
      title: 'Crop Properties',
      icon: Sprout,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.CropProperties !== undefined,
      properties: [
        {
          key: 'CropProperties.GrowthStages',
          label: 'Growth Stages',
          type: 'number',
          defaultValue: 4,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'CropProperties.GrowthTime',
          label: 'Growth Time',
          type: 'number',
          defaultValue: 300,
          numberConfig: { min: 1, step: 10, unit: 's' },
        },
        {
          key: 'CropProperties.DropItem',
          label: 'Drop Item ID',
          type: 'string',
          placeholder: 'Item ID to drop on harvest',
        },
        {
          key: 'CropProperties.RequiresWater',
          label: 'Requires Water',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'farming',
      title: 'Farming',
      icon: Sprout,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Farming'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Farming !== undefined),
      properties: [
        {
          key: 'BlockType.Farming.GrowthStages',
          label: 'Growth Stages',
          type: 'number',
          description: 'Number of growth stages',
          defaultValue: 4,
          numberConfig: { min: 1, max: 16, step: 1 },
        },
        {
          key: 'BlockType.Farming.BaseGrowthTime',
          label: 'Base Growth Time',
          type: 'number',
          description: 'Time per stage in seconds',
          defaultValue: 300,
          numberConfig: { min: 1, step: 10, unit: 's' },
        },
        {
          key: 'BlockType.Farming.ActiveGrowthModifiers',
          label: 'Growth Modifiers',
          type: 'array',
          description: 'Conditions that affect growth speed',
          arrayConfig: {
            itemSchema: {
              key: 'modifier',
              label: 'Modifier',
              type: 'object',
              objectSchema: [
                { key: 'Condition', label: 'Condition', type: 'string', placeholder: 'e.g., HasWater, InSunlight' },
                {
                  key: 'Multiplier',
                  label: 'Speed Multiplier',
                  type: 'number',
                  numberConfig: { min: 0, step: 0.1 },
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.Farming.HarvestItem',
          label: 'Harvest Item',
          type: 'string',
          description: 'Item dropped when harvested',
          placeholder: 'Item ID',
        },
        {
          key: 'BlockType.Farming.HarvestCount',
          label: 'Harvest Count',
          type: 'number',
          description: 'Number of items dropped',
          defaultValue: 1,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'BlockType.Farming.SeedItem',
          label: 'Seed Item',
          type: 'string',
          description: 'Item that plants this crop',
          placeholder: 'Seed Item ID',
        },
      ],
    },
    {
      id: 'blockEntity',
      title: 'Block Entity Components',
      icon: Settings,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.BlockEntity'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).BlockEntity !== undefined),
      properties: [
        {
          key: 'BlockType.BlockEntity.Type',
          label: 'Block Entity Type',
          type: 'string',
          description: 'Type of block entity',
          placeholder: 'e.g., Container, Furnace, Sign',
        },
        {
          key: 'BlockType.BlockEntity.Components',
          label: 'Components',
          type: 'array',
          description: 'Attached component configurations',
          arrayConfig: {
            itemSchema: {
              key: 'component',
              label: 'Component',
              type: 'object',
              objectSchema: [
                { key: 'Type', label: 'Component Type', type: 'string', placeholder: 'e.g., Inventory, Crafting' },
                { key: 'Config', label: 'Configuration', type: 'string', placeholder: 'Component config JSON' },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'container',
      title: 'Container Properties',
      icon: Archive,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.ContainerProperties !== undefined,
      properties: [
        {
          key: 'ContainerProperties.Slots',
          label: 'Total Slots',
          type: 'number',
          defaultValue: 27,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'ContainerProperties.Rows',
          label: 'Rows',
          type: 'number',
          defaultValue: 3,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'ContainerProperties.Columns',
          label: 'Columns',
          type: 'number',
          defaultValue: 9,
          numberConfig: { min: 1, step: 1 },
        },
      ],
    },
    {
      id: 'furniture',
      title: 'Furniture Properties',
      icon: Layers,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.FurnitureProperties !== undefined,
      properties: [
        {
          key: 'FurnitureProperties.CanSit',
          label: 'Can Sit',
          type: 'boolean',
          defaultValue: false,
        },
        {
          key: 'FurnitureProperties.CanInteract',
          label: 'Can Interact',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'FurnitureProperties.SeatOffset',
          label: 'Seat Offset',
          type: 'array',
          description: 'X, Y, Z offset for sitting position',
          arrayConfig: {
            itemSchema: {
              key: 'offset',
              label: 'Offset',
              type: 'number',
              numberConfig: { step: 0.1 },
            },
            minItems: 3,
            maxItems: 3,
          },
        },
      ],
    },
    {
      id: 'variantRotation',
      title: 'Variant Rotation',
      icon: RotateCcw,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.VariantRotation'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).VariantRotation !== undefined),
      properties: [
        {
          key: 'BlockType.VariantRotation',
          label: 'Variant Rotation',
          type: 'select',
          description: 'How the block can be rotated when placed (NESW = cardinal directions)',
          selectConfig: {
            options: [
              { value: 'None', label: 'None' },
              { value: 'NESW', label: 'NESW (4 rotations)' },
              { value: 'All', label: 'All (24 rotations)' },
            ],
          },
        },
      ],
    },
    {
      id: 'bench',
      title: 'Bench Properties',
      icon: Hammer,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Bench'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Bench !== undefined),
      properties: [
        {
          key: 'BlockType.Bench.Type',
          label: 'Bench Type',
          type: 'string',
          description: 'Type identifier for this bench',
          placeholder: 'e.g., Forge, Workbench, Anvil',
        },
        {
          key: 'BlockType.Bench.Id',
          label: 'Bench ID',
          type: 'string',
          description: 'Unique identifier for this bench',
          placeholder: 'e.g., hytale:forge',
        },
        {
          key: 'BlockType.Bench.Categories',
          label: 'Categories',
          type: 'array',
          description: 'Crafting categories this bench supports',
          arrayConfig: {
            itemSchema: {
              key: 'category',
              label: 'Category',
              type: 'string',
              placeholder: 'e.g., Metalworking, Woodworking',
            },
          },
        },
        {
          key: 'BlockType.Bench.TierLevel',
          label: 'Tier Level',
          type: 'number',
          description: 'Bench tier level for recipe requirements',
          defaultValue: 1,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'BlockType.Bench.OpenSound',
          label: 'Open Sound',
          type: 'string',
          description: 'Sound played when opening bench UI',
          placeholder: 'Sound event ID',
        },
        {
          key: 'BlockType.Bench.CloseSound',
          label: 'Close Sound',
          type: 'string',
          description: 'Sound played when closing bench UI',
          placeholder: 'Sound event ID',
        },
        {
          key: 'BlockType.Bench.CraftSound',
          label: 'Craft Sound',
          type: 'string',
          description: 'Sound played when crafting',
          placeholder: 'Sound event ID',
        },
      ],
    },
    {
      id: 'interactions',
      title: 'Interactions',
      icon: MousePointer,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.Interactions'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).Interactions !== undefined),
      properties: [
        {
          key: 'BlockType.Interactions.Use',
          label: 'Use Interactions',
          type: 'array',
          description: 'Actions when block is used/interacted with',
          arrayConfig: {
            itemSchema: {
              key: 'interaction',
              label: 'Interaction',
              type: 'object',
              objectSchema: [
                {
                  key: 'Action',
                  label: 'Action',
                  type: 'select',
                  selectConfig: {
                    options: [
                      { value: 'ChangeState', label: 'Change State' },
                      { value: 'OpenUI', label: 'Open UI' },
                      { value: 'PlaySound', label: 'Play Sound' },
                      { value: 'SpawnEntity', label: 'Spawn Entity' },
                    ],
                  },
                },
                {
                  key: 'StateName',
                  label: 'State Name',
                  type: 'string',
                  description: 'For ChangeState: name of state to change',
                  placeholder: 'e.g., powered, open',
                },
                {
                  key: 'StateValue',
                  label: 'State Value',
                  type: 'string',
                  description: 'For ChangeState: value to set',
                  placeholder: 'e.g., true, false, toggle',
                },
                {
                  key: 'UIId',
                  label: 'UI ID',
                  type: 'string',
                  description: 'For OpenUI: identifier of UI to open',
                  placeholder: 'UI identifier',
                },
                {
                  key: 'SoundId',
                  label: 'Sound ID',
                  type: 'string',
                  description: 'For PlaySound: sound event to play',
                  placeholder: 'Sound event ID',
                },
              ],
            },
          },
        },
        {
          key: 'BlockType.InteractionHint',
          label: 'Interaction Hint',
          type: 'string',
          description: 'Text shown when player looks at block',
          placeholder: 'e.g., Press E to open',
        },
      ],
    },
    {
      id: 'customModelAnimation',
      title: 'Model Animation',
      icon: Zap,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.CustomModelAnimation'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).CustomModelAnimation !== undefined),
      properties: [
        {
          key: 'BlockType.CustomModelAnimation',
          label: 'Animation Path',
          type: 'path',
          description: 'Animation for the custom model',
          placeholder: 'Animations/Blocks/...',
          pathConfig: {
            previewType: 'none',
            filters: [{ name: 'Blocky Animations', extensions: ['blockyanim'] }],
            suggestedFolder: 'Common/Animations/Blocks',
            pathPrefix: 'Common',
          },
        },
        {
          key: 'BlockType.Looping',
          label: 'Looping',
          type: 'boolean',
          description: 'Whether the animation loops',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'placementSettings',
      title: 'Placement Settings',
      icon: Settings,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data['BlockType.PlacementSettings'] !== undefined ||
        (data.BlockType !== undefined && typeof data.BlockType === 'object' && data.BlockType !== null && (data.BlockType as Record<string, unknown>).PlacementSettings !== undefined),
      properties: [
        {
          key: 'BlockType.PlacementSettings.AllowedFaces',
          label: 'Allowed Faces',
          type: 'array',
          description: 'Block faces that can be placed against',
          arrayConfig: {
            itemSchema: {
              key: 'face',
              label: 'Face',
              type: 'select',
              selectConfig: {
                options: [
                  { value: 'Up', label: 'Up' },
                  { value: 'Down', label: 'Down' },
                  { value: 'North', label: 'North' },
                  { value: 'South', label: 'South' },
                  { value: 'East', label: 'East' },
                  { value: 'West', label: 'West' },
                ],
              },
            },
          },
        },
        {
          key: 'BlockType.PlacementSettings.RequiresSolidBase',
          label: 'Requires Solid Base',
          type: 'boolean',
          description: 'Must be placed on a solid block',
          defaultValue: false,
        },
        {
          key: 'BlockType.PlacementSettings.CanFloat',
          label: 'Can Float',
          type: 'boolean',
          description: 'Can be placed in mid-air',
          defaultValue: false,
        },
        {
          key: 'BlockType.PlacementSettings.SnapToGrid',
          label: 'Snap To Grid',
          type: 'boolean',
          description: 'Block snaps to grid when placed',
          defaultValue: true,
        },
      ],
    },
  ],
}
