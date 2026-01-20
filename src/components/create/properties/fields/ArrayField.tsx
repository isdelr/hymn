import { memo, useCallback, useState, useMemo } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldProps, PropertySchema } from '../types'
import { getFieldComponent, inferPropertyType } from './index'

/**
 * Array field for managing lists of items.
 * Supports add/remove operations and renders appropriate fields for each item.
 */
export const ArrayField = memo(function ArrayField({
  value,
  onChange,
  schema,
  disabled,
  modRoot,
}: FieldProps<unknown[]>) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]))

  const arrayValue = useMemo(() => Array.isArray(value) ? value : [], [value])
  const itemSchema = schema.arrayConfig?.itemSchema
  const minItems = schema.arrayConfig?.minItems ?? 0
  const maxItems = schema.arrayConfig?.maxItems ?? Infinity

  const handleAdd = useCallback(() => {
    if (arrayValue.length >= maxItems) return

    // Create default item based on schema or type inference
    let defaultItem: unknown = ''
    if (itemSchema) {
      if (itemSchema.type === 'object' && itemSchema.objectSchema) {
        const obj: Record<string, unknown> = {}
        for (const prop of itemSchema.objectSchema) {
          obj[prop.key.split('.').pop()!] = prop.defaultValue ?? ''
        }
        defaultItem = obj
      } else {
        defaultItem = itemSchema.defaultValue ?? ''
      }
    }

    onChange([...arrayValue, defaultItem])
    // Auto-expand the new item
    setExpandedItems((prev) => new Set([...prev, arrayValue.length]))
  }, [arrayValue, maxItems, itemSchema, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      if (arrayValue.length <= minItems) return
      const newArray = arrayValue.filter((_, i) => i !== index)
      onChange(newArray)
    },
    [arrayValue, minItems, onChange]
  )

  const handleItemChange = useCallback(
    (index: number, newValue: unknown) => {
      const newArray = [...arrayValue]
      newArray[index] = newValue
      onChange(newArray)
    },
    [arrayValue, onChange]
  )

  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Infer item type if no schema provided
  const getItemSchema = useCallback(
    (item: unknown, index: number): PropertySchema => {
      if (itemSchema) return { ...itemSchema, key: `${index}` }

      const type = inferPropertyType(String(index), item)
      return {
        key: `${index}`,
        label: `Item ${index + 1}`,
        type,
      }
    },
    [itemSchema]
  )

  const canAdd = !disabled && arrayValue.length < maxItems
  const canRemove = !disabled && arrayValue.length > minItems

  return (
    <div className="space-y-1">
      {/* Items */}
      {arrayValue.map((item, index) => {
        const currentSchema = getItemSchema(item, index)
        const isComplex = currentSchema.type === 'object'
        const isExpanded = expandedItems.has(index)
        const ItemField = getFieldComponent(currentSchema.type)

        return (
          <div
            key={index}
            className={cn(
              'group border rounded-lg bg-muted/10 overflow-hidden',
              'hover:border-muted-foreground/30 transition-colors'
            )}
          >
            {/* Item Header */}
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1',
                isComplex && 'border-b cursor-pointer hover:bg-muted/20'
              )}
              onClick={isComplex ? () => toggleExpanded(index) : undefined}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />

              {isComplex && (
                <span className="text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </span>
              )}

              <span className="text-xs text-muted-foreground min-w-[40px]">
                #{index + 1}
              </span>

              {/* Inline field for simple types */}
              {!isComplex && (
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <ItemField
                    value={item}
                    onChange={(newValue) => handleItemChange(index, newValue)}
                    schema={currentSchema}
                    path={`${schema.key}.${index}`}
                    disabled={disabled}
                    modRoot={modRoot}
                  />
                </div>
              )}

              {/* Summary for complex types when collapsed */}
              {isComplex && !isExpanded && (
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {getItemSummary(item)}
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                disabled={!canRemove}
                className={cn(
                  'p-1 rounded hover:bg-destructive/10 transition-colors',
                  'text-muted-foreground hover:text-destructive',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                  'opacity-0 group-hover:opacity-100'
                )}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Expanded content for complex types */}
            {isComplex && isExpanded && (
              <div className="p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                {renderObjectFields(
                  item as Record<string, unknown>,
                  (key, newValue) => {
                    handleItemChange(index, {
                      ...(item as Record<string, unknown>),
                      [key]: newValue,
                    })
                  },
                  currentSchema.objectSchema,
                  `${schema.key}.${index}`,
                  disabled,
                  modRoot
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add button */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className={cn(
          'w-full py-1.5 border-2 border-dashed rounded-lg',
          'text-xs text-muted-foreground',
          'hover:border-primary hover:text-primary transition-colors',
          'flex items-center justify-center gap-1',
          'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-muted disabled:hover:text-muted-foreground'
        )}
      >
        <Plus className="h-3 w-3" />
        Add Item
      </button>
    </div>
  )
})

/**
 * Get a summary string for a complex item.
 */
function getItemSummary(item: unknown): string {
  if (typeof item !== 'object' || item === null) {
    return String(item)
  }

  const obj = item as Record<string, unknown>

  // Try common identifier fields
  if (obj.ItemId) return String(obj.ItemId)
  if (obj.Id) return String(obj.Id)
  if (obj.Name) return String(obj.Name)
  if (obj.EffectId) return String(obj.EffectId)

  // Fallback to key count
  const keys = Object.keys(obj)
  return `${keys.length} fields`
}

/**
 * Render fields for an object value.
 */
function renderObjectFields(
  obj: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void,
  objectSchema: PropertySchema[] | undefined,
  parentPath: string,
  disabled?: boolean,
  modRoot?: string | null
) {
  // If we have a schema, use it
  if (objectSchema) {
    return objectSchema.map((prop) => {
      const key = prop.key.split('.').pop()!
      const FieldComponent = getFieldComponent(prop.type)

      return (
        <div key={prop.key} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24 shrink-0">
            {prop.label}
          </span>
          <div className="flex-1">
            <FieldComponent
              value={obj[key]}
              onChange={(newValue) => onChange(key, newValue)}
              schema={prop}
              path={`${parentPath}.${key}`}
              disabled={disabled}
              modRoot={modRoot}
            />
          </div>
        </div>
      )
    })
  }

  // Otherwise, auto-generate fields from object keys
  return Object.entries(obj).map(([key, value]) => {
    const type = inferPropertyType(key, value)
    const FieldComponent = getFieldComponent(type)
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')

    return (
      <div key={key} className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
        <div className="flex-1">
          <FieldComponent
            value={value}
            onChange={(newValue) => onChange(key, newValue)}
            schema={{ key, label, type }}
            path={`${parentPath}.${key}`}
            disabled={disabled}
            modRoot={modRoot}
          />
        </div>
      </div>
    )
  })
}
