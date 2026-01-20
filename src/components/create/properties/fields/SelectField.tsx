import { memo, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

/**
 * Dropdown select field for enum/choice properties.
 */
export const SelectField = memo(function SelectField({
  value,
  onChange,
  schema,
  disabled,
}: FieldProps<string>) {
  const options = schema.selectConfig?.options ?? []
  const currentValue = value ?? schema.defaultValue ?? ''

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className="relative">
      <select
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'w-full h-8 pl-2 pr-8 rounded border bg-muted/30 text-sm',
          'appearance-none cursor-pointer',
          'focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background',
          'transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4',
          'text-muted-foreground pointer-events-none'
        )}
      />
    </div>
  )
})
