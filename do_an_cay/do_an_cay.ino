#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ================= CẤU HÌNH CHÂN (PINS) =================
#define DHTPIN        A2     // Chân Data của DHT11
#define DHTTYPE       DHT11  // Loại cảm biến DHT11

#define SOIL_ANALOG   A1     // Chân Analog độ ẩm đất SMS-V1
#define SOIL_DIGITAL  3      // Chân Digital độ ẩm đất SMS-V1

#define LDR_ANALOG    A0     // Chân Analog quang trở
#define LDR_DIGITAL   2      // Chân Digital quang trở

#define RELAY_PIN     8      // Chân Relay máy bơm (D8)
#define LED_PIN       9      // Chân Đèn LED trang trí (D9)

// ================= CẤU HÌNH MỨC KÍCH & NGƯỠNG TỰ ĐỘNG =================
#define RELAY_ON      HIGH   // Mức kích BẬT Relay (Active HIGH)
#define RELAY_OFF     LOW    // Mức kích TẮT Relay

#define SOIL_DRY_THRESHOLD    40  // Độ ẩm đất < 40%: Đất khô -> Kích hoạt tưới
#define SOIL_WET_THRESHOLD    70  // Độ ẩm đất >= 70%: Đất đủ ẩm -> Ngừng tưới
#define LIGHT_DARK_THRESHOLD  30  // Ánh sáng < 30%: Trời tối -> Tự động BẬT đèn LED trang trí

#define PUMP_PULSE_DURATION_MS 2000  // THỜI GIAN BƠM: Đúng 2 giây (cho máy bơm công suất mạnh)
#define PUMP_COOLDOWN_MS       20000 // THỜI GIAN NGHỈ CHỜ NGẤM: 20 giây giữa các lần bơm

// ================= KHỞI TẠO ĐỐI TƯỢNG =================
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// ================= BIẾN TOÀN CỤC & TIMING =================
unsigned long previousSensorRead = 0;
const unsigned long sensorInterval = 2000; // Chu kỳ đọc cảm biến & gửi JSON: 2 giây

unsigned long previousScreenSwitch = 0;
const unsigned long screenInterval = 3500; // Đổi trang LCD mỗi 3.5 giây
int currentScreen = 0;

unsigned long pumpStartTime = 0;    // Thời điểm bắt đầu bật máy bơm
unsigned long lastPumpEndTime = 0;   // Thời điểm kết thúc lần bơm gần nhất

bool isAutoMode = true; // true: Chế độ Tự động | false: Chế độ Điều khiển Thủ công từ Web
bool pumpState = false;  // Trạng thái máy bơm
bool ledState = false;   // Trạng thái đèn LED trang trí

float temperature = 0.0;
float humidity = 0.0;
int soilRaw = 0;
int soilPercent = 0;
int soilState = 0;
int ldrRaw = 0;
int ldrPercent = 0;
int ldrState = 0;

// Ký tự °C cho LCD
byte degreeChar[8] = {
  B00110,
  B01001,
  B01001,
  B00110,
  B00000,
  B00000,
  B00000,
  B00000
};

// Chuỗi đệm nhận lệnh từ ESP8266 qua Serial
String inputBuffer = "";

void setup() {
  Serial.begin(9600);

  pinMode(SOIL_DIGITAL, INPUT);
  pinMode(LDR_DIGITAL, INPUT);
  
  // Khởi tạo chân chấp hành
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);
  pumpState = false;

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  ledState = false;

  // Khởi động DHT
  dht.begin();

  // Khởi động màn hình LCD I2C
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, degreeChar);

  // Màn hình chào đón đồ án
  lcd.setCursor(0, 0);
  lcd.print("SMART TERRARIUM ");
  lcd.setCursor(0, 1);
  lcd.print("NHOM 05 - 24C03 ");
  delay(2000);
  lcd.clear();
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Đọc lệnh điều khiển từ ESP8266 / Web gửi xuống qua cổng Serial
  readSerialCommands();

  // 2. Định kỳ đọc cảm biến, xử lý điều khiển và gửi dữ liệu JSON lên ESP8266
  if (currentMillis - previousSensorRead >= sensorInterval || previousSensorRead == 0) {
    previousSensorRead = currentMillis;
    readSensors();
    processControlLogic(currentMillis);
    sendDataToESP();
  }

  // 3. TỰ ĐỘNG TẮT BƠM SAU ĐÚNG 2 GIÂY (hoặc khi đất đã đủ ẩm >= 70%)
  if (pumpState && (currentMillis - pumpStartTime >= PUMP_PULSE_DURATION_MS || soilPercent >= SOIL_WET_THRESHOLD)) {
    turnPump(false);
  }

  // 4. Chuyển đổi qua lại giữa 2 trang hiển thị LCD
  if (currentMillis - previousScreenSwitch >= screenInterval) {
    previousScreenSwitch = currentMillis;
    currentScreen = (currentScreen + 1) % 2;
    lcd.clear();
  }

  updateLCD(currentScreen);
}

