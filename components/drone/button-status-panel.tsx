'use client'

import { CircleDot } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { cn } from '@/lib/utils'

export function ButtonStatusPanel() {
  const { buttonState } = useDrone()

  const buttons = [
    { key: 'takeoff' as const, label: 'Takeoff', color: 'bg-success' },
    { key: 'land' as const, label: 'Land', color: 'bg-warning' },
    { key: 'reset' as const, label: 'Reset', color: 'bg-destructive' },
    { key: 'sceneSwitch' as const, label: 'Scene', color: 'bg-primary' }
  ]

  return (
    <GlassPanel 
      title="Button Status" 
      icon={<CircleDot className="w-4 h-4" />}
    >
      <div className="grid grid-cols-2 gap-2">
        {buttons.map(({ key, label, color }) => (
          <div 
            key={key}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border transition-all duration-150',
              buttonState[key] 
                ? `${color}/20 border-2` 
                : 'bg-secondary/30 border-border/50'
            )}
          >
            <div className={cn(
              'w-3 h-3 rounded-full transition-all duration-150',
              buttonState[key] 
                ? `${color} shadow-lg shadow-${color}/50` 
                : 'bg-muted-foreground/30'
            )} />
            <span className={cn(
              'text-xs font-medium transition-colors',
              buttonState[key] ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
