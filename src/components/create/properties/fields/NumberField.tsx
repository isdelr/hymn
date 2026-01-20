import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

/**
 * Numeric input field with optional min/max/step and unit display.
 */
export const NumberField = memo(function NumberField({
  value,
  onChange,
  schema,
  disabled,
}: FieldProps<number>) {
  const config = schema.numberConfig
  const min = config?.min
  const max = config?.max
  const step = config?.step ?? 1
  const unit = config?.unit

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      if (rawValue === '' || rawValue === '-') {
        // Allow empty or negative sign while typing
        return
      }

      const numValue = parseFloat(rawValue)
      if (!isNaN(numValue)) {
        onChange(numValue)
      }
    },
    [onChange]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      if (rawValue === '' || rawValue === '-') {
        // Reset to default or 0 on blur if empty
        onChange(schema.defaultValue as number ?? 0)
        return
      }

      let numValue = parseFloat(rawValue)
      if (isNaN(numValue)) {
        numValue = schema.defaultValue as number ?? 0
      }

      // Clamp to min/max if specified
      if (min !== undefined && numValue < min) numValue = min
      if (max !== undefined && numValue > max) numValue = max

      onChange(numValue)
    },
    [onChange, min, max, schema.defaultValue]
  )

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? schema.defaultValue ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        placeholder={schema.placeholder}
        className={cn(
          'w-full h-8 px-2 rounded border bg-muted/30 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background',
          'transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'placeholder:text-muted-foreground/50',
          // Hide spinners for cleaner look
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
      />
      {unit && (
        <span className="text-xs text-muted-foreground shrink-0">{unit}</span>
      )}
    </div>
  )
})
