import { cn } from '@/lib/utils'

interface WarningBoxProps {
  title: string
  warnings: string[]
  className?: string
  variant?: 'default' | 'error'
}

export function WarningBox({ title, warnings, className, variant = 'default' }: WarningBoxProps) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed p-3 text-xs',
        variant === 'error'
          ? 'border-destructive/60 bg-destructive/10'
          : 'border-border/60 bg-muted/30',
        className,
      )}
    >
      <p className="font-medium text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        {warnings.map((warning) => (
          <li key={warning} className="leading-relaxed">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  )
}
