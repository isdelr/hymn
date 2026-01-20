import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { PropertyRowProps, PropertyType } from './types'

// Field components - use registry to render the right field
import {
  StringField,
  NumberField,
  BooleanField,
  SelectField,
  ComputeField,
  PathField,
  Vector3Field,
  ArrayField,
  ObjectField,
} from './fields'

const LABEL_WIDTH = 140
const INDENT_SIZE = 16

/**
 * Single property row with label and field.
 * Unity-style compact layout with fixed-width labels.
 */
export const PropertyRow = memo(function PropertyRow({
  schema,
  value,
  onChange,
  path,
  modRoot,
  isNested = false,
  nestingLevel = 0,
}: PropertyRowProps) {
  const indent = nestingLevel * INDENT_SIZE

  // Render field based on type - memoized to avoid recreation
  const fieldElement = useMemo(() => {
    const fieldProps = {
      value,
      onChange,
      schema,
      path,
      disabled: schema.readOnly,
      modRoot,
    }

    switch (schema.type) {
      case 'string':
        return <StringField {...fieldProps} />
      case 'number':
        return <NumberField {...fieldProps} />
      case 'boolean':
        return <BooleanField {...fieldProps} />
      case 'select':
        return <SelectField {...fieldProps} />
      case 'compute':
        return <ComputeField {...fieldProps} />
      case 'path':
        return <PathField {...fieldProps} />
      case 'vector3':
        return <Vector3Field {...fieldProps} />
      case 'array':
        return <ArrayField {...fieldProps} />
      case 'object':
        return <ObjectField {...fieldProps} />
      default:
        return <StringField {...fieldProps} />
    }
  }, [value, onChange, schema, path, modRoot])

  return (
    <div
      className={cn(
        'group flex items-start gap-2 min-h-[32px] py-1 px-2 -mx-2 rounded transition-colors',
        'hover:bg-muted/30',
        isNested && 'border-l border-muted/50'
      )}
      style={{ paddingLeft: indent + 8 }}
    >
      {/* Label */}
      <div
        className="shrink-0 flex items-center h-8"
        style={{ width: LABEL_WIDTH - indent }}
      >
        <label
          className={cn(
            'text-xs text-muted-foreground truncate',
            schema.required && "after:content-['*'] after:text-destructive after:ml-0.5"
          )}
          title={schema.description || schema.label}
        >
          {schema.label}
        </label>
      </div>

      {/* Field */}
      <div className="flex-1 min-w-0">
        {fieldElement}
      </div>
    </div>
  )
})

/**
 * Get the display value for a property (used for computed fields)
 */
export function getDisplayValue(value: unknown, type: PropertyType): string {
  if (value === undefined || value === null) return '—'

  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'number':
      return String(value)
    case 'string':
      return String(value) || '—'
    case 'compute':
      if (typeof value === 'object' && 'Compute' in value) {
        return `Computed: ${(value as { Compute: string }).Compute}`
      }
      return String(value)
    case 'array':
      return Array.isArray(value) ? `${value.length} items` : '—'
    case 'object':
      return typeof value === 'object' ? 'Object' : '—'
    default:
      return String(value)
  }
}
