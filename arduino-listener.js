import { SerialPort } from "serialport"
import { ReadlineParser } from "@serialport/parser-readline"
import fetch from "node-fetch"
import fs from "fs"
import FormData from "form-data"

// ⚠️ CHANGE THIS PORT
const port = new SerialPort({
    path: "/dev/cu.usbmodem13101",
  baudRate: 9600,
})

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }))

parser.on("data", async (line) => {
  const msg = line.trim()
  console.log("Arduino:", msg)

  if (msg === "BTN3") {
    console.log("🔥 Button 3 pressed → mint NFT")

    try {
      const form = new FormData()

      form.append(
        "recipientWallet",
        "4XQUxCBZ7njW2Zw5SVWL199SfVn5xrHENpr4KagzYM3d"
      )

      form.append("image", fs.createReadStream("./test.png"))

      form.append("name", "Drone Auto Capture")
      form.append("symbol", "DRONE")
      form.append("description", "Captured from hardware trigger")

      const res = await fetch("http://localhost:3000/api/nft/mint", {
        method: "POST",
        body: form,
      })

      const data = await res.json()
      console.log("✅ Mint result:", data)
    } catch (err) {
      console.error("❌ Mint failed:", err)
    }
  }
})