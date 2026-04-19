Run Arduino listner

node arduino-listener.js

pkill -f arduino-listener.js
lsof | grep usbmodem


let's check if the port is ready, if anything runs, kill -9 port
lsof | grep /dev/cu.usbmodem13101



Connectt to rubikpi
/dev/cu.usbmodem5A9B1112031

screen /dev/cu.usbmodem5A9B1112031 115200




🛩️ Drone Gesture Control System

Control a 3D drone simulator using real-time hand gestures powered by computer vision, WebSockets, and a custom hardware pipeline.

🚀 Overview

This project connects:

📷 RubikPi (Flask + MediaPipe) → detects hand gestures
🔌 ESP32 Controller (IMU + buttons) → controls drone movement
🌐 Next.js Web App (WebGL) → renders interactive drone simulation

A simple fist gesture triggers a water attack in the game.

🧠 Architecture
Camera (RubikPi)
      ↓
MediaPipe Hand Tracking
      ↓
Gesture Detection (FIST)
      ↓
Socket.IO (WebSocket / Polling)
      ↓
Frontend (Next.js)
      ↓
window.dispatchEvent('DRONE_FIRE_WATER')
      ↓
3D Drone Simulation 💧
🧰 Tech Stack
Backend (RubikPi)
Python
Flask
Flask-SocketIO
OpenCV
MediaPipe
Frontend
Next.js (React)
TypeScript
WebGL (3D simulation)
Socket.IO Client
Hardware
ESP32 (IMU + buttons)
USB Serial (Web Serial API)


⚙️ Setup
1. Clone the repository

2. Backend (RubikPi)
Install dependencies
pip install flask flask-socketio eventlet opencv-python mediapipe
Run server
python app.py

Server will run at:

http://192.168.2.3:5050
3. Frontend (Next.js)
npm install
npm run dev

Open:

http://localhost:3000
🔌 WebSocket Connection

Frontend connects to RubikPi using:

io("http://192.168.2.3:5050")
✊ Gesture Control
Supported Gesture
Gesture	Action
✊ Fist	💧 Water Attack

Backend emits:

socketio.emit("gesture", {
    "gesture": "fist",
    "confidence": 1.0
})

Frontend listens and triggers:

window.dispatchEvent(new Event('DRONE_FIRE_WATER'))
🎮 Controls
Hardware (ESP32)
Tilt → movement
Button → takeoff / land / reset
Gesture (Camera)
✊ Fist → fire water
🧪 Debugging
Check connection

In browser console:

console.log("connected to RubikPi socket")
Log incoming events
socket.onAny((event, ...args) => {
  console.log("EVENT:", event, args)
})
Manual test
window.dispatchEvent(new Event('DRONE_FIRE_WATER'))
⚠️ Common Issues
❌ Gesture not triggering
Check backend emits "gesture"
Verify frontend receives event
Ensure same WiFi network
❌ Socket reconnecting repeatedly
Use:
transports: ['polling']
❌ Camera not detected
Check camera index in app.py
Try switching between 0, 1, 2
🛠️ Future Improvements
🖐 Open hand → spray mode
🚀 Gesture combos (boost, shield)
🤖 AI gesture classification model
📱 Mobile support
🏆 Project Highlights
Real-time gesture → game interaction
Hardware + AI + Web integration
Low-latency WebSocket pipeline
Fully interactive 3D environment


📄 License

MIT License