'use client'

import { Hand } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { cn } from '@/lib/utils'

export function GestureStatusPanel() {
  const { gestureStatus } = useDrone()

  return (
    <GlassPanel 
      title="Gesture Recognition" 
      icon={<Hand className="w-4 h-4" />}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className={cn(
            'text-sm font-medium',
            gestureStatus.detected ? 'text-success' : 'text-muted-foreground'
          )}>
            {gestureStatus.detected ? 'Active' : 'Idle'}
          </span>
        </div>
        
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Detected Gesture</div>
          <div className="text-lg font-semibold text-primary">{gestureStatus.gesture}</div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <span className="text-xs font-mono text-foreground">
              {(gestureStatus.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                gestureStatus.confidence > 0.8 ? 'bg-success' :
                gestureStatus.confidence > 0.5 ? 'bg-warning' : 'bg-muted-foreground'
              )}
              style={{ width: `${gestureStatus.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
