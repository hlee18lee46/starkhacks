// Drone Simulator Types
// This file contains all type definitions for the drone simulator

export type SceneType = 'urban' | 'warehouse' | 'emergency'

export interface IMUData {
  pitch: number      // -90 to 90 degrees
  roll: number       // -180 to 180 degrees
  yaw: number        // 0 to 360 degrees
  accelX: number     // m/s²
  accelY: number     // m/s²
  accelZ: number     // m/s²
}

export interface ButtonState {
  takeoff: boolean
  land: boolean
  reset: boolean
  sceneSwitch: boolean
}

export interface DroneState {
  position: { x: number; y: number; z: number }
  rotation: { pitch: number; roll: number; yaw: number }
  velocity: { x: number; y: number; z: number }
  altitude: number
  speed: number
  isFlying: boolean
  batteryLevel: number
}

export interface ConnectionStatus {
  imu: 'connected' | 'disconnected' | 'error'
  buttons: 'connected' | 'disconnected' | 'error'
  simulation: 'running' | 'paused' | 'stopped'
}

export interface GestureStatus {
  detected: boolean
  gesture: string
  confidence: number
}

export interface EventLog {
  id: string
  timestamp: Date
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export interface HardwareInputSource {
  type: 'mock' | 'websocket' | 'serial' | 'api'
  endpoint?: string
}

// Scene configuration for each environment
export interface SceneConfig {
  id: SceneType
  name: string
  description: string
  groundColor: string
  skyColor: string
  fogColor: string
  fogDensity: number
}

export const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
  urban: {
    id: 'urban',
    name: 'Urban Inspection',
    description: 'City environment with buildings for inspection missions',
    groundColor: '#1a1a2e',
    skyColor: '#0a0a15',
    fogColor: '#0a0a15',
    fogDensity: 0.02
  },
  warehouse: {
    id: 'warehouse',
    name: 'Indoor Warehouse',
    description: 'Warehouse obstacle course with shelves and equipment',
    groundColor: '#1e1e1e',
    skyColor: '#0d0d0d',
    fogColor: '#0d0d0d',
    fogDensity: 0.03
  },
  emergency: {
    id: 'emergency',
    name: 'Emergency Response',
    description: 'Disaster zone with damaged structures for rescue operations',
    groundColor: '#2a1a1a',
    skyColor: '#1a0a0a',
    fogColor: '#1a0a0a',
    fogDensity: 0.025
  }
}
