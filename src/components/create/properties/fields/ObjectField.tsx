import { memo, useCallback, useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'
import { getFieldComponent, inferPropertyType } from './index'

/**
 * Collapsible field for nested object properties.
 */
export const ObjectField = memo(function ObjectField({
  value,
  onChange,
  schema,
  path,
  disabled,
  modRoot,
}: FieldProps<Record<string, unknown>>) {
  const [isExpanded, setIsExpanded] = useState(true)

  const objectValue = useMemo(
    () => (typeof value === 'object' && value !== null && !Array.isArray(value))
      ? value as Record<string, unknown>
      : {},
    [value]
  )

  const handleFieldChange = useCallback(
    (key: string, newValue: unknown) => {
      onChange({
        ...objectValue,
        [key]: newValue,
      })
    },
    [objectValue, onChange]
  )

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Use schema if available, otherwise infer from object
  const properties = schema.objectSchema ?? Object.keys(objectValue).map((key) => {
    const propValue = objectValue[key]
    const type = inferPropertyType(key, propValue)
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')

    return { key, label, type }
  })

  return (
    <div className="space-y-1">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className={cn(
          'flex items-center gap-1 w-full py-1 px-2 -mx-2',
          'text-xs text-muted-foreground',
          'hover:bg-muted/30 rounded transition-colors'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="font-medium">{schema.label}</span>
        {!isExpanded && (
          <span className="ml-auto text-muted-foreground/60">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </span>
        )}
      </button>

      {/* Nested properties */}
      {isExpanded && (
        <div className="pl-4 border-l border-muted/50 space-y-0.5">
          {properties.map((prop) => {
            // Extract the simple key from potentially dot-notated keys
            const simpleKey = prop.key.includes('.') ? prop.key.split('.').pop()! : prop.key
            const FieldComponent = getFieldComponent(prop.type)

            return (
              <div key={prop.key} className="flex items-start gap-2 py-1">
                <span className="text-xs text-muted-foreground w-28 shrink-0 pt-1.5">
                  {prop.label}
                </span>
                <div className="flex-1">
                  <FieldComponent
                    value={objectValue[simpleKey]}
                    onChange={(newValue) => handleFieldChange(simpleKey, newValue)}
                    schema={prop}
                    path={`${path}.${simpleKey}`}
                    disabled={disabled}
                    modRoot={modRoot}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
