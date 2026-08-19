# 🌿 BÁO CÁO FLOW CODE & SƠ ĐỒ HỆ THỐNG TRỌNG TÂM

> **Tài liệu phân tích luồng code (Flow Code), sơ đồ khối, sơ đồ tuần tự và tra cứu dòng lệnh chi tiết cho 4 nhóm chức năng trọng tâm:**
> 1. 🌡️📟 **NHÓM 1: Cảm biến nhiệt độ & độ ẩm DHT11 và Màn hình LCD 16x2 I2C** *(Khởi tạo $\rightarrow$ Đọc lấy mẫu $\rightarrow$ Đóng gói gửi UART/MQTT $\rightarrow$ Xử lý Backend/Broker $\rightarrow$ Hiển thị Frontend & Mô phỏng LCD $\rightarrow$ Lưu trữ & Realtime Supabase)*
> 2. 📧📱 **NHÓM 2: Dịch vụ gửi Email (Supabase) & Thông báo nhanh qua điện thoại (Pushsafer)** *(Cảnh báo quá nhiệt DHT11, Thiết bị & Khôi phục tài khoản)*
> 3. 📊📈 **NHÓM 3: Cơ sở dữ liệu (Supabase) & Biểu đồ Time-series đa đường (Chart.js)** *(Lưu trữ PostgreSQL Cloud, Realtime WebSockets, Biểu đồ trục kép & Xuất CSV)*
> 4. 🔐🔑 **NHÓM 4: Bảo mật hệ thống & Quản lý tài khoản (Supabase Auth & OTP PIN)** *(Đăng nhập, Duy trì phiên đăng nhập, Đăng xuất, Quên mật khẩu qua mã OTP PIN 6 số)*

---

## 📑 BẢNG TRA CỨU NHANH THEO CÁC NHÓM LOGIC (FILE - HÀM - DÒNG CODE)

| Giai Đoạn / Nhóm Chức Năng | Tầng Hệ Thống | Tên File | Tên Hàm / Đoạn Code | Vị Trí Dòng Code | Nhiệm Vụ Chi Tiết |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **1. Khởi tạo DHT11 & Phần Cứng** | **Hardware Uno** | `do_an_cay/do_an_cay.ino` | `setup()` | **6 - 7, 31, 87 - 102** | Định nghĩa chân A2, khởi tạo đối tượng `DHT dht(A2, DHT11)`, `dht.begin()`, `lcd.init()` |
| | **Gateway ESP8266** | `esp_wifi/esp_wifi.ino` | `setup()`, `setupWiFi()` | **23 - 33, 60 - 70** | Khởi tạo UART 9600, kết nối Wi-Fi trạm STA, cấu hình MQTT Broker `broker.emqx.io:1883` |
| | **Web Frontend & DB** | `js/mqttClient.js` | `startMQTTConnection()` | **20 - 56** | Kết nối WebSocket MQTT `wss://broker.emqx.io:8084/mqtt`, đăng ký Topic Sensors |
| | | `js/supabaseClient.js` | `initSupabase()` | **15 - 51** | Khởi tạo Supabase Client kết nối Cloud PostgreSQL với Anon Key |
| **2. Đọc & Lấy Mẫu DHT11** | **Hardware Uno** | `do_an_cay/do_an_cay.ino` | `readSensors()` | **171 - 179** | Đọc nhiệt độ `dht.readTemperature()` & độ ẩm `dht.readHumidity()`, kiểm tra `!isnan()` |
| | | `do_an_cay/do_an_cay.ino` | `updateLCD()` | **259 - 290** | Xuất số liệu tức thời `T:xx.x°C H:xx%` lên hàng 1 màn hình LCD 16x2 phần cứng |
| **3. Đóng Gói & Gửi Dữ Liệu** | **Hardware Uno** | `do_an_cay/do_an_cay.ino` | `sendDataToESP()` | **194 - 212** | Đóng gói chuỗi JSON `{"temp":28.5,"hum":70,...}` xuất qua cổng UART Serial 9600 |
| | **Gateway ESP8266** | `esp_wifi/esp_wifi.ino` | `loop()` | **42 - 57** | Đọc chuỗi JSON từ Serial buffer, kiểm tra hợp lệ và Publish lên Topic Sensors |
| **4. Xử Lý Backend / Broker** | **Cloud Broker** | `broker.emqx.io` | Port 1883 & 8084 (WSS) | *Tầng Trung Gian* | Định tuyến và chuyển tiếp các bản tin Sensor Telemetry tới tất cả Web Clients |
| **5. Xử Lý Frontend & Giao Diện** | **Web Core** | `js/mqttClient.js` | `client.on("message")` | **57 - 128** | Nhận payload, bóc tách `temp`/`hum`, cập nhật thẻ DOM, gọi biểu đồ và LCD Simulator |
| | | `js/app.js` | `processIncomingSensorData()` | **832 - 897** | Điều phối dữ liệu cảm biến, kiểm tra cảnh báo quá nhiệt `temp > 38°C` |
| | | `js/app.js` | `updateMetricCards()` | **899 - 915** | Ghi số đo nhiệt độ vào `#metric-temp-val` và độ ẩm vào `#metric-hum-val` |
| | **Mô Phỏng LCD** | `js/lcdSimulator.js` | `updateFromSensors()` | **48 - 68** | Tạo chuỗi `Temp:xx.xC H:xx%` và ghi ra phần tử DOM `#lcd-line-1` qua `pad16()` |
| | **Engine Biểu Đồ** | `js/charts.js` | `appendDataPoint()` | **132 - 156** | Đẩy điểm nhiệt độ vào trục trái (`yTemp`) và độ ẩm vào trục phải (`yPercent`) |
| **6. Lưu Trữ & Realtime Supabase** | **Supabase DB** | `supabase/schema.sql` | Table `sensor_logs` | **6 - 15, 49, 54** | Bảng PostgreSQL lưu trữ `temperature`, `humidity`, kích hoạt RLS & Realtime |
| | | `js/supabaseClient.js` | `pushSensorData()` | **327 - 344** | Ghi bản ghi cảm biến mới vào bảng `sensor_logs` trên Supabase Cloud |
| | | `js/supabaseClient.js` | `subscribeRealtime()` | **191 - 233** | Lắng nghe WebSocket sự kiện `INSERT` trên bảng `sensor_logs` |
| | | `js/supabaseClient.js` | `fetchSensorHistory()` | **240 - 262** | Truy vấn lịch sử chuỗi thời gian vẽ biểu đồ ban đầu (Cold Start) |
| | | `js/charts.js` | `exportToCSV()` | **197 - 223** | Trích xuất toàn bộ dữ liệu đo đạc DHT11 ra file CSV UTF-8 (BOM) cho Excel |
| **Email & Pushsafer Cảnh Báo** | **Pushsafer (Phone)** | `js/notificationService.js`| `sendPushsaferNotification()`| **16 - 68** | Gửi HTTP POST tới Pushsafer API đẩy thông báo khẩn khi DHT11 quá nhiệt (>38°C) |
| | **Email & Supabase** | `js/notificationService.js`| `sendEmailNotification()` | **76 - 124** | Gửi Email HTML qua FormSubmit API và gọi `pushAlertLog()` lưu bảng `alert_logs` |
| **Xác Thực & Bảo Mật Auth** | **Supabase Auth** | `js/supabaseClient.js` | `signInWithPassword()` | **58 - 95** | Xác thực tài khoản đăng nhập bảo mật qua Supabase Auth API / Bcrypt RPC |
| | | `js/app.js` | `sendResetPinCode()` | **239 - 300** | Sinh mã PIN 6 số, lưu Supabase (`save_reset_pin`) và gửi Email khôi phục |

---

# 🌡️📟 NHÓM 1: CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM DHT11 VÀ MÀN HÌNH LCD 16x2 I2C

### 1.1. Sơ Đồ Khối Toàn Diện 6 Giai Đoạn Của Luồng DHT11 (End-to-End Flowchart)

Luồng dữ liệu của cảm biến **DHT11** được thiết kế khép kín và phân tầng rõ ràng qua **6 giai đoạn** từ phần cứng đo đạc, truyền thông mạng, phân phối đám mây đến giao diện trực quan và lưu trữ cơ sở dữ liệu:

```mermaid
flowchart TD
    subgraph STAGE1 ["1. GIAI ĐOẠN KHỞI TẠO (INITIALIZATION)"]
        HW_INIT["Hardware Uno (do_an_cay.ino):<br>• #define DHTPIN A2, DHTTYPE DHT11<br>• DHT dht(DHTPIN, DHTTYPE)<br>• dht.begin() & lcd.init()"]
        ESP_INIT["Gateway ESP8266 (esp_wifi.ino):<br>• Serial.begin(9600)<br>• WiFi.begin(ssid, pass)<br>• client.setServer(broker, 1883)"]
        WEB_INIT["Web Frontend & Supabase (js):<br>• mqttClient.js: wss://broker.emqx.io:8084<br>• supabaseClient.js: initSupabase()"]
    end

    subgraph STAGE2 ["2. GIAI ĐOẠN ĐỌC & LẤY MẪU (SAMPLING & READING)"]
        TIMER["Ngắt thời gian Non-blocking:<br>millis() - previousSensorRead >= 2000ms"] --> READ_DHT["readSensors() (do_an_cay.ino):<br>• t = dht.readTemperature()<br>• h = dht.readHumidity()<br>• Lọc nhiễu: if (!isnan(t) && !isnan(h))"]
        READ_DHT --> LCD_LOCAL["updateLCD(0):<br>Xuất LCD 16x2 I2C Phần Cứng (Hàng 1):<br>T:xx.x°C H:xx%"]
    end

    subgraph STAGE3 ["3. GIAI ĐOẠN ĐÓNG GÓI & GỬI DỮ LIỆU (TRANSMISSION & GATEWAY)"]
        READ_DHT --> PKG_JSON["sendDataToESP() (do_an_cay.ino):<br>Đóng gói chuỗi JSON chuẩn:<br>{\x22temp\x22:28.5,\x22hum\x22:70,...}\n"]
        PKG_JSON -->|"UART Serial Rx/Tx 9600"| ESP_RECV["loop() (esp_wifi.ino):<br>Đọc Serial buffer -> Kiểm tra JSON hợp lệ"]
        ESP_RECV -->|"TCP/IP Wi-Fi (MQTT Publish)"| ESP_SEND["client.publish()<br>Topic: smart_terrarium/nhom05/sensors"]
    end

    subgraph STAGE4 ["4. GIAI ĐOẠN XỬ LÝ BACKEND / BROKER (CLOUD BROKER)"]
        ESP_SEND --> CLOUD_MQTT["☁️ EMQX Cloud MQTT Broker<br>(broker.emqx.io:1883 / Port 8084 WSS)<br>• Định tuyến bản tin Sensors<br>• Phân phối tức thời tới Web Clients"]
    end

    subgraph STAGE5 ["5. GIAI ĐOẠN TIẾP NHẬN & XỬ LÝ FRONTEND (FRONTEND RENDERING)"]
        CLOUD_MQTT -->|"WebSocket WSS Payload"| JS_ONMSG["mqttClient.js: client.on('message')<br>Parse JSON -> data.temp, data.hum"]
        JS_ONMSG --> APP_PROC["app.js: processIncomingSensorData(data)"]
        
        APP_PROC --> DOM_CARDS["updateMetricCards():<br>• #metric-temp-val -> 28.5°C<br>• #metric-hum-val -> 70%"]
        APP_PROC --> LCD_SIM["lcdSimulator.js: updateFromSensors()<br>#lcd-line-1 -> 'Temp:28.5C H:70%'"]
        APP_PROC --> CHARTS["ChartService.appendDataPoint()<br>#historyChart & #quickViewChart (Chart.js)"]
        
        APP_PROC -->|"Nếu temp > 38°C"| ALARM["Kích hoạt Cảnh Báo Quá Nhiệt:<br>• Pushsafer Phone (Icon 82, Priority 2)<br>• Email FormSubmit HTML Table"]
    end

    subgraph STAGE6 ["6. GIAI ĐOẠN LƯU TRỮ & REALTIME SUPABASE (DATABASE & TIME-SERIES)"]
        JS_ONMSG -.->|"Đồng bộ lưu trữ"| SP_INSERT["SupabaseService.pushSensorData(record)<br>INSERT INTO sensor_logs<br>(temperature, humidity, created_at)"]
        SP_INSERT --> PG_DB[("🗄️ Supabase PostgreSQL Cloud<br>Table: public.sensor_logs")]
        PG_DB -->|"Realtime WebSockets (postgres_changes)"| SP_SUB["subscribeRealtime(): Nhận event INSERT"]
        PG_DB -->|"fetchSensorHistory(30)"| SP_HIST["Nạp lịch sử biểu đồ ban đầu (Cold Start)"]
        PG_DB -->|"exportToCSV()"| CSV_FILE["📁 Xuất báo cáo Excel CSV UTF-8 BOM"]
    end

    STAGE1 -.-> STAGE2
    STAGE2 --> STAGE3
    STAGE3 --> STAGE4
    STAGE4 --> STAGE5
    STAGE5 --> STAGE6
```

---

### 1.2. Sơ Đồ Tuần Tự Toàn Diện Của Luồng DHT11 (Full Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant Sensor as 🌡️ DHT11 (Chân A2)
    participant Uno as 💻 Arduino Uno (do_an_cay.ino)
    participant LCD_HW as 📟 LCD 16x2 I2C Phần Cứng
    participant ESP as 📡 ESP8266 Gateway (esp_wifi.ino)
    participant Broker as ☁️ EMQX MQTT Broker
    participant WebMQTT as 🌐 mqttClient.js
    participant AppCore as ⚙️ app.js
    participant UI_DOM as 🖥️ Thẻ Đo & LCD Simulator
    participant ChartEngine as 📈 charts.js (Chart.js)
    participant SupaDB as 🗄️ Supabase DB (sensor_logs)
    participant NotiService as 🚨 notificationService.js

    Note over Uno, Sensor: 1. Khởi tạo (setup) & Chu kỳ lấy mẫu Non-blocking 2000ms
    Uno->>Sensor: dht.readTemperature(), dht.readHumidity()
    Sensor-->>Uno: Trả về điện áp 1-Wire -> Chuyển đổi số: t = 28.5°C, h = 70.0%
    Uno->>Uno: Kiểm tra hợp lệ: !isnan(t) && !isnan(h)
    
    par Hiển thị LCD 16x2 Tại Chỗ
        Uno->>LCD_HW: updateLCD(0) -> Hàng 1: "T:28.5°C H:70%   "
    and Đóng Gói JSON & Xuất UART Serial
        Uno->>ESP: sendDataToESP() -> Serial.println("{\"temp\":28.5,\"hum\":70.0,...}")
    end

    Note over ESP, Broker: 2. Gateway chuyển tiếp MQTT lên Cloud Broker
    ESP->>ESP: loop() nhận chuỗi JSON từ Serial buffer
    ESP->>Broker: client.publish("smart_terrarium/nhom05/sensors", JSON)
    Broker->>WebMQTT: Phân phối WebSocket (WSS Port 8084) tới trình duyệt

    Note over WebMQTT, UI_DOM: 3. Xử lý Frontend, Cập nhật Giao diện & Biểu đồ
    WebMQTT->>WebMQTT: JSON.parse() -> data.temp = 28.5, data.hum = 70.0
    WebMQTT->>AppCore: processIncomingSensorData(mapped)
    
    par Cập nhật Thẻ Số Liệu Dashboard
        AppCore->>UI_DOM: updateMetricCards() -> #metric-temp-val ("28.5°C"), #metric-hum-val ("70%")
    and Cập nhật LCD 16x2 Simulator
        AppCore->>UI_DOM: LCDSimulator.updateFromSensors() -> #lcd-line-1 ("Temp:28.5C H:70%")
    and Vẽ Điểm Thời Gian Thực Lên Biểu Đồ
        AppCore->>ChartEngine: ChartService.appendDataPoint() & appendQuickChartPoint()
        ChartEngine->>UI_DOM: Cập nhật trục yTemp (trái) & yPercent (phải) trên Canvas
    end

    Note over AppCore, SupaDB: 4. Lưu trữ Cơ sở Dữ liệu & Cảnh báo nếu Quá Nhiệt
    opt Lưu trữ Dữ liệu Lịch sử Chuỗi Thời Gian
        AppCore->>SupaDB: SupabaseService.pushSensorData(mapped) -> INSERT INTO sensor_logs
        SupaDB-->>WebMQTT: Realtime Event 'INSERT' (postgres_changes)
    end

    opt Kiểm tra Ngưỡng Quá Nhiệt (temp > 38°C)
        AppCore->>NotiService: checkAndTriggerAlerts(data, {TEMP_MAX: 38.0})
        NotiService->>NotiService: Bắn Pushsafer về điện thoại & Gửi Email FormSubmit
    end
```

---

### 1.3. Phân Tích Chuyên Sâu 6 Giai Đoạn Cốt Lõi Của Luồng DHT11

#### Giai Đoạn 1: Khởi Tạo Hệ Thống (Initialization)
1. **Phần cứng Arduino Uno ([do_an_cay.ino](file:///d:/web_vlcntt/do_an_cay/do_an_cay.ino)):**
   * Định nghĩa chân dữ liệu `DHTPIN A2` và kiểu cảm biến `DHTTYPE DHT11` (Dòng 6 – 7).
   * Khởi tạo đối tượng toàn cục `DHT dht(DHTPIN, DHTTYPE)` (Dòng 31).
   * Trong hàm `setup()` (Dòng 87 – 102): Gọi `dht.begin()` để kích hoạt giao tiếp 1-Wire, khởi tạo màn hình LCD I2C qua `lcd.init()`, bật đèn nền `lcd.backlight()` và nạp byte ký tự độ C `°` vào CGRAM địa chỉ 0 qua `lcd.createChar(0, degreeChar)`.
2. **Gateway ESP8266 ([esp_wifi.ino](file:///d:/web_vlcntt/esp_wifi/esp_wifi.ino)):**
   * Cấu hình Serial baudrate `9600` kết nối trực tiếp với Arduino Uno (Dòng 25).
   * Kết nối mạng Wi-Fi qua `setupWiFi()` ở chế độ `WIFI_STA` (Dòng 60 – 70).
   * Cấu hình MQTT Broker `broker.emqx.io` cổng `1883` qua `client.setServer()` và đăng ký callback `mqttCallback` (Dòng 31 – 32).
3. **Web Frontend & Supabase ([js/mqttClient.js](file:///d:/web_vlcntt/js/mqttClient.js) & [js/supabaseClient.js](file:///d:/web_vlcntt/js/supabaseClient.js)):**
   * Kết nối WebSocket bảo mật tới `wss://broker.emqx.io:8084/mqtt` và subscribe topic `smart_terrarium/nhom05/sensors` (Dòng 20 – 45 trong `mqttClient.js`).
   * Khởi tạo Supabase SDK qua `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` (Dòng 15 – 51 trong `supabaseClient.js`).

---

#### Giai Đoạn 2: Đọc Cảm Biến & Kiểm Tra Tính Hợp Lệ (Sampling & Validation)
* **Kỹ thuật lấy mẫu Non-blocking:** Sử dụng bộ đếm thời gian `millis() - previousSensorRead >= sensorInterval` (`2000ms`) trong `loop()` (Dòng 111 – 116 của `do_an_cay.ino`) giúp hệ thống vừa đọc định kỳ 2 giây/lần vừa không bị block luồng xử lý Serial và Relay.
* **Hàm đọc cảm biến `readSensors()` (Dòng 171 – 179):**
  ```cpp
  // Dòng 171-179 trong do_an_cay/do_an_cay.ino
  void readSensors() {
    // 1. Đọc DHT11
    float t = dht.readTemperature(); // Đọc nhiệt độ (°C)
    float h = dht.readHumidity();    // Đọc độ ẩm không khí (%RH)
    if (!isnan(t) && !isnan(h)) {    // Bộ lọc khử nhiễu NaN (Not a Number)
      temperature = t;
      humidity = h;
    }
    ...
  }
  ```
* **Xuất màn hình LCD 16x2 phần cứng (`updateLCD(0)`, Dòng 259 – 315):**
  Khi `currentScreen == 0`, Arduino Uno ghi trực tiếp lên hàng 0 của LCD:
  `T:[temperature]°C H:[humidity]%` (Ví dụ: `T:28.5°C H:70%   `).

---

#### Giai Đoạn 3: Đóng Gói Chuỗi JSON & Gửi Qua Gateway ESP8266 (Transmission)
* **Đóng gói JSON trên Arduino Uno (`sendDataToESP()`, Dòng 194 – 212):**
  Chuỗi JSON chuẩn chứa đầy đủ các trường dữ liệu cảm biến và trạng thái chấp hành được xuất qua cổng UART Serial:
  ```cpp
  // Dòng 197-211 trong do_an_cay/do_an_cay.ino
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
  ```
* **Chuyển tiếp qua ESP8266 Gateway (`loop()`, Dòng 42 – 57 trong `esp_wifi.ino`):**
  ESP8266 liên tục gom từng byte Serial vào `serialData`. Khi gặp ký tự xuống dòng `\n` hoặc `\r`, nó kiểm tra chuỗi có hợp lệ `startsWith("{") && endsWith("}")` và thực hiện Publish lên Topic MQTT:
  ```cpp
  // Dòng 48-52 trong esp_wifi/esp_wifi.ino
  if (serialData.startsWith("{") && serialData.endsWith("}")) {
    client.publish(topic_sensors, serialData.c_str());
  }
  ```

---

#### Giai Đoạn 4: Xử Lý Backend & Cloud Broker
* **MQTT Broker (`broker.emqx.io:1883` / WSS `8084`):**
  Đóng vai trò là trung tâm phân phối dữ liệu (Message Broker), chuyển tiếp gói tin từ ESP8266 tới toàn bộ các Client đã kết nối qua giao thức WebSocket WSS bảo mật.
* **Topic phân luồng rõ ràng:**
  * Topic gửi cảm biến: `smart_terrarium/nhom05/sensors`
  * Topic nhận lệnh điều khiển: `smart_terrarium/nhom05/control`

---

#### Giai Đoạn 5: Tiếp Nhận, Xử Lý Frontend & Cập Nhật Giao Diện (Frontend Rendering)
* **Bóc tách dữ liệu tại `mqttClient.js` (Dòng 57 – 128):**
  ```javascript
  // Dòng 76-85 trong js/mqttClient.js
  const data = JSON.parse(payloadStr);
  const mapped = {
      temperature: data.temp !== undefined ? parseFloat(data.temp) : 0.0,
      humidity: data.hum !== undefined ? parseFloat(data.hum) : 0.0,
      soil_moisture: data.soil !== undefined ? parseFloat(data.soil) : 0.0,
      light_level: data.ldr !== undefined ? (parseFloat(data.ldr) * 10) : 0.0,
      is_dark: data.ldr !== undefined ? (parseFloat(data.ldr) < 30) : false,
      created_at: new Date().toISOString()
  };
  ```
