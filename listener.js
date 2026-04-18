import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import fetch from "node-fetch";

/**
 * ⚠️ CONFIGURATION
 * 1. Ensure your Arduino is plugged in.
 * 2. Update 'path' to match your port (e.g., COM3 on Windows or /dev/cu... on Mac).
 */
const ARDUINO_PATH = "/dev/cu.usbmodem1101"; 
const NEXTJS_API_URL = "http://localhost:3000/api/hardware/events";

const port = new SerialPort({
  path: ARDUINO_PATH,
  baudRate: 9600,
});

// Use the Readline parser to handle the \n terminated strings from Arduino
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

console.log(`🚀 Arduino Listener Started`);
console.log(`📡 Monitoring port: ${ARDUINO_PATH}`);
console.log(`🔗 Bridging to: ${NEXTJS_API_URL}`);

parser.on("data", async (line) => {
  const msg = line.trim();
  
  // Log all messages from Arduino for debugging
  if (msg) console.log("Arduino Serial:", msg);

  // Logic for Button 3 (NFT Minting)
  if (msg === "BTN3") {
    console.log("🔥 Physical Button 3 Pressed!");
    console.log("📡 Sending capture signal to game engine...");

    try {
      const response = await fetch(NEXTJS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "capture",
          timestamp: new Date().toISOString() 
        }),
      });

      if (response.ok) {
        console.log("✅ Signal delivered to frontend successfully.");
      } else {
        console.error("⚠️ Frontend received signal but returned error:", response.status);
      }
    } catch (err) {
      console.error("❌ Failed to reach Next.js server. Is your app running?");
    }
  }

  // Logic for Button 2 (Optional: Scene Switch / Reset)
  if (msg === "BTN2") {
    console.log("🔄 Physical Button 2 Pressed! Sending scene switch signal...");
    try {
      await fetch(NEXTJS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch-scene" }),
      });
    } catch (err) {
        console.error("❌ Failed to send BTN2 signal");
    }
  }
});

// Handle Port Errors
port.on("error", (err) => {
  console.error("🔴 Serial Port Error: ", err.message);
});

// Handle Unexpected Closures
port.on("close", () => {
  console.log("🟡 Serial Port Closed. Check your USB connection.");
});