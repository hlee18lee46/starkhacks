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
  imuData: IMUData
  buttonState: ButtonState
  droneState: DroneState
  connectionStatus: ConnectionStatus
  gestureStatus: GestureStatus
  eventLogs: EventLog[]
  currentScene: SceneType
  inputSource: HardwareInputSource
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
    imu: 'disconnected',
    buttons: 'disconnected',
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
  const serialReaderRef = useRef<ReadableStreamDefaultReader | null>(null)
  const serialPortRef = useRef<SerialPort | null>(null)
  const lastButtonStateRef = useRef<ButtonState>(initialButtonState)

  const addEventLog = useCallback((type: EventLog['type'], message: string) => {
    const newLog: EventLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message
    }
    setEventLogs(prev => [newLog, ...prev].slice(0, 50))
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

  // --- START HARDWARE INTEGRATION ---
  const setInputSource = useCallback(async (source: HardwareInputSource) => {
    // 1. Full Cleanup of existing connections
    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel()
        // Small delay to allow stream to close
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (e) {
        console.warn("Reader cleanup error:", e)
      }
      serialReaderRef.current = null
    }

    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close()
      } catch (e) {
        console.warn("Port closure error:", e)
      }
      serialPortRef.current = null
    }

    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }

    setInputSourceState(source)

    if (source.type === 'mock') {
      addEventLog('info', 'Switched to Mock Mode')
      setConnectionStatus({ imu: 'connected', buttons: 'connected', simulation: 'running' })
    } 
    
    else if (source.type === 'serial') {
      try {
        const port = await navigator.serial.requestPort()
        serialPortRef.current = port
        await port.open({ baudRate: 115200 })
        
        addEventLog('success', 'Hardware Controller Online')
        setConnectionStatus({ imu: 'connected', buttons: 'connected', simulation: 'running' })

        const decoder = new TextDecoderStream()
        port.readable.pipeTo(decoder.writable)
        const reader = decoder.readable.getReader()
        serialReaderRef.current = reader

        let buffer = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += value
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const parts = line.trim().split(",")
            if (parts.length >= 7) {
              const b1 = parts[0] === "1"
              const b2 = parts[1] === "1"
              const b3 = parts[2] === "1"
              const rawJoy = parseInt(parts[3])
              const roll = parseFloat(parts[4])
              const pitch = parseFloat(parts[5])
              const yaw = parseFloat(parts[6])

              const center = 3170
              let accelZ = 9.81
              if (rawJoy < center) {
                accelZ = 9.81 + ((center - rawJoy) / center) * 6
              } else {
                accelZ = 9.81 - ((rawJoy - center) / (4095 - center)) * 6
              }

              setIMUDataState({ pitch, roll, yaw, accelZ, accelX: 0, accelY: 0 })
              setButtonState({ takeoff: b1, land: b2, reset: b3, sceneSwitch: false })

              if (b1 && !lastButtonStateRef.current.takeoff) takeoff()
              if (b2 && !lastButtonStateRef.current.land) land()
              if (b3 && !lastButtonStateRef.current.reset) resetDrone()
              
              lastButtonStateRef.current = { takeoff: b1, land: b2, reset: b3, sceneSwitch: false }
            }
          }
        }
      } catch (err) {
        console.error("Serial error:", err)
        addEventLog('error', 'Serial connection failed or closed')
        setInputSourceState({ type: 'mock' })
      }
    }
  }, [addEventLog, takeoff, land, resetDrone])

  // Mock data generator
  useEffect(() => {
    if (inputSource.type === 'mock') {
      mockIntervalRef.current = setInterval(() => {
        const time = Date.now() / 1000
        setIMUDataState(prev => ({
          ...prev,
          pitch: Math.sin(time * 0.5) * 5,
          roll: Math.cos(time * 0.5) * 5,
          accelZ: 9.81 + Math.sin(time) * 0.2
        }))
      }, 100)
      return () => { if (mockIntervalRef.current) clearInterval(mockIntervalRef.current) }
    }
  }, [inputSource.type])

  // --- PHYSICS ENGINE ---
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })
  const imuDataRef = useRef(imuData)

  useEffect(() => { imuDataRef.current = imuData }, [imuData])
  
  const PHYSICS = {
    maxSpeed: 10,
    acceleration: 15,
    deceleration: 8,
    climbRate: 6,
    gravity: 9.81,
    drag: 0.98
  }
  
  useEffect(() => {
    if (droneState.isFlying) {
      const updateInterval = setInterval(() => {
        const dt = 0.033 
        const currentImu = imuDataRef.current
        
        setDroneState(prev => {
          // 1. Normalized Tilt Factors (Divisor 45 for stable flight)
          const pitchFactor = currentImu.pitch / 45 
          const rollFactor = currentImu.roll / 45
          
          // 2. Absolute Yaw Alignment
          const currentYaw = currentImu.yaw 
          const yawRad = (currentYaw * Math.PI) / 180
          
          // 3. Directional Velocity (relative to controller orientation)
          const targetVelX = (Math.sin(yawRad) * pitchFactor + Math.cos(yawRad) * rollFactor) * PHYSICS.maxSpeed
          const targetVelZ = (Math.cos(yawRad) * pitchFactor - Math.sin(yawRad) * rollFactor) * PHYSICS.maxSpeed
          
          const accelRate = (Math.abs(pitchFactor) > 0.05 || Math.abs(rollFactor) > 0.05) 
            ? PHYSICS.acceleration 
            : PHYSICS.deceleration
          
          velocityRef.current.x += (targetVelX - velocityRef.current.x) * accelRate * dt
          velocityRef.current.z += (targetVelZ - velocityRef.current.z) * accelRate * dt
          velocityRef.current.x *= PHYSICS.drag
          velocityRef.current.z *= PHYSICS.drag
          
          // 4. Vertical Thrust
          const throttle = (currentImu.accelZ - PHYSICS.gravity) / 2
          velocityRef.current.y += throttle * PHYSICS.climbRate * dt
          velocityRef.current.y *= 0.96 
          
          const newPosition = {
            x: prev.position.x + velocityRef.current.x * dt,
            y: Math.min(100, Math.max(0.5, prev.position.y + velocityRef.current.y * dt)),
            z: prev.position.z + velocityRef.current.z * dt
          }

          return {
            ...prev,
            position: newPosition,
            rotation: {
              pitch: currentImu.pitch * 0.5,
              roll: currentImu.roll * 0.5,
              yaw: currentYaw 
            },
            velocity: { ...velocityRef.current },
            altitude: newPosition.y,
            speed: Math.sqrt(velocityRef.current.x**2 + velocityRef.current.z**2)
          }
        })
      }, 33)
      return () => clearInterval(updateInterval)
    } else {
      const landInterval = setInterval(() => {
        setDroneState(prev => {
          if (prev.altitude <= 0) return { ...prev, altitude: 0, position: { ...prev.position, y: 0 }, velocity: {x:0,y:0,z:0}, speed: 0 }
          return { ...prev, altitude: Math.max(0, prev.altitude - 0.2), position: { ...prev.position, y: Math.max(0, prev.position.y - 0.2) } }
        })
      }, 33)
      return () => clearInterval(landInterval)
    }
  }, [droneState.isFlying])

  const value: DroneContextType = useMemo(() => ({
    imuData, buttonState, droneState, connectionStatus, gestureStatus, eventLogs, currentScene, inputSource,
    setIMUData, triggerButton, setCurrentScene, addEventLog, resetDrone, takeoff, land, setInputSource
  }), [imuData, buttonState, droneState, connectionStatus, gestureStatus, eventLogs, currentScene, inputSource, setIMUData, triggerButton, setCurrentScene, addEventLog, resetDrone, takeoff, land, setInputSource])

  return <DroneContext.Provider value={value}>{children}</DroneContext.Provider>
}

export function useDrone() {
  const context = useContext(DroneContext)
  if (!context) throw new Error('useDrone must be used within a DroneProvider')
  return context
}