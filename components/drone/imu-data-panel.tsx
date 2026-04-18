'use client'

import { Compass, Activity } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { TelemetryCard } from './telemetry-card'

export function IMUDataPanel() {
  const { imuData } = useDrone()

  return (
    <GlassPanel 
      title="IMU Data" 
      icon={<Compass className="w-4 h-4" />}
    >
      <div className="grid grid-cols-2 gap-2">
        <TelemetryCard 
          label="Pitch" 
          value={imuData.pitch} 
          unit="°"
          warning={Math.abs(imuData.pitch) > 30}
          critical={Math.abs(imuData.pitch) > 45}
        />
        <TelemetryCard 
          label="Roll" 
          value={imuData.roll} 
          unit="°"
          warning={Math.abs(imuData.roll) > 30}
          critical={Math.abs(imuData.roll) > 45}
        />
        <TelemetryCard 
          label="Yaw" 
          value={imuData.yaw} 
          unit="°"
        />
        <TelemetryCard 
          label="Accel Z" 
          value={imuData.accelZ} 
          unit="m/s²"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">X</div>
            <div className="font-mono text-sm text-foreground">{imuData.accelX.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Y</div>
            <div className="font-mono text-sm text-foreground">{imuData.accelY.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Z</div>
            <div className="font-mono text-sm text-foreground">{imuData.accelZ.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