// ================= HÀM XỬ LÝ ĐIỀU KHIỂN TỰ ĐỘNG =================
void processControlLogic(unsigned long currentMillis) {
  if (isAutoMode) {
    // A. Tự động điều khiển Máy Bơm theo Xung 2 giây (có thời gian chờ 20s cho nước ngấm)
    if (soilPercent < SOIL_DRY_THRESHOLD && !pumpState) {
      if (lastPumpEndTime == 0 || (currentMillis - lastPumpEndTime >= PUMP_COOLDOWN_MS)) {
        turnPump(true); // Kích hoạt tưới đúng 2 giây
      }
    }

    // B. Tự động điều khiển Đèn LED Trang trí theo Ánh sáng LDR
    if (ldrPercent < LIGHT_DARK_THRESHOLD && !ledState) {
      turnLED(true); // Trời tối -> Bật đèn LED trang trí
    } else if (ldrPercent >= LIGHT_DARK_THRESHOLD && ledState) {
      turnLED(false); // Trời sáng -> Tắt đèn LED
    }
  }
}

// ================= HÀM BẬT / TẮT MÁY BƠM =================
void turnPump(bool state) {
  pumpState = state;
  if (pumpState) {
    digitalWrite(RELAY_PIN, RELAY_ON);
    pumpStartTime = millis();
  } else {
    digitalWrite(RELAY_PIN, RELAY_OFF);
    lastPumpEndTime = millis();
  }
}

// ================= HÀM BẬT / TẮT ĐÈN LED TRANG TRÍ =================
void turnLED(bool state) {
  ledState = state;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
}

// ================= HÀM ĐỌC CẢM BIẾN =================
void readSensors() {
  // 1. Đọc DHT11
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    temperature = t;
    humidity = h;
  }

  // 2. Đọc độ ẩm đất SMS-V1 (quy đổi % từ Analog 1023->0)
  soilRaw = analogRead(SOIL_ANALOG);
  soilState = digitalRead(SOIL_DIGITAL);
  soilPercent = map(soilRaw, 1023, 200, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  // 3. Đọc quang trở LDR
  ldrRaw = analogRead(LDR_ANALOG);
  ldrState = digitalRead(LDR_DIGITAL);
  ldrPercent = map(ldrRaw, 1023, 0, 0, 100);
  ldrPercent = constrain(ldrPercent, 0, 100);
}

// ================= GỬI DỮ LIỆU JSON CHO ESP8266 & SERIAL MONITOR =================
void sendDataToESP() {
  // Đóng gói chuỗi JSON chuẩn cho ESP8266/Supabase
  // Ví dụ: {"temp":28.5,"hum":70,"soil":65,"ldr":80,"pump":0,"led":1,"auto":1}
  Serial.print(F("{\"temp\":"));
  Serial.print(temperature, 1);
  Serial.print(F(",\"hum\":"));
  Serial.print(humidity, 1);
  Serial.print(F(",\"soil\":"));
  Serial.print(soilPercent);
  Serial.print(F(",\"ldr\":"));
  Serial.print(ldrPercent);
  Serial.print(F(",\"pump\":"));
  Serial.print(pumpState ? 1 : 0);
  Serial.print(F(",\"led\":"));
  Serial.print(ledState ? 1 : 0);
  Serial.print(F(",\"auto\":"));
  Serial.print(isAutoMode ? 1 : 0);
  Serial.println(F("}"));
}

// ================= NHẬN LỆNH ĐIỀU KHIỂN TỪ ESP8266 QUA SERIAL =================
void readSerialCommands() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        parseCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
    }
  }
}

// Giải mã lệnh từ Web/ESP8266 (Ví dụ: "PUMP:1", "PUMP:0", "LED:1", "LED:0", "MODE:AUTO", "MODE:MANUAL")
void parseCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "PUMP:1" || cmd == "{\"PUMP\":1}") {
    isAutoMode = false;
    turnPump(true);
  } 
  else if (cmd == "PUMP:0" || cmd == "{\"PUMP\":0}") {
    isAutoMode = false;
    turnPump(false);
  } 
  else if (cmd == "LED:1" || cmd == "{\"LED\":1}") {
    isAutoMode = false;
    turnLED(true);
  } 
  else if (cmd == "LED:0" || cmd == "{\"LED\":0}") {
    isAutoMode = false;
    turnLED(false);
  } 
  else if (cmd == "MODE:AUTO" || cmd == "{\"MODE\":\"AUTO\"}") {
    isAutoMode = true;
  } 
  else if (cmd == "MODE:MANUAL" || cmd == "{\"MODE\":\"MANUAL\"}") {
    isAutoMode = false;
  }
}

// ================= HÀM HIỂN THỊ LCD 1602 =================
void updateLCD(int screen) {
  if (screen == 0) {
    // Trang 1: Nhiệt độ, Độ ẩm không khí & Đất, Ánh sáng
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(temperature, 1);
    lcd.write(0);
    lcd.print("C H:");
    lcd.print(humidity, 0);
    lcd.print("%   ");

    lcd.setCursor(0, 1);
    lcd.print("Dat:");
    lcd.print(soilPercent);
    lcd.print("%  LDR:");
    lcd.print(ldrPercent);
    lcd.print("%   ");
  } 
  else if (screen == 1) {
    // Trang 2: Trạng thái Máy Bơm, Đèn LED & Chế độ
    lcd.setCursor(0, 0);
    lcd.print("B:");
    lcd.print(pumpState ? "ON " : "OFF");
    lcd.print(" LED:");
    lcd.print(ledState ? "ON " : "OFF");
    lcd.print("    ");

    lcd.setCursor(0, 1);
    lcd.print("Che do: ");
    lcd.print(isAutoMode ? "TU DONG " : "THU CONG");
  }
}
