//Esp32_final -> basic imu and button functionality
//Esp32_final_v1 -> Reliablity code to ensure stable functionality
//Esp32_final_v1.2 -> Implementing Smoothing Low Pass Algorithms and Motion State Detection and reset button to button 1
//Esp32_final_v1.3 -> Implementing a motion classifier for more smooth state detection
//Esp32_final_v1.4 -> Integrating a IOT Dashboard
#include <Wire.h>
#include <SparkFun_BNO08x_Arduino_Library.h>
#include <WiFi.h>
#include <WebSocketsServer.h>

#define SDA_PIN 41
#define SCL_PIN 42
#define BTN1 38
#define BTN2 39
#define BTN3 40
#define JOY_X 1

// ---------------- ACCESS POINT ----------------
const char* ssid = "Drone_Controller";
const char* password = "12345678";

WebSocketsServer webSocket = WebSocketsServer(81);

BNO08x imu;

// ---------------- RAW / FILTERED ----------------
float r = 0, p = 0, y = 0;
float r_f = 0, p_f = 0, y_f = 0;

// offsets
float r0 = 0, p0 = 0, y0_offset = 0;

// smoothing
const float alpha = 0.15;
const float deadband = 1.0;

// ---------------- GESTURE ENUM ----------------
enum GestureState {
  NEUTRAL,
  FORWARD,
  BACKWARD,
  LEFT,
  RIGHT,
  TURN_LEFT,
  TURN_RIGHT
};

GestureState gesture = NEUTRAL;

// debounce
bool lastB1 = 0, lastB2 = 0, lastB3 = 0;
unsigned long lastDebounceTime = 0;
const int debounceDelay = 30;

// ---------------- CLASSIFIER ----------------
GestureState classifyGesture(float r, float p, float y) {

  float motion = abs(r) + abs(p) + abs(y);
  if (motion < 5.0) return NEUTRAL;

  float forwardScore = p;
  float backwardScore = -p;

  float leftScore = -r;
  float rightScore = r;

  float turnLeftScore = -y;
  float turnRightScore = y;

  float maxScore = forwardScore;
  GestureState best = FORWARD;

  if (backwardScore > maxScore) { maxScore = backwardScore; best = BACKWARD; }
  if (leftScore > maxScore)     { maxScore = leftScore; best = LEFT; }
  if (rightScore > maxScore)    { maxScore = rightScore; best = RIGHT; }
  if (turnLeftScore > maxScore) { maxScore = turnLeftScore; best = TURN_LEFT; }
  if (turnRightScore > maxScore){ maxScore = turnRightScore; best = TURN_RIGHT; }

  if (maxScore < 8.0) return NEUTRAL;

  return best;
}

// ---------------- WEBSOCKET EVENT ----------------
void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("Client Connected");
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);

  // ---------------- IMU ----------------
  if (imu.begin()) {
    imu.enableGameRotationVector(20);
    Serial.println("IMU Ready");
  } else {
    Serial.println("IMU NOT FOUND");
    while (1);
  }

  // ---------------- ACCESS POINT MODE ----------------
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);

  Serial.println("\nAccess Point Started");
  Serial.print("Network Name: ");
  Serial.println(ssid);
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());

  // ---------------- WEBSOCKET ----------------
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
}

void loop() {

  webSocket.loop();

  // ---------------- IMU UPDATE ----------------
  if (imu.getSensorEvent()) {
    if (imu.getSensorEventID() == SENSOR_REPORTID_GAME_ROTATION_VECTOR) {
      r = imu.getRoll()  * 180.0 / PI;
      p = imu.getPitch() * 180.0 / PI;
      y = imu.getYaw()   * 180.0 / PI;
    }
  }

  // ---------------- FILTER ----------------
  r_f = alpha * r + (1 - alpha) * r_f;
  p_f = alpha * p + (1 - alpha) * p_f;
  y_f = alpha * y + (1 - alpha) * y_f;

  // ---------------- OFFSET ----------------
  float r_out = (abs(r_f - r0) < deadband) ? 0 : (r_f - r0);
  float p_out = (abs(p_f - p0) < deadband) ? 0 : (p_f - p0);
  float y_out = (abs(y_f - y0_offset) < deadband) ? 0 : (y_f - y0_offset);

  // ---------------- BUTTONS ----------------
  bool b1 = !digitalRead(BTN1);

  if (millis() - lastDebounceTime > debounceDelay) {
    if (b1 && !lastB1) {
      r0 = r_f;
      p0 = p_f;
      y0_offset = y_f;
      Serial.println("Re-zeroed");
    }

    lastB1 = b1;
    lastDebounceTime = millis();
  }

  // ---------------- CLASSIFIER ----------------
  gesture = classifyGesture(r_out, p_out, y_out);

  // ---------------- JOYSTICK ----------------
  int joy = analogRead(JOY_X);

  static int joy_f = 0;
  joy_f = 0.2 * joy + 0.8 * joy_f;

  // ---------------- JSON STREAM ----------------
  String json = "{";
  json += "\"roll\":" + String(r_out) + ",";
  json += "\"pitch\":" + String(p_out) + ",";
  json += "\"yaw\":" + String(y_out) + ",";
  json += "\"gesture\":\"";

  switch (gesture) {
    case FORWARD: json += "FORWARD"; break;
    case BACKWARD: json += "BACKWARD"; break;
    case LEFT: json += "LEFT"; break;
    case RIGHT: json += "RIGHT"; break;
    case TURN_LEFT: json += "TURN_LEFT"; break;
    case TURN_RIGHT: json += "TURN_RIGHT"; break;
    default: json += "NEUTRAL"; break;
  }

  json += "\"}";

  webSocket.broadcastTXT(json);

  delay(15);
}