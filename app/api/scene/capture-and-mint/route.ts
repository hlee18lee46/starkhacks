import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import FormData from "form-data"
import bs58 from "bs58"
import clientPromise from "@/lib/mongodb"

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi"
import {
  mplTokenMetadata,
  createNft,
} from "@metaplex-foundation/mpl-token-metadata"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    const recipientWallet = form.get("recipientWallet") as string | null
    const imageFile = form.get("image") as File | null

    const name =
      (form.get("name") as string | null) || "Drone Inspection Snapshot"
    const symbol = (form.get("symbol") as string | null) || "DRONE"
    const description =
      (form.get("description") as string | null) ||
      "Captured during drone simulation building inspection"

    const projectName =
      (form.get("projectName") as string | null) || "Drone Simulation"
    const missionId = (form.get("missionId") as string | null) || null
    const inspectionId = (form.get("inspectionId") as string | null) || null
    const buildingId = (form.get("buildingId") as string | null) || null
    const sceneName = (form.get("sceneName") as string | null) || null
    const issueType = (form.get("issueType") as string | null) || null
    const capturedAt =
      (form.get("capturedAt") as string | null) || new Date().toISOString()

    const dronePosX = (form.get("dronePosX") as string | null) || null
    const dronePosY = (form.get("dronePosY") as string | null) || null
    const dronePosZ = (form.get("dronePosZ") as string | null) || null

    const droneRotPitch = (form.get("droneRotPitch") as string | null) || null
    const droneRotYaw = (form.get("droneRotYaw") as string | null) || null
    const droneRotRoll = (form.get("droneRotRoll") as string | null) || null

    if (!recipientWallet) {
      return NextResponse.json(
        { ok: false, error: "recipientWallet is required" },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return NextResponse.json(
        { ok: false, error: "image file is required" },
        { status: 400 }
      )
    }

    if (!imageFile.type?.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "uploaded file must be an image" },
        { status: 400 }
      )
    }

    const pinataJwt = process.env.PINATA_JWT
    const pinataGateway = process.env.PINATA_GATEWAY
    const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY_BASE58
    const rpcUrl =
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"

    if (!pinataJwt || !pinataGateway || !solanaPrivateKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required env vars: PINATA_JWT, PINATA_GATEWAY, SOLANA_PRIVATE_KEY_BASE58",
        },
        { status: 500 }
      )
    }

    const normalizedGateway = pinataGateway.replace(/\/+$/, "")

    // 1) Prepare uploaded screenshot buffer
    const imageBytes = await imageFile.arrayBuffer()
    const imageBuffer = Buffer.from(imageBytes)

    // 2) Upload scene image to Pinata directly from memory (avoids blocking fs I/O)
    const pinataFileForm = new FormData()
    pinataFileForm.append("file", imageBuffer, {
      filename: "scene.png",
      contentType: "image/png",
    })

    const pinataFileResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      pinataFileForm,
      {
        maxBodyLength: Infinity,
        headers: {
          ...pinataFileForm.getHeaders(),
          Authorization: `Bearer ${pinataJwt}`,
        },
      }
    )

    const imageCID = pinataFileResponse.data.IpfsHash
    const imageUrl = `${normalizedGateway}/${imageCID}`

    // 3) Build metadata
    const nftAttributes = [
      { trait_type: "project", value: projectName },
      { trait_type: "capturedAt", value: capturedAt },
      ...(missionId ? [{ trait_type: "missionId", value: missionId }] : []),
      ...(inspectionId
        ? [{ trait_type: "inspectionId", value: inspectionId }]
        : []),
      ...(buildingId ? [{ trait_type: "buildingId", value: buildingId }] : []),
      ...(sceneName ? [{ trait_type: "sceneName", value: sceneName }] : []),
      ...(issueType ? [{ trait_type: "issueType", value: issueType }] : []),
      ...(dronePosX ? [{ trait_type: "dronePosX", value: dronePosX }] : []),
      ...(dronePosY ? [{ trait_type: "dronePosY", value: dronePosY }] : []),
      ...(dronePosZ ? [{ trait_type: "dronePosZ", value: dronePosZ }] : []),
      ...(droneRotPitch
        ? [{ trait_type: "droneRotPitch", value: droneRotPitch }]
        : []),
      ...(droneRotYaw
        ? [{ trait_type: "droneRotYaw", value: droneRotYaw }]
        : []),
      ...(droneRotRoll
        ? [{ trait_type: "droneRotRoll", value: droneRotRoll }]
        : []),
    ]

    const metadata = {
      name,
      symbol,
      description,
      seller_fee_basis_points: 0,
      image: imageUrl,
      external_url: null,
      attributes: nftAttributes,
      properties: {
        files: [
          {
            uri: imageUrl,
            type: "image/png",
          },
        ],
        category: "image",
      },
    }

    // 4) Upload metadata JSON
    const pinataMetadataResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pinataJwt}`,
        },
      }
    )

    const metadataCID = pinataMetadataResponse.data.IpfsHash
    const metadataUri = `${normalizedGateway}/${metadataCID}`

    // 5) Mint NFT
    const secretKey = bs58.decode(solanaPrivateKey)

    const umi = createUmi(rpcUrl).use(mplTokenMetadata())
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey)
    umi.use(keypairIdentity(umiKeypair))

    const mintSigner = generateSigner(umi)

    const mintResult = await createNft(umi, {
      mint: mintSigner,
      name,
      symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      tokenOwner: publicKey(recipientWallet),
    }).sendAndConfirm(umi)

    const mintAddress = mintSigner.publicKey.toString()
    const signature = bs58.encode(mintResult.signature)
    const explorer = `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`

    // 6) Save to Mongo
    const mongoClient = await clientPromise
    const db = mongoClient.db("drone")
    const mintedCollection = db.collection("mintednfts")

    await mintedCollection.insertOne({
      projectName,
      recipientWallet,
      name,
      symbol,
      description,
      missionId,
      inspectionId,
      buildingId,
      sceneName,
      issueType,
      capturedAt,
      dronePosition: {
        x: dronePosX,
        y: dronePosY,
        z: dronePosZ,
      },
      droneRotation: {
        pitch: droneRotPitch,
        yaw: droneRotYaw,
        roll: droneRotRoll,
      },
      mintAddress,
      signature,
      imageCID,
      imageUrl,
      metadataCID,
      metadataUri,
      explorer,
      uploadedFileName: "scene.png",
      uploadedFileType: "image/png",
      savedAt: new Date(),
    })

    return NextResponse.json({
      ok: true,
      message: "Scene captured and NFT minted successfully",
      recipientWallet,
      mintAddress,
      signature,
      explorer,
      imageCID,
      imageUrl,
      metadataCID,
      metadataUri,
    })
  } catch (error: any) {
    console.error("Scene capture-and-mint error:", error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Scene capture-and-mint failed",
        details: error?.response?.data || null,
      },
      { status: 500 }
    )
  }
}
