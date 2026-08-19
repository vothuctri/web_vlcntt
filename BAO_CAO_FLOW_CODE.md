# 🌿 BÁO CÁO FLOW CODE & SƠ ĐỒ HỆ THỐNG TRỌNG TÂM

> **Tài liệu phân tích luồng code (Flow Code), sơ đồ khối, sơ đồ tuần tự và tra cứu dòng lệnh chi tiết cho 2 nhóm chức năng trọng tâm:**
> 1. 🌡️📟 **NHÓM 1: Cảm biến nhiệt độ DHT11 & Màn hình LCD 16x2 I2C** *(Hardware Uno $\rightarrow$ Gateway ESP8266 $\rightarrow$ Web Dashboard & LCD Simulator)*
> 2. 📧📱 **NHÓM 2: Dịch vụ gửi Email (Supabase) & Thông báo nhanh qua điện thoại (Pushsafer)** *(Cảnh báo quá nhiệt DHT11, Thiết bị & Khôi phục tài khoản)*

---

## 📑 BẢNG TRA CỨU NHANH THEO 2 NHÓM LOGIC (FILE - HÀM - DÒNG CODE)

| Nhóm Chức Năng | Tầng Hệ Thống | Tên File | Tên Hàm / Đoạn Code | Vị Trí Dòng Code | Nhiệm Vụ Chi Tiết |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **1. DHT11 & LCD 16x2** | **Hardware Uno** | `do_an_cay/do_an_cay.ino` | `setup()` | **87 - 102** | Khởi tạo `dht.begin()`, `lcd.init()`, nạp ký tự `°C` và hiển thị Splash Screen |
| | | `do_an_cay/do_an_cay.ino` | `readSensors()` | **171 - 179** | Đọc nhiệt độ (°C) & độ ẩm (%RH) từ chân A2 qua thư viện `DHT.h` |
| | | `do_an_cay/do_an_cay.ino` | `updateLCD()` | **259 - 276** | Định dạng và xuất số liệu nhiệt độ `T:..C H:..%` lên LCD 16x2 phần cứng |
| | | `do_an_cay/do_an_cay.ino` | `sendDataToESP()` | **194 - 212** | Đóng gói trường `"temp"` và `"hum"` vào chuỗi JSON gửi qua Serial |
| | **Gateway ESP8266**| `esp_wifi/esp_wifi.ino` | `loop()` | **43 - 57** | Đọc chuỗi JSON từ Arduino Uno qua Serial và Publish lên Topic `topic_sensors` |
| | **Web Dashboard** | `js/app.js` | `processIncomingSensorData()` | **832 - 895** | Tiếp nhận gói tin JSON từ MQTT Broker, điều phối cập nhật UI và LCD Simulator |
| | | `js/app.js` | `updateMetricCards()` | **897 - 912** | Cập nhật số liệu nhiệt độ (°C) và độ ẩm (%) lên thẻ đo đạc Dashboard |
| | **Mô phỏng LCD** | `js/lcdSimulator.js` | `updateFromSensors()` | **48 - 62** | Định dạng chuỗi `Temp:xx.xC H:xx%` cho dòng 1 màn hình mô phỏng |
| | | `js/lcdSimulator.js` | `pad16()`, `updateDisplay()` | **15 - 42** | Cắt/đệm chuẩn 16 ký tự và ghi vào DOM HTML `#lcd-line-1`, `#lcd-line-2` |
| **2. Email & Pushsafer**| **Pushsafer (Phone)**| `js/notificationService.js`| `sendPushsaferNotification()`| **16 - 68** | Tạo URLSearchParams và gửi HTTP POST tới `https://www.pushsafer.com/api` |
| | | `js/notificationService.js`| `checkAndTriggerAlerts()` | **158 - 178** | Tự động bắn Pushsafer khẩn cấp (icon 82, priority 2) khi DHT11 quá nhiệt (>38°C) |
| | | `js/notificationService.js`| `sendDeviceNotification()` | **132 - 153** | Bắn Pushsafer về điện thoại thông báo khi Bơm hoặc Đèn Bật/Tắt |
| | | `js/app.js` | `testPushsaferAlert()` | **1113 - 1141** | Xử lý sự kiện nút bấm Test gửi thông báo Pushsafer trên giao diện Cài đặt |
| | **Email & Supabase** | `js/notificationService.js`| `sendEmailNotification()` | **76 - 124** | Gửi Email HTML qua FormSubmit REST API và tự động gọi Supabase ghi log |
| | | `js/supabaseClient.js` | `pushAlertLog()` | **346 - 364** | Thực hiện `INSERT` lịch sử cảnh báo vào bảng `alert_logs` PostgreSQL |
| | | `js/app.js` | `sendResetPinCode()` | **239 - 300** | Tạo PIN 6 số, lưu Supabase (`save_reset_pin`) và gửi Email khôi phục tài khoản |
| | | `js/app.js` | `testEmailAlert()` | **1143 - 1165** | Xử lý sự kiện nút bấm Test gửi Email cảnh báo trên giao diện Web |

