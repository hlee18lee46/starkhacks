'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei'
import { useDrone } from '@/lib/drone-context'
import { useGame } from '@/lib/game-state'
import { DroneModel } from './drone-model'
import { UrbanScene } from './scenes/urban-scene'
import { WarehouseScene } from './scenes/warehouse-scene'
import { EmergencyScene } from './scenes/emergency-scene'
import { CameraController } from './game/camera-controller'
import { WaypointSystem } from './game/waypoint'
import { GameHUD } from './game/game-hud'
import { Button } from '@/components/ui/button'
import { Camera, Video, Eye, MapPin } from 'lucide-react'

type CameraMode = 'follow' | 'orbit' | 'fpv' | 'top'

function SceneRenderer() {
  const { currentScene } = useDrone()

  switch (currentScene) {
    case 'urban':
      return <UrbanScene />
    case 'warehouse':
      return <WarehouseScene />
    case 'emergency':
      return <EmergencyScene />
    default:
      return <UrbanScene />
  }
}

function KeyboardControls() {
  const { setIMUData, takeoff, land, setCurrentScene, triggerButton, droneState } = useDrone()
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.add(key)

      if (key === ' ') e.preventDefault()

      switch (key) {
        case ' ':
          if (!droneState.isFlying) {
            takeoff()
            triggerButton('takeoff')
          }
          break
        case 'shift':
          if (droneState.isFlying) {
            land()
            triggerButton('land')
          }
          break
        case '1':
          setCurrentScene('urban')
          triggerButton('sceneSwitch')
          break
        case '2':
          setCurrentScene('warehouse')
          triggerButton('sceneSwitch')
          break
        case '3':
          setCurrentScene('emergency')
          triggerButton('sceneSwitch')
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.delete(key)
    }

    const inputLoop = setInterval(() => {
      let pitch = 0
      let roll = 0
      let yaw = 0

      if (keysPressed.current.has('w')) pitch = 25
      if (keysPressed.current.has('s')) pitch = -25
      if (keysPressed.current.has('a')) roll = -25
      if (keysPressed.current.has('d')) roll = 25
      if (keysPressed.current.has('q')) yaw = -30
      if (keysPressed.current.has('e')) yaw = 30

      if (keysPressed.current.has('r')) {
        setIMUData({ accelZ: 12 })
      } else if (keysPressed.current.has('f')) {
        setIMUData({ accelZ: 7 })
      } else {
        setIMUData({ accelZ: 9.81 })
      }

      setIMUData({ pitch, roll, yaw })
    }, 16)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearInterval(inputLoop)
    }
  }, [setIMUData, takeoff, land, setCurrentScene, triggerButton, droneState.isFlying])

  return null
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00d4ff" wireframe />
    </mesh>
  )
}

function SceneContent({ cameraMode }: { cameraMode: CameraMode }) {
  return (
    <>
      {cameraMode === 'orbit' ? (
        <>
          <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={60} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={100}
            target={[0, 5, 0]}
            maxPolarAngle={Math.PI / 2 - 0.1}
          />
        </>
      ) : (
        <>
          <PerspectiveCamera makeDefault position={[0, 10, 15]} fov={cameraMode === 'fpv' ? 90 : 60} />
          <CameraController mode={cameraMode} />
        </>
      )}

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={150}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[-20, 15, -20]} intensity={0.4} color="#00d4ff" />
      <pointLight position={[20, 15, 20]} intensity={0.3} color="#ff4400" />
      <hemisphereLight args={['#1a1a3a', '#0a0a15', 0.3]} />

      <SceneRenderer />
      <DroneModel />
      <WaypointSystem />

      <Stars radius={200} depth={100} count={3000} factor={5} saturation={0} fade speed={0.5} />
      <Environment preset="night" />
    </>
  )
}

