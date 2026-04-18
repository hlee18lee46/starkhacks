/**
 * Hardware Input Integration Layer
 * 
 * This module provides the interface for connecting real hardware inputs
 * to the drone simulator. It's designed to be easily extended with
 * different input sources.
 * 
 * INTEGRATION POINTS:
 * 
 * 1. WebSocket Connection
 *    - Connect to a WebSocket server that streams IMU/button data
 *    - Example: ESP32 with WebSocket server
 * 
 * 2. Serial Port (Web Serial API)
 *    - Direct USB connection to Arduino/ESP32
 *    - Requires Chrome/Edge browser
 * 
 * 3. REST API Polling
 *    - Poll an HTTP endpoint for sensor data
 *    - Useful for cloud-connected devices
 */

import type { IMUData, ButtonState } from './drone-types'

// ============================================================================
// WEBSOCKET INTEGRATION
// ============================================================================

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number
  onIMUData?: (data: IMUData) => void
  onButtonState?: (state: Partial<ButtonState>) => void
  onConnectionChange?: (connected: boolean) => void
}

export function createWebSocketConnection(config: WebSocketConfig) {
  let ws: WebSocket | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  
  const connect = () => {
    try {
      ws = new WebSocket(config.url)
      
      ws.onopen = () => {
        console.log('[Hardware] WebSocket connected')
        config.onConnectionChange?.(true)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Expected message format:
          // { type: 'imu', pitch: 0, roll: 0, yaw: 0, accelX: 0, accelY: 0, accelZ: 9.81 }
          // { type: 'button', button: 'takeoff', pressed: true }
          
          if (data.type === 'imu') {
            config.onIMUData?.({
              pitch: data.pitch ?? 0,
              roll: data.roll ?? 0,
              yaw: data.yaw ?? 0,
              accelX: data.accelX ?? 0,
              accelY: data.accelY ?? 0,
              accelZ: data.accelZ ?? 9.81
            })
          } else if (data.type === 'button') {
            config.onButtonState?.({ [data.button]: data.pressed })
          }
        } catch (e) {
          console.error('[Hardware] Failed to parse WebSocket message:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('[Hardware] WebSocket disconnected')
        config.onConnectionChange?.(false)
        
        // Auto-reconnect
        if (config.reconnectInterval) {
          reconnectTimeout = setTimeout(connect, config.reconnectInterval)
        }
      }
      
      ws.onerror = (error) => {
        console.error('[Hardware] WebSocket error:', error)
      }
    } catch (e) {
      console.error('[Hardware] Failed to create WebSocket:', e)
    }
  }
  
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }
  
  const send = (message: object) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
  
  return { connect, disconnect, send }
}

// ============================================================================
// SERIAL PORT INTEGRATION (Web Serial API)
// ============================================================================

export interface SerialConfig {
  baudRate?: number
  onIMUData?: (data: IMUData) => void
  onButtonState?: (state: Partial<ButtonState>) => void
  onConnectionChange?: (connected: boolean) => void
}

export async function createSerialConnection(config: SerialConfig) {
  // Check if Web Serial API is available
  if (!('serial' in navigator)) {
    console.warn('[Hardware] Web Serial API not available')
    return null
  }
  
  let port: SerialPort | null = null
  let reader: ReadableStreamDefaultReader<string> | null = null
  
  const connect = async () => {
    try {
      // Request port from user
      port = await (navigator as Navigator & { serial: { requestPort: () => Promise<SerialPort> } }).serial.requestPort()
      
      await port.open({ baudRate: config.baudRate ?? 115200 })
      
      config.onConnectionChange?.(true)
      console.log('[Hardware] Serial port connected')
      
      // Start reading
      const decoder = new TextDecoderStream()
      const readableStreamClosed = port.readable?.pipeTo(decoder.writable)
      reader = decoder.readable.getReader()
      
      let buffer = ''
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += value
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.trim())
            
            if (data.type === 'imu') {
              config.onIMUData?.({
                pitch: data.pitch ?? 0,
                roll: data.roll ?? 0,
                yaw: data.yaw ?? 0,
                accelX: data.accelX ?? 0,
                accelY: data.accelY ?? 0,
                accelZ: data.accelZ ?? 9.81
              })
            } else if (data.type === 'button') {
              config.onButtonState?.({ [data.button]: data.pressed })
            }
          } catch {
            // Ignore parse errors for incomplete data
          }
        }
      }
    } catch (e) {
      console.error('[Hardware] Serial connection error:', e)
      config.onConnectionChange?.(false)
    }
  }
  
  const disconnect = async () => {
    if (reader) {
      await reader.cancel()
      reader = null
    }
    if (port) {
      await port.close()
      port = null
    }
    config.onConnectionChange?.(false)
  }
  
  return { connect, disconnect }
}

