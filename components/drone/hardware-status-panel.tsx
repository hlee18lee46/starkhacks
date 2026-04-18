'use client'

import { Cpu, Radio, Zap } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { StatusBadge } from './status-badge'

export function HardwareStatusPanel() {
  const { connectionStatus, inputSource } = useDrone()

  return (
    <GlassPanel 
      title="Hardware Status" 
      icon={<Cpu className="w-4 h-4" />}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">IMU Sensor</span>
          </div>
          <StatusBadge status={connectionStatus.imu} label={connectionStatus.imu} />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Push Buttons</span>
          </div>
          <StatusBadge status={connectionStatus.buttons} label={connectionStatus.buttons} />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Simulation</span>
          </div>
          <StatusBadge status={connectionStatus.simulation} label={connectionStatus.simulation} />
        </div>

        <div className="pt-2 mt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Input Source</span>
            <span className="text-xs font-mono text-primary">{inputSource.type.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
