'use client'

import { ScrollText, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { cn } from '@/lib/utils'
import type { EventLog as EventLogType } from '@/lib/drone-types'

const logIcons: Record<EventLogType['type'], React.ReactNode> = {
  info: <Info className="w-3 h-3" />,
  warning: <AlertTriangle className="w-3 h-3" />,
  error: <XCircle className="w-3 h-3" />,
  success: <CheckCircle className="w-3 h-3" />
}

const logStyles: Record<EventLogType['type'], string> = {
  info: 'text-primary',
  warning: 'text-warning',
  error: 'text-destructive',
  success: 'text-success'
}

export function EventLog() {
  const { eventLogs } = useDrone()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  return (
    <GlassPanel 
      title="Event Log" 
      icon={<ScrollText className="w-4 h-4" />}
    >
      <div className="h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="space-y-1">
          {eventLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No events recorded</p>
          ) : (
            eventLogs.map((log) => (
              <div 
                key={log.id}
                className="flex items-start gap-2 p-2 rounded bg-secondary/30 text-xs"
              >
                <span className={cn('mt-0.5', logStyles[log.type])}>
                  {logIcons[log.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground truncate">{log.message}</span>
                    <span className="text-muted-foreground font-mono shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GlassPanel>
  )
}
