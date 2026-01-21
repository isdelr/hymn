import {
  Sword,
  Pickaxe,
  Box,
  UserPlus,
  Ghost,
  Music,
  Layout,
  FileJson,
  Droplets,
  Axe,
  Shovel,
  Wheat,
  Fish,
  HardHat,
  Shirt,
  Footprints,
  Apple,
  FlaskConical,
  Puzzle,
  Crosshair,
  Sparkles,
  Sofa,
  Sprout,
  Archive,
  Bird,
  Waves,
  Crown,
  Rabbit,
  Dice5,
  Grid3X3,
  Shuffle,
  Store,
  Rocket,
  Terminal,
  Radio,
  FileCode,
  Settings,
  Zap,
  MousePointer,
} from 'lucide-react'
import type { ServerAssetIconName } from '@/shared/templates/serverAssetTemplates'
import type { JavaClassIconName } from '@/shared/templates/javaClassTemplates'

type IconComponent = React.ComponentType<{ className?: string }>

/**
 * Map server asset icon names to React components.
 */
export const SERVER_ASSET_ICONS: Record<ServerAssetIconName, IconComponent> = {
  Sword,
  Pickaxe,
  Box,
  UserPlus,
  Ghost,
  Music,
  Layout,
  FileJson,
  Droplets,
  Axe,
  Shovel,
  Wheat,
  Fish,
  HardHat,
  Shirt,
  Footprints,
  Apple,
  FlaskConical,
  Puzzle,
  Crosshair,
  Sparkles,
  Sofa,
  Sprout,
  Archive,
  Bird,
  Waves,
  Crown,
  Rabbit,
  Dice5,
  Grid3X3,
  Shuffle,
  Store,
  Rocket,
}

/**
 * Map Java class icon names to React components.
 */
export const JAVA_CLASS_ICONS: Record<JavaClassIconName, IconComponent> = {
  Terminal,
  Radio,
  Puzzle,
  FileCode,
  Layout,
  Settings,
  Zap,
  MousePointer,
}

/**
 * Get the icon component for a server asset template.
 */
export function getServerAssetIcon(iconName: ServerAssetIconName): IconComponent {
  return SERVER_ASSET_ICONS[iconName] ?? FileJson
}

/**
 * Get the icon component for a Java class template.
 */
export function getJavaClassIcon(iconName: JavaClassIconName): IconComponent {
  return JAVA_CLASS_ICONS[iconName] ?? FileCode
}
