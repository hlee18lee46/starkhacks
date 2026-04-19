'use client'

import dynamic from 'next/dynamic'
import { HardwareStatusPanel } from './hardware-status-panel'
import { IMUDataPanel } from './imu-data-panel'
import { ButtonStatusPanel } from './button-status-panel'
import { GestureStatusPanel } from './gesture-status-panel'
import { TelemetryPanel } from './telemetry-panel'
import { SceneSelector } from './scene-selector'
import { ControlPanel } from './control-panel'
import { ControlInstructions } from './control-instructions'
import { EventLog } from './event-log'
import { Plane } from 'lucide-react'
import Link from "next/link"
// Dynamic import for the 3D viewport to avoid SSR issues
const DroneViewport = dynamic(
  () => import('./drone-viewport').then(mod => ({ default: mod.DroneViewport })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-xl border border-border/50 bg-card/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Initializing 3D Viewport...</p>
        </div>
      </div>
    )
  }
)

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Drone Command Center</h1>
            <p className="text-xs text-muted-foreground">Advanced Simulation Dashboard v1.0</p>
          </div>
        </div>
            <Link
      href="/scene"
      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
    >
      Inspection NFTScene
    </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">System Status:</span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Online
          </span>
        </div>
      </header>

      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 h-[calc(100vh-100px)]">
        {/* Left Panel */}
        <aside className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">
          <HardwareStatusPanel />
          <IMUDataPanel />
          <ButtonStatusPanel />
          <GestureStatusPanel />
          <TelemetryPanel />
        </aside>

        {/* Center - 3D Viewport */}
        <main className="h-full min-h-[400px]">
          <DroneViewport />
        </main>

        {/* Right Panel */}
        <aside className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pl-1">
          <ControlPanel />
          <SceneSelector />
          <ControlInstructions />
          <EventLog />
        </aside>
      </div>
    </div>
  )
}
