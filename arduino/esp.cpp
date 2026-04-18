#include <Wire.h>
#include <SparkFun_BNO08x_Arduino_Library.h>

#define SDA_PIN 41
#define SCL_PIN 42
#define BTN1 38
#define BTN2 39
#define BTN3 40
#define JOY_X 1

BNO08x imu;

// We make these global so they hold their last known value 
// even if the sensor doesn't have a new event this millisecond.
float r = 0, p = 0, y = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  
  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);

  if (imu.begin()) {
    // Game Rotation Vector is "Absolute" relative to Gravity.
    // 0,0 will always be perfectly level with the ground.
    imu.enableGameRotationVector(20); 
    Serial.println("Absolute Orientation Mode Active");
  } else {
    Serial.println("IMU NOT FOUND - Check pins 41/42");
    while(1);
  }
}

void loop() {
  // 1. Update IMU data
  // If no new event happens, R, P, and Y keep their last values.
  if (imu.getSensorEvent()) {
    if (imu.getSensorEventID() == SENSOR_REPORTID_GAME_ROTATION_VECTOR) {
      r = (imu.getRoll())  * 180.0 / PI;
      p = (imu.getPitch()) * 180.0 / PI;
      y = (imu.getYaw())   * 180.0 / PI;
    }
  }

  // 2. Read All Buttons (Inverting so 1 = Pressed)
  int b1 = !digitalRead(BTN1);
  int b2 = !digitalRead(BTN2);
  int b3 = !digitalRead(BTN3);

  // 3. Read Joystick
  int joy = analogRead(JOY_X);

  // 4. Output - Absolute values regardless of startup position
  Serial.print("B1:"); Serial.print(b1);
  Serial.print(" B2:"); Serial.print(b2);
  Serial.print(" B3:"); Serial.print(b3);
  Serial.print(" | Joy:"); Serial.print(joy);
  Serial.print(" | R:"); Serial.print(r, 1); 
  Serial.print(" P:"); Serial.print(p, 1);
  Serial.print(" Y:"); Serial.println(y, 1);

  delay(15);
}