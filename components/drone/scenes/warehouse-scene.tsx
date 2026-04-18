'use client'

function Shelf({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Shelf frame */}
      {[[-1.5, 0, 0], [1.5, 0, 0], [-1.5, 0, 0.8], [1.5, 0, 0.8]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 3, pos[2]]} castShadow>
          <boxGeometry args={[0.1, 6, 0.1]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Shelf levels */}
      {[1, 2.5, 4, 5.5].map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.1, 1]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      
      {/* Boxes on shelves */}
      {[
        [0.5, 1.4, 0.4], [-0.8, 1.4, 0.3], [0.8, 2.9, 0.4],
        [-0.5, 4.4, 0.5], [0.3, 4.4, 0.3], [-0.7, 5.9, 0.4]
      ].map((pos, i) => (
        <mesh key={`box-${i}`} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.6 + Math.random() * 0.3, 0.5 + Math.random() * 0.3, 0.5]} />
          <meshStandardMaterial color={['#8B4513', '#D2691E', '#A0522D', '#CD853F'][i % 4]} />
        </mesh>
      ))}
    </group>
  )
}

function Obstacle({ position, type }: { position: [number, number, number], type: 'pillar' | 'crate' | 'barrel' }) {
  if (type === 'pillar') {
    return (
      <mesh position={position} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 8, 8]} />
        <meshStandardMaterial color="#5a5a6a" metalness={0.7} roughness={0.3} />
      </mesh>
    )
  }
  
  if (type === 'barrel') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.4, 1, 12]} />
          <meshStandardMaterial color="#2a5a3a" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[0.4, 0.03, 8, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    )
  }
  
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#8B4513" />
    </mesh>
  )
}

export function WarehouseScene() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1e1e1e" metalness={0.1} roughness={0.95} />
      </mesh>
      
      {/* Floor markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[8, 8.3, 32]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Safety lines */}
      {[-20, 20].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.2, 60]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.2} />
        </mesh>
      ))}
      
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 12, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
      </mesh>
      
      {/* Walls */}
      <mesh position={[0, 6, -30]}>
        <boxGeometry args={[60, 12, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[0, 6, 30]}>
        <boxGeometry args={[60, 12, 0.3]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[-30, 6, 0]}>
        <boxGeometry args={[0.3, 12, 60]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[30, 6, 0]}>
        <boxGeometry args={[0.3, 12, 60]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Shelving units */}
      <Shelf position={[-15, 0, -15]} />
      <Shelf position={[-15, 0, 0]} />
      <Shelf position={[-15, 0, 15]} />
      <Shelf position={[15, 0, -15]} rotation={Math.PI} />
      <Shelf position={[15, 0, 0]} rotation={Math.PI} />
      <Shelf position={[15, 0, 15]} rotation={Math.PI} />
      
      {/* Obstacles */}
      <Obstacle position={[-5, 4, -10]} type="pillar" />
      <Obstacle position={[5, 4, 10]} type="pillar" />
      <Obstacle position={[0, 0.75, -20]} type="crate" />
      <Obstacle position={[3, 0.5, -18]} type="barrel" />
      <Obstacle position={[-3, 0.5, 20]} type="barrel" />
      <Obstacle position={[8, 0.75, 5]} type="crate" />
      
      {/* Ceiling lights */}
      {[[-15, 0], [0, 0], [15, 0], [-15, -15], [0, -15], [15, -15], [-15, 15], [0, 15], [15, 15]].map((pos, i) => (
        <group key={i}>
          <mesh position={[pos[0], 11.5, pos[1]]}>
            <boxGeometry args={[2, 0.2, 0.5]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <pointLight position={[pos[0], 11, pos[1]]} color="#ffffff" intensity={1.5} distance={15} castShadow />
        </group>
      ))}
      
      <fog attach="fog" args={['#0d0d0d', 10, 50]} />
    </group>
  )
}
