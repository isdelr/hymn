import type { LucideIcon } from 'lucide-react'

/** Supported property types for the properties panel */
export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'path'
  | 'vector3'
  | 'array'
  | 'object'
  | 'compute'

/** Preview types for path fields */
export type PathPreviewType = 'image' | 'sound' | 'model' | 'none'

/** Configuration for path-type fields */
export interface PathConfig {
  previewType: PathPreviewType
  filters?: Array<{ name: string; extensions: string[] }>
  suggestedFolder?: string
  pathPrefix?: string
}

/** Configuration for number-type fields */
export interface NumberConfig {
  min?: number
  max?: number
  step?: number
  unit?: string
}

/** Configuration for select-type fields */
export interface SelectConfig {
  options: Array<{ value: string; label: string }>
}

/** Configuration for array-type fields */
export interface ArrayConfig {
  itemSchema: PropertySchema
  minItems?: number
  maxItems?: number
}

/** Schema definition for a single property */
export interface PropertySchema {
  /** Dot-notation path to the property (e.g., 'FoodProperties.Nutrition') */
  key: string
  /** Display label for the property */
  label: string
  /** Property type determines the field renderer */
  type: PropertyType
  /** Optional description shown as tooltip */
  description?: string
  /** Default value when property is undefined */
  defaultValue?: unknown
  /** Whether this property is required */
  required?: boolean
  /** Whether this property is read-only */
  readOnly?: boolean
  /** Configuration for path-type fields */
  pathConfig?: PathConfig
  /** Configuration for number-type fields */
  numberConfig?: NumberConfig
  /** Configuration for select-type fields */
  selectConfig?: SelectConfig
  /** Configuration for array-type fields */
  arrayConfig?: ArrayConfig
  /** Schema for nested object properties */
  objectSchema?: PropertySchema[]
  /** Placeholder text for input fields */
  placeholder?: string
}

/** Section of related properties */
export interface PropertySection {
  /** Unique section identifier */
  id: string
  /** Section title displayed in the header */
  title: string
  /** Optional icon for the section */
  icon?: LucideIcon
  /** Properties within this section */
  properties: PropertySchema[]
  /** Whether section can be collapsed */
  collapsible?: boolean
  /** Whether section starts expanded */
  defaultExpanded?: boolean
  /** Conditional visibility based on data */
  condition?: (data: Record<string, unknown>) => boolean
}

/** Complete schema for an asset type */
export interface AssetSchema {
  /** Asset kind (item, block, entity, etc.) */
  kind: string
  /** Display name for the asset type */
  displayName: string
  /** Sections containing properties */
  sections: PropertySection[]
}

/** Props for field renderer components */
export interface FieldProps<T = unknown> {
  /** Current field value */
  value: T
  /** Callback when value changes */
  onChange: (value: T) => void
  /** Property schema with configuration */
  schema: PropertySchema
  /** Full dot-notation path to this property */
  path: string
  /** Whether the field is disabled */
  disabled?: boolean
  /** Root path of the mod for path resolution */
  modRoot?: string | null
}

/** Props for the property row component */
export interface PropertyRowProps {
  schema: PropertySchema
  value: unknown
  onChange: (value: unknown) => void
  path: string
  modRoot?: string | null
  isNested?: boolean
  nestingLevel?: number
}

/** Props for the property section component */
export interface PropertySectionProps {
  section: PropertySection
  data: Record<string, unknown>
  onChange: (path: string, value: unknown) => void
  modRoot?: string | null
  isExpanded?: boolean
  onToggle?: () => void
  searchFilter?: string
}

/** Props for the properties panel component */
export interface PropertiesPanelProps {
  data: Record<string, unknown>
  onChange: (path: string, value: unknown) => void
  schema?: AssetSchema
  modRoot?: string | null
  assetKind?: string
}

/** Result from binary file read IPC */
export interface ReadBinaryFileResult {
  success: boolean
  dataUrl?: string
  size?: number
  error?: string
}

/** Options for binary file read IPC */
export interface ReadBinaryFileOptions {
  filePath: string
  mimeType: string
  maxSizeBytes?: number
}
