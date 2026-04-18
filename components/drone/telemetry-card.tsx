'use client'

import { cn } from '@/lib/utils'

interface TelemetryCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  warning?: boolean
  critical?: boolean
}

export function TelemetryCard({ label, value, unit, icon, warning, critical }: TelemetryCardProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border transition-colors',
      critical ? 'bg-destructive/10 border-destructive/30' :
      warning ? 'bg-warning/10 border-warning/30' :
      'bg-secondary/50 border-border/50'
    )}>
      <div className="flex items-center gap-2">
        {icon && (
          <span className={cn(
            'text-lg',
            critical ? 'text-destructive' :
            warning ? 'text-warning' :
            'text-primary'
          )}>
            {icon}
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'font-mono text-lg font-bold',
          critical ? 'text-destructive' :
          warning ? 'text-warning' :
          'text-foreground'
        )}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}