export function DroneViewport() {
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow')
  const [sceneCanvas, setSceneCanvas] = useState<HTMLCanvasElement | null>(null)
  const [isMinting, setIsMinting] = useState(false)

  const { currentScene, droneState, addEventLog } = useDrone()
  const { generateWaypoints } = useGame()

  // 1. HARDWARE TRIGGER LISTENER
  useEffect(() => {
    console.log("📡 Initializing Hardware Event Stream...")
    const eventSource = new EventSource('/api/hardware/events')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.action === 'capture') {
          console.log("🔌 Hardware Signal Received: TRIGGERING CAPTURE")
          // Check if canvas exists and we aren't already minting
          const canvas = document.querySelector('canvas')
          if (canvas && !isMinting) {
            captureSceneAndMint(canvas)
          } else {
            console.warn("Capture ignored: Canvas not ready or already minting")
          }
        }
      } catch (err) {
        console.error("Failed to parse hardware event:", err)
      }
    }

    eventSource.onerror = (err) => {
      console.error("Hardware Stream Connection Error:", err)
    }

    return () => {
      eventSource.close()
    }
  }, [isMinting]) // Dependencies ensure we have the correct minting state context

  useEffect(() => {
    generateWaypoints(currentScene)
  }, [currentScene, generateWaypoints])

  async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to capture scene canvas'))
          return
        }
        resolve(blob)
      }, 'image/png')
    })
  }

  async function captureSceneAndMint(canvas: HTMLCanvasElement) {
    try {
      setIsMinting(true)
      addEventLog('info', 'Capturing game scene for NFT mint')
      console.log('📸 Starting scene capture')

      const blob = await canvasToBlob(canvas)
      console.log('📸 Canvas blob created:', blob)

      const formData = new FormData()
      formData.append(
        'image',
        new File([blob], 'scene.png', { type: 'image/png' })
      )
      formData.append(
        'recipientWallet',
        '4XQUxCBZ7njW2Zw5SVWL199SfVn5xrHENpr4KagzYM3d'
      )
      formData.append('name', 'Drone Inspection Snapshot')
      formData.append('symbol', 'DRONE')
      formData.append(
        'description',
        'Captured during drone simulation building inspection'
      )
      formData.append('projectName', 'Drone Simulation')
      formData.append('sceneName', currentScene)
      formData.append('issueType', 'hardware-capture') // Updated to track hardware origin
      formData.append('capturedAt', new Date().toISOString())

      formData.append('dronePosX', String(droneState.position.x))
      formData.append('dronePosY', String(droneState.position.y))
      formData.append('dronePosZ', String(droneState.position.z))

      formData.append('droneRotPitch', String(droneState.rotation.pitch))
      formData.append('droneRotRoll', String(droneState.rotation.roll))
      formData.append('droneRotYaw', String(droneState.rotation.yaw))

      console.log('🚀 Sending scene.png to /api/scene/capture-and-mint')

      const response = await fetch('/api/scene/capture-and-mint', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result?.error || 'Capture-and-mint failed')
      }

      addEventLog('success', 'NFT minted successfully')
      addEventLog('info', `Mint: ${result.mintAddress}`)
      console.log('✅ NFT MINT SUCCESS:', result.explorer)

    } catch (error: any) {
      console.error('❌ Failed to capture and mint scene:', error)
      addEventLog('error', error?.message || 'Failed to capture and mint scene')
    } finally {
      setIsMinting(false)
    }
  }

  const cameraModes: { mode: CameraMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'follow', icon: <Video className="w-4 h-4" />, label: 'Follow' },
    { mode: 'fpv', icon: <Eye className="w-4 h-4" />, label: 'FPV' },
    { mode: 'top', icon: <MapPin className="w-4 h-4" />, label: 'Top' },
    { mode: 'orbit', icon: <Camera className="w-4 h-4" />, label: 'Orbit' },
  ]

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none z-10" />

      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        className="w-full h-full"
        onCreated={({ gl }) => {
          console.log('🎨 Canvas ready:', gl.domElement)
          setSceneCanvas(gl.domElement)
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent cameraMode={cameraMode} />
        </Suspense>
      </Canvas>

      <GameHUD />

      <div className="absolute top-4 left-4 z-20">
        <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
          {cameraModes.map(({ mode, icon, label }) => (
            <Button
              key={mode}
              size="sm"
              variant={cameraMode === mode ? 'default' : 'ghost'}
              className="gap-2 justify-start"
              onClick={() => setCameraMode(mode)}
            >
              {icon}
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <Button
          size="sm"
          disabled={!sceneCanvas || isMinting}
          onClick={() => {
            if (sceneCanvas) captureSceneAndMint(sceneCanvas)
          }}
        >
          {isMinting ? 'Minting...' : 'Capture & Mint'}
        </Button>
      </div>

      <KeyboardControls />

      {/* Decorative Overlays */}
      <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-primary/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-primary/50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-primary/50 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-primary/50 pointer-events-none" />

      <div
        className="absolute inset-0 pointer-events-none z-[5] opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)'
        }}
      />
    </div>
  )
}