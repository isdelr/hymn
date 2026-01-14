import type { ModEntry } from './hymn-types'

export const typeLabels: Record<ModEntry['type'], string> = {
  pack: 'Pack',
  plugin: 'Plugin',
  'early-plugin': 'Early Plugin',
  unknown: 'Unknown',
}

export const formatLabels: Record<ModEntry['format'], string> = {
  directory: 'Folder',
  jar: 'Jar',
  zip: 'Zip',
}

export const locationLabels: Record<ModEntry['location'], string> = {
  mods: 'Mods',
  packs: 'Packs',
  earlyplugins: 'Early Plugins',
}

export function getTypeLabel(type: ModEntry['type']): string {
  return typeLabels[type] ?? 'Unknown'
}

export function getFormatLabel(format: ModEntry['format']): string {
  return formatLabels[format] ?? format
}

export function getLocationLabel(location: ModEntry['location']): string {
  return locationLabels[location] ?? location
}
