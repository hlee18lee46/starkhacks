'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function DamagedBuilding({ position, damage }: { position: [number, number, number], damage: 'light' | 'heavy' | 'collapsed' }) {
  const baseHeight = damage === 'collapsed' ? 4 : damage === 'heavy' ? 10 : 15
  
  return (
    <group position={position}>
      {/* Main structure */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, baseHeight, 6]} />
        <meshStandardMaterial color="#3a2a2a" metalness={0.2} roughness={0.9} />
      </mesh>
      
      {/* Damage details */}
      {damage === 'heavy' && (
        <>
          <mesh position={[2, 8, 3.1]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[2, 4, 0.5]} />
            <meshStandardMaterial color="#2a1a1a" />
          </mesh>
          <mesh position={[-1, 5, 3.1]} rotation={[0.2, 0, -0.1]}>
            <boxGeometry args={[3, 2, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </>
      )}
      
      {damage === 'collapsed' && (
        <>
          {/* Debris pile */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh 
              key={i}
              position={[
                (Math.random() - 0.5) * 8,
                Math.random() * 2,
                (Math.random() - 0.5) * 8
              ]}
              rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
              castShadow
            >
              <boxGeometry args={[1 + Math.random(), 0.5 + Math.random(), 1 + Math.random()]} />
              <meshStandardMaterial color="#2a2020" />
            </mesh>
          ))}
        </>
      )}
      
      {/* Fire glow for heavy damage */}
      {damage === 'heavy' && (
        <pointLight position={[0, 3, 0]} color="#ff4400" intensity={2} distance={8} />
      )}
    </group>
  )
}

function EmergencyVehicle({ position, type }: { position: [number, number, number], type: 'ambulance' | 'firetruck' }) {
  const lightRef = useRef<THREE.PointLight>(null)
  
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = Math.sin(state.clock.elapsedTime * 10) > 0 ? 3 : 0
    }
  })
  
  const color = type === 'ambulance' ? '#ffffff' : '#cc0000'
  
  return (
    <group position={position}>
      {/* Vehicle body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2, 1.2, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Cab */}
      <mesh position={[0, 1.6, -1]} castShadow>
        <boxGeometry args={[1.8, 0.8, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Emergency lights */}
      <mesh position={[0, 2.2, -1]}>
        <boxGeometry args={[0.8, 0.2, 0.4]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 2.5, -1]} color="#ff0000" intensity={3} distance={15} />
      
      {/* Wheels */}
      {[[-0.9, 0.3, -1.2], [0.9, 0.3, -1.2], [-0.9, 0.3, 1.2], [0.9, 0.3, 1.2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  )
}

function RescueMarker({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime
      ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1)
    }
  })
  
  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2, 32]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.8} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1, 0]} color="#ff0000" intensity={2} distance={10} />
    </group>
  )
}

export function EmergencyScene() {
  return (
    <group>
      {/* Ground - damaged terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2a1a1a" metalness={0.1} roughness={0.95} />
      </mesh>
      
      {/* Cracked ground details */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh 
          key={i}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]} 
          position={[(Math.random() - 0.5) * 40, 0.01, (Math.random() - 0.5) * 40]}
        >
          <planeGeometry args={[0.1, 5 + Math.random() * 10]} />
          <meshStandardMaterial color="#1a0a0a" />
        </mesh>
      ))}
      
      {/* Damaged buildings */}
      <DamagedBuilding position={[-20, 0, -15]} damage="light" />
      <DamagedBuilding position={[15, 0, -20]} damage="heavy" />
      <DamagedBuilding position={[-10, 0, 20]} damage="collapsed" />
      <DamagedBuilding position={[20, 0, 10]} damage="light" />
      <DamagedBuilding position={[0, 0, -30]} damage="heavy" />
      
      {/* Emergency vehicles */}
      <EmergencyVehicle position={[-8, 0, 5]} type="ambulance" />
      <EmergencyVehicle position={[5, 0, 8]} type="firetruck" />
      
      {/* Rescue markers */}
      <RescueMarker position={[-10, 0.1, 20]} />
      <RescueMarker position={[15, 0.1, -18]} />
      
      {/* Smoke effect (using fog) */}
      <fog attach="fog" args={['#1a0a0a', 15, 60]} />
      
      {/* Emergency area lighting */}
      <pointLight position={[0, 20, 0]} color="#ff6600" intensity={0.5} distance={50} />
      
      {/* Scattered debris */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh 
          key={i}
          position={[
            (Math.random() - 0.5) * 50,
            Math.random() * 0.3,
            (Math.random() - 0.5) * 50
          ]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
          castShadow
        >
          <boxGeometry args={[0.3 + Math.random() * 0.5, 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.5]} />
          <meshStandardMaterial color="#3a2020" />
        </mesh>
      ))}
    </group>
  )
}
