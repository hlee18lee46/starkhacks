#include <Wire.h>
#include <SparkFun_BNO08x_Arduino_Library.h>

#define SDA_PIN 41
#define SCL_PIN 42
#define BTN1 38
#define BTN2 39   // ✅ calibration button
#define BTN3 40
#define JOY_X 1

BNO08x imu;

float r = 0.0;
float p = 0.0;
float y = 0.0;

float rollOffset = 0.0;
float pitchOffset = 0.0;
float yawOffset = 0.0;

int lastBtn2State = 0;

void calibrateToZero() {
  rollOffset = r;
  pitchOffset = p;
  yawOffset = y;
  Serial.println("CALIBRATED");
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  Wire.begin(SDA_PIN, SCL_PIN);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);

  if (imu.begin()) {
    imu.enableGameRotationVector(20);
    delay(500);
  } else {
    Serial.println("0,0,0,0,0,0,0");
    while (1) delay(100);
  }
}

void loop() {
  if (imu.getSensorEvent()) {
    if (imu.getSensorEventID() == SENSOR_REPORTID_GAME_ROTATION_VECTOR) {
      r = imu.getRoll() * 180.0 / PI;
      p = imu.getPitch() * 180.0 / PI;
      y = imu.getYaw() * 180.0 / PI;
    }
  }

  int b1 = digitalRead(BTN1);
  int b2 = digitalRead(BTN2);
  int b3 = digitalRead(BTN3);
  int joy = analogRead(JOY_X);

  // ✅ Calibration on BTN2 press (edge detection)
  if (b2 == 1 && lastBtn2State == 0) {
    calibrateToZero();
  }
  lastBtn2State = b2;

  float calibratedRoll  = r - rollOffset;
  float calibratedPitch = p - pitchOffset;
  float calibratedYaw   = y - yawOffset;

  Serial.print(b1);
  Serial.print(",");
  Serial.print(b2);
  Serial.print(",");
  Serial.print(b3);
  Serial.print(",");
  Serial.print(joy);
  Serial.print(",");
  Serial.print(calibratedRoll, 2);
  Serial.print(",");
  Serial.print(calibratedPitch, 2);
  Serial.print(",");
  Serial.println(calibratedYaw, 2);

  delay(15);
}