// ============================================================================
// REST API POLLING INTEGRATION
// ============================================================================

export interface APIPollingConfig {
  endpoint: string
  pollInterval?: number
  onIMUData?: (data: IMUData) => void
  onButtonState?: (state: Partial<ButtonState>) => void
  onConnectionChange?: (connected: boolean) => void
}

export function createAPIPolling(config: APIPollingConfig) {
  let intervalId: NodeJS.Timeout | null = null
  let isConnected = false
  
  const poll = async () => {
    try {
      const response = await fetch(config.endpoint)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!isConnected) {
        isConnected = true
        config.onConnectionChange?.(true)
      }
      
      // Expected response format:
      // {
      //   imu: { pitch, roll, yaw, accelX, accelY, accelZ },
      //   buttons: { takeoff, land, reset, sceneSwitch }
      // }
      
      if (data.imu) {
        config.onIMUData?.(data.imu)
      }
      
      if (data.buttons) {
        config.onButtonState?.(data.buttons)
      }
    } catch (e) {
      console.error('[Hardware] API polling error:', e)
      if (isConnected) {
        isConnected = false
        config.onConnectionChange?.(false)
      }
    }
  }
  
  const start = () => {
    poll() // Initial poll
    intervalId = setInterval(poll, config.pollInterval ?? 100)
  }
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    isConnected = false
    config.onConnectionChange?.(false)
  }
  
  return { start, stop }
}

// ============================================================================
// EXAMPLE ARDUINO/ESP32 CODE FOR REFERENCE
// ============================================================================

/*
 * Example ESP32 WebSocket Server Code:
 * 
 * #include <WiFi.h>
 * #include <WebSocketsServer.h>
 * #include <Wire.h>
 * #include <MPU6050.h>
 * 
 * WebSocketsServer webSocket = WebSocketsServer(81);
 * MPU6050 mpu;
 * 
 * void setup() {
 *   WiFi.begin("SSID", "PASSWORD");
 *   while (WiFi.status() != WL_CONNECTED) delay(500);
 *   
 *   Wire.begin();
 *   mpu.initialize();
 *   
 *   webSocket.begin();
 *   webSocket.onEvent(webSocketEvent);
 * }
 * 
 * void loop() {
 *   webSocket.loop();
 *   
 *   int16_t ax, ay, az, gx, gy, gz;
 *   mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
 *   
 *   // Convert to degrees
 *   float pitch = atan2(ay, az) * 180 / PI;
 *   float roll = atan2(-ax, sqrt(ay*ay + az*az)) * 180 / PI;
 *   float yaw = atan2(gx, gy) * 180 / PI;
 *   
 *   String json = "{\"type\":\"imu\",";
 *   json += "\"pitch\":" + String(pitch) + ",";
 *   json += "\"roll\":" + String(roll) + ",";
 *   json += "\"yaw\":" + String(yaw) + ",";
 *   json += "\"accelX\":" + String(ax/16384.0) + ",";
 *   json += "\"accelY\":" + String(ay/16384.0) + ",";
 *   json += "\"accelZ\":" + String(az/16384.0) + "}";
 *   
 *   webSocket.broadcastTXT(json);
 *   delay(50);
 * }
 */
