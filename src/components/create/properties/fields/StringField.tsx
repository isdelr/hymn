import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

/**
 * Text input field for string properties.
 */
export const StringField = memo(function StringField({
  value,
  onChange,
  schema,
  disabled,
}: FieldProps<string>) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <input
      type="text"
      value={value ?? schema.defaultValue ?? ''}
      onChange={handleChange}
      disabled={disabled}
      placeholder={schema.placeholder}
      className={cn(
        'w-full h-8 px-2 rounded border bg-muted/30 text-sm',
        'focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'placeholder:text-muted-foreground/50'
      )}
    />
  )
})
