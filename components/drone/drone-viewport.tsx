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
  const { setIMUData, takeoff, land, setCurrentScene, triggerButton, addEventLog, droneState } = useDrone()
  const { gameState } = useGame()
  const keysPressed = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.add(key)
      
      // Prevent space from scrolling
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
    
    // Continuous input update loop
    const inputLoop = setInterval(() => {
      let pitch = 0, roll = 0, yaw = 0
      
      if (keysPressed.current.has('w')) pitch = 25
      if (keysPressed.current.has('s')) pitch = -25
      if (keysPressed.current.has('a')) roll = -25
      if (keysPressed.current.has('d')) roll = 25
      if (keysPressed.current.has('q')) yaw = -30
      if (keysPressed.current.has('e')) yaw = 30
      
      // Throttle controls for altitude
      if (keysPressed.current.has('r')) {
        setIMUData({ accelZ: 12 }) // Climb
      } else if (keysPressed.current.has('f')) {
        setIMUData({ accelZ: 7 }) // Descend
      } else {
        setIMUData({ accelZ: 9.81 }) // Hover
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
      {/* Camera setup based on mode */}
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
      
      {/* Lighting */}
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
      
      {/* Scene content */}
      <SceneRenderer />
      <DroneModel />
      <WaypointSystem />
      
      {/* Environment */}
      <Stars radius={200} depth={100} count={3000} factor={5} saturation={0} fade speed={0.5} />
      <Environment preset="night" />
    </>
  )
}

export function DroneViewport() {
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow')
  const { currentScene } = useDrone()
  const { generateWaypoints } = useGame()
  
  // Generate waypoints when scene changes
  useEffect(() => {
    generateWaypoints(currentScene)
  }, [currentScene, generateWaypoints])
  
  const cameraModes: { mode: CameraMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'follow', icon: <Video className="w-4 h-4" />, label: 'Follow' },
    { mode: 'fpv', icon: <Eye className="w-4 h-4" />, label: 'FPV' },
    { mode: 'top', icon: <MapPin className="w-4 h-4" />, label: 'Top' },
    { mode: 'orbit', icon: <Camera className="w-4 h-4" />, label: 'Orbit' },
  ]
  
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50 bg-background">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 pointer-events-none z-10" />
      
      <Canvas shadows gl={{ antialias: true, alpha: false }} className="w-full h-full">
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent cameraMode={cameraMode} />
        </Suspense>
      </Canvas>
      
      {/* Game HUD */}
      <GameHUD />
      
      {/* Camera mode selector */}
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
      
      {/* Keyboard handler (outside Canvas) */}
      <KeyboardControls />
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-primary/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-primary/50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-primary/50 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-primary/50 pointer-events-none" />
      
      {/* Scan lines effect */}
      <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)'
        }}
      />
    </div>
  )
}
