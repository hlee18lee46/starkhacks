'use client'

import { useGame } from '@/lib/game-state'
import { useDrone } from '@/lib/drone-context'
import { cn } from '@/lib/utils'
import { Target, Timer, Trophy, Zap, AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
}

export function GameHUD() {
  const { gameState, startGame, pauseGame, resumeGame, resetGame } = useGame()
  const { droneState } = useDrone()
  
  const totalWaypoints = gameState.waypoints.length
  const remainingTargets = gameState.waypoints.filter(wp => !wp.collected && wp.type === 'target').length
  const remainingCheckpoints = gameState.waypoints.filter(wp => !wp.collected && wp.type === 'checkpoint').length
  
  return (
    <>
      {/* Top HUD Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
        {/* Score */}
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-primary/30 rounded-lg px-4 py-2">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="text-xl font-bold font-mono text-primary">{gameState.score.toLocaleString()}</span>
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2">
          <Timer className="w-5 h-5 text-foreground" />
          <span className="text-xl font-bold font-mono text-foreground">{formatTime(gameState.timeElapsed)}</span>
        </div>
        
        {/* Waypoints remaining */}
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-chart-2/30 rounded-lg px-4 py-2">
          <Target className="w-5 h-5 text-chart-2" />
          <span className="text-lg font-bold font-mono text-chart-2">
            {gameState.waypointsCollected}/{totalWaypoints}
          </span>
        </div>
      </div>
      
      {/* Speed indicator - left side */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 w-24">
          <div className="text-xs text-muted-foreground mb-1">SPEED</div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {droneState.speed.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">m/s</div>
          
          <div className="mt-3 h-32 relative bg-secondary rounded overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-chart-2 to-primary transition-all duration-100"
              style={{ height: `${Math.min(100, droneState.speed * 20)}%` }}
            />
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              {[5, 4, 3, 2, 1, 0].map(n => (
                <div key={n} className="flex items-center gap-1 px-1">
                  <div className="w-2 h-px bg-foreground/30" />
                  <span className="text-[8px] text-foreground/50">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Altitude indicator - right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 w-24">
          <div className="text-xs text-muted-foreground mb-1">ALT</div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {droneState.altitude.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">meters</div>
          
          <div className="mt-3 h-32 relative bg-secondary rounded overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-chart-3 transition-all duration-100"
              style={{ height: `${Math.min(100, droneState.altitude * 2)}%` }}
            />
            <div className="absolute inset-0 flex flex-col justify-between py-1">
              {[50, 40, 30, 20, 10, 0].map(n => (
                <div key={n} className="flex items-center justify-end gap-1 px-1">
                  <span className="text-[8px] text-foreground/50">{n}</span>
                  <div className="w-2 h-px bg-foreground/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Collision warning */}
      {gameState.collisions > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-destructive/20 backdrop-blur-sm border border-destructive/50 rounded-lg px-4 py-2 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Collisions: {gameState.collisions}</span>
          </div>
        </div>
      )}
      
      {/* Objectives panel - bottom left */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 min-w-48">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <Zap className="w-3 h-3" /> OBJECTIVES
          </div>
          <div className="space-y-1">
            {remainingTargets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-foreground">Targets: {remainingTargets} remaining</span>
              </div>
            )}
            {remainingCheckpoints > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-foreground">Checkpoints: {remainingCheckpoints} remaining</span>
              </div>
            )}
            {remainingTargets === 0 && remainingCheckpoints === 0 && totalWaypoints > 0 && (
              <div className="text-sm text-chart-2 font-medium">All objectives complete!</div>
            )}
          </div>
          {gameState.bestTime && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">Best Time</div>
              <div className="text-sm font-mono text-chart-4">{formatTime(gameState.bestTime)}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Game controls - bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-2">
          {!gameState.isPlaying ? (
            <Button 
              onClick={startGame} 
              size="sm" 
              className="gap-2 bg-chart-2 hover:bg-chart-2/80 text-chart-2-foreground"
            >
              <Play className="w-4 h-4" />
              Start Game
            </Button>
          ) : (
            <Button 
              onClick={gameState.isPaused ? resumeGame : pauseGame} 
              size="sm" 
              variant="outline"
              className="gap-2"
            >
              {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {gameState.isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}
          <Button onClick={resetGame} size="sm" variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>
      
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <div className="relative w-16 h-16">
          <div className="absolute top-1/2 left-0 w-5 h-0.5 bg-primary/50 -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-5 h-0.5 bg-primary/50 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-0.5 h-5 bg-primary/50 -translate-x-1/2" />
          <div className="absolute left-1/2 bottom-0 w-0.5 h-5 bg-primary/50 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 border-2 border-primary rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
      
      {/* Compass */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative w-20 h-20 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2">
          <div 
            className="w-full h-full relative"
            style={{ transform: `rotate(${-droneState.rotation.yaw}deg)` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-bold text-destructive">N</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">S</div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">W</div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">E</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-destructive to-foreground/30 rounded-full origin-bottom" 
              style={{ transform: 'translateY(-50%)' }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