---

# 🌡️📟 NHÓM 1: CẢM BIẾN NHIỆT ĐỘ DHT11 & MÀN HÌNH LCD 16x2 I2C

### 1.1. Sơ Đồ Khối Toàn Diện (End-to-End Flowchart)

```mermaid
flowchart TD
    subgraph HARDWARE_UNO ["1. TẦNG PHẦN CỨNG ARDUINO UNO (do_an_cay.ino)"]
        DHT["🌡️ Cảm biến DHT11 (Chân A2)"] -->|"Đọc tín hiệu nhiệt độ & độ ẩm"| UNO_READ["readSensors()<br>(Dòng 171-179)"]
        
        UNO_READ -->|"Chuyển trang mỗi 3.5s"| LCD_PAGE{"currentScreen = (currentScreen + 1) % 2"}
        LCD_PAGE -->|"Trang 0: Môi trường"| LCD_P0["📟 LCD Dòng 1: T:xx.x°C H:xx%<br>📟 LCD Dòng 2: Dat:xx% LDR:xx%"]
        LCD_PAGE -->|"Trang 1: Thiết bị"| LCD_P1["📟 LCD Dòng 1: B:ON/OFF LED:ON/OFF<br>📟 LCD Dòng 2: Che do: TU DONG"]
        
        LCD_P0 --> LCD_HW["📟 Màn hình LCD 16x2 Phần Cứng (I2C 0x27)"]
        LCD_P1 --> LCD_HW

        UNO_READ -->|"Đóng gói JSON"| UNO_SEND["sendDataToESP()<br>(Dòng 194-212)<br>Xuất UART Serial 9600"]
    end

    subgraph GATEWAY_ESP ["2. TẦNG GATEWAY ESP8266 (esp_wifi.ino)"]
        UNO_SEND -->|"UART Rx/Tx 9600"| ESP_READ["loop(): Đọc Serial Buffer<br>(Dòng 43-49)"]
        ESP_READ -->|"Kiểm tra chuỗi JSON hợp lệ"| ESP_PUB["client.publish()<br>(Dòng 50-52)<br>Topic: smart_terrarium/nhom05/sensors"]
    end

    subgraph CLOUD_BROKER ["3. TẦNG CLOUD BROKER"]
        ESP_PUB -->|"TCP/IP Wi-Fi"| BROKER["☁️ MQTT Broker (broker.emqx.io:1883)"]
    end

    subgraph WEB_DASHBOARD ["4. TẦNG WEB FRONTEND DASHBOARD & SIMULATOR"]
        BROKER -->|"WebSocket WSS"| WEB_RECV["mqttClient.js & app.js<br>processIncomingSensorData(data)<br>(Dòng 832-845)"]
        
        WEB_RECV -->|"Cập nhật thẻ số liệu Dashboard"| WEB_METRIC["updateMetricCards(data)<br>(app.js: Dòng 897-912)"]
        WEB_METRIC --> DOM_TEMP["📍 #metric-temp-val (index.html: D438)<br>Điền: 28.5°C"]
        WEB_METRIC --> DOM_HUM["📍 #metric-hum-val (index.html: D455)<br>Điền: 70%"]

        WEB_RECV -->|"Cập nhật mô phỏng LCD 16x2"| LCD_SIM["lcdSimulator.js<br>updateFromSensors(temp, hum, soil, isDark)<br>(Dòng 48-62)"]
        LCD_SIM -->|"Định dạng dòng 1 qua pad16"| DOM_LCD1["📍 #lcd-line-1 (index.html: D547)<br>Hiển thị: Temp:28.5C H:70%"]
        LCD_SIM -->|"Định dạng dòng 2 qua pad16"| DOM_LCD2["📍 #lcd-line-2 (index.html: D548)<br>Hiển thị: Soil:65% Lgt:DARK"]
    end
```

---

### 1.2. Sơ Đồ Tuần Tự Xuất Thông Tin LCD & Frontend (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant DHT as Cảm biến DHT11
    participant Uno as Arduino Uno (do_an_cay.ino)
    participant LCD_HW as LCD 16x2 Hardware
    participant ESP as ESP8266 (esp_wifi.ino)
    participant Broker as MQTT Broker
    participant Web as Web Core (app.js)
    participant LCD_Sim as lcdSimulator.js
    participant UI_Cards as Thẻ Dashboard (#tab-dashboard)
    participant UI_LCD as Màn Hình LCD (#tab-analytics)

    Note over Uno: 1. Đọc cảm biến định kỳ mỗi 2000ms
    Uno->>DHT: dht.readTemperature(), dht.readHumidity() (Chân A2)
    DHT-->>Uno: Trả về: temp = 28.5°C, hum = 70%
    
    par [LUỒNG PHẦN CỨNG]: Xuất LCD 16x2 I2C (Luân chuyển mỗi 3.5s)
        alt currentScreen == 0 (Trang 1: Môi trường)
            Uno->>LCD_HW: Dòng 1 (0,0): "T:28.5°C H:70%   " | Dòng 2 (0,1): "Dat:65%  LDR:80% "
        else currentScreen == 1 (Trang 2: Thiết bị)
            Uno->>LCD_HW: Dòng 1 (0,0): "B:OFF  LED:ON    " | Dòng 2 (0,1): "Che do: TU DONG "
        end
    and [LUỒNG TRUYỀN THÔNG]: Gửi Gateway ESP8266 -> MQTT -> Web
        Uno->>ESP: sendDataToESP() -> Gửi UART: {"temp":28.5,"hum":70,"soil":65,"ldr":80,...}\n
        ESP->>Broker: client.publish("smart_terrarium/nhom05/sensors", JSON)
        Broker->>Web: WebSocket gửi gói tin tới trình duyệt
    end

    Note over Web, UI_LCD: 2. Luồng xử lý và xuất dữ liệu lên Frontend DOM
    Web->>Web: processIncomingSensorData(data) (Dòng 832)
    
    par Cập nhật Thẻ Metric Dashboard
        Web->>UI_Cards: updateMetricCards() -> Điền vào #metric-temp-val & #metric-hum-val
    and Cập nhật Khung LCD 16x2 Simulator
        Web->>LCD_Sim: updateFromSensors(28.5, 70, 65, isDark) (Dòng 838)
        LCD_Sim->>LCD_Sim: Ghép chuỗi & cắt đệm pad16(str)
        LCD_Sim->>UI_LCD: updateDisplay() -> Ghi trực tiếp vào #lcd-line-1 & #lcd-line-2
    end
```

---

### 1.3. Bảng Ma Trận 16x2 Ký Tự (LCD Phần Cứng & LCD Mô Phỏng Web)

#### A. Màn hình LCD 16x2 Phần Cứng (Luân chuyển mỗi 3.5 giây qua `updateLCD()`)
```text
Trang 0 (Môi Trường):
[Hàng 0] | T | : | 2 | 8 | . | 5 | ° | C |   | H | : | 7 | 0 | % |   |   | (16 ký tự)
[Hàng 1] | D | a | t | : | 6 | 5 | % |   |   | L | D | R | : | 8 | 0 | % | (16 ký tự)

Trang 1 (Thiết Bị & Chế Độ):
[Hàng 0] | B | : | O | F | F |   |   | L | E | D | : | O | N |   |   |   | (16 ký tự)
[Hàng 1] | C | h | e |   | d | o | : |   | T | U |   | D | O | N | G |   | (16 ký tự)
```

#### B. Màn hình LCD 16x2 Mô Phỏng Web (`lcdSimulator.js` $\rightarrow$ `#tab-analytics`)
```text
[Dòng 1 - #lcd-line-1] | T | e | m | p | : | 2 | 8 | . | 5 | C |   | H | : | 7 | 0 | % | (16 ký tự)
[Dòng 2 - #lcd-line-2] | S | o | i | l | : | 6 | 5 | % |   | L | g | t | : | D | A | R | K | (16 ký tự)
```

---

### 1.4. Vị Trí Cụ Thể Trên Giao Diện Frontend ([index.html](file:///d:/web_vlcntt/index.html))

| Tên Khối Giao Diện | File Nguồn | ID Phần Tử DOM | Vị Trí Dòng Code | Chức Năng Hiển Thị |
| :--- | :--- | :--- | :---: | :--- |
| **Khung Màn hình LCD 16x2** | `index.html` | `#lcd-screen-container` | **Dòng 546** | Hộp chứa nền xanh LCD retro, viền phát sáng, chứa 2 dòng hiển thị |
| **Dòng 1 LCD 16x2** | `index.html` | `#lcd-line-1` | **Dòng 547** | Hiển thị chuỗi Nhiệt độ & Độ ẩm DHT11 (`Temp:xx.xC H:xx%`) |
| **Dòng 2 LCD 16x2** | `index.html` | `#lcd-line-2` | **Dòng 548** | Hiển thị chuỗi Độ ẩm đất & Trạng thái sáng (`Soil:xx% Lgt:DARK/SUNNY`) |
| **Tab Chứa LCD Simulator** | `index.html` | `#tab-analytics` | **Dòng 524** | Tab Phân tích & Dự đoán (Analytics) trên thanh điều hướng |
| **Thẻ Đo Nhiệt Độ Dashboard**| `index.html`| `#metric-temp-val` | **Dòng 438** | Thẻ lớn hiển thị số đo nhiệt độ tức thời (°C) |
| **Thẻ Đo Độ Ẩm Dashboard** | `index.html` | `#metric-hum-val` | **Dòng 455** | Thẻ lớn hiển thị số đo độ ẩm không khí (%) |
| **Thẻ Đo Độ Ẩm Đất** | `index.html` | `#metric-soil-val` | **Dòng 472** | Thẻ lớn hiển thị phần trăm độ ẩm đất (%) |
| **Thẻ Đo Quang Trở LDR** | `index.html` | `#metric-light-val` | **Dòng 489** | Thẻ lớn hiển thị độ sáng Lux & trạng thái Ngày/Đêm |

---

### 1.5. Chi Tiết Các Hàm & Dòng Lệnh Cốt Lõi (Nhóm 1)

#### 1. Mạch Phần Cứng Arduino Uno ([do_an_cay.ino](file:///d:/web_vlcntt/do_an_cay/do_an_cay.ino))
* **Khởi tạo chân & LCD I2C (`setup()`, Dòng 87 – 102):**
  ```cpp
  // Dòng 87-102 trong do_an_cay/do_an_cay.ino
  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, degreeChar); // Nạp byte ký tự °C vào CGRAM của LCD

  lcd.setCursor(0, 0);
  lcd.print("SMART TERRARIUM ");
  lcd.setCursor(0, 1);
  lcd.print("NHOM 05 - 24C03 ");
  delay(2000);
  lcd.clear();
  ```

* **Đọc cảm biến DHT11 (`readSensors()`, Dòng 171 – 179):**
  ```cpp
  // Dòng 171-179 trong do_an_cay/do_an_cay.ino
  void readSensors() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      temperature = t;
      humidity = h;
    }
    ...
  }
  ```

* **Hiển thị luân phiên 2 trang lên LCD 16x2 I2C (`updateLCD()`, Dòng 259 – 290):**
  ```cpp
  // Dòng 259-290 trong do_an_cay/do_an_cay.ino
  void updateLCD(int screen) {
    if (screen == 0) {
      // Trang 1: Thông số nhiệt độ, độ ẩm không khí & đất, ánh sáng
      lcd.setCursor(0, 0);
      lcd.print("T:");
      lcd.print(temperature, 1);
      lcd.write(0); // Ký tự độ °
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
      // Trang 2: Trạng thái Máy Bơm, Đèn LED & Chế độ vận hành
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
  ```

#### 2. Mạch Gateway ESP8266 ([esp_wifi.ino](file:///d:/web_vlcntt/esp_wifi/esp_wifi.ino))
* **Đọc Serial và đẩy lên MQTT Broker (`loop()`, Dòng 43 – 57):**
  ```cpp
  // Dòng 43-57 trong esp_wifi/esp_wifi.ino
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialData.length() > 0) {
        serialData.trim();
        if (serialData.startsWith("{") && serialData.endsWith("}")) {
          client.publish(topic_sensors, serialData.c_str());
        }
        serialData = "";
      }
    } else {
      serialData += c;
    }
  }
  ```

#### 3. Mô phỏng LCD 16x2 trên Web ([js/lcdSimulator.js](file:///d:/web_vlcntt/js/lcdSimulator.js))
* **Khởi tạo DOM elements (`initLCD()`, Dòng 24 – 31):**
  ```javascript
  // Dòng 24-31 trong js/lcdSimulator.js
  function initLCD() {
      line1Element = document.getElementById("lcd-line-1");
      line2Element = document.getElementById("lcd-line-2");
      backlightElement = document.getElementById("lcd-screen-container");

      updateDisplay("LCD 16x2 I2C READY", "DHT11 CONNECTED");
  }
  ```

* **Định dạng số liệu dòng 1 & 2 (`updateFromSensors()`, Dòng 48 – 62):**
  ```javascript
  // Dòng 48-62 trong js/lcdSimulator.js
  function updateFromSensors(temp, hum, soil, lightIsDark) {
      const tStr = temp !== undefined ? temp.toFixed(1) : "--.-";
      const hStr = hum !== undefined ? hum.toFixed(0) : "--";
      const l1 = `Temp:${tStr}C H:${hStr}%`;

      const sStr = soil !== undefined ? soil.toFixed(0) : "--";
      const lightStr = lightIsDark ? "DARK" : "SUNNY";
      const l2 = `Soil:${sStr}% Lgt:${lightStr}`;

      updateDisplay(l1, l2);
  }
  ```

* **Cắt đệm chuẩn 16 ký tự & Cập nhật DOM HTML (`pad16()` & `updateDisplay()`, Dòng 15 – 42):**
  ```javascript
  // Dòng 15-19 & 35-42 trong js/lcdSimulator.js
  function pad16(str) {
      if (!str) str = "";
      if (str.length > 16) return str.substring(0, 16);
      return str.padEnd(16, " ");
  }

  function updateDisplay(line1Text, line2Text) {
      if (line1Element) line1Element.textContent = pad16(line1Text);
      if (line2Element) line2Element.textContent = pad16(line2Text);
  }
  ```

---

# 📧📱 NHÓM 2: DỊCH VỤ EMAIL (SUPABASE) & THÔNG BÁO NHANH QUA ĐIỆN THOẠI (PUSHSAFER)

### 2.1. Sơ Đồ Khối Toàn Diện (End-to-End Flowchart)

```mermaid
flowchart TD
    TRIG["🔥 CÁC SỰ KIỆN KÍCH HOẠT<br>1. Nhiệt độ DHT11 > 38°C (Quá nhiệt khẩn cấp)<br>2. Bật / Tắt Thiết Bị (Bơm Relay D8 / Đèn LED D9)<br>3. Yêu cầu Quên mật khẩu (Gửi mã OTP PIN)"] 
    
    TRIG --> PROC["⚙️ Xử lý tại notificationService.js & app.js<br>• checkAndTriggerAlerts()<br>• sendDeviceNotification()<br>• sendResetPinCode()"]

    subgraph PUSHSAFER_GATEWAY ["1. THÔNG BÁO ĐIỆN THOẠI REALTIME (PUSHSAFER REST API)"]
        PROC -->|"Gọi hàm gửi Pushsafer"| PUSH_FUNC["sendPushsaferNotification()<br>(notificationService.js: Dòng 16-68)"]
        PUSH_FUNC -->|"HTTP POST URLSearchParams"| PUSH_API["🌐 https://www.pushsafer.com/api<br>(k: PrivateKey, t: Title, m: Message, i: 82, pr: 2)"]
        PUSH_API -->|"Đẩy thông báo APNs / FCM"| PHONE["📱 Điện Thoại Người Dùng<br>(App Pushsafer rung & đổ chuông)"]
    end

    subgraph EMAIL_SUPABASE_GATEWAY ["2. DỊCH VỤ EMAIL & ĐỒNG BỘ SUPABASE DATABASE"]
        PROC -->|"Gọi hàm gửi Email"| MAIL_FUNC["sendEmailNotification()<br>(notificationService.js: Dòng 76-124)"]
        MAIL_FUNC -->|"HTTP POST JSON Table"| MAIL_API["📧 FormSubmit REST API<br>(https://formsubmit.co/ajax/vthuctri@gmail.com)"]
        MAIL_API -->|"Chuyển phát SMTP"| GMAIL["📬 Hòm thư Gmail Người Dùng<br>(Email bảng HTML trực quan)"]

        MAIL_FUNC -->|"Ghi nhật ký hệ thống"| SP_FUNC["pushAlertLog()<br>(supabaseClient.js: Dòng 346-364)"]
        SP_FUNC -->|"INSERT"| SP_DB[("🗄️ Supabase PostgreSQL<br>Bảng: alert_logs")]
        SP_DB -->|"Realtime Channels"| TABS["🖥️ Đồng bộ nhật ký tức thì trên Web"]
    end
```

---

### 2.2. Sơ Đồ Tuần Tự Cảnh Báo Quá Nhiệt (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant Sensor as Cảm biến DHT11
    participant Uno as Arduino Uno
    participant ESP as ESP8266
    participant Web as Web (app.js)
    participant Noti as notificationService.js
    participant Pushsafer as Pushsafer REST API
    participant FormSubmit as FormSubmit Email API
    participant Supabase as Supabase Database

    Sensor->>Uno: Đo nhiệt độ tăng cao = 39.5°C
    Uno->>ESP: Gửi chuỗi JSON (temp=39.5°C) qua UART Serial
    ESP->>Web: MQTT publish -> Web tiếp nhận JSON
    Web->>Noti: checkAndTriggerAlerts(sensorData, thresholds) (Dòng 890)
    Note over Noti: Nhận diện temp = 39.5°C > TEMP_MAX (38°C)

    par Bắn Thông Báo Khẩn Cấp Về Điện Thoại
        Noti->>Pushsafer: POST https://www.pushsafer.com/api (icon: 82, priority: 2)
        Pushsafer-->>Noti: { status: 1, success: "message transmitted" }
    and Gửi Email Cảnh Báo & Ghi Log Supabase
        Noti->>FormSubmit: POST https://formsubmit.co/ajax/vthuctri@gmail.com
        FormSubmit-->>Noti: { success: "true", message: "Email sent" }
        Noti->>Supabase: pushAlertLog({ alert_type: "EMAIL_NOTIFICATION", message: "..." })
        Supabase-->>Noti: INSERT vào bảng alert_logs thành công
    end
```

---

### 2.3. Chi Tiết Các Hàm & Dòng Lệnh Cốt Lõi (Nhóm 2)

#### 1. Thông Báo Nhanh Qua Điện Thoại (Pushsafer API)
* **Gửi HTTP POST Pushsafer (`sendPushsaferNotification()`, Dòng 16 – 68 trong `js/notificationService.js`):**
  ```javascript
  // Dòng 36-52 trong js/notificationService.js
  const params = new URLSearchParams({
      k: privateKey.trim(),
      t: title || "Smart Terrarium Alert",
      m: message || "Thông báo từ hệ thống Terrarium",
      s: options.sound !== undefined ? options.sound : "1",      // Chuông
      v: options.vibrate !== undefined ? options.vibrate : "3",  // Rung mạnh
      i: options.icon !== undefined ? options.icon : "82",       // Icon cảm biến
      pr: options.priority !== undefined ? options.priority : "2" // Độ ưu tiên cao nhất
  });

  const response = await fetch("https://www.pushsafer.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
  });
  ```

* **Tự động kích hoạt khi DHT11 quá nhiệt (`checkAndTriggerAlerts()`, Dòng 158 – 178 trong `js/notificationService.js`):**
  ```javascript
  // Dòng 163-169 trong js/notificationService.js
  if (temp > thresholds.TEMP_MAX) {
      const title = "🔥 CẢNH BÁO: QUÁ NHIỆT TERRARIUM!";
      const msg = `Nhiệt độ hiện tại đạt ${temp.toFixed(1)}°C (vượt ngưỡng cho phép ${thresholds.TEMP_MAX}°C)...`;
      
      await sendPushsaferNotification(title, msg, { icon: 82, priority: 2 });
      await sendEmailNotification(title, msg);
  }
  ```

* **Thông báo Bật/Tắt thiết bị Bơm & Đèn (`sendDeviceNotification()`, Dòng 132 – 153 trong `js/notificationService.js`):**
  Bắn Pushsafer thông báo khi máy bơm hoặc đèn bật/tắt (manual hoặc auto).

---

#### 2. Dịch Vụ Gửi Email & Đồng Bộ Supabase Database
* **Gửi Email bảng HTML (`sendEmailNotification()`, Dòng 76 – 124 trong `js/notificationService.js`):**
  ```javascript
  // Dòng 90-104 trong js/notificationService.js
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
          _subject: `🌱 [Smart Terrarium Nhóm 05] ${subject || 'CẢNH BÁO HỆ THỐNG'}`,
          "Tiêu Đề Cảnh Báo": subject,
          "Nội Dung Chi Tiết": body,
          "Hệ Thống Giám Sát": "BioSync Smart Terrarium - Lớp 24C03 (Nhóm 05)",
          "Thời Gian Ghi Nhận": new Date().toLocaleString("vi-VN"),
          _template: "table"
      })
  });
  ```

* **Ghi nhật ký vào bảng `alert_logs` Supabase (`pushAlertLog()`, Dòng 346 – 364 trong `js/supabaseClient.js`):**
  ```javascript
  // Dòng 351-358 trong js/supabaseClient.js
  const { error } = await supabaseClient
      .from('alert_logs')
      .insert([{
          alert_type: alertObj.alert_type || "EMAIL_NOTIFICATION",
          severity: alertObj.severity || "WARNING",
          message: alertObj.message || ""
      }]);
  ```

* **Email Mã PIN Khôi Phục Tài Khoản (`sendResetPinCode()`, Dòng 239 – 300 trong `js/app.js`):**
  Sinh mã PIN 6 số ngẫu nhiên, lưu vào Supabase và gửi qua Email FormSubmit để xác thực quên mật khẩu.

---

*Tài liệu tóm lược tập trung 2 nhóm logic phục vụ thuyết trình & bảo vệ đồ án chuyên ngành Công nghệ thông tin.*
