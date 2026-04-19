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

  const serialReaderRef = useRef<ReadableStreamDefaultReader | null>(null)
  const serialPortRef = useRef<SerialPort | null>(null)
  const lastButtonStateRef = useRef<ButtonState>(initialButtonState)
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })
  const imuDataRef = useRef(initialIMUData)
  const yawOffsetRef = useRef(0)

  const PHYSICS = {
    maxSpeed: 12,
    acceleration: 15,
    deceleration: 8,
    climbRate: 8,
    gravity: 9.81,
    drag: 0.98,
    deadzone: 2.0
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
    yawOffsetRef.current = imuDataRef.current.yaw
    setDroneState(initialDroneState)
    addEventLog('info', 'Drone reset & heading calibrated')
  }, [addEventLog])

  const setCurrentScene = useCallback((scene: SceneType) => {
    setCurrentSceneState(scene)
    addEventLog('info', `Scene changed to ${scene}`)
  }, [addEventLog])

  const triggerButton = useCallback((button: keyof ButtonState) => {
    setButtonState(prev => ({ ...prev, [button]: true }))

    if (button === 'takeoff') takeoff()
    if (button === 'land') land()
    if (button === 'reset') resetDrone()
    if (button === 'sceneSwitch') {
      setCurrentSceneState(prev => {
        const nextScene: SceneType =
          prev === 'urban' ? 'forest' : prev === 'forest' ? 'desert' : 'urban'
        addEventLog('info', `Scene changed to ${nextScene}`)
        return nextScene
      })
    }

    window.setTimeout(() => {
      setButtonState(prev => ({ ...prev, [button]: false }))
    }, 150)
  }, [takeoff, land, resetDrone, addEventLog])

  const setInputSource = useCallback(async (source: HardwareInputSource) => {
    if (serialReaderRef.current) {
      await serialReaderRef.current.cancel().catch(() => {})
    }

    if (serialPortRef.current) {
      await serialPortRef.current.close().catch(() => {})
    }

    setInputSourceState(source)

    if (source.type === 'serial') {
      try {
        const port = await navigator.serial.requestPort()
        serialPortRef.current = port
        await port.open({ baudRate: 115200 })

        setConnectionStatus({
          imu: 'connected',
          buttons: 'connected',
          simulation: 'running'
        })
        addEventLog('success', 'Hardware online')

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

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line) continue
            if (line === 'CALIBRATED') {
              addEventLog('info', 'Hardware calibration completed')
              continue
            }

            const parts = line.split(',')
            if (parts.length < 7) continue

            const b1Pressed = parts[0] === '0'
            const b2Pressed = parts[1] === '0'
            const b3Pressed = parts[2] === '0'

            const rawJoy = parseInt(parts[3], 10)
            const roll = parseFloat(parts[4])
            const pitch = parseFloat(parts[5])
            const yaw = parseFloat(parts[6])

            if (
              Number.isNaN(rawJoy) ||
              Number.isNaN(roll) ||
              Number.isNaN(pitch) ||
              Number.isNaN(yaw)
            ) {
              continue
            }

            if (b2Pressed && !lastButtonStateRef.current.land) {
              yawOffsetRef.current = yaw
              addEventLog('info', 'Yaw calibrated from BTN2')
            }

            if (b3Pressed && !lastButtonStateRef.current.reset) {
              resetDrone()
            }

            if (b1Pressed && !lastButtonStateRef.current.takeoff) {
              if (droneState.isFlying) land()
              else takeoff()
            }

            const center = 3170
            let accelZ = 9.81

            if (rawJoy < center) {
              accelZ = 9.81 + ((center - rawJoy) / center) * 10
            } else {
              accelZ = 9.81 - ((rawJoy - center) / (4095 - center)) * 10
            }

            const adjustedIMU: IMUData = {
              pitch,
              roll,
              yaw: yaw - yawOffsetRef.current,
              accelZ,
              accelX: 0,
              accelY: 0
            }

            imuDataRef.current = adjustedIMU
            setIMUDataState(adjustedIMU)

            setButtonState({
              takeoff: b1Pressed,
              land: false,
              reset: b3Pressed,
              sceneSwitch: b2Pressed
            })

            lastButtonStateRef.current = {
              takeoff: b1Pressed,
              land: b2Pressed,
              reset: b3Pressed,
              sceneSwitch: false
            }
          }
        }
      } catch (err) {
        setConnectionStatus({
          imu: 'disconnected',
          buttons: 'disconnected',
          simulation: 'running'
        })
        addEventLog('error', 'Serial connection failed')
      }
    } else {
      setConnectionStatus({
        imu: 'disconnected',
        buttons: 'disconnected',
        simulation: 'running'
      })
    }
  }, [addEventLog, takeoff, land, resetDrone, droneState.isFlying])

  useEffect(() => {
    const updateInterval = setInterval(() => {
      const dt = 0.033
      const currentImu = imuDataRef.current

      setDroneState(prev => {
        if (!prev.isFlying) {
          if (prev.altitude <= 0) {
            return {
              ...prev,
              altitude: 0,
              position: { ...prev.position, y: 0 }
            }
          }

          return {
            ...prev,
            altitude: Math.max(0, prev.altitude - 0.2),
            position: {
              ...prev.position,
              y: Math.max(0, prev.position.y - 0.2)
            }
          }
        }

        const applyDeadzone = (n: number) => (Math.abs(n) < PHYSICS.deadzone ? 0 : n)

        const pitchFactor = applyDeadzone(currentImu.pitch) / 30
        const rollFactor = applyDeadzone(currentImu.roll) / 30
        const yawRad = (currentImu.yaw * Math.PI) / 180

        const targetVelX =
          (Math.sin(yawRad) * pitchFactor + Math.cos(yawRad) * rollFactor) * PHYSICS.maxSpeed
        const targetVelZ =
          (Math.cos(yawRad) * pitchFactor - Math.sin(yawRad) * rollFactor) * PHYSICS.maxSpeed

        velocityRef.current.x += (targetVelX - velocityRef.current.x) * PHYSICS.acceleration * dt
        velocityRef.current.z += (targetVelZ - velocityRef.current.z) * PHYSICS.acceleration * dt
        velocityRef.current.y += (currentImu.accelZ - 9.81) * PHYSICS.climbRate * dt

        velocityRef.current.x *= PHYSICS.drag
        velocityRef.current.z *= PHYSICS.drag
        velocityRef.current.y *= 0.95

        const newPos = {
          x: prev.position.x + velocityRef.current.x * dt,
          y: Math.min(100, Math.max(0.2, prev.position.y + velocityRef.current.y * dt)),
          z: prev.position.z + velocityRef.current.z * dt
        }

        return {
          ...prev,
          position: newPos,
          altitude: newPos.y,
          rotation: {
            pitch: currentImu.pitch,
            roll: currentImu.roll,
            yaw: currentImu.yaw
          },
          velocity: { ...velocityRef.current },
          speed: Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.z ** 2)
        }
      })
    }, 33)

    return () => clearInterval(updateInterval)
  }, [])

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  )

  return <DroneContext.Provider value={value}>{children}</DroneContext.Provider>
}

export const useDrone = () => {
  const context = useContext(DroneContext)
  if (!context) throw new Error('useDrone must be used within a DroneProvider')
  return context
}