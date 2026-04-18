'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useDrone } from '@/lib/drone-context'
import * as THREE from 'three'

export function DroneModel() {
  const groupRef = useRef<THREE.Group>(null)
  const propellerRefs = useRef<THREE.Mesh[]>([])
  const { droneState, imuData } = useDrone()

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Smooth position and rotation updates
    const targetRotation = {
      x: THREE.MathUtils.degToRad(droneState.rotation.pitch),
      z: THREE.MathUtils.degToRad(-droneState.rotation.roll),
      y: THREE.MathUtils.degToRad(droneState.rotation.yaw)
    }

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotation.x,
      5 * delta
    )
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotation.z,
      5 * delta
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation.y,
      3 * delta
    )

    // Hover animation when flying
    if (droneState.isFlying) {
      groupRef.current.position.y = droneState.position.y + Math.sin(state.clock.elapsedTime * 3) * 0.05
    } else {
      groupRef.current.position.y = droneState.position.y
    }

    groupRef.current.position.x = droneState.position.x
    groupRef.current.position.z = droneState.position.z

    // Spin propellers
    const propSpeed = droneState.isFlying ? 50 : 5
    propellerRefs.current.forEach((prop) => {
      if (prop) {
        prop.rotation.y += propSpeed * delta
      }
    })
  })

  const propellerPositions = [
    [0.6, 0.15, 0.6],
    [-0.6, 0.15, 0.6],
    [0.6, 0.15, -0.6],
    [-0.6, 0.15, -0.6]
  ] as const

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Body accent */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.45, 0.08, 0.45]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.9} roughness={0.1} emissive="#00d4ff" emissiveIntensity={0.3} />
      </mesh>

      {/* Camera dome */}
      <mesh position={[0, -0.1, 0.15]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Arms and motors */}
      {propellerPositions.map((pos, i) => (
        <group key={i}>
          {/* Arm */}
          <mesh 
            position={[pos[0] * 0.5, 0, pos[2] * 0.5]} 
            rotation={[0, Math.atan2(pos[0], pos[2]), 0]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.05, 0.7]} />
            <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Motor housing */}
          <mesh position={[pos[0], pos[1] - 0.05, pos[2]]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.1, 8]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          </mesh>
          
          {/* Motor LED ring */}
          <mesh position={[pos[0], pos[1] - 0.02, pos[2]]}>
            <torusGeometry args={[0.09, 0.01, 8, 16]} />
            <meshStandardMaterial 
              color={droneState.isFlying ? "#00ff88" : "#ff4444"} 
              emissive={droneState.isFlying ? "#00ff88" : "#ff4444"} 
              emissiveIntensity={0.8} 
            />
          </mesh>
          
          {/* Propeller */}
          <mesh 
            ref={(el) => { if (el) propellerRefs.current[i] = el }}
            position={[pos[0], pos[1] + 0.05, pos[2]]}
          >
            <boxGeometry args={[0.4, 0.01, 0.05]} />
            <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Status light on top */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial 
          color={droneState.isFlying ? "#00d4ff" : "#ff8800"} 
          emissive={droneState.isFlying ? "#00d4ff" : "#ff8800"} 
          emissiveIntensity={1} 
        />
      </mesh>

      {/* Landing gear */}
      {[[-0.25, -0.15, 0.3], [0.25, -0.15, 0.3], [-0.25, -0.15, -0.3], [0.25, -0.15, -0.3]].map((pos, i) => (
        <mesh key={`gear-${i}`} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
          <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
