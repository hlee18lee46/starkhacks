'use client'

import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
import { Camera, Video, Eye, MapPin, Cpu } from 'lucide-react'

type CameraMode = 'follow' | 'orbit' | 'fpv' | 'top'

function SceneRenderer() {
  const { currentScene } = useDrone()
  switch (currentScene) {
    case 'urban': return <UrbanScene />
    case 'warehouse': return <WarehouseScene />
    case 'emergency': return <EmergencyScene />
    default: return <UrbanScene />
  }
}

function KeyboardControls() {
  const { setIMUData, takeoff, land, setCurrentScene, triggerButton, droneState, inputSource } = useDrone()
  const keysPressed = useRef<Set<string>>(new Set())
  const isFlyingRef = useRef(droneState.isFlying)

  useEffect(() => {
    isFlyingRef.current = droneState.isFlying
  }, [droneState.isFlying])

  useEffect(() => {
    // Stop keyboard physics from fighting with the ESP32 Serial data
    if (inputSource.type === 'serial') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.add(key)
      if (key === ' ') e.preventDefault()
      switch (key) {
        case ' ': if (!isFlyingRef.current) { takeoff(); triggerButton('takeoff'); } break
        case 'shift': if (isFlyingRef.current) { land(); triggerButton('land'); } break
        case '1': setCurrentScene('urban'); triggerButton('sceneSwitch'); break
        case '2': setCurrentScene('warehouse'); triggerButton('sceneSwitch'); break
        case '3': setCurrentScene('emergency'); triggerButton('sceneSwitch'); break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase())

    const inputLoop = setInterval(() => {
      let pitch = 0, roll = 0, yaw = 0
      if (keysPressed.current.has('w')) pitch = 25
      if (keysPressed.current.has('s')) pitch = -25
      if (keysPressed.current.has('a')) roll = -25
      if (keysPressed.current.has('d')) roll = 25
      if (keysPressed.current.has('q')) yaw = -30
      if (keysPressed.current.has('e')) yaw = 30

      const accelZ = keysPressed.current.has('r') ? 12 : keysPressed.current.has('f') ? 7 : 9.81
      setIMUData({ pitch, roll, yaw, accelZ })
    }, 16)

    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
      clearInterval(inputLoop)
    }
  }, [setIMUData, takeoff, land, setCurrentScene, triggerButton, inputSource.type])

  return null
}

function LoadingFallback() {
  return <mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#00d4ff" wireframe /></mesh>
}

function SceneContent({ cameraMode }: { cameraMode: CameraMode }) {
  return (
    <>
      {cameraMode === 'orbit' ? (
        <>
          <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={60} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={5} maxDistance={100} target={[0, 5, 0]} maxPolarAngle={Math.PI / 2 - 0.1} />
        </>
      ) : (
        <>
          <PerspectiveCamera makeDefault position={[0, 10, 15]} fov={cameraMode === 'fpv' ? 90 : 60} />
          <CameraController mode={cameraMode} />
        </>
      )}
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 50, 20]} intensity={1.2} castShadow />
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

  const { currentScene, droneState, addEventLog, buttonState, setInputSource } = useDrone()
  const { generateWaypoints } = useGame()
  
  const isMintingRef = useRef(false)
  const sceneRef = useRef(currentScene)
  const droneStateRef = useRef(droneState)

  useEffect(() => { isMintingRef.current = isMinting }, [isMinting])
  useEffect(() => { sceneRef.current = currentScene }, [currentScene])
  useEffect(() => { droneStateRef.current = droneState }, [droneState])

  const canvasToBlob = useCallback(async (canvas: HTMLCanvasElement): Promise<Blob> => {
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => { blob ? resolve(blob) : reject(new Error('Capture failed')) }, 'image/png')
    })
  }, [])

  const captureSceneAndMint = useCallback(async (canvas: HTMLCanvasElement) => {
    try {
      setIsMinting(true)
      addEventLog('info', 'Capturing game scene for NFT mint')
      const blob = await canvasToBlob(canvas)
      const formData = new FormData()
      formData.append('image', new File([blob], 'scene.png', { type: 'image/png' }))
      formData.append('recipientWallet', '4XQUxCBZ7njW2Zw5SVWL199SfVn5xrHENpr4KagzYM3d')
      formData.append('name', 'Drone Inspection Snapshot')
      formData.append('symbol', 'DRONE')
      formData.append('sceneName', sceneRef.current)
      formData.append('dronePosX', String(droneStateRef.current.position.x))
      formData.append('dronePosY', String(droneStateRef.current.position.y))
      formData.append('dronePosZ', String(droneStateRef.current.position.z))

      const response = await fetch('/api/scene/capture-and-mint', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result?.error || 'Capture-and-mint failed')

      addEventLog('success', 'NFT minted successfully')
    } catch (error: any) {
      addEventLog('error', error?.message || 'Failed to capture and mint scene')
    } finally { setIsMinting(false) }
  }, [addEventLog, canvasToBlob])

  // --- HARDWARE BUTTON LISTENERS ---
  useEffect(() => {
    // If B1 (takeoff button) is pressed on hardware while already flying, trigger capture
    if (buttonState.takeoff && droneState.isFlying && !isMintingRef.current) {
        if (sceneCanvas) captureSceneAndMint(sceneCanvas);
    }
  }, [buttonState.takeoff, droneState.isFlying, captureSceneAndMint, sceneCanvas])

  useEffect(() => { generateWaypoints(currentScene) }, [currentScene, generateWaypoints])

  const cameraModes: { mode: CameraMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'follow', icon: <Video className="w-4 h-4" />, label: 'Follow' },
    { mode: 'fpv', icon: <Eye className="w-4 h-4" />, label: 'FPV' },
    { mode: 'top', icon: <MapPin className="w-4 h-4" />, label: 'Top' },
    { mode: 'orbit', icon: <Camera className="w-4 h-4" />, label: 'Orbit' },
  ]

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-background">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => setSceneCanvas(gl.domElement)}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent cameraMode={cameraMode} />
        </Suspense>
      </Canvas>

      <GameHUD />

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
          {cameraModes.map(({ mode, icon, label }) => (
            <Button key={mode} size="sm" variant={cameraMode === mode ? 'default' : 'ghost'} className="gap-2 justify-start" onClick={() => setCameraMode(mode)}>
              {icon} <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>

        {/* CONNECT HARDWARE BUTTON */}
        <Button 
          size="sm" 
          variant="outline" 
          className="gap-2 bg-background/90 border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => setInputSource({ type: 'serial' })}
        >
          <Cpu className="w-4 h-4" />
          <span className="text-xs font-bold">CONNECT CONTROLLER</span>
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <Button size="sm" disabled={!sceneCanvas || isMinting} onClick={() => sceneCanvas && captureSceneAndMint(sceneCanvas)}>
          {isMinting ? 'Minting...' : 'Capture & Mint'}
        </Button>
      </div>

      <KeyboardControls />
    </div>
  )
}