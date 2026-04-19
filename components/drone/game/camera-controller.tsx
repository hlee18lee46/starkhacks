'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useDrone } from '@/lib/drone-context'
import * as THREE from 'three'

interface CameraControllerProps {
  mode: 'follow' | 'orbit' | 'fpv' | 'top'
}

export function CameraController({ mode }: CameraControllerProps) {
  const { camera } = useThree()
  const { droneState } = useDrone()
  const targetRef = useRef(new THREE.Vector3())
  const positionRef = useRef(new THREE.Vector3())
  
  useFrame((state, delta) => {
    const dronePos = new THREE.Vector3(droneState.position.x, droneState.position.y, droneState.position.z)
    const yawRad = THREE.MathUtils.degToRad(droneState.rotation.yaw)
    const pitchRad = THREE.MathUtils.degToRad(droneState.rotation.pitch)
    const rollRad = THREE.MathUtils.degToRad(droneState.rotation.roll)
    
    // Reset camera up vector to ensure roll applies correctly
    camera.up.set(0, 1, 0)

    if (mode === 'follow') {
      const cameraOffset = new THREE.Vector3(-Math.sin(yawRad) * 8, 4 + droneState.position.y * 0.1, -Math.cos(yawRad) * 8)
      const targetPos = dronePos.clone().add(cameraOffset)
      positionRef.current.lerp(targetPos, 4 * delta)
      camera.position.copy(positionRef.current)
      targetRef.current.lerp(dronePos, 6 * delta)
      camera.lookAt(targetRef.current)

    } else if (mode === 'fpv') {
      // 1. Move camera to drone position
      camera.position.lerp(dronePos, 10 * delta)
      
      // 2. Calculate Look Direction from IMU
      // X = Sin(Yaw) * Cos(Pitch), Y = -Sin(Pitch), Z = Cos(Yaw) * Cos(Pitch)
      const lookDir = new THREE.Vector3(
        Math.sin(yawRad) * Math.cos(pitchRad),
        -Math.sin(pitchRad), 
        Math.cos(yawRad) * Math.cos(pitchRad)
      )
      
      const targetPoint = dronePos.clone().add(lookDir.multiplyScalar(5))
      targetRef.current.lerp(targetPoint, 12 * delta)
      camera.lookAt(targetRef.current)

      // 3. Apply Banking (Roll)
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, rollRad, 5 * delta)

    } else if (mode === 'top') {
      const topOffset = new THREE.Vector3(0, 30, 0)
      positionRef.current.lerp(dronePos.clone().add(topOffset), 3 * delta)
      camera.position.copy(positionRef.current)
      camera.lookAt(dronePos)
    }
  })
  
  return null
}