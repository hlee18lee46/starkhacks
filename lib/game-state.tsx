'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

export interface Waypoint {
  id: string
  position: [number, number, number]
  collected: boolean
  type: 'checkpoint' | 'target' | 'bonus'
}

export interface Obstacle {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  type: 'static' | 'moving'
}

export interface GameState {
  score: number
  waypoints: Waypoint[]
  timeElapsed: number
  isPlaying: boolean
  isPaused: boolean
  gameMode: 'freefly' | 'checkpoint' | 'inspection'
  difficulty: 'easy' | 'medium' | 'hard'
  collisions: number
  waypointsCollected: number
  bestTime: number | null
}

interface GameContextType {
  gameState: GameState
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  collectWaypoint: (id: string) => void
  addScore: (points: number) => void
  registerCollision: () => void
  setGameMode: (mode: GameState['gameMode']) => void
  setDifficulty: (diff: GameState['difficulty']) => void
  generateWaypoints: (scene: string) => void
}

const initialGameState: GameState = {
  score: 0,
  waypoints: [],
  timeElapsed: 0,
  isPlaying: false,
  isPaused: false,
  gameMode: 'freefly',
  difficulty: 'medium',
  collisions: 0,
  waypointsCollected: 0,
  bestTime: null
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const generateWaypoints = useCallback((scene: string) => {
    const waypointConfigs: Record<string, Array<{ pos: [number, number, number], type: Waypoint['type'] }>> = {
      urban: [
        { pos: [0, 15, 0], type: 'checkpoint' },
        { pos: [-15, 20, -15], type: 'checkpoint' },
        { pos: [15, 25, -20], type: 'checkpoint' },
        { pos: [-20, 12, 10], type: 'checkpoint' },
        { pos: [20, 18, 15], type: 'checkpoint' },
        { pos: [0, 35, -30], type: 'target' },
        { pos: [-10, 22, 25], type: 'bonus' },
        { pos: [10, 28, 30], type: 'bonus' },
      ],
      warehouse: [
        { pos: [0, 6, 0], type: 'checkpoint' },
        { pos: [-12, 8, -12], type: 'checkpoint' },
        { pos: [12, 8, -12], type: 'checkpoint' },
        { pos: [-12, 8, 12], type: 'checkpoint' },
        { pos: [12, 8, 12], type: 'checkpoint' },
        { pos: [0, 10, 0], type: 'target' },
        { pos: [-5, 5, -10], type: 'bonus' },
        { pos: [5, 5, 10], type: 'bonus' },
      ],
      emergency: [
        { pos: [-10, 8, 20], type: 'target' },
        { pos: [15, 8, -18], type: 'target' },
        { pos: [-20, 12, -15], type: 'checkpoint' },
        { pos: [15, 10, -20], type: 'checkpoint' },
        { pos: [20, 8, 10], type: 'checkpoint' },
        { pos: [0, 15, -30], type: 'checkpoint' },
        { pos: [-8, 5, 5], type: 'bonus' },
        { pos: [5, 5, 8], type: 'bonus' },
      ]
    }

    const config = waypointConfigs[scene] || waypointConfigs.urban
    const waypoints: Waypoint[] = config.map((wp, i) => ({
      id: `wp-${i}`,
      position: wp.pos,
      collected: false,
      type: wp.type
    }))

    setGameState(prev => ({ ...prev, waypoints }))
  }, [])

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      timeElapsed: 0,
      score: 0,
      collisions: 0,
      waypointsCollected: 0,
      waypoints: prev.waypoints.map(wp => ({ ...wp, collected: false }))
    }))
  }, [])

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true }))
  }, [])

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...initialGameState,
      waypoints: prev.waypoints.map(wp => ({ ...wp, collected: false })),
      gameMode: prev.gameMode,
      difficulty: prev.difficulty
    }))
  }, [])

  const collectWaypoint = useCallback((id: string) => {
    setGameState(prev => {
      const waypoint = prev.waypoints.find(wp => wp.id === id)
      if (!waypoint || waypoint.collected) return prev

      const points = waypoint.type === 'target' ? 500 : waypoint.type === 'bonus' ? 200 : 100
      const newWaypoints = prev.waypoints.map(wp =>
        wp.id === id ? { ...wp, collected: true } : wp
      )
      
      const allCollected = newWaypoints.every(wp => wp.collected)
      
      return {
        ...prev,
        waypoints: newWaypoints,
        score: prev.score + points,
        waypointsCollected: prev.waypointsCollected + 1,
        isPlaying: !allCollected,
        bestTime: allCollected && (!prev.bestTime || prev.timeElapsed < prev.bestTime)
          ? prev.timeElapsed
          : prev.bestTime
      }
    })
  }, [])

  const addScore = useCallback((points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }))
  }, [])

  const registerCollision = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      collisions: prev.collisions + 1,
      score: Math.max(0, prev.score - 10)
    }))
  }, [])

  const setGameMode = useCallback((mode: GameState['gameMode']) => {
    setGameState(prev => ({ ...prev, gameMode: mode }))
  }, [])

  const setDifficulty = useCallback((difficulty: GameState['difficulty']) => {
    setGameState(prev => ({ ...prev, difficulty }))
  }, [])

  // Game timer
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      timerRef.current = setInterval(() => {
        setGameState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 0.1 }))
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState.isPlaying, gameState.isPaused])

  return (
    <GameContext.Provider value={{
      gameState,
      startGame,
      pauseGame,
      resumeGame,
      resetGame,
      collectWaypoint,
      addScore,
      registerCollision,
      setGameMode,
      setDifficulty,
      generateWaypoints
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
