import { memo, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PropertyRow } from './PropertyRow'
import type { PropertySectionProps, PropertySchema } from './types'

/**
 * Get a value from an object using dot-notation path.
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/**
 * Check if a property matches the search filter.
 */
function propertyMatchesFilter(schema: PropertySchema, filter: string): boolean {
  if (!filter) return true
  const lowerFilter = filter.toLowerCase()

  // Match against label
  if (schema.label.toLowerCase().includes(lowerFilter)) return true

  // Match against key
  if (schema.key.toLowerCase().includes(lowerFilter)) return true

  // Match against description
  if (schema.description?.toLowerCase().includes(lowerFilter)) return true

  // For object types, check nested properties
  if (schema.objectSchema) {
    return schema.objectSchema.some((nested) => propertyMatchesFilter(nested, filter))
  }

  return false
}

/**
 * Collapsible section containing related properties.
 * Supports search filtering and conditional visibility.
 */
export const PropertySection = memo(function PropertySection({
  section,
  data,
  onChange,
  modRoot,
  isExpanded: controlledExpanded,
  onToggle,
  searchFilter = '',
}: PropertySectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(
    section.defaultExpanded ?? true
  )

  const isExpanded = controlledExpanded ?? internalExpanded
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded((prev) => !prev)
    }
  }, [onToggle])

  // Check if section should be visible based on condition
  if (section.condition && !section.condition(data)) {
    return null
  }

  // Filter properties based on search
  const visibleProperties = searchFilter
    ? section.properties.filter((prop) => propertyMatchesFilter(prop, searchFilter))
    : section.properties

  // Don't render section if no properties match the filter
  if (visibleProperties.length === 0) {
    return null
  }

  const Icon = section.icon

  return (
    <div className="border-b border-muted/30 last:border-b-0">
      {/* Section Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!section.collapsible}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'hover:bg-muted/20 transition-colors',
          section.collapsible && 'cursor-pointer',
          !section.collapsible && 'cursor-default'
        )}
      >
        {section.collapsible && (
          <span className="text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
        {Icon && (
          <span className="text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-sm font-medium">{section.title}</span>
        {!isExpanded && visibleProperties.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {visibleProperties.length} {visibleProperties.length === 1 ? 'property' : 'properties'}
          </span>
        )}
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-0.5">
          {visibleProperties.map((property) => (
            <PropertyRow
              key={property.key}
              schema={property}
              value={getValueByPath(data, property.key)}
              onChange={(value) => onChange(property.key, value)}
              path={property.key}
              modRoot={modRoot}
            />
          ))}
        </div>
      )}
    </div>
  )
})
