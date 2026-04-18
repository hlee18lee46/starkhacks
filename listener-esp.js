/**
 * listener-esp.js
 * Handles WebSerial connection and data parsing for the ESP32 Drone Controller.
 * Data format: B1,B2,B3,Joy,Roll,Pitch,Yaw
 */

class ESPController {
    constructor() {
        this.data = {
            btn1: false,
            btn2: false,
            btn3: false,
            throttle: 0, // Normalized -1.0 to 1.0
            roll: 0,
            pitch: 0,
            yaw: 0
        };
        this.port = null;
        this.reader = null;
        this.keepReading = true;

        // Configuration for normalization
        this.JOY_CENTER = 3170; 
        this.JOY_MAX = 4095;
        this.JOY_MIN = 0;
    }

    async connect() {
        try {
            // Request port from user
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });

            console.log("Connected to ESP32 Controller");

            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
            const inputStream = textDecoder.readable;
            this.reader = inputStream.getReader();

            this.readLoop();
        } catch (error) {
            console.error("Serial Connection Error:", error);
        }
    }

    async readLoop() {
        let lineBuffer = "";

        while (this.keepReading) {
            try {
                const { value, done } = await this.reader.read();
                if (done) {
                    this.reader.releaseLock();
                    break;
                }

                lineBuffer += value;
                const lines = lineBuffer.split("\n");
                
                // If the last element isn't a full line, keep it in the buffer
                lineBuffer = lines.pop();

                for (const line of lines) {
                    if (line.trim().length > 0) {
                        this.parseCSV(line.trim());
                    }
                }
            } catch (error) {
                console.error("Read Error:", error);
                break;
            }
        }
    }

    parseCSV(csvLine) {
        const parts = csvLine.split(",");
        if (parts.length < 7) return;

        // 1. Buttons (Already 0 or 1 from ESP)
        this.data.btn1 = parts[0] === "1";
        this.data.btn2 = parts[1] === "1";
        this.data.btn3 = parts[2] === "1";

        // 2. Joystick/Throttle Normalization
        // Upward (0) -> 1.0 | Center (3170) -> 0.0 | Downward (4095) -> -1.0
        const rawJoy = parseInt(parts[3]);
        if (rawJoy < this.JOY_CENTER) {
            // Range from 0 to 3170
            this.data.throttle = (this.JOY_CENTER - rawJoy) / this.JOY_CENTER;
        } else {
            // Range from 3170 to 4095
            this.data.throttle = (this.JOY_CENTER - rawJoy) / (this.JOY_MAX - this.JOY_CENTER);
        }

        // 3. IMU Angles (Directly from BNO08x)
        this.data.roll = parseFloat(parts[4]);
        this.data.pitch = parseFloat(parts[5]);
        this.data.yaw = parseFloat(parts[6]);

        // Optional: trigger a callback or update your game state here
        // this.onUpdate(this.data);
    }

    async disconnect() {
        this.keepReading = false;
        if (this.reader) {
            await this.reader.cancel();
        }
        if (this.port) {
            await this.port.close();
        }
    }
}

// Global instance for the game
const droneController = new ESPController();