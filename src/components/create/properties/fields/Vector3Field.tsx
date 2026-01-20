import { memo, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { FieldProps } from '../types'

interface Vector3Value {
  X: number
  Y: number
  Z: number
}

/**
 * Coordinate input field for X, Y, Z values.
 * Displays three inline inputs with axis labels.
 */
export const Vector3Field = memo(function Vector3Field({
  value,
  onChange,
  disabled,
}: FieldProps<Vector3Value>) {
  const vectorValue: Vector3Value = useMemo(() => ({
    X: (value as Vector3Value)?.X ?? 0,
    Y: (value as Vector3Value)?.Y ?? 0,
    Z: (value as Vector3Value)?.Z ?? 0,
  }), [value])

  const handleAxisChange = useCallback(
    (axis: 'X' | 'Y' | 'Z', rawValue: string) => {
      const numValue = parseFloat(rawValue)
      if (isNaN(numValue)) return

      onChange({
        ...vectorValue,
        [axis]: numValue,
      })
    },
    [onChange, vectorValue]
  )

  const axisColors = {
    X: 'text-red-500',
    Y: 'text-green-500',
    Z: 'text-blue-500',
  }

  return (
    <div className="flex items-center gap-1">
      {(['X', 'Y', 'Z'] as const).map((axis) => (
        <div key={axis} className="flex items-center gap-0.5 flex-1">
          <span className={cn('text-xs font-bold w-3', axisColors[axis])}>
            {axis}
          </span>
          <input
            type="number"
            value={vectorValue[axis]}
            onChange={(e) => handleAxisChange(axis, e.target.value)}
            disabled={disabled}
            step="0.1"
            className={cn(
              'w-full h-8 px-1.5 rounded border bg-muted/30 text-sm text-center',
              'focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
        </div>
      ))}
    </div>
  )
})
