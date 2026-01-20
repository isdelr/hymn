import { memo, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertySearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Search input for filtering properties.
 * Positioned at the top of the properties panel.
 */
export const PropertySearchBar = memo(function PropertySearchBar({
  value,
  onChange,
  placeholder = 'Search properties...',
  className,
}: PropertySearchBarProps) {
  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-9 pr-8 rounded-lg border bg-muted/30',
          'text-sm placeholder:text-muted-foreground/60',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background',
          'transition-colors'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'p-0.5 rounded hover:bg-muted/50 transition-colors',
            'text-muted-foreground hover:text-foreground'
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})
