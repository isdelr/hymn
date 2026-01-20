import type { ComponentType } from 'react'
import type { PropertyType, FieldProps } from '../types'

import { StringField } from './StringField'
import { NumberField } from './NumberField'
import { BooleanField } from './BooleanField'
import { SelectField } from './SelectField'
import { ComputeField } from './ComputeField'
import { PathField } from './PathField'
import { Vector3Field } from './Vector3Field'
import { ArrayField } from './ArrayField'
import { ObjectField } from './ObjectField'

/**
 * Registry mapping property types to field components.
 */
const fieldRegistry: Record<PropertyType, ComponentType<FieldProps<unknown>>> = {
  string: StringField as ComponentType<FieldProps<unknown>>,
  number: NumberField as ComponentType<FieldProps<unknown>>,
  boolean: BooleanField as ComponentType<FieldProps<unknown>>,
  select: SelectField as ComponentType<FieldProps<unknown>>,
  compute: ComputeField as ComponentType<FieldProps<unknown>>,
  path: PathField as ComponentType<FieldProps<unknown>>,
  vector3: Vector3Field as ComponentType<FieldProps<unknown>>,
  array: ArrayField as ComponentType<FieldProps<unknown>>,
  object: ObjectField as ComponentType<FieldProps<unknown>>,
}

/**
 * Get the appropriate field component for a property type.
 */
export function getFieldComponent(type: PropertyType): ComponentType<FieldProps<unknown>> {
  return fieldRegistry[type] ?? StringField
}

/**
 * Infer property type from a value when no schema is provided.
 */
export function inferPropertyType(_key: string, value: unknown): PropertyType {
  // Check for compute objects
  if (value && typeof value === 'object' && 'Compute' in value) {
    return 'compute'
  }

  // Check primitive types
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'

  // Check string and potential paths
  if (typeof value === 'string') {
    if (looksLikePath(value)) return 'path'
    return 'string'
  }

  // Check arrays
  if (Array.isArray(value)) return 'array'

  // Check objects
  if (typeof value === 'object' && value !== null) {
    if (hasXYZ(value)) return 'vector3'
    return 'object'
  }

  // Default to string
  return 'string'
}

/**
 * Check if a string value looks like a file path.
 */
function looksLikePath(value: string): boolean {
  const pathExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.tga', '.dds',
    '.ogg', '.wav', '.mp3',
    '.blockymodel', '.blockyanim',
    '.json'
  ]

  const lowerValue = value.toLowerCase()

  // Check for common file extensions
  if (pathExtensions.some(ext => lowerValue.endsWith(ext))) {
    return true
  }

  // Check for path separators
  if (value.includes('/') || value.includes('\\')) {
    return true
  }

  return false
}

/**
 * Check if an object has X, Y, Z properties (vector3).
 */
function hasXYZ(obj: object): boolean {
  return 'X' in obj && 'Y' in obj && 'Z' in obj
}

// Re-export field components
export { StringField } from './StringField'
export { NumberField } from './NumberField'
export { BooleanField } from './BooleanField'
export { SelectField } from './SelectField'
export { ComputeField } from './ComputeField'
export { PathField } from './PathField'
export { Vector3Field } from './Vector3Field'
export { ArrayField } from './ArrayField'
export { ObjectField } from './ObjectField'
