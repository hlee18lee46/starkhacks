'use client'

import { Gauge, ArrowUp, Battery, Plane } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { TelemetryCard } from './telemetry-card'
import { StatusBadge } from './status-badge'
import { cn } from '@/lib/utils'

export function TelemetryPanel() {
  const { droneState } = useDrone()

  return (
    <GlassPanel 
      title="Drone Telemetry" 
      icon={<Plane className="w-4 h-4" />}
      glow
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Flight Status</span>
          <StatusBadge 
            status={droneState.isFlying ? 'running' : 'stopped'} 
            label={droneState.isFlying ? 'Airborne' : 'Grounded'} 
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TelemetryCard 
            label="Altitude" 
            value={droneState.altitude} 
            unit="m"
            icon={<ArrowUp className="w-4 h-4" />}
          />
          <TelemetryCard 
            label="Speed" 
            value={droneState.speed} 
            unit="m/s"
            icon={<Gauge className="w-4 h-4" />}
          />
        </div>

        {/* Battery indicator */}
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Battery className={cn(
                'w-4 h-4',
                droneState.batteryLevel > 50 ? 'text-success' :
                droneState.batteryLevel > 20 ? 'text-warning' : 'text-destructive'
              )} />
              <span className="text-xs text-muted-foreground">Battery</span>
            </div>
            <span className={cn(
              'text-sm font-mono font-bold',
              droneState.batteryLevel > 50 ? 'text-success' :
              droneState.batteryLevel > 20 ? 'text-warning' : 'text-destructive'
            )}>
              {droneState.batteryLevel.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                droneState.batteryLevel > 50 ? 'bg-success' :
                droneState.batteryLevel > 20 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${droneState.batteryLevel}%` }}
            />
          </div>
        </div>

        {/* Position display */}
        <div className="pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Position (m)</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-secondary/30">
              <div className="text-xs text-primary">X</div>
              <div className="font-mono text-sm text-foreground">{droneState.position.x.toFixed(1)}</div>
            </div>
            <div className="p-2 rounded bg-secondary/30">
              <div className="text-xs text-primary">Y</div>
              <div className="font-mono text-sm text-foreground">{droneState.position.y.toFixed(1)}</div>
            </div>
            <div className="p-2 rounded bg-secondary/30">
              <div className="text-xs text-primary">Z</div>
              <div className="font-mono text-sm text-foreground">{droneState.position.z.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
