'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'running' | 'paused' | 'stopped' | 'warning'
  label: string
  pulse?: boolean
}

const statusStyles = {
  connected: 'bg-success/20 text-success border-success/30',
  running: 'bg-success/20 text-success border-success/30',
  disconnected: 'bg-muted text-muted-foreground border-border',
  stopped: 'bg-muted text-muted-foreground border-border',
  paused: 'bg-warning/20 text-warning border-warning/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  error: 'bg-destructive/20 text-destructive border-destructive/30'
}

const dotStyles = {
  connected: 'bg-success',
  running: 'bg-success',
  disconnected: 'bg-muted-foreground',
  stopped: 'bg-muted-foreground',
  paused: 'bg-warning',
  warning: 'bg-warning',
  error: 'bg-destructive'
}

export function StatusBadge({ status, label, pulse = true }: StatusBadgeProps) {
  const shouldPulse = pulse && (status === 'connected' || status === 'running')
  
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm',
      statusStyles[status]
    )}>
      <span className="relative flex h-2 w-2">
        {shouldPulse && (
          <span className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            dotStyles[status]
          )} />
        )}
        <span className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          dotStyles[status]
        )} />
      </span>
      {label}
    </div>
  )
}