* **Cập nhật các khối giao diện tương ứng:**
  1. **Thẻ đo Dashboard (`updateMetricCards()`, Dòng 899 – 915 trong `app.js`):**
     * Gán `mapped.temperature.toFixed(1) + "°C"` vào `#metric-temp-val` ([index.html: Dòng 438](file:///d:/web_vlcntt/index.html#L438)).
     * Gán `mapped.humidity.toFixed(0) + "%"` vào `#metric-hum-val` ([index.html: Dòng 455](file:///d:/web_vlcntt/index.html#L455)).
  2. **Màn hình LCD 16x2 Simulator (`updateFromSensors()`, Dòng 48 – 68 trong `lcdSimulator.js`):**
     * Dòng 1 LCD: `Temp:28.5C H:70%` được đệm chuẩn 16 ký tự qua hàm `pad16()` và đưa vào `#lcd-line-1` ([index.html: Dòng 547](file:///d:/web_vlcntt/index.html#L547)).
     * Dòng 2 LCD: `Soil:65% Lgt:DARK` đưa vào `#lcd-line-2` ([index.html: Dòng 548](file:///d:/web_vlcntt/index.html#L548)).
  3. **Vẽ biểu đồ thời gian thực (`ChartService.appendDataPoint()`, Dòng 132 – 156 trong `charts.js`):**
     * Đẩy `mapped.temperature` vào Dataset 0 (trục trái `yTemp` màu Hổ phách `#f59e0b`).
     * Đẩy `mapped.humidity` vào Dataset 1 (trục phải `yPercent` màu Cyan `#06b6d4`).
     * Gọi `mainChart.update('none')` để render 60 FPS mượt mà không giật lag.
  4. **Kích hoạt cảnh báo quá nhiệt (`processIncomingSensorData()`, Dòng 884 – 897 trong `app.js`):**
     * Nếu `data.temperature > AppState.tempMaxThreshold` (ngưỡng mặc định `38.0°C`), hệ thống tự động ghi nhật ký cảnh báo và gọi `NotificationService.checkAndTriggerAlerts()` để bắn thông báo khẩn qua Pushsafer và Email.

---

#### Giai Đoạn 6: Lưu Trữ Vào Cơ Sở Dữ Liệu Supabase & Đồng Bộ Realtime (Database & Time-series)
* **Cấu trúc bảng PostgreSQL `sensor_logs` ([supabase/schema.sql](file:///d:/web_vlcntt/supabase/schema.sql)):**
  ```sql
  -- Dòng 6-14 trong supabase/schema.sql
  CREATE TABLE IF NOT EXISTS public.sensor_logs (
      id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Ho_Chi_Minh', NOW()) NOT NULL,
      temperature NUMERIC(5, 2) NOT NULL,    -- Nhiệt độ (°C) từ DHT11
      humidity NUMERIC(5, 2) NOT NULL,       -- Độ ẩm không khí (%) từ DHT11
      soil_moisture NUMERIC(5, 2) NOT NULL,  -- Độ ẩm đất (%) từ SMS-V1
      light_level NUMERIC(7, 2) DEFAULT 0,   -- Ánh sáng (Lux) từ LDR
      is_dark BOOLEAN DEFAULT FALSE          -- Trạng thái Trời tối / Sáng
  );
  ```
* **Hàm ghi dữ liệu cảm biến (`pushSensorData()`, Dòng 327 – 344 trong `js/supabaseClient.js`):**
  ```javascript
  // Dòng 327-344 trong js/supabaseClient.js
  async function pushSensorData(record) {
      if (!supabaseClient) initSupabase();
      if (!supabaseClient) return false;
      try {
          const { error } = await supabaseClient
              .from('sensor_logs')
              .insert([record]);
          return !error;
      } catch (err) {
          return false;
      }
  }
  ```
* **Lắng nghe WebSockets Realtime (`subscribeRealtime()`, Dòng 191 – 233 trong `js/supabaseClient.js`):**
  Kích hoạt kênh lắng nghe sự kiện `INSERT` trên bảng `sensor_logs` để đồng bộ thời gian thực cho mọi thiết bị truy cập hệ thống.
* **Trích xuất dữ liệu ra file báo cáo Excel (`exportToCSV()`, Dòng 197 – 223 trong `js/charts.js`):**
  Xuất dữ liệu lịch sử đo đạc DHT11 ra file `biosync_sensor_logs_YYYY-MM-DD.csv` định dạng chuẩn UTF-8 kèm mã BOM `\uFEFF` giúp mở trực tiếp trên Microsoft Excel không bị lỗi font tiếng Việt.

---

### 1.4. Bảng Ma Trận Đối Soát Dữ Liệu DHT11 Xuyên Suốt 6 Tầng Hệ Thống

| Tầng Hệ Thống | Thành Phần Đảm Nhiệm | Định Dạng Dữ Liệu | Tên Biến / Trường Dữ Liệu | Ví Dụ Giá Trị Cụ Thể |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cảm biến DHT11** | Chân tín hiệu Data (A2) | Xung điện áp 1-Wire | Tín hiệu xung 40-bit | 16-bit độ ẩm + 16-bit nhiệt độ + 8-bit checksum |
| **2. Arduino Uno** | Thư viện `DHT.h` | `float` (IEEE 754) | `temperature`, `humidity` | `temperature = 28.5`, `humidity = 70.0` |
| **3. LCD 16x2 Hardware** | IC I2C PCF8574 (0x27) | Ký tự ASCII 16x2 | Hàng 0: `T:xx.x°C H:xx%` | `T:28.5°C H:70%   ` |
| **4. Truyền UART & MQTT** | Serial Uno $\rightarrow$ ESP8266 | Chuỗi JSON chuẩn | `{"temp": float, "hum": float}`| `{"temp":28.5,"hum":70.0,"soil":65,...}` |
| **5. Frontend Web** | `mqttClient.js` & `app.js` | Object JS & DOM Text | `mapped.temperature`, `mapped.humidity` | `#metric-temp-val`: `28.5°C`, `#metric-hum-val`: `70%` |
| **6. LCD Simulator Web** | `lcdSimulator.js` | DOM String 16 ký tự | `#lcd-line-1` (`pad16`) | `Temp:28.5C H:70%` (16 ký tự) |
| **7. Supabase Database** | PostgreSQL Cloud | Table `sensor_logs` | `temperature`, `humidity` | `temperature: 28.50`, `humidity: 70.00` |
| **8. Báo Cáo CSV** | `charts.js` | File CSV UTF-8 BOM | `NhietDo_C`, `DoAmKhongKhi_%` | `"2026-08-19 13:00:00",28.5,70,65,800,KHONG` |

---

### 1.5. Luồng Xuất Chế Độ Chủ Động / Bị Động Từ Thao Tác Người Dùng Lên LCD 16x2

```mermaid
flowchart TD
    subgraph USER_ACTION ["1. THAO TÁC NGƯỜI DÙNG TRÊN FRONTEND (index.html & app.js)"]
        ACT_BTN["Cách 1: Nhấn nút chọn Chế độ<br>• #mode-auto-btn (Tự Động / Chủ Động)<br>• #mode-manual-btn (Thủ Công / Bị Động)<br>• #control-mode-tag (Thẻ badge)"]
        ACT_DEV["Cách 2: Điều khiển thiết bị thủ công<br>• Bấm BẬT/TẮT Bơm M1 (#btn-pump-on/off)<br>• Bấm BẬT/TẮT Đèn L1 (#btn-lamp-on/off)<br>(Hệ thống tự chuyển sang Manual)"]
        
        ACT_BTN -->|"Gọi hàm"| JS_MODE["setSystemMode(mode)<br>(app.js: Dòng 672-697)"]
        ACT_DEV -->|"Gọi hàm"| JS_MODE
    end

    subgraph MQTT_TRANSMISSION ["2. TRUYỀN THÔNG LỆNH QUA MQTT & ESP8266"]
        JS_MODE -->|"MQTTService.sendCommand()"| MQTT_PUB["Publish gói tin điều khiển<br>Topic: smart_terrarium/nhom05/control<br>Payload: 'MODE:AUTO' hoặc 'MODE:MANUAL'"]
        MQTT_PUB -->|"TCP/IP Wi-Fi"| ESP_CB["ESP8266: mqttCallback()<br>(esp_wifi.ino: Dòng 73-85)"]
        ESP_CB -->|"UART Serial Tx/Rx 9600"| UNO_UART["Gửi UART xuống Uno:<br>Serial.println('MODE:AUTO') hoặc<br>Serial.println('MODE:MANUAL')"]
    end

    subgraph UNO_PROCESSING ["3. XỬ LÝ TRÊN ARDUINO UNO (do_an_cay.ino)"]
        UNO_UART --> UNO_READ["readSerialCommands()<br>(Dòng 215-227)"]
        UNO_READ --> UNO_PARSE["parseCommand(cmd)<br>(Dòng 230-256)<br>Cập nhật: isAutoMode = true / false"]
        
        UNO_PARSE --> CHECK_MODE{"isAutoMode == true ?"}
        CHECK_MODE -- "CHỦ ĐỘNG (Auto)" --> MODE_ACTIVE["isAutoMode = true<br>• Tự bật Bơm khi Đất < 40%<br>• Tự bật Đèn khi Tối < 30%"]
        CHECK_MODE -- "BỊ ĐỘNG (Manual)" --> MODE_PASSIVE["isAutoMode = false<br>• Khóa logic tự động<br>• Chấp hành theo lệnh Web"]
    end

    subgraph LCD_OUTPUT ["4. XUẤT HIỂN THỊ LÊN MÀN HÌNH LCD 16X2"]
        MODE_ACTIVE -->|"updateLCD(1)"| LCD_HW_AUTO["📟 LCD 16x2 Phần Cứng (Dòng 2):<br>Che do: TU DONG "]
        MODE_PASSIVE -->|"updateLCD(1)"| LCD_HW_MAN["📟 LCD 16x2 Phần Cứng (Dòng 2):<br>Che do: THU CONG"]

        JS_MODE -->|"Cập nhật mô phỏng Web"| LCD_WEB_SIM["🖥️ LCD 16x2 Web (#lcd-line-2):<br>Soil:xx% [AUTO] hoặc [MANUAL]"]
    end
```

---

### 1.6. Vị Trí Cụ Thể Trên Giao Diện Frontend ([index.html](file:///d:/web_vlcntt/index.html))

| Tên Khối Giao Diện | File Nguồn | ID Phần Tử DOM | Vị Trí Dòng Code | Chức Năng Hiển Thị |
| :--- | :--- | :--- | :---: | :--- |
| **Thẻ Đo Nhiệt Độ Dashboard**| `index.html`| `#metric-temp-val` | **Dòng 438** | Thẻ lớn hiển thị số đo nhiệt độ tức thời (°C) từ DHT11 |
| **Thẻ Đo Độ Ẩm Dashboard** | `index.html` | `#metric-hum-val` | **Dòng 455** | Thẻ lớn hiển thị số đo độ ẩm không khí (%) từ DHT11 |
| **Khung Màn hình LCD 16x2** | `index.html` | `#lcd-screen-container` | **Dòng 546** | Hộp chứa nền xanh LCD retro, viền phát sáng, chứa 2 dòng hiển thị |
| **Dòng 1 LCD 16x2** | `index.html` | `#lcd-line-1` | **Dòng 547** | Hiển thị chuỗi Nhiệt độ & Độ ẩm DHT11 (`Temp:xx.xC H:xx%`) |
| **Dòng 2 LCD 16x2** | `index.html` | `#lcd-line-2` | **Dòng 548** | Hiển thị chuỗi Độ ẩm đất & Trạng thái sáng (`Soil:xx% Lgt:DARK/SUNNY`) |
| **Tab Chứa LCD Simulator** | `index.html` | `#tab-analytics` | **Dòng 524** | Tab Phân tích & Dự đoán (Analytics) trên thanh điều hướng |
| **Thẻ Đo Độ Ẩm Đất** | `index.html` | `#metric-soil-val` | **Dòng 472** | Thẻ lớn hiển thị phần trăm độ ẩm đất (%) |
| **Thẻ Đo Quang Trở LDR** | `index.html` | `#metric-light-val` | **Dòng 489** | Thẻ lớn hiển thị độ sáng Lux & trạng thái Ngày/Đêm |

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

# 📊📈 NHÓM 3: CƠ SỞ DỮ LIỆU (SUPABASE) & BIỂU ĐỒ TIME-SERIES (CHART.JS)

### 3.1. Sơ Đồ Khối Toàn Diện (End-to-End Flowchart)

```mermaid
flowchart TD
    subgraph SENSOR_TIER ["1. TẦNG CẢM BIẾN & GATEWAY (Uno + ESP8266)"]
        DHT_SMS["🌡️ DHT11 (Nhiệt độ, Độ ẩm KK)<br>🌱 SMS-V1 (Độ ẩm đất)<br>☀️ LM393 (Quang trở LDR)"]
        DHT_SMS -->|"Đọc chu kỳ 2s & đóng gói JSON"| UNO["Arduino Uno: sendDataToESP()<br>(do_an_cay.ino: Dòng 194-212)"]
        UNO -->|"UART Serial 9600"| ESP["ESP8266: loop()<br>(esp_wifi.ino: Dòng 43-57)"]
    end

    subgraph CLOUD_DATABASE ["2. TẦNG CƠ SỞ DỮ LIỆU SUPABASE (PostgreSQL Cloud)"]
        ESP -->|"HTTPS POST REST / Realtime"| SP_INSERT["Bảng PostgreSQL: sensor_logs<br>• temperature (float)<br>• humidity (float)<br>• soil_moisture (int)<br>• light_level (int)<br>• is_dark (bool)<br>• created_at (timestampz)"]
    end

    subgraph WEB_SYNC ["3. TẦNG ĐỒNG BỘ THỜI GIAN THỰC & TRUY VẤN LỊCH SỬ"]
        SP_INSERT -->|"WebSockets: postgres_changes (INSERT)"| SP_WS["SupabaseService.subscribeRealtime()<br>(js/supabaseClient.js: Dòng 191-233)"]
        SP_INSERT -->|"REST API Query: fetchSensorHistory()"| SP_QUERY["SupabaseService.fetchSensorHistory(limit)<br>(js/supabaseClient.js: Dòng 240-262)"]
        
        SP_WS -->|"Dữ liệu mới (Realtime)"| APP_DISPATCH["app.js: processIncomingSensorData(data)"]
        SP_QUERY -->|"Mảng lịch sử (History Array)"| APP_LOAD["app.js: loadHistoryChartData()"]
    end

    subgraph CHART_ENGINE ["4. TẦNG RENDER BIỂU ĐỒ TIME-SERIES (Chart.js Engine)"]
        APP_DISPATCH -->|"Cập nhật mượt mà (FIFO max 30-50 pts)"| CHART_APPEND["ChartService.appendDataPoint(record)<br>(js/charts.js: Dòng 132-156)"]
        APP_LOAD -->|"Nạp tập dữ liệu lịch sử"| CHART_SET["ChartService.loadDataSet(dataList)<br>(js/charts.js: Dòng 161-178)"]
        
        CHART_APPEND --> DUAL_AXES["Biểu đồ Đa Đường Trục Kép (Dual Y-Axes)<br>• Trục trái (yTemp): Nhiệt độ 15°C - 45°C (#f59e0b)<br>• Trục phải (yPercent): Độ ẩm KK & Đất 0% - 100%"]
        CHART_SET --> DUAL_AXES
        
        DUAL_AXES --> DOM_CANVAS["📍 Canvas #historyChart (Tab Analytics: Dòng 578)"]
        APP_DISPATCH --> DOM_QUICK["📍 Canvas #quickViewChart (Tab Dashboard: Dòng 395)"]
    end

    subgraph REPORT_EXPORT ["5. TẦNG XUẤT BÁO CÁO (CSV EXPORT)"]
        DUAL_AXES -->|"Bấm nút #btn-export-csv"| CSV_GEN["ChartService.exportToCSV()<br>(js/charts.js: Dòng 197-223)<br>Tạo Blob UTF-8 kèm BOM (\uFEFF)"]
        CSV_GEN --> CSV_FILE["📁 File: biosync_sensor_logs_YYYY-MM-DD.csv<br>(Mở trực tiếp trên Microsoft Excel tiếng Việt không lỗi font)"]
    end
```

---

### 3.2. Sơ Đồ Tuần Tự Đồng Bộ Dữ Liệu & Render Time-series (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant ESP as ESP8266 Gateway
    participant SupaDB as Supabase Database (PostgreSQL)
    participant SupaClient as supabaseClient.js
    participant App as app.js
    participant ChartJS as charts.js (Chart.js Engine)
    participant DOM_Canvas as Canvas HTML5 (#historyChart)
    participant User as Người Dùng

    Note over User, DOM_Canvas: 1. Khởi tạo & Tải dữ liệu lịch sử ban đầu (Cold Start)
    App->>ChartJS: ChartService.init() -> Khởi tạo Chart(ctx, config) với Dual Y-Axes
    App->>SupaClient: SupabaseService.fetchSensorHistory(30)
    SupaClient->>SupaDB: SELECT * FROM sensor_logs ORDER BY created_at DESC LIMIT 30
    SupaDB-->>SupaClient: Trả về mảng 30 bản ghi JSON
    SupaClient->>SupaClient: Đảo chiều mảng (reverse) theo thứ tự thời gian tăng dần
    SupaClient-->>App: dataList[]
    App->>ChartJS: ChartService.loadDataSet(dataList)
    ChartJS->>DOM_Canvas: mainChart.update() -> Vẽ 3 đường biểu đồ lịch sử

    Note over ESP, DOM_Canvas: 2. Đồng bộ thời gian thực qua WebSockets (Realtime Stream)
    ESP->>SupaDB: INSERT INTO sensor_logs (temp, hum, soil, light) VALUES (28.5, 70, 65, 80)
    SupaDB-->>SupaClient: WebSocket Event 'INSERT' -> payload.new
    SupaClient->>App: Callback onSensorData(newRecord)
    App->>ChartJS: ChartService.appendDataPoint(newRecord)
    ChartJS->>ChartJS: Push nhãn thời gian HH:mm:ss & data (FIFO: shift nếu > 30 pts)
    ChartJS->>DOM_Canvas: mainChart.update('none') -> Cập nhật mượt, không giật lag

    Note over User, ChartJS: 3. Xuất file báo cáo lịch sử CSV UTF-8
    User->>App: Bấm nút "Xuất File CSV" (#btn-export-csv)
    App->>ChartJS: ChartService.exportToCSV()
    ChartJS->>ChartJS: Ghép chuỗi UTF-8 BOM (\uFEFF) & tạo Blob URL
    ChartJS-->>User: Trình duyệt tự động tải file `biosync_sensor_logs_2026-08-19.csv`
```

---

### 3.3. Cấu Trúc Bảng Dữ Liệu `sensor_logs` (Supabase PostgreSQL)

| Tên Cột (Column) | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Nguồn Cung Cấp |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Khóa chính tự tăng của mỗi bản ghi đo |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Mốc thời gian ISO 8601 (Dùng cho trục hoành Time-series) |
| `temperature` | `NUMERIC(4,1)`| `NOT NULL` | Nhiệt độ môi trường (°C) từ cảm biến DHT11 |
| `humidity` | `NUMERIC(4,1)`| `NOT NULL` | Độ ẩm không khí (%RH) từ cảm biến DHT11 |
| `soil_moisture`| `INTEGER` | `DEFAULT 0` | Độ ẩm đất (%) từ cảm biến điện dung SMS-V1 |
| `light_level` | `INTEGER` | `DEFAULT 0` | Cường độ sáng (%) từ quang trở LDR / LM393 |
| `is_dark` | `BOOLEAN` | `DEFAULT false` | Cờ trạng thái môi trường tối/sáng |

---

### 3.4. Kiến Trúc Hệ Trục Kép Dual Y-Axes & Chiến Lược Cập Nhật Biểu Đồ

1. **Hệ 2 trục tung độc lập (Dual Y-Axes):**
   * **Trục trái (`yTemp`):** Chuyên dụng cho **Nhiệt độ (°C)**, dải đo đề xuất `15°C - 45°C`, nét vẽ màu vàng/hổ phách (`#f59e0b`), vùng phủ gradient `rgba(245, 158, 11, 0.12)`.
   * **Trục phải (`yPercent`):** Chuyên dụng cho **Độ ẩm không khí (%)** (nét vẽ màu Cyan `#06b6d4`) và **Độ ẩm đất (%)** (nét đứt Emerald `#10b981`), dải đo cố định `0% - 100%`.
2. **Cơ chế cập nhật không giật lag (`mainChart.update('none')`):**
   * Tắt animation chuyển cảnh nặng khi nhận điểm realtime mỗi 2 giây, giúp giao diện 60 FPS mượt mà.
   * Áp dụng hàng đợi **FIFO (First In First Out)** giới hạn 30 điểm hiển thị trên màn hình nhằm tránh tràn bộ nhớ RAM trình duyệt.

---

### 3.5. Vị Trí Cụ Thể Trên Giao Diện Frontend ([index.html](file:///d:/web_vlcntt/index.html))

| Tên Phần Tử Giao Diện | File Nguồn | ID Phần Tử DOM | Vị Trí Dòng Code | Chức Năng Chi Tiết |
| :--- | :--- | :--- | :---: | :--- |
| **Canvas Biểu Đồ Time-series Lớn** | `index.html` | `#historyChart` | **Dòng 578** | Vùng vẽ Canvas đồ thị đa đường Chart.js toàn diện |
| **Canvas Biểu Đồ Dashboard Thu Nhỏ**| `index.html` | `#quickViewChart`| **Dòng 395** | Vùng vẽ Canvas biểu đồ nhanh tại trang Tổng quan |
| **Nút Xuất Dữ Liệu CSV** | `index.html` | `#btn-export-csv` | **Dòng 569** | Nút bấm trích xuất toàn bộ dữ liệu time-series ra file CSV |
| **Tab Chứa Biểu Đồ Phân Tích** | `index.html` | `#tab-analytics` | **Dòng 524** | Tab Phân tích dữ liệu & Đồ thị trên thanh điều hướng |
| **Nút Chọn Khung Thời Gian 1H** | `index.html` | `#btn-filter-1h` | **Dòng 562** | Bộ lọc hiển thị dữ liệu lịch sử trong 1 giờ gần nhất |
| **Nút Chọn Khung Thời Gian 24H**| `index.html` | `#btn-filter-24h`| **Dòng 564** | Bộ lọc hiển thị dữ liệu lịch sử trong 24 giờ gần nhất |

---

### 3.6. Chi Tiết Các Hàm & Dòng Lệnh Cốt Lõi (Nhóm 3)

#### 1. Tầng Cơ Sở Dữ Liệu Supabase ([js/supabaseClient.js](file:///d:/web_vlcntt/js/supabaseClient.js))
* **Hàm Ghi Dữ Liệu Cảm Biến Vào Database (`pushSensorData()`, Dòng 327 – 344):**
  ```javascript
  // Dòng 327-344 trong js/supabaseClient.js
  async function pushSensorData(record) {
      if (!supabaseClient) initSupabase();
      if (!supabaseClient) return false;

      try {
          // Thực hiện lệnh INSERT vào bảng PostgreSQL 'sensor_logs'
          const { error } = await supabaseClient
              .from('sensor_logs')
              .insert([record]);

          if (error) {
              console.warn("Lỗi pushSensorData:", error.message);
              return false;
          }
          return true;
      } catch (err) {
          return false;
      }
  }
  ```

* **Hàm Ghi Nhật Ký Cảnh Báo Vào Database (`pushAlertLog()`, Dòng 346 – 364):**
  ```javascript
  // Dòng 346-364 trong js/supabaseClient.js
  async function pushAlertLog(alertObj) {
      if (!supabaseClient) initSupabase();
      if (!supabaseClient) return false;

      try {
          const { error } = await supabaseClient
              .from('alert_logs')
              .insert([{
                  alert_type: alertObj.alert_type || alertObj.type || "SYSTEM_WARN",
                  severity: alertObj.severity || "INFO",
                  message: alertObj.message || ""
              }]);

          if (error) return false;
          return true;
      } catch (err) {
          return false;
      }
  }
  ```

* **Hàm Cập Nhật / Upsert Trạng Thái Điều Khiển Thiết Bị (`updateDeviceControls()`, Dòng 301 – 325):**
  ```javascript
  // Dòng 301-325 trong js/supabaseClient.js
  async function updateDeviceControls(controlsPayload) {
      if (!supabaseClient) initSupabase();
      if (!supabaseClient) return false;

      try {
          const updateRecord = {
              id: 1,
              ...controlsPayload,
              updated_at: new Date().toISOString()
          };
          const { error } = await supabaseClient
              .from('device_controls')
              .upsert(updateRecord);

          return !error;
      } catch (err) {
          return false;
      }
  }
  ```

* **Lắng nghe WebSockets Realtime (`subscribeRealtime()`, Dòng 191 – 233):**
  ```javascript
  // Dòng 201-209 trong js/supabaseClient.js
  realtimeChannel = supabaseClient
      .channel('public:smart_terrarium_realtime')
      // Lắng nghe bản ghi cảm biến mới chèn từ ESP8266
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_logs' }, payload => {
          console.log("⚡ [Realtime Supabase] Dữ liệu cảm biến mới từ ESP8266:", payload.new);
          if (callbacks.onSensorData) {
              callbacks.onSensorData(payload.new);
          }
      })
      .subscribe();
  ```

* **Truy vấn lịch sử chuỗi thời gian (`fetchSensorHistory()`, Dòng 240 – 262):**
  ```javascript
  // Dòng 245-257 trong js/supabaseClient.js
  const { data, error } = await supabaseClient
      .from('sensor_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

  if (error) return null;
  // Đảo lại thứ tự thời gian tăng dần để vẽ biểu đồ từ trái sang phải
  return (data || []).reverse();
  ```

#### 2. Tầng Engine Biểu Đồ Chart.js ([js/charts.js](file:///d:/web_vlcntt/js/charts.js))
* **Khởi tạo đồ thị đa đường với hệ 2 trục Y (`initChart()`, Dòng 13 – 127):**
  ```javascript
  // Dòng 22-64 & 99-119 trong js/charts.js
  mainChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: [],
          datasets: [
              { label: 'Nhiệt độ (°C)', data: [], borderColor: '#f59e0b', yAxisID: 'yTemp' },
              { label: 'Độ ẩm không khí (%)', data: [], borderColor: '#06b6d4', yAxisID: 'yPercent' },
              { label: 'Độ ẩm đất (%)', data: [], borderColor: '#10b981', borderDash: [4, 4], yAxisID: 'yPercent' }
          ]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
              yTemp: { type: 'linear', position: 'left', suggestedMin: 15, suggestedMax: 45 },
              yPercent: { type: 'linear', position: 'right', min: 0, max: 100 }
          }
      }
  });
  ```

* **Thêm điểm thời gian thực mượt mà (`appendDataPoint()`, Dòng 132 – 156):**
  ```javascript
  // Dòng 132-156 trong js/charts.js
  function appendDataPoint(record) {
      if (!mainChart) return;
      const timeLabel = new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      mainChart.data.labels.push(timeLabel);
      mainChart.data.datasets[0].data.push(record.temperature);
      mainChart.data.datasets[1].data.push(record.humidity);
      mainChart.data.datasets[2].data.push(record.soil_moisture);

      // FIFO: Giới hạn 30 điểm gần nhất
      if (mainChart.data.labels.length > 30) {
          mainChart.data.labels.shift();
          mainChart.data.datasets.forEach(ds => ds.data.shift());
      }
      mainChart.update('none'); // Cập nhật không giật lag
  }
  ```

* **Xuất tập dữ liệu ra file CSV chuẩn UTF-8 BOM (`exportToCSV()`, Dòng 197 – 223):**
  ```javascript
  // Dòng 203-219 trong js/charts.js
  // Sử dụng ký tự \uFEFF (UTF-8 Byte Order Mark) để Excel mở tiếng Việt chuẩn 100%
  let csvContent = "\uFEFFThoiGian,NhietDo_C,DoAmKhongKhi_%,DoAmDat_%,AnhSang_Lux,TroiToi\n";
  chartHistoryData.forEach(r => {
      const time = new Date(r.created_at || Date.now()).toLocaleString('vi-VN');
      csvContent += `"${time}",${r.temperature},${r.humidity},${r.soil_moisture},${r.light_level || 0},${r.is_dark ? 'CO' : 'KHONG'}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `biosync_sensor_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  ```

---

# 🔐🔑 NHÓM 4: BẢO MẬT HỆ THỐNG & XÁC THỰC TÀI KHOẢN (SUPABASE AUTH & OTP PIN)

### 4.1. Sơ Đồ Khối Toàn Diện: Đăng Nhập & Quên Mật Khẩu (End-to-End Flowchart)

```mermaid
flowchart TD
    subgraph AUTH_GATEWAY ["1. TẦNG KHỞI ĐỘNG & KIỂM TRA PHIÊN (Cold Start)"]
        START["Truy cập ứng dụng Web"] --> CHECK_SESSION["checkAuthSession()<br>(app.js: Dòng 107-125)"]
        CHECK_SESSION --> HAS_SESSION{"Có phiên hợp lệ?<br>(Supabase getSession / LocalStorage)"}
        HAS_SESSION -- "ĐÃ ĐĂNG NHẬP" --> APP_VIEW["Hiển thị #view-main-app<br>Nạp Dashboard, Charts & LCD"]
        HAS_SESSION -- "CHƯA ĐĂNG NHẬP" --> LOGIN_VIEW["Hiển thị #view-login<br>(Form Đăng nhập)"]
    end

    subgraph LOGIN_FLOW ["2. LUỒNG ĐĂNG NHẬP (LOGIN FLOW)"]
        LOGIN_VIEW -->|"Nhập Email & Mật khẩu<br>Bấm ĐĂNG NHẬP"| HANDLE_LOGIN["handleLogin()<br>(app.js: Dòng 162-194)"]
        HANDLE_LOGIN --> SP_AUTH["SupabaseService.signInWithPassword(email, pwd)<br>(supabaseClient.js: Dòng 75-94)"]
        SP_AUTH --> AUTH_CHECK{"Xác thực Supabase thành công?"}
        AUTH_CHECK -- "THÀNH CÔNG" --> SAVE_SESSION["Lưu LocalStorage & AppState.currentUser"]
        AUTH_CHECK -- "FALLBACK / DEMO" --> SAVE_FALLBACK["Lưu phiên quản trị cục bộ (Offline Demo)"]
        SAVE_SESSION --> APP_VIEW
        SAVE_FALLBACK --> APP_VIEW
    end

    subgraph FORGOT_FLOW ["3. LUỒNG QUÊN MẬT KHẨU QUA MÃ OTP PIN 6 SỐ (FORGOT PASSWORD)"]
        LOGIN_VIEW -->|"Bấm 'Quên mật khẩu?'"| SHOW_FORGOT["showForgotPasswordForm()<br>(app.js: Dòng 215-223)"]
        SHOW_FORGOT --> STEP1["Bước 1: Nhập Email khôi phục"]
        
        STEP1 -->|"Bấm GỬI MÃ PIN"| SEND_PIN["sendResetPinCode()<br>(app.js: Dòng 239-300)"]
        SEND_PIN --> GEN_PIN["Sinh mã PIN ngẫu nhiên 6 số<br>(Math.floor(100000 + Math.random() * 900000))<br>Hạn sử dụng: 5 phút"]
        
        GEN_PIN --> SP_SAVE_PIN["Supabase RPC: save_reset_pin(email, pin)<br>(supabaseClient.js: Dòng 135-150)"]
        GEN_PIN --> SEND_GMAIL["NotificationService.sendEmailNotification()<br>(FormSubmit REST API $\rightarrow$ Gmail User)"]
        
        SEND_GMAIL --> STEP2["Bước 2: Hiển thị Form nhập PIN & Mật khẩu mới<br>(#forgot-step-2: Dòng 285)"]
        
        STEP2 -->|"Nhập PIN + Pass Mới + Pass Xác Nhận<br>Bấm XÁC NHẬN & ĐỔI MẬT KHẨU"| VERIFY_PIN["verifyPinAndResetPassword()<br>(app.js: Dòng 302-400)"]
        
        VERIFY_PIN --> CHECK_PIN{"Mã PIN đúng &<br>Chưa quá 5 phút?"}
        CHECK_PIN -- "SAI / HẾT HẠN" --> SHOW_ERR["Báo lỗi màu đỏ, yêu cầu gửi lại PIN"]
        CHECK_PIN -- "HỢP LỆ" --> SP_RESET["Supabase RPC: reset_password_with_pin()<br>(supabaseClient.js: Dòng 152-168)"]
        
        SP_RESET --> UPDATE_LOCAL["Cập nhật mật khẩu mới vào LocalStorage"]
        UPDATE_LOCAL --> BACK_LOGIN["Tự động điền mật khẩu mới & Chuyển về Form Đăng Nhập<br>(app.js: Dòng 381-390)"]
    end

    subgraph LOGOUT_FLOW ["4. LUỒNG ĐĂNG XUẤT (LOGOUT)"]
        APP_VIEW -->|"Bấm Đăng Xuất (#popup-logout-btn)"| HANDLE_LOGOUT["handleLogout()<br>(app.js: Dòng 196-208)"]
        HANDLE_LOGOUT --> SP_SIGNOUT["SupabaseService.signOut()<br>+ Xóa biosync_local_session"]
        SP_SIGNOUT --> LOGIN_VIEW
    end
```

---

### 4.2. Sơ Đồ Tuần Tự Quên Mật Khẩu & Xác Thực Mã OTP PIN (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant User as Người Dùng
    participant UI as Giao Diện Web (#view-login)
    participant App as app.js
    participant SupaAuth as Supabase Auth & RPC
    participant EmailAPI as FormSubmit API
    participant Gmail as Hòm Thư Gmail

    Note over User, UI: GIAI ĐOẠN 1: YÊU CẦU MÃ PIN KHÔI PHỤC
    User->>UI: Bấm "Quên mật khẩu?" & Nhập Email (vthuctri@gmail.com)
    User->>UI: Nhấn nút "GỬI MÃ PIN" (#forgot-send-pin-btn)
    UI->>App: sendResetPinCode() (Dòng 239)
    App->>App: Sinh mã PIN: "847291" (Hạn dùng 5 phút)
    
    par Lưu Supabase Database
        App->>SupaAuth: SupabaseService.saveResetPin("vthuctri@gmail.com", "847291")
        SupaAuth-->>App: { success: true }
    and Gửi Email HTML qua REST API
        App->>EmailAPI: POST https://formsubmit.co/ajax/vthuctri@gmail.com (PIN: 847291)
        EmailAPI->>Gmail: Chuyển phát Email chứa mã PIN 6 số
        EmailAPI-->>App: { success: "true" }
    end
    
    App->>UI: Mở khóa Form Bước 2 (#forgot-step-2) & Báo thông báo xanh

    Note over User, UI: GIAI ĐOẠN 2: XÁC THỰC PIN & ĐỔI MẬT KHẨU MỚI
    User->>Gmail: Mở hộp thư Gmail lấy mã PIN "847291"
    User->>UI: Nhập mã PIN "847291", Mật khẩu mới & Xác nhận
    User->>UI: Bấm "XÁC NHẬN & ĐỔI MẬT KHẨU" (#forgot-verify-btn)
    UI->>App: verifyPinAndResetPassword() (Dòng 302)
    App->>App: Kiểm tra PIN khớp & Thời gian < 5 phút
    App->>SupaAuth: SupabaseService.resetPasswordWithPin("vthuctri@gmail.com", "847291", newPwd)
    SupaAuth-->>App: { success: true, message: "Password updated" }
    App->>UI: Báo thành công "🎉 ĐỔI MẬT KHẨU THÀNH CÔNG!"
    App->>UI: Tự động điền mật khẩu mới và chuyển sang Form Đăng Nhập (Dòng 381)
```

---

### 4.3. Bảng Đối Soát Thành Phần Giao Diện Đăng Nhập & Bảo Mật ([index.html](file:///d:/web_vlcntt/index.html))

| Khối Giao Diện | ID Phần Tử DOM | Vị Trí Dòng Code | Chức Năng Chi Tiết |
| :--- | :--- | :---: | :--- |
| **Màn Hình Đăng Nhập Toàn Trang** | `#view-login` | **Dòng 52** | Vùng phủ toàn màn hình bảo vệ hệ thống khi chưa đăng nhập |
| **Khối Form Đăng Nhập Chính** | `#login-card-section` | **Dòng 55** | Chứa ô nhập Email, Mật khẩu và Nút Đăng nhập |
| **Ô Nhập Email Đăng Nhập** | `#login-username` | **Dòng 79** | Trường điền tài khoản Email |
| **Ô Nhập Password Đăng Nhập** | `#login-password` | **Dòng 89** | Trường điền mật khẩu đăng nhập |
| **Nút Đăng Nhập** | `#login-submit-btn` | **Dòng 98** | Gọi hàm `handleLogin()` |
| **Khối Form Quên Mật Khẩu** | `#forgot-password-section` | **Dòng 104** | Form 2 bước khôi phục mật khẩu qua Email |
| **Ô Nhập Email Quên Pass (Bước 1)**| `#forgot-email-input` | **Dòng 115** | Điền email nhận mã PIN |
| **Nút Gửi Mã PIN** | `#forgot-send-pin-btn`| **Dòng 122** | Gọi hàm `sendResetPinCode()` |
| **Khối Bước 2 (Mã PIN & Mật khẩu mới)**| `#forgot-step-2` | **Dòng 129** | Ẩn mặc định, tự động hiện sau khi gửi PIN thành công |
| **Ô Nhập Mã PIN 6 Số** | `#forgot-pin-input` | **Dòng 137** | Trường nhập mã xác thực OTP 6 ký tự số |
| **Ô Nhập Mật Khẩu Mới** | `#forgot-new-pwd` | **Dòng 145** | Trường nhập mật khẩu mới (tối thiểu 6 ký tự) |
| **Ô Xác Nhận Mật Khẩu Mới** | `#forgot-confirm-pwd` | **Dòng 153** | Trường xác nhận lại mật khẩu mới |
| **Nút Xác Nhận Đổi Mật Khẩu** | `#forgot-verify-btn` | **Dòng 161** | Gọi hàm `verifyPinAndResetPassword()` |

---

### 4.4. Chi Tiết Các Hàm & Dòng Lệnh Cốt Lõi (Nhóm 4)

#### 1. Xử lý Đăng nhập & Duy trì phiên ([js/app.js](file:///d:/web_vlcntt/js/app.js))
* **Kiểm tra phiên đăng nhập tự động (`checkAuthSession()`, Dòng 107 – 125):**
  ```javascript
  // Dòng 107-125 trong js/app.js
  async function checkAuthSession() {
      const savedSession = localStorage.getItem("biosync_local_session");
      if (window.SupabaseService && window.SupabaseService.isConnected()) {
          const session = await window.SupabaseService.getCurrentSession();
          if (session && session.user) {
              setLoggedInUser(session.user);
              return;
          }
      }
      if (savedSession) {
          setLoggedInUser(JSON.parse(savedSession));
      } else {
          AppState.isLoggedIn = false;
          document.getElementById("view-login").classList.remove("hidden");
          document.getElementById("view-main-app").classList.add("hidden");
      }
  }
  ```

* **Thực hiện Đăng nhập (`handleLogin()`, Dòng 162 – 194):**
  ```javascript
  // Dòng 162-185 trong js/app.js
  window.handleLogin = async function () {
      const emailInput = document.getElementById("login-username")?.value.trim();
      const pwdInput = document.getElementById("login-password")?.value;
      
      let authResult = null;
      if (window.SupabaseService && window.SupabaseService.isConnected()) {
          authResult = await window.SupabaseService.signInWithPassword(emailInput, pwdInput);
      }
      if (authResult && authResult.success) {
          localStorage.setItem("biosync_local_session", JSON.stringify(authResult.user));
          setLoggedInUser(authResult.user);
      }
  };
  ```

#### 2. Xử lý Quên mật khẩu & Đổi mật khẩu qua mã OTP PIN ([js/app.js](file:///d:/web_vlcntt/js/app.js))
* **Sinh mã PIN 6 số & Gửi Email (`sendResetPinCode()`, Dòng 239 – 300):**
  ```javascript
  // Dòng 259-278 trong js/app.js
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  currentResetPin = pin;
  currentResetEmail = emailInput;
  pinExpiryTime = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

  // Lưu mã PIN lên Supabase
  if (window.SupabaseService && window.SupabaseService.isConnected()) {
      await window.SupabaseService.saveResetPin(emailInput, pin);
  }
  // Gửi Email FormSubmit
  await window.NotificationService.sendEmailNotification(
      `🔐 MÃ PIN XÁC THỰC KHÔI PHỤC MẬT KHẨU: [ ${pin} ]`,
      `Mã PIN tạm thời để đặt lại mật khẩu của bạn là: [ ${pin} ]. Hiệu lực 5 phút.`,
      emailInput
  );
  ```

* **Xác thực PIN & Cập nhật mật khẩu mới (`verifyPinAndResetPassword()`, Dòng 302 – 400):**
  ```javascript
  // Dòng 318-375 trong js/app.js
  if (Date.now() > pinExpiryTime) {
      step2Msg.textContent = "❌ Mã PIN đã hết hạn (sau 5 phút).";
      return;
  }
  if (pinInput !== currentResetPin) {
      step2Msg.textContent = "❌ Mã PIN không chính xác!";
      return;
  }
  // Đổi mật khẩu trên database Supabase
  if (window.SupabaseService && window.SupabaseService.isConnected()) {
      await window.SupabaseService.resetPasswordWithPin(currentResetEmail, pinInput, newPwd);
  }
  // Tự động điền mật khẩu mới và chuyển về trang đăng nhập
  ```

---

*Tài liệu tóm lược tập trung 4 nhóm logic phục vụ thuyết trình & bảo vệ đồ án chuyên ngành Công nghệ thông tin.*


