'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Building({ position, size, color }: { position: [number, number, number], size: [number, number, number], color: string }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Windows */}
      {Array.from({ length: Math.floor(size[1] / 2) }).map((_, floor) => (
        Array.from({ length: Math.floor(size[0] / 1.5) }).map((_, col) => (
          <mesh 
            key={`${floor}-${col}`}
            position={[
              -size[0] / 2 + 0.8 + col * 1.5,
              1.5 + floor * 2,
              size[2] / 2 + 0.01
            ]}
          >
            <planeGeometry args={[0.8, 1.2]} />
            <meshStandardMaterial 
              color="#00d4ff" 
              emissive="#00d4ff" 
              emissiveIntensity={Math.random() > 0.3 ? 0.3 : 0} 
              transparent 
              opacity={0.8}
            />
          </mesh>
        ))
      ))}
      
      {/* Roof details */}
      <mesh position={[0, size[1] + 0.25, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.3, 0.5, size[2] * 0.3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  )
}

function StreetLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 5, 8]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.3, 4.8, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      <pointLight position={[0.3, 4.5, 0]} color="#ffaa00" intensity={2} distance={10} castShadow />
    </group>
  )
}

export function UrbanScene() {
  const buildings = [
    { position: [-15, 0, -20] as [number, number, number], size: [6, 25, 6] as [number, number, number], color: '#1e2a3a' },
    { position: [15, 0, -25] as [number, number, number], size: [8, 35, 8] as [number, number, number], color: '#1a2a35' },
    { position: [-20, 0, 10] as [number, number, number], size: [5, 18, 5] as [number, number, number], color: '#2a2a3a' },
    { position: [20, 0, 15] as [number, number, number], size: [7, 22, 7] as [number, number, number], color: '#1e2535' },
    { position: [0, 0, -30] as [number, number, number], size: [10, 40, 10] as [number, number, number], color: '#1a1f2e' },
    { position: [-25, 0, -10] as [number, number, number], size: [6, 15, 6] as [number, number, number], color: '#252535' },
    { position: [25, 0, -5] as [number, number, number], size: [5, 20, 5] as [number, number, number], color: '#1e2530' },
    { position: [-10, 0, 25] as [number, number, number], size: [8, 28, 8] as [number, number, number], color: '#202535' },
    { position: [10, 0, 30] as [number, number, number], size: [6, 32, 6] as [number, number, number], color: '#1a2030' }
  ]

  return (
    <group>
      {/* Ground - city street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.2} roughness={0.9} />
      </mesh>
      
      {/* Road markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.95} />
      </mesh>
      
      {/* Center line */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -45 + i * 10]}>
          <planeGeometry args={[0.2, 5]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.2} />
        </mesh>
      ))}
      
      {/* Buildings */}
      {buildings.map((building, i) => (
        <Building key={i} {...building} />
      ))}
      
      {/* Street lights */}
      {[-30, -15, 0, 15, 30].map((z, i) => (
        <StreetLight key={i} position={[5, 0, z]} />
      ))}
      
      {/* Ambient city glow */}
      <fog attach="fog" args={['#0a0a15', 20, 80]} />
    </group>
  )
}
