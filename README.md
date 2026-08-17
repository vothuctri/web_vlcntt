# 🌿 Smart Terrarium IoT Web Dashboard (ESP32 + Node-RED Flow + Web Realtime)

Giao diện Web Dashboard quản lý và giám sát Mô hình Terrarium Thông minh, kết nối trực tiếp với vi điều khiển **ESP32** qua luồng **Node-RED & MQTT (broker.emqx.io)**.

---

## 📡 Sơ Đồ Kiến Trúc Luồng Dữ Liệu (Data Flow)

```text
┌─────────────────────────┐
│     ESP32 Vi Điều Khiển │
│ (DHT11, Đất, LDR, Relay)│
└───────────┬─────────────┘
            │ 1. Publish dữ liệu cảm biến (MQTT)
            │    Topic: smart_terrarium/nhom05/sensors
            ▼
┌─────────────────────────┐
│ MQTT Broker             │
│ broker.emqx.io:1883     │
└───────────┬─────────────┘
            │ 2. Lắng nghe MQTT In
            ▼
┌─────────────────────────┐
│ Node-RED Backend Server │
│ - mqtt in               │
│ - websocket out (/ws/iot)
│ - http in (/api/control)│
│ - mqtt out (/control)   │
└───────────┬─────────────┘
            │ 3. WebSocket Realtime (/ws/iot)
            ▼
┌─────────────────────────┐
│ Web Dashboard Frontend  │
│ (LCD 16x2, Chart.js, UI)│
└─────────────────────────┘
```

---

## 🚀 Hướng Dẫn Khởi Chạy

### Bước 1: Khởi động Node-RED & Import Flow
1. Cài đặt Node-RED trên máy tính (nếu chưa có):
   ```bash
   npm install -g --unsafe-perm node-red
   ```
2. Khởi chạy Node-RED:
   ```bash
   node-red
   ```
3. Mở trình duyệt truy cập `http://localhost:1880`.
4. Chọn **Menu (góc trên phải) -> Import** -> Chọn file [flows.json](file:///d:/web_vlcntt/flows.json) -> Nhấn **Import** và **Deploy**.

### Bước 2: Định Dạng Gói Tin ESP32 Gửi Lên MQTT
ESP32 chỉ cần gửi chuỗi JSON lên MQTT Broker `broker.emqx.io:1883` với Topic `smart_terrarium/nhom05/sensors`:

```json
{
  "temp": 28.5,
  "hum": 65.0,
  "soil": 42.0,
  "ldr": 450,
  "is_dark": false,
  "pump": 0,
  "led": 0,
  "auto": 1
}
```

- Topic nhận lệnh điều khiển từ Web xuống ESP32: `smart_terrarium/nhom05/control`
- Các lệnh điều khiển: `PUMP:1` / `PUMP:0`, `LED:1` / `LED:0`, `MODE:AUTO` / `MODE:MANUAL`.

### Bước 3: Mở Web Dashboard
- Mở file [index.html](file:///d:/web_vlcntt/index.html) bằng trình duyệt web.
- Quan sát thanh Header: Khi Node-RED đang chạy, Web sẽ hiển thị badge xanh `ESP32 / Node-RED Trực Tuyến`.
- Khi ESP32 bắt đầu gửi gói tin, thông số Nhiệt độ, Độ ẩm không khí, Độ ẩm đất, Ánh sáng, LCD 16x2 và Biểu đồ Chart.js sẽ tự động nhảy số theo thời gian thực!

---

## 📁 Cấu Trúc Mã Nguồn

```text
d:\web_vlcntt\
├── index.html              # Trang Dashboard chính (Stitch UI)
├── flows.json              # Cấu hình Node-RED Flow (MQTT + WebSocket + HTTP Control)
├── css\
│   └── styles.css          # Design System, Glassmorphism, Theme Sáng/Tối
├── js\
│   ├── config.js           # Cấu hình Host/Port Node-RED & Ngưỡng an toàn
│   ├── nodeRedClient.js    # Client WebSocket nhận dữ liệu ESP32 & gửi lệnh
│   ├── lcdSimulator.js     # Mô phỏng màn hình LCD 16x2 I2C
│   ├── charts.js           # Biểu đồ thời gian thực Chart.js & Xuất CSV
│   ├── aiChatbot.js        # AI Assistant phân tích môi trường
│   └── app.js              # Logic ứng dụng chính & Xử lý sự kiện UI
└── supabase\
    └── schema.sql          # Cấu hình Database Cloud (tùy chọn)
```