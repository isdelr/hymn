import { memo, useState, useCallback, useMemo } from 'react'
import { PropertySection } from './PropertySection'
import { PropertySearchBar } from './PropertySearchBar'
import { inferPropertyType } from './fields'
import type { PropertiesPanelProps, PropertySchema, PropertySection as PropertySectionType } from './types'

// Import schemas registry (will be populated in Phase 5)
import { getSchemaForKind } from './schemas'

/**
 * Generate a dynamic schema from data when no predefined schema exists.
 */
function generateSchemaFromData(data: Record<string, unknown>): PropertySectionType[] {
  const properties: PropertySchema[] = []

  function processValue(key: string, value: unknown, parentKey = ''): void {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    const type = inferPropertyType(key, value)

    // Create a human-readable label from the key
    const label = key
      .replace(/([A-Z])/g, ' $1') // Add space before caps
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    if (type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // For nested objects, create nested properties
      const nestedProperties: PropertySchema[] = []
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const nestedType = inferPropertyType(nestedKey, nestedValue)
        const nestedLabel = nestedKey
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')

        nestedProperties.push({
          key: `${fullKey}.${nestedKey}`,
          label: nestedLabel,
          type: nestedType,
        })
      }

      properties.push({
        key: fullKey,
        label,
        type: 'object',
        objectSchema: nestedProperties,
      })
    } else {
      properties.push({
        key: fullKey,
        label,
        type,
      })
    }
  }

  // Process top-level properties
  for (const [key, value] of Object.entries(data)) {
    processValue(key, value)
  }

  // Group properties into sections based on common prefixes or categories
  const sectionMap = new Map<string, PropertySchema[]>()

  for (const prop of properties) {
    // Determine section based on key structure
    const keyParts = prop.key.split('.')
    const sectionKey = keyParts.length > 1 ? keyParts[0] : 'General'

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, [])
    }
    sectionMap.get(sectionKey)!.push(prop)
  }

  // Convert to sections array
  const sections: PropertySectionType[] = []
  for (const [id, sectionProperties] of sectionMap) {
    const title = id
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    sections.push({
      id,
      title,
      properties: sectionProperties,
      collapsible: true,
      defaultExpanded: true,
    })
  }

  return sections
}

/**
 * Main properties panel component.
 * Renders a searchable, sectioned list of editable properties.
 */
export const PropertiesPanel = memo(function PropertiesPanel({
  data,
  onChange,
  schema,
  modRoot,
  assetKind,
}: PropertiesPanelProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Get or generate schema
  const effectiveSchema = useMemo(() => {
    if (schema) return schema

    // Try to get predefined schema for the asset kind
    if (assetKind) {
      const predefinedSchema = getSchemaForKind(assetKind)
      if (predefinedSchema) return predefinedSchema
    }

    // Fall back to generating schema from data
    return {
      kind: assetKind || 'unknown',
      displayName: assetKind || 'Properties',
      sections: generateSchemaFromData(data),
    }
  }, [schema, assetKind, data])

  // Initialize expanded sections from defaults (only once when schema changes)
  const initialExpandedSections = useMemo(() => {
    const expanded = new Set<string>()
    for (const section of effectiveSchema.sections) {
      if (section.defaultExpanded !== false) {
        expanded.add(section.id)
      }
    }
    return expanded
  }, [effectiveSchema.sections])

  // Use the initial expanded sections if user hasn't explicitly toggled anything
  const [hasUserToggled, setHasUserToggled] = useState(false)
  const activeExpandedSections = hasUserToggled ? expandedSections : initialExpandedSections

  // Track which sections are expanded
  const isSectionExpanded = useCallback(
    (sectionId: string, defaultExpanded?: boolean) => {
      if (!hasUserToggled) {
        return defaultExpanded ?? true
      }
      return activeExpandedSections.has(sectionId)
    },
    [activeExpandedSections, hasUserToggled]
  )

  const toggleSection = useCallback((sectionId: string) => {
    if (!hasUserToggled) {
      // First toggle - initialize from defaults and then toggle
      const next = new Set(initialExpandedSections)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      setExpandedSections(next)
      setHasUserToggled(true)
    } else {
      setExpandedSections((prev) => {
        const next = new Set(prev)
        if (next.has(sectionId)) {
          next.delete(sectionId)
        } else {
          next.add(sectionId)
        }
        return next
      })
    }
  }, [hasUserToggled, initialExpandedSections])

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b">
        <PropertySearchBar
          value={searchFilter}
          onChange={setSearchFilter}
        />
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {effectiveSchema.sections.map((section) => (
          <PropertySection
            key={section.id}
            section={section}
            data={data}
            onChange={onChange}
            modRoot={modRoot}
            isExpanded={isSectionExpanded(section.id, section.defaultExpanded)}
            onToggle={() => toggleSection(section.id)}
            searchFilter={searchFilter}
          />
        ))}

        {/* Empty state when no sections match filter */}
        {effectiveSchema.sections.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No properties to display</p>
          </div>
        )}
      </div>
    </div>
  )
})
