"use client"

type MintSceneSnapshotArgs = {
  canvas: HTMLCanvasElement
  recipientWallet: string
  missionId?: string
  inspectionId?: string
  buildingId?: string
  sceneName?: string
  issueType?: string
  dronePosition?: { x: number; y: number; z: number }
  droneRotation?: { pitch: number; roll: number; yaw: number }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to convert canvas to blob"))
        return
      }
      resolve(blob)
    }, "image/png")
  })
}

export async function mintSceneSnapshot({
  canvas,
  recipientWallet,
  missionId,
  inspectionId,
  buildingId,
  sceneName,
  issueType,
  dronePosition,
  droneRotation,
}: MintSceneSnapshotArgs) {
  const imageBlob = await canvasToBlob(canvas)
  const imageFile = new File([imageBlob], "drone-scene-capture.png", {
    type: "image/png",
  })

  const formData = new FormData()
  formData.append("recipientWallet", recipientWallet)
  formData.append("image", imageFile)
  formData.append("name", "Drone Inspection Snapshot")
  formData.append("symbol", "DRONE")
  formData.append(
    "description",
    "Captured during drone simulation building inspection"
  )

  formData.append("projectName", "Drone Simulation")
  formData.append("capturedAt", new Date().toISOString())

  if (missionId) formData.append("missionId", missionId)
  if (inspectionId) formData.append("inspectionId", inspectionId)
  if (buildingId) formData.append("buildingId", buildingId)
  if (sceneName) formData.append("sceneName", sceneName)
  if (issueType) formData.append("issueType", issueType)

  if (dronePosition) {
    formData.append("dronePosX", String(dronePosition.x))
    formData.append("dronePosY", String(dronePosition.y))
    formData.append("dronePosZ", String(dronePosition.z))
  }

  if (droneRotation) {
    formData.append("droneRotPitch", String(droneRotation.pitch))
    formData.append("droneRotRoll", String(droneRotation.roll))
    formData.append("droneRotYaw", String(droneRotation.yaw))
  }

  const response = await fetch("/api/nft/mint", {
    method: "POST",
    body: formData,
  })

  const result = await response.json()

  if (!response.ok || !result.ok) {
    throw new Error(result?.error || "Mint failed")
  }

  return result
}