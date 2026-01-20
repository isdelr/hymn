import type { AssetSchema } from '../types'

// Import schemas
import { itemSchema } from './itemSchema'
import { blockSchema } from './blockSchema'
import { entitySchema } from './entitySchema'

// Schema registry
const schemaRegistry: Record<string, AssetSchema> = {
  item: itemSchema,
  block: blockSchema,
  entity: entitySchema,
}

/**
 * Get predefined schema for an asset kind.
 * Returns undefined if no schema exists (will fall back to auto-generation).
 */
export function getSchemaForKind(kind: string): AssetSchema | undefined {
  return schemaRegistry[kind]
}

/**
 * Register a schema for an asset kind.
 */
export function registerSchema(schema: AssetSchema): void {
  schemaRegistry[schema.kind] = schema
}

// Export schemas for direct access
export { itemSchema } from './itemSchema'
export { blockSchema } from './blockSchema'
export { entitySchema } from './entitySchema'
