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
import { io, type Socket } from 'socket.io-client'

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
  const gestureSocketRef = useRef<Socket | null>(null)
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })
  const imuDataRef = useRef(initialIMUData)

  const PHYSICS = {
    maxSpeed: 12,        // Slightly increased for better feel
    acceleration: 15,
    deceleration: 8,
    climbRate: 8,
    gravity: 9.81,
    drag: 0.98,
    deadzone: 1.5        // Ignore tilts less than 1.5 degrees
  }

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
    const updated = { ...imuDataRef.current, ...data }
    imuDataRef.current = updated
    setIMUDataState(updated)
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
    velocityRef.current = { x: 0, y: 0, z: 0 }
    setDroneState(initialDroneState)
    setIMUDataState(initialIMUData)
    imuDataRef.current = initialIMUData
    addEventLog('info', 'Drone position and state reset')
  }, [addEventLog])

  const setCurrentScene = useCallback((scene: SceneType) => {
    setCurrentSceneState(scene)
    addEventLog('info', `Scene changed to ${scene}`)
  }, [addEventLog])

  // --- GESTURE SERVER CONNECTION ---
  useEffect(() => {
    const gestureServerUrl = 'http://192.168.2.3:5050'
    const socket = io(gestureServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true
    })

    gestureSocketRef.current = socket

    socket.on('connect', () => {
      addEventLog('success', 'Connected to gesture server')
      setGestureStatus({ detected: false, gesture: 'Connected', confidence: 1 })
    })

    socket.on('gesture_event', (event: { action?: string; gesture?: string }) => {
      const gestureName = event.gesture || 'Unknown'
      const actionName = event.action || 'none'
      setGestureStatus({ detected: true, gesture: `${gestureName} → ${actionName}`, confidence: 1 })

      if (actionName === 'shot') window.dispatchEvent(new CustomEvent('DRONE_FIRE_WATER'))
      if (actionName === 'spray_on') window.dispatchEvent(new CustomEvent('DRONE_SPRAY_ON'))
      if (actionName === 'spray_off') window.dispatchEvent(new CustomEvent('DRONE_SPRAY_OFF'))
      if (actionName === 'boost') window.dispatchEvent(new CustomEvent('DRONE_BOOST'))
    })

    return () => { socket.disconnect() }
  }, [addEventLog])

  // --- HARDWARE / SERIAL CONNECTION ---
  const setInputSource = useCallback(async (source: HardwareInputSource) => {
    if (serialReaderRef.current) await serialReaderRef.current.cancel().catch(() => {})
    if (serialPortRef.current) await serialPortRef.current.close().catch(() => {})
    if (mockIntervalRef.current) clearInterval(mockIntervalRef.current)

    setInputSourceState(source)

    if (source.type === 'mock') {
      addEventLog('info', 'Switched to Mock Mode')
      setConnectionStatus({ imu: 'connected', buttons: 'connected', simulation: 'running' })
    } else if (source.type === 'serial') {
      try {
        const port = await navigator.serial.requestPort()
        serialPortRef.current = port
        await port.open({ baudRate: 115200 })

        addEventLog('success', 'Hardware Controller Online')
        setConnectionStatus({ imu: 'connected', buttons: 'connected', simulation: 'running' })

        const decoder = new TextDecoderStream()
        port.readable?.pipeTo(decoder.writable)
        const reader = decoder.readable.getReader()
        serialReaderRef.current = reader

        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += value
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const parts = line.trim().split(',')
            if (parts.length >= 7) {
              const b1 = parts[0] === '1'
              const b2 = parts[1] === '1'
              const b3 = parts[2] === '1'
              const rawJoy = parseInt(parts[3])
              const roll = parseFloat(parts[4])
              const pitch = parseFloat(parts[5])
              const yaw = parseFloat(parts[6])

              // Throttle mapping
              const center = 3170
              let accelZ = 9.81
              if (rawJoy < center) {
                accelZ = 9.81 + ((center - rawJoy) / center) * 6
              } else {
                accelZ = 9.81 - ((rawJoy - center) / (4095 - center)) * 6
              }

              // SYNC TO REF (Immediate for Physics) AND STATE (UI)
              const newIMU = { pitch, roll, yaw, accelZ, accelX: 0, accelY: 0 }
              imuDataRef.current = newIMU
              setIMUDataState(newIMU)
              
              setButtonState({ takeoff: b1, land: b2, reset: b3, sceneSwitch: false })

              if (b1 && !lastButtonStateRef.current.takeoff) takeoff()
              if (b2 && !lastButtonStateRef.current.land) land()
              if (b3 && !lastButtonStateRef.current.reset) resetDrone()

              lastButtonStateRef.current = { takeoff: b1, land: b2, reset: b3, sceneSwitch: false }
            }
          }
        }
      } catch (err) {
        addEventLog('error', 'Serial connection failed')
        setInputSourceState({ type: 'mock' })
      }
    }
  }, [addEventLog, takeoff, land, resetDrone])

  // --- MOCK DATA GENERATOR ---
  useEffect(() => {
    if (inputSource.type === 'mock') {
      mockIntervalRef.current = setInterval(() => {
        const time = Date.now() / 1000
        const mockIMU = {
          pitch: Math.sin(time * 0.5) * 5,
          roll: Math.cos(time * 0.5) * 5,
          yaw: (time * 10) % 360,
          accelZ: 9.81 + Math.sin(time) * 0.2,
          accelX: 0,
          accelY: 0
        }
        imuDataRef.current = mockIMU
        setIMUDataState(mockIMU)
      }, 100)
      return () => { if (mockIntervalRef.current) clearInterval(mockIntervalRef.current) }
    }
  }, [inputSource.type])

  // --- MAIN PHYSICS LOOP ---
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const dt = 0.033
      const currentImu = imuDataRef.current

      setDroneState(prev => {
        if (!prev.isFlying) {
          // Landing logic: Gravity pulls down until altitude is 0
          if (prev.altitude <= 0) return { ...prev, altitude: 0, position: { ...prev.position, y: 0 } }
          return {
            ...prev,
            altitude: Math.max(0, prev.altitude - 0.2),
            position: { ...prev.position, y: Math.max(0, prev.position.y - 0.2) }
          }
        }

        // --- IMU MANEUVERING LOGIC ---
        // 1. Calculate Tilt Factors with Deadzone
        const applyDeadzone = (val: number) => Math.abs(val) < PHYSICS.deadzone ? 0 : val
        const pitchFactor = applyDeadzone(currentImu.pitch) / 30 // 30 deg = max speed
        const rollFactor = applyDeadzone(currentImu.roll) / 30
        
        const yawRad = (currentImu.yaw * Math.PI) / 180

        // 2. Horizontal Velocity (Relative to Yaw/Heading)
        const targetVelX = (Math.sin(yawRad) * pitchFactor + Math.cos(yawRad) * rollFactor) * PHYSICS.maxSpeed
        const targetVelZ = (Math.cos(yawRad) * pitchFactor - Math.sin(yawRad) * rollFactor) * PHYSICS.maxSpeed

        velocityRef.current.x += (targetVelX - velocityRef.current.x) * PHYSICS.acceleration * dt
        velocityRef.current.z += (targetVelZ - velocityRef.current.z) * PHYSICS.acceleration * dt
        velocityRef.current.x *= PHYSICS.drag
        velocityRef.current.z *= PHYSICS.drag

        // 3. Vertical Velocity (Joystick Throttle)
        const throttleEffect = (currentImu.accelZ - 9.81) * PHYSICS.climbRate
        velocityRef.current.y += throttleEffect * dt
        velocityRef.current.y *= 0.95 // Air resistance for vertical

        // 4. Update Position
        const newPosition = {
          x: prev.position.x + velocityRef.current.x * dt,
          y: Math.min(100, Math.max(0.5, prev.position.y + velocityRef.current.y * dt)),
          z: prev.position.z + velocityRef.current.z * dt
        }

        return {
          ...prev,
          position: newPosition,
          rotation: {
            pitch: currentImu.pitch,
            roll: currentImu.roll,
            yaw: currentImu.yaw
          },
          velocity: { ...velocityRef.current },
          altitude: newPosition.y,
          speed: Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.z ** 2)
        }
      })
    }, 33)

    return () => clearInterval(updateInterval)
  }, [droneState.isFlying])

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
  }), [imuData, buttonState, droneState, connectionStatus, gestureStatus, eventLogs, currentScene, inputSource, setIMUData, triggerButton, setCurrentScene, addEventLog, resetDrone, takeoff, land, setInputSource])

  return <DroneContext.Provider value={value}>{children}</DroneContext.Provider>
}

export function useDrone() {
  const context = useContext(DroneContext)
  if (!context) throw new Error('useDrone must be used within a DroneProvider')
  return context
}