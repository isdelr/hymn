import {
  Layers,
  Sparkles,
  Zap,
  Bird,
  Crown,
  Settings,
  Users,
  Move,
  Shield,
  Heart,
  Eye,
  Volume2,
  Swords,
  Wheat,
  GitBranch,
} from 'lucide-react'
import type { AssetSchema } from '../types'

export const entitySchema: AssetSchema = {
  kind: 'entity',
  displayName: 'Entity',
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
      id: 'templateConfig',
      title: 'Template Config',
      icon: Settings,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.Type !== undefined || data.StartState !== undefined || data.Reference !== undefined,
      properties: [
        {
          key: 'Type',
          label: 'Type',
          type: 'select',
          description: 'Entity type - Abstract for templates, Concrete for instances, Variant for inherited variants',
          selectConfig: {
            options: [
              { value: 'Abstract', label: 'Abstract (Template)' },
              { value: 'Concrete', label: 'Concrete (Instance)' },
              { value: 'Variant', label: 'Variant (Inherits from Reference)' },
            ],
          },
        },
        {
          key: 'Reference',
          label: 'Reference',
          type: 'string',
          description: 'Template ID to inherit from (for Variant type)',
          placeholder: 'e.g., hytale:npc_base, hytale:cow',
        },
        {
          key: 'StartState',
          label: 'Start State',
          type: 'string',
          description: 'Initial AI state when entity spawns',
          placeholder: 'e.g., Idle, Patrol, Wander',
        },
      ],
    },
    {
      id: 'variantConfig',
      title: 'Variant Configuration',
      icon: GitBranch,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) => data.Type === 'Variant' || data.Parameters !== undefined || data.Modify !== undefined,
      properties: [
        {
          key: 'Parameters',
          label: 'Parameters',
          type: 'array',
          description: 'Configurable parameters with values and descriptions (used with Compute references)',
          arrayConfig: {
            itemSchema: {
              key: 'param',
              label: 'Parameter',
              type: 'object',
              objectSchema: [
                {
                  key: 'Name',
                  label: 'Name',
                  type: 'string',
                  placeholder: 'Parameter name',
                },
                {
                  key: 'Value',
                  label: 'Value',
                  type: 'string',
                  placeholder: 'Parameter value',
                },
                {
                  key: 'Description',
                  label: 'Description',
                  type: 'string',
                  placeholder: 'Parameter description',
                },
              ],
            },
          },
        },
        {
          key: 'Modify',
          label: 'Property Overrides',
          type: 'array',
          description: 'Properties to override from the referenced template. Use { "Compute": "ParamName" } for computed values.',
          arrayConfig: {
            itemSchema: {
              key: 'modification',
              label: 'Modification',
              type: 'object',
              objectSchema: [
                {
                  key: 'Path',
                  label: 'Property Path',
                  type: 'string',
                  placeholder: 'e.g., Health, Character.Scale',
                },
                {
                  key: 'Value',
                  label: 'New Value',
                  type: 'string',
                  placeholder: 'Value or { "Compute": "ParamName" }',
                },
              ],
            },
          },
        },
      ],
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
          placeholder: 'Entity description',
        },
        {
          key: 'NameKey',
          label: 'Name Key',
          type: 'string',
          placeholder: 'entities.my_entity.name',
        },
        {
          key: 'DescriptionKey',
          label: 'Description Key',
          type: 'string',
          placeholder: 'entities.my_entity.desc',
        },
        {
          key: 'NameTranslationKey',
          label: 'Name Translation Key',
          type: 'compute',
          description: 'Computed localization key reference',
        },
      ],
    },
    {
      id: 'character',
      title: 'Character',
      icon: Layers,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Prefab',
          label: 'Prefab ID',
          type: 'string',
        },
        {
          key: 'Character.Model',
          label: 'Model',
          type: 'path',
          placeholder: 'Lookups/Characters/...',
          pathConfig: {
            previewType: 'none',
            filters: [{ name: 'Blocky Models', extensions: ['blockymodel'] }],
            suggestedFolder: 'Common/Lookups/Characters',
            pathPrefix: 'Common',
          },
        },
        {
          key: 'Character.Scale',
          label: 'Scale',
          type: 'number',
          defaultValue: 1.0,
          numberConfig: { min: 0.1, step: 0.1 },
        },
        {
          key: 'Appearance',
          label: 'Appearance',
          type: 'compute',
          description: 'Computed appearance/model reference',
        },
      ],
    },
    {
      id: 'stats',
      title: 'Stats',
      icon: Heart,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Health',
          label: 'Health',
          type: 'number',
          defaultValue: 100,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'MaxHealth',
          label: 'Max Health',
          type: 'number',
          description: 'Maximum health pool',
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'OffHandSlots',
          label: 'Off-Hand Slots',
          type: 'number',
          description: 'Number of off-hand equipment slots',
          defaultValue: 1,
          numberConfig: { min: 0, max: 4, step: 1 },
        },
      ],
    },
    {
      id: 'ai',
      title: 'AI & Faction',
      icon: Zap,
      collapsible: true,
      defaultExpanded: true,
      properties: [
        {
          key: 'Faction',
          label: 'Faction',
          type: 'select',
          selectConfig: {
            options: [
              { value: 'Neutral', label: 'Neutral' },
              { value: 'Friendly', label: 'Friendly' },
              { value: 'Hostile', label: 'Hostile' },
              { value: 'Passive', label: 'Passive' },
            ],
          },
        },
      ],
    },
    {
      id: 'attitudes',
      title: 'Attitudes',
      icon: Users,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.DefaultPlayerAttitude !== undefined ||
        data.DefaultNPCAttitude !== undefined ||
        data.AttitudeGroup !== undefined,
      properties: [
        {
          key: 'DefaultPlayerAttitude',
          label: 'Default Player Attitude',
          type: 'select',
          description: 'How this entity reacts to players by default',
          selectConfig: {
            options: [
              { value: 'Friendly', label: 'Friendly' },
              { value: 'Neutral', label: 'Neutral' },
              { value: 'Hostile', label: 'Hostile' },
              { value: 'Fearful', label: 'Fearful' },
            ],
          },
        },
        {
          key: 'DefaultNPCAttitude',
          label: 'Default NPC Attitude',
          type: 'select',
          description: 'How this entity reacts to other NPCs by default',
          selectConfig: {
            options: [
              { value: 'Friendly', label: 'Friendly' },
              { value: 'Neutral', label: 'Neutral' },
              { value: 'Hostile', label: 'Hostile' },
              { value: 'Fearful', label: 'Fearful' },
            ],
          },
        },
        {
          key: 'AttitudeGroup',
          label: 'Attitude Group',
          type: 'compute',
          description: 'Faction/attitude group reference (computed)',
        },
      ],
    },
    {
      id: 'combat',
      title: 'Combat',
      icon: Shield,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.DisableDamageGroups !== undefined ||
        data.KnockbackScale !== undefined,
      properties: [
        {
          key: 'KnockbackScale',
          label: 'Knockback Scale',
          type: 'number',
          description: 'Multiplier for knockback received',
          defaultValue: 1.0,
          numberConfig: { min: 0, step: 0.1 },
        },
        {
          key: 'DisableDamageGroups',
          label: 'Disable Damage Groups',
          type: 'array',
          description: 'Damage types this entity is immune to',
          arrayConfig: {
            itemSchema: {
              key: 'damageGroup',
              label: 'Damage Group',
              type: 'string',
              placeholder: 'e.g., Fire, Poison, Fall',
            },
          },
        },
      ],
    },
    {
      id: 'movement',
      title: 'Movement',
      icon: Move,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) => data.MotionControllerList !== undefined,
      properties: [
        {
          key: 'MotionControllerList',
          label: 'Motion Controllers',
          type: 'array',
          description: 'Movement behavior configurations',
          arrayConfig: {
            itemSchema: {
              key: 'controller',
              label: 'Controller',
              type: 'object',
              objectSchema: [
                { key: 'Type', label: 'Type', type: 'string', placeholder: 'e.g., Walk, Fly, Swim' },
                { key: 'Speed', label: 'Speed', type: 'number', numberConfig: { min: 0, step: 0.1 } },
                { key: 'Acceleration', label: 'Acceleration', type: 'number', numberConfig: { min: 0, step: 0.1 } },
              ],
            },
          },
        },
      ],
    },
    {
      id: 'drops',
      title: 'Drops',
      icon: Layers,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) => data.DropList !== undefined,
      properties: [
        {
          key: 'DropList',
          label: 'Drop List',
          type: 'compute',
          description: 'Loot table reference (computed)',
        },
      ],
    },
    {
      id: 'sounds',
      title: 'Sounds',
      icon: Volume2,
      collapsible: true,
      defaultExpanded: false,
      properties: [
        {
          key: 'SoundSetId',
          label: 'Sound Set ID',
          type: 'string',
          description: 'Sound set for entity audio',
          placeholder: 'Sound set identifier',
        },
        {
          key: 'FootstepSoundSetId',
          label: 'Footstep Sound Set',
          type: 'string',
          description: 'Sound set for footsteps',
          placeholder: 'Footstep sound set',
        },
      ],
    },
    {
      id: 'detection',
      title: 'Detection',
      icon: Eye,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.DetectionRange !== undefined ||
        data.SightRange !== undefined ||
        data.HearingRange !== undefined ||
        data.ViewSector !== undefined ||
        data.AbsoluteDetectionRange !== undefined,
      properties: [
        {
          key: 'DetectionRange',
          label: 'Detection Range',
          type: 'number',
          description: 'Range at which entity detects targets',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'SightRange',
          label: 'Sight Range',
          type: 'number',
          description: 'Visual detection range',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'HearingRange',
          label: 'Hearing Range',
          type: 'number',
          description: 'Audio detection range',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'FieldOfView',
          label: 'Field of View',
          type: 'number',
          description: 'Vision cone angle in degrees',
          defaultValue: 120,
          numberConfig: { min: 0, max: 360, step: 1 },
        },
        {
          key: 'ViewSector',
          label: 'View Sector',
          type: 'number',
          description: 'Alternative vision cone (different from FieldOfView)',
          numberConfig: { min: 0, max: 360, step: 1 },
        },
        {
          key: 'AbsoluteDetectionRange',
          label: 'Absolute Detection Range',
          type: 'number',
          description: 'Range at which entity always detects targets regardless of direction',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'AlertedActionRange',
          label: 'Alerted Action Range',
          type: 'number',
          description: 'Range at which alerted entity takes action',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'MaxSpeed',
          label: 'Max Speed',
          type: 'number',
          description: 'Maximum movement speed during detection/pursuit',
          numberConfig: { min: 0, step: 0.1 },
        },
        {
          key: 'IsMemory',
          label: 'Has Memory',
          type: 'boolean',
          description: 'Whether entity remembers detected targets',
          defaultValue: false,
        },
        {
          key: 'MemoriesCategory',
          label: 'Memories Category',
          type: 'string',
          description: 'Category for memory system',
          placeholder: 'e.g., Threats, Food, Friends',
        },
        {
          key: 'MemoriesNameOverride',
          label: 'Memories Name Override',
          type: 'string',
          description: 'Override name for memories',
          placeholder: 'Custom memory name',
        },
      ],
    },
    {
      id: 'flight',
      title: 'Flight Properties',
      icon: Bird,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.FlightProperties !== undefined,
      properties: [
        {
          key: 'FlightProperties.MaxAltitude',
          label: 'Max Altitude',
          type: 'number',
          defaultValue: 100,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'FlightProperties.HoverSpeed',
          label: 'Hover Speed',
          type: 'number',
          defaultValue: 2.0,
          numberConfig: { min: 0, step: 0.1 },
        },
        {
          key: 'FlightProperties.CanLand',
          label: 'Can Land',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'swimming',
      title: 'Swimming Properties',
      icon: Zap,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.SwimmingProperties !== undefined,
      properties: [
        {
          key: 'SwimmingProperties.MaxDepth',
          label: 'Max Depth',
          type: 'number',
          defaultValue: 50,
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'SwimmingProperties.SwimSpeed',
          label: 'Swim Speed',
          type: 'number',
          defaultValue: 3.0,
          numberConfig: { min: 0, step: 0.1 },
        },
        {
          key: 'SwimmingProperties.CanBreathUnderwater',
          label: 'Can Breath Underwater',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'boss',
      title: 'Boss Properties',
      icon: Crown,
      collapsible: true,
      defaultExpanded: true,
      condition: (data) => data.BossProperties !== undefined,
      properties: [
        {
          key: 'BossProperties.Phases',
          label: 'Phases',
          type: 'number',
          defaultValue: 1,
          numberConfig: { min: 1, step: 1 },
        },
        {
          key: 'BossProperties.MusicId',
          label: 'Music ID',
          type: 'string',
          placeholder: 'Optional boss music',
        },
        {
          key: 'BossProperties.ShowHealthBar',
          label: 'Show Health Bar',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
    {
      id: 'livestock',
      title: 'Livestock Properties',
      icon: Wheat,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.LovedItems !== undefined ||
        data.ProduceItem !== undefined ||
        data.IsHarvestable !== undefined ||
        data.Timid !== undefined,
      properties: [
        {
          key: 'LovedItems',
          label: 'Loved Items',
          type: 'array',
          description: 'Items this animal is attracted to',
          arrayConfig: {
            itemSchema: {
              key: 'item',
              label: 'Item',
              type: 'string',
              placeholder: 'Item ID',
            },
          },
        },
        {
          key: 'ProduceItem',
          label: 'Produce Item',
          type: 'string',
          description: 'Item this animal produces',
          placeholder: 'e.g., hytale:egg, hytale:milk',
        },
        {
          key: 'IsHarvestable',
          label: 'Is Harvestable',
          type: 'boolean',
          description: 'Can be harvested for resources',
          defaultValue: false,
        },
        {
          key: 'HarvestDropList',
          label: 'Harvest Drop List',
          type: 'string',
          description: 'Drop list when harvested',
          placeholder: 'Drop list ID',
        },
        {
          key: 'HarvestInteractionContext',
          label: 'Harvest Interaction Context',
          type: 'string',
          description: 'Interaction context for harvesting',
          placeholder: 'e.g., Shear, Milk',
        },
        {
          key: 'HarvestParticles',
          label: 'Harvest Particles',
          type: 'string',
          description: 'Particle effect when harvested',
          placeholder: 'Particle system ID',
        },
        {
          key: 'HarvestSound',
          label: 'Harvest Sound',
          type: 'string',
          description: 'Sound played when harvested',
          placeholder: 'Sound event ID',
        },
        {
          key: 'HarvestTimeout',
          label: 'Harvest Timeout',
          type: 'string',
          description: 'Time between harvests (ISO 8601 duration, e.g., PT12H)',
          placeholder: 'e.g., PT12H, PT1H30M',
        },
        {
          key: 'ProduceTimeout',
          label: 'Produce Timeout',
          type: 'string',
          description: 'Time between producing items (ISO 8601 duration)',
          placeholder: 'e.g., PT24H, PT6H',
        },
        {
          key: 'Timid',
          label: 'Timid',
          type: 'boolean',
          description: 'Whether the animal is timid and easily scared',
          defaultValue: false,
        },
        {
          key: 'ChanceToTurnFriendly',
          label: 'Chance To Turn Friendly',
          type: 'number',
          description: 'Base chance for animal to become friendly (0-1)',
          numberConfig: { min: 0, max: 1, step: 0.01 },
        },
        {
          key: 'ChanceToTurnFriendlyWithAttractiveItem',
          label: 'Chance With Attractive Item',
          type: 'number',
          description: 'Chance to become friendly when presented with loved item (0-1)',
          numberConfig: { min: 0, max: 1, step: 0.01 },
        },
        {
          key: 'WeightGreet',
          label: 'Weight: Greet',
          type: 'number',
          description: 'Behavior weight for greeting player',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'WeightFollowItem',
          label: 'Weight: Follow Item',
          type: 'number',
          description: 'Behavior weight for following held item',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'WeightFollow',
          label: 'Weight: Follow',
          type: 'number',
          description: 'Behavior weight for following player',
          numberConfig: { min: 0, step: 1 },
        },
        {
          key: 'WeightIgnore',
          label: 'Weight: Ignore',
          type: 'number',
          description: 'Behavior weight for ignoring player',
          numberConfig: { min: 0, step: 1 },
        },
      ],
    },
    {
      id: 'npcCombat',
      title: 'NPC Combat',
      icon: Swords,
      collapsible: true,
      defaultExpanded: false,
      condition: (data) =>
        data.Weapons !== undefined ||
        data.Attack !== undefined ||
        data.AttackDistance !== undefined ||
        data.FlockArray !== undefined,
      properties: [
        {
          key: 'Weapons',
          label: 'Weapons',
          type: 'array',
          description: 'Weapons available to this NPC',
          arrayConfig: {
            itemSchema: {
              key: 'weapon',
              label: 'Weapon',
              type: 'string',
              placeholder: 'Weapon ID',
            },
          },
        },
        {
          key: 'Attack',
          label: 'Attack Reference',
          type: 'string',
          description: 'Attack behavior/pattern reference',
          placeholder: 'Attack reference ID',
        },
        {
          key: 'AttackDistance',
          label: 'Attack Distance',
          type: 'number',
          description: 'Distance at which NPC will attack',
          numberConfig: { min: 0, step: 0.1 },
        },
        {
          key: 'DesiredAttackDistanceRange',
          label: 'Desired Attack Distance Range',
          type: 'array',
          description: 'Min and max preferred attack distance [min, max]',
          arrayConfig: {
            itemSchema: {
              key: 'distance',
              label: 'Distance',
              type: 'number',
              numberConfig: { min: 0, step: 0.1 },
            },
            minItems: 2,
            maxItems: 2,
          },
        },
        {
          key: 'CombatMessageTargetGroups',
          label: 'Combat Message Target Groups',
          type: 'array',
          description: 'Groups that receive combat messages from this NPC',
          arrayConfig: {
            itemSchema: {
              key: 'group',
              label: 'Group',
              type: 'string',
              placeholder: 'Target group ID',
            },
          },
        },
        {
          key: 'FlockArray',
          label: 'Flock Array',
          type: 'array',
          description: 'NPCs that flock/coordinate with this entity',
          arrayConfig: {
            itemSchema: {
              key: 'flock',
              label: 'Flock Member',
              type: 'string',
              placeholder: 'Entity ID',
            },
          },
        },
        {
          key: 'WakingPeriod',
          label: 'Waking Period',
          type: 'string',
          description: 'Time period when NPC is active (ISO 8601 duration)',
          placeholder: 'e.g., PT12H, PT8H',
        },
      ],
    },
  ],
}
