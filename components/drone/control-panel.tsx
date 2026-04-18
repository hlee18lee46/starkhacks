'use client'

import { Gamepad2, Rocket, CircleArrowDown, RotateCcw } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ControlPanel() {
  const { takeoff, land, resetDrone, droneState, triggerButton } = useDrone()

  const handleTakeoff = () => {
    takeoff()
    triggerButton('takeoff')
  }

  const handleLand = () => {
    land()
    triggerButton('land')
  }

  const handleReset = () => {
    resetDrone()
    triggerButton('reset')
  }

  return (
    <GlassPanel 
      title="Drone Controls" 
      icon={<Gamepad2 className="w-4 h-4" />}
    >
      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={handleTakeoff}
          disabled={droneState.isFlying}
          className={cn(
            'w-full gap-2 font-semibold transition-all',
            !droneState.isFlying && 'bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20'
          )}
        >
          <Rocket className="w-4 h-4" />
          Takeoff
        </Button>
        
        <Button
          onClick={handleLand}
          disabled={!droneState.isFlying}
          className={cn(
            'w-full gap-2 font-semibold transition-all',
            droneState.isFlying && 'bg-warning hover:bg-warning/90 text-warning-foreground shadow-lg shadow-warning/20'
          )}
        >
          <CircleArrowDown className="w-4 h-4" />
          Land
        </Button>
        
        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full gap-2 font-semibold border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Position
        </Button>
      </div>
    </GlassPanel>
  )
}
