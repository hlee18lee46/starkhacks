'use client'

import { Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react'
import { GlassPanel } from './glass-panel'

export function ControlInstructions() {
  const flightControls = [
    { keys: ['W', 'S'], action: 'Pitch Fwd/Back', icon: <ArrowUp className="w-3 h-3" /> },
    { keys: ['A', 'D'], action: 'Roll Left/Right', icon: <ArrowLeft className="w-3 h-3" /> },
    { keys: ['Q', 'E'], action: 'Yaw Left/Right', icon: <RotateCw className="w-3 h-3" /> },
    { keys: ['R', 'F'], action: 'Climb/Descend', icon: <ArrowUp className="w-3 h-3" /> },
  ]
  
  const systemControls = [
    { keys: ['Space'], action: 'Takeoff' },
    { keys: ['Shift'], action: 'Land' },
    { keys: ['1', '2', '3'], action: 'Switch Scene' },
  ]

  return (
    <GlassPanel 
      title="Keyboard Controls" 
      icon={<Info className="w-4 h-4" />}
    >
      <div className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-2">Flight</div>
          <div className="space-y-1.5">
            {flightControls.map((control, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  {control.keys.map((key, i) => (
                    <span key={i}>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border/50 text-foreground">
                        {key}
                      </kbd>
                      {i < control.keys.length - 1 && <span className="text-muted-foreground mx-0.5">/</span>}
                    </span>
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">{control.action}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/30">
          <div className="text-xs text-muted-foreground mb-2">System</div>
          <div className="space-y-1.5">
            {systemControls.map((control, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  {control.keys.map((key, i) => (
                    <span key={i}>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border/50 text-foreground">
                        {key}
                      </kbd>
                      {i < control.keys.length - 1 && <span className="text-muted-foreground mx-0.5">/</span>}
                    </span>
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">{control.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Collect waypoints to earn points. Camera modes: Follow, FPV, Top, Orbit.
        </p>
      </div>
    </GlassPanel>
  )
}
