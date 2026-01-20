import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

/**
 * Toggle switch for boolean properties.
 */
export const BooleanField = memo(function BooleanField({
  value,
  onChange,
  schema,
  disabled,
}: FieldProps<boolean>) {
  const isChecked = value ?? (schema.defaultValue as boolean) ?? false

  const handleChange = useCallback(() => {
    onChange(!isChecked)
  }, [onChange, isChecked])

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={handleChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent',
        'transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isChecked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-sm',
          'ring-0 transition-transform',
          isChecked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
})
