'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { 
  IMUData, 
  ButtonState, 
  DroneState, 
  ConnectionStatus, 
  GestureStatus, 
  EventLog, 
  SceneType,
  HardwareInputSource 
} from './drone-types'

interface DroneContextType {
  // State
  imuData: IMUData
  buttonState: ButtonState
  droneState: DroneState
  connectionStatus: ConnectionStatus
  gestureStatus: GestureStatus
  eventLogs: EventLog[]
  currentScene: SceneType
  inputSource: HardwareInputSource
  
  // Actions
  setIMUData: (data: Partial<IMUData>) => void
  triggerButton: (button: keyof ButtonState) => void
  setCurrentScene: (scene: SceneType) => void
  addEventLog: (type: EventLog['type'], message: string) => void
  resetDrone: () => void
  takeoff: () => void
  land: () => void
  setInputSource: (source: HardwareInputSource) => void
}

const initialIMUData: IMUData = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  accelX: 0,
  accelY: 0,
  accelZ: 9.81
}

const initialButtonState: ButtonState = {
  takeoff: false,
  land: false,
  reset: false,
  sceneSwitch: false
}

const initialDroneState: DroneState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { pitch: 0, roll: 0, yaw: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  altitude: 0,
  speed: 0,
  isFlying: false,
  batteryLevel: 100
}

const DroneContext = createContext<DroneContextType | null>(null)

