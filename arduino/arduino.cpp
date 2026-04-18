#include <Wire.h>

#define SDA_PIN 41
#define SCL_PIN 42

#define BTN1 38
#define BTN2 39
#define BTN3 40

#define JOY_X 1

// Your joystick seems to rest around 3100 in the center
#define JOY_CENTER 3100
#define JOY_MIN 0
#define JOY_MAX 4095
#define JOY_DEADZONE 120

int convertJoystickToPercent(int rawValue) {
  int offsetFromCenter = rawValue - JOY_CENTER;

  if (abs(offsetFromCenter) <= JOY_DEADZONE) {
    return 0;
  }

  // Remove deadzone so motion starts smoothly after center
  if (offsetFromCenter > 0) {
    offsetFromCenter -= JOY_DEADZONE;
  } else {
    offsetFromCenter += JOY_DEADZONE;
  }

  int mappedValue;

  if (offsetFromCenter < 0) {
    mappedValue = map(rawValue, JOY_MIN, JOY_CENTER - JOY_DEADZONE, -100, 0);
  } else {
    mappedValue = map(rawValue, JOY_CENTER + JOY_DEADZONE, JOY_MAX, 0, 100);
  }

  mappedValue = constrain(mappedValue, -100, 100);

  // Flip direction because your joystick is reversed
  mappedValue = -mappedValue;

  return mappedValue;
}

int readJoystickAverage(int pinNumber) {
  long totalValue = 0;

  for (int i = 0; i < 10; i++) {
    totalValue += analogRead(pinNumber);
    delay(2);
  }

  return totalValue / 10;
}

void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);
}

void loop() {
  bool button1Pressed = digitalRead(BTN1) == LOW;
  bool button2Pressed = digitalRead(BTN2) == LOW;
  bool button3Pressed = digitalRead(BTN3) == LOW;

  int joystickRawValue = readJoystickAverage(JOY_X);
  int joystickPercentValue = convertJoystickToPercent(joystickRawValue);

  Serial.print("B1: ");
  Serial.print(button1Pressed ? 1 : 0);

  Serial.print(" | B2: ");
  Serial.print(button2Pressed ? 1 : 0);

  Serial.print(" | B3: ");
  Serial.print(button3Pressed ? 1 : 0);

  Serial.print(" | JoyRaw: ");
  Serial.print(joystickRawValue);

  Serial.print(" | JoyMapped: ");
  Serial.println(joystickPercentValue);

  delay(50);
}