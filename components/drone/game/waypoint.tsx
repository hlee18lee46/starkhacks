'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useDrone } from '@/lib/drone-context'
import { useGame, type Waypoint as WaypointType } from '@/lib/game-state'
import * as THREE from 'three'

interface WaypointProps {
  waypoint: WaypointType
}

export function Waypoint({ waypoint }: WaypointProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const { droneState } = useDrone()
  const { collectWaypoint, gameState } = useGame()
  const [pulseScale, setPulseScale] = useState(1)
  
  const colors = {
    checkpoint: { main: '#00ffff', glow: '#00aaff' },
    target: { main: '#ff4444', glow: '#ff0000' },
    bonus: { main: '#ffff00', glow: '#ffaa00' }
  }
  
  const color = colors[waypoint.type]
  const collectRadius = waypoint.type === 'target' ? 3 : 2

  useFrame((state) => {
    if (!groupRef.current || waypoint.collected) return
    
    // Animate rotation
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.5
    
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2
    }
    
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -state.clock.elapsedTime * 3
    }
    
    // Pulse effect
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15
    setPulseScale(pulse)
    
    // Check collision with drone
    if (gameState.isPlaying && !gameState.isPaused) {
      const dronePos = new THREE.Vector3(
        droneState.position.x,
        droneState.position.y,
        droneState.position.z
      )
      const waypointPos = new THREE.Vector3(...waypoint.position)
      const distance = dronePos.distanceTo(waypointPos)
      
      if (distance < collectRadius) {
        collectWaypoint(waypoint.id)
      }
    }
  })

  if (waypoint.collected) return null

  return (
    <group ref={groupRef} position={waypoint.position}>
      {/* Outer ring */}
      <mesh ref={ringRef} scale={[pulseScale, pulseScale, 1]}>
        <torusGeometry args={[1.5, 0.08, 8, 32]} />
        <meshStandardMaterial 
          color={color.main} 
          emissive={color.main} 
          emissiveIntensity={0.8} 
          transparent 
          opacity={0.9}
        />
      </mesh>
      
      {/* Inner ring */}
      <mesh ref={innerRingRef} scale={[pulseScale, pulseScale, 1]}>
        <torusGeometry args={[0.8, 0.05, 8, 24]} />
        <meshStandardMaterial 
          color={color.glow} 
          emissive={color.glow} 
          emissiveIntensity={1} 
          transparent 
          opacity={0.7}
        />
      </mesh>
      
      {/* Center sphere */}
      <mesh scale={[pulseScale * 0.8, pulseScale * 0.8, pulseScale * 0.8]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color={color.main} 
          emissive={color.main} 
          emissiveIntensity={1.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Point light */}
      <pointLight 
        color={color.main} 
        intensity={2 * pulseScale} 
        distance={8}
      />
      
      {/* Vertical beam */}
      <mesh position={[0, -waypoint.position[1] / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, waypoint.position[1], 8]} />
        <meshStandardMaterial 
          color={color.main} 
          emissive={color.main} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  )
}

export function WaypointSystem() {
  const { gameState } = useGame()
  
  return (
    <group>
      {gameState.waypoints.map(waypoint => (
        <Waypoint key={waypoint.id} waypoint={waypoint} />
      ))}
    </group>
  )
}
