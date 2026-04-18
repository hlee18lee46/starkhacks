'use client'

import { useRef, useEffect } from 'react'
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
  
  useFrame((_, delta) => {
    const dronePos = new THREE.Vector3(
      droneState.position.x,
      droneState.position.y,
      droneState.position.z
    )
    
    const yawRad = THREE.MathUtils.degToRad(droneState.rotation.yaw)
    
    if (mode === 'follow') {
      // Third person follow camera
      const cameraOffset = new THREE.Vector3(
        -Math.sin(yawRad) * 8,
        4 + droneState.position.y * 0.3,
        -Math.cos(yawRad) * 8
      )
      
      const targetPos = dronePos.clone().add(cameraOffset)
      positionRef.current.lerp(targetPos, 4 * delta)
      camera.position.copy(positionRef.current)
      
      targetRef.current.lerp(dronePos, 6 * delta)
      camera.lookAt(targetRef.current)
    } else if (mode === 'fpv') {
      // First person view
      const fpvOffset = new THREE.Vector3(
        Math.sin(yawRad) * 0.2,
        0.1,
        Math.cos(yawRad) * 0.2
      )
      
      const fpvPos = dronePos.clone().add(fpvOffset)
      camera.position.lerp(fpvPos, 10 * delta)
      
      const lookDir = new THREE.Vector3(
        Math.sin(yawRad) * 10,
        droneState.position.y - Math.sin(THREE.MathUtils.degToRad(droneState.rotation.pitch)) * 5,
        Math.cos(yawRad) * 10
      )
      
      targetRef.current.lerp(dronePos.clone().add(lookDir), 8 * delta)
      camera.lookAt(targetRef.current)
    } else if (mode === 'top') {
      // Top-down view
      const topOffset = new THREE.Vector3(0, 30 + droneState.position.y, 0)
      const targetPos = dronePos.clone().add(topOffset)
      
      positionRef.current.lerp(targetPos, 3 * delta)
      camera.position.copy(positionRef.current)
      camera.lookAt(dronePos)
    }
    // orbit mode uses OrbitControls, so no manual camera update
  })
  
  return null
}