export function DroneProvider({ children }: { children: React.ReactNode }) {
  const [imuData, setIMUDataState] = useState<IMUData>(initialIMUData)
  const [buttonState, setButtonState] = useState<ButtonState>(initialButtonState)
  const [droneState, setDroneState] = useState<DroneState>(initialDroneState)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    imu: 'connected',
    buttons: 'connected',
    simulation: 'running'
  })
  const [gestureStatus, setGestureStatus] = useState<GestureStatus>({
    detected: false,
    gesture: 'None',
    confidence: 0
  })
  const [eventLogs, setEventLogs] = useState<EventLog[]>([])
  const [currentScene, setCurrentSceneState] = useState<SceneType>('urban')
  const [inputSource, setInputSourceState] = useState<HardwareInputSource>({ type: 'mock' })
  
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const addEventLog = useCallback((type: EventLog['type'], message: string) => {
    const newLog: EventLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message
    }
    setEventLogs(prev => [newLog, ...prev].slice(0, 50)) // Keep last 50 logs
  }, [])

  const setIMUData = useCallback((data: Partial<IMUData>) => {
    setIMUDataState(prev => ({ ...prev, ...data }))
  }, [])

  const triggerButton = useCallback((button: keyof ButtonState) => {
    setButtonState(prev => ({ ...prev, [button]: true }))
    setTimeout(() => {
      setButtonState(prev => ({ ...prev, [button]: false }))
    }, 200)
  }, [])

  const takeoff = useCallback(() => {
    setDroneState(prev => {
      if (prev.isFlying) return prev
      addEventLog('success', 'Drone takeoff initiated')
      return { ...prev, isFlying: true }
    })
  }, [addEventLog])

  const land = useCallback(() => {
    setDroneState(prev => {
      if (!prev.isFlying) return prev
      addEventLog('info', 'Drone landing sequence started')
      return { ...prev, isFlying: false }
    })
  }, [addEventLog])

  const resetDrone = useCallback(() => {
    setDroneState(initialDroneState)
    setIMUDataState(initialIMUData)
    addEventLog('info', 'Drone position and state reset')
  }, [addEventLog])

  const setCurrentScene = useCallback((scene: SceneType) => {
    setCurrentSceneState(scene)
    addEventLog('info', `Scene changed to ${scene}`)
  }, [addEventLog])

  const setInputSource = useCallback((source: HardwareInputSource) => {
    setInputSourceState(source)
    addEventLog('info', `Input source changed to ${source.type}`)
    
    // Update connection status based on source type
    if (source.type === 'mock') {
      setConnectionStatus({
        imu: 'connected',
        buttons: 'connected',
        simulation: 'running'
      })
    }
    // TODO: Implement real hardware connections here
    // For websocket: new WebSocket(source.endpoint)
    // For serial: navigator.serial.requestPort()
    // For API: fetch/polling
  }, [addEventLog])

  // Mock data generator for demo purposes
  useEffect(() => {
    if (inputSource.type === 'mock') {
      // Generate mock IMU variations
      mockIntervalRef.current = setInterval(() => {
        const time = Date.now() / 1000
        
        // Simulate subtle IMU noise/drift
        setIMUDataState(prev => ({
          ...prev,
          pitch: prev.pitch + (Math.random() - 0.5) * 0.5,
          roll: prev.roll + (Math.random() - 0.5) * 0.5,
          accelX: Math.sin(time * 0.5) * 0.1,
          accelY: Math.cos(time * 0.5) * 0.1,
          accelZ: 9.81 + Math.sin(time) * 0.05
        }))

        // Update gesture detection randomly
        if (Math.random() > 0.95) {
          const gestures = ['Tilt Forward', 'Tilt Back', 'Roll Left', 'Roll Right', 'Rotate CW', 'Stable']
          setGestureStatus({
            detected: true,
            gesture: gestures[Math.floor(Math.random() * gestures.length)],
            confidence: 0.7 + Math.random() * 0.3
          })
        }

        // Battery drain simulation
        setDroneState(prev => ({
          ...prev,
          batteryLevel: Math.max(0, prev.batteryLevel - 0.001)
        }))
      }, 100)

      return () => {
        if (mockIntervalRef.current) {
          clearInterval(mockIntervalRef.current)
        }
      }
    }
  }, [inputSource.type])

  // Use ref to track accumulated yaw and velocity
  const yawAccumulatorRef = useRef(0)
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })
  const imuDataRef = useRef(imuData)

  useEffect(() => {
    imuDataRef.current = imuData
  }, [imuData])
  
  // Physics constants
  const PHYSICS = {
    maxSpeed: 8,
    acceleration: 15,
    deceleration: 8,
    yawSpeed: 2,
    climbRate: 5,
    gravity: 9.81,
    drag: 0.98
  }
  
  // Update drone state based on IMU data when flying
  useEffect(() => {
    if (droneState.isFlying) {
      const updateInterval = setInterval(() => {
        const dt = 0.033 // ~30fps
        const currentImu = imuDataRef.current
        
        // Accumulate yaw rotation
        yawAccumulatorRef.current = (yawAccumulatorRef.current + currentImu.yaw * PHYSICS.yawSpeed * dt) % 360
        if (yawAccumulatorRef.current < 0) yawAccumulatorRef.current += 360
        
        setDroneState(prev => {
          const pitchFactor = currentImu.pitch / 25
          const rollFactor = currentImu.roll / 25
          
          // Calculate movement based on yaw direction
          const yawRad = (yawAccumulatorRef.current * Math.PI) / 180
          
          // Forward/backward movement (pitch)
          const targetForwardX = Math.sin(yawRad) * pitchFactor * PHYSICS.maxSpeed
          const targetForwardZ = Math.cos(yawRad) * pitchFactor * PHYSICS.maxSpeed
          
          // Strafe movement (roll)
          const targetStrafeX = Math.cos(yawRad) * rollFactor * PHYSICS.maxSpeed
          const targetStrafeZ = -Math.sin(yawRad) * rollFactor * PHYSICS.maxSpeed
          
          // Target horizontal velocity
          const targetVelX = targetForwardX + targetStrafeX
          const targetVelZ = targetForwardZ + targetStrafeZ
          
          // Smooth acceleration/deceleration
          const accelRate = (Math.abs(pitchFactor) > 0.1 || Math.abs(rollFactor) > 0.1) 
            ? PHYSICS.acceleration 
            : PHYSICS.deceleration
          
          velocityRef.current.x += (targetVelX - velocityRef.current.x) * accelRate * dt
          velocityRef.current.z += (targetVelZ - velocityRef.current.z) * accelRate * dt
          
          // Apply drag
          velocityRef.current.x *= PHYSICS.drag
          velocityRef.current.z *= PHYSICS.drag
          
          // Vertical movement based on throttle (accelZ)
          const throttle = (currentImu.accelZ - PHYSICS.gravity) / 3
          velocityRef.current.y += throttle * PHYSICS.climbRate * dt
          velocityRef.current.y *= 0.95 // Vertical drag
          
          // Clamp vertical velocity
          velocityRef.current.y = Math.max(-PHYSICS.climbRate, Math.min(PHYSICS.climbRate, velocityRef.current.y))
          
          // Update position
          const newPosition = {
            x: prev.position.x + velocityRef.current.x * dt,
            y: Math.min(60, Math.max(0.5, prev.position.y + velocityRef.current.y * dt)),
            z: prev.position.z + velocityRef.current.z * dt
          }

          const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.z ** 2)

          return {
            ...prev,
            position: newPosition,
            rotation: {
              pitch: currentImu.pitch * 0.6,
              roll: currentImu.roll * 0.6,
              yaw: yawAccumulatorRef.current
            },
            velocity: { ...velocityRef.current },
            altitude: newPosition.y,
            speed
          }
        })
      }, 33)

      return () => clearInterval(updateInterval)
    } else {
      // When not flying, gradually descend
      const landInterval = setInterval(() => {
        setDroneState(prev => {
          if (prev.altitude <= 0) {
            velocityRef.current = { x: 0, y: 0, z: 0 }
            return { ...prev, altitude: 0, position: { ...prev.position, y: 0 }, velocity: { x: 0, y: 0, z: 0 }, speed: 0 }
          }
          return {
            ...prev,
            altitude: Math.max(0, prev.altitude - 0.16),
            position: { ...prev.position, y: Math.max(0, prev.position.y - 0.16) }
          }
        })
      }, 33)

      return () => clearInterval(landInterval)
    }
  }, [droneState.isFlying])

  // Log initial connection
  useEffect(() => {
    addEventLog('success', 'Drone Command Center initialized')
    addEventLog('info', 'Mock hardware input active')
  }, [addEventLog])

  const value: DroneContextType = useMemo(() => ({
    imuData,
    buttonState,
    droneState,
    connectionStatus,
    gestureStatus,
    eventLogs,
    currentScene,
    inputSource,
    setIMUData,
    triggerButton,
    setCurrentScene,
    addEventLog,
    resetDrone,
    takeoff,
    land,
    setInputSource
  }), [
    imuData,
    buttonState,
    droneState,
    connectionStatus,
    gestureStatus,
    eventLogs,
    currentScene,
    inputSource,
    setIMUData,
    triggerButton,
    setCurrentScene,
    addEventLog,
    resetDrone,
    takeoff,
    land,
    setInputSource
  ])

  return (
    <DroneContext.Provider value={value}>
      {children}
    </DroneContext.Provider>
  )
}

export function useDrone() {
  const context = useContext(DroneContext)
  if (!context) {
    throw new Error('useDrone must be used within a DroneProvider')
  }
  return context
}
