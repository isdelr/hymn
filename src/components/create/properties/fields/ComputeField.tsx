import { memo } from 'react'
import { Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

interface ComputeValue {
  Compute: string
}

/**
 * Read-only field for computed values.
 * Displays the compute expression with a calculator icon.
 */
export const ComputeField = memo(function ComputeField({
  value,
}: FieldProps<ComputeValue | unknown>) {
  // Handle compute object format
  const computeExpression =
    value && typeof value === 'object' && 'Compute' in value
      ? (value as ComputeValue).Compute
      : String(value ?? '—')

  return (
    <div
      className={cn(
        'flex items-center gap-2 h-8 px-2 rounded border bg-muted/10',
        'text-sm text-muted-foreground'
      )}
    >
      <Calculator className="h-3.5 w-3.5 shrink-0 text-primary/60" />
      <span className="truncate font-mono text-xs">{computeExpression}</span>
    </div>
  )
})
