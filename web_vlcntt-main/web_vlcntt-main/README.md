# 🌿 Smart Terrarium IoT Web Dashboard (Stitch UI + Supabase)

Mã nguồn Giao diện Web Dashboard quản lý và giám sát Mô hình Terrarium Thông minh, sử dụng chuẩn thiết kế **Stitch UI** hiện đại, kết nối cơ sở dữ liệu thời gian thực **Supabase (Realtime PostgreSQL)** và đáp ứng 100% các chức năng trong Proposal.

---

## 🎨 Tính năng Nổi bật & Chức năng Proposal

1. **LCD 16x2 I2C Display Simulator (Chức năng 1):** Mô phỏng màn hình LCD 1602 vi điều khiển (đọc từ DHT11) trên giao diện Web theo phong cách vi phông chữ pixel retro chân thực.
2. **Độ ẩm Đất & Động cơ Bơm M1 (Chức năng 2):** Giám sát độ ẩm đất, công tắc điều khiển Bơm M1 (Transistor T1 + Diode D1), chế độ bơm tự động khi đất khô.
3. **Quang trở LDR & Relay L1 (Chức năng 3):** Nhận biết trạng thái Trời sáng/Tối (LM393) và điều khiển Bóng đèn sưởi L1 qua Relay SPDT K2.
4. **Đồng bộ dữ liệu Realtime (Chức năng 4):** Lắng nghe dữ liệu thời gian thực giữa ESP8266 và Web qua Supabase WebSockets.
5. **Cơ sở dữ liệu & Biểu đồ Time-series (Chức năng 5):** Đồ thị lịch sử đa đường (Chart.js) cho Nhiệt độ, Độ ẩm không khí & đất, hỗ trợ xuất CSV.
6. **Điều khiển Từ xa & LED RGB D2 (Chức năng 6):** Bộ chọn màu LED RGB D2 (Color Picker + Brightness Slider) và bảng điều khiển thiết bị từ xa 2 chiều.
7. **Cảnh báo & Nhật ký Ngưỡng an toàn (Chức năng 7):** Hiển thị cảnh báo quá nhiệt và nhật ký sự kiện thời gian thực.
8. **Chatbot AI & Phân tích Dự đoán (Chức năng 8):** Trợ lý AI tư vấn tình trạng hệ sinh thái, phân tích sức khỏe cây trồng & dự báo xu hướng môi trường.

---

## 🚀 Hướng dẫn Sử dụng & Khởi chạy

### 1. Khởi chạy Web tại địa phương (Local Dev)
Bạn có thể mở trực tiếp file `index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Firefox) hoặc chạy qua bất kỳ web server tĩnh nào (ví dụ: Live Server trong VS Code, `npx serve`, v.v.).

> 💡 **Chế độ Simulator:** Hệ thống được tích hợp sẵn bộ phát sinh dữ liệu cảm biến giả lập. Khi chưa kết nối Supabase, Web sẽ tự động chạy mượt mà để bạn Demo giao diện & kiểm thử tính năng!

---

### 2. Cấu hình Kết nối Supabase (Chuyển sang Cloud Data thật)

1. **Bước 1:** Truy cập [Supabase.com](https://supabase.com), tạo một Project mới (Miễn phí).
2. **Bước 2:** Vào mục **SQL Editor** trong Supabase Dashboard -> Copy nội dung file `supabase/schema.sql` -> Dán vào và nhấn **Run** để khởi tạo các bảng (`sensor_logs`, `device_controls`, `alert_logs`) và bật Realtime.
3. **Bước 3:** Vào **Project Settings** -> **API** -> Copy `Project URL` và `anon public key`.
4. **Bước 4:** Mở file `js/config.js` trong thư mục web và cập nhật thông tin:

```javascript
window.APP_CONFIG = {
    SUPABASE_URL: "https://xxx.supabase.co", // Điền URL của bạn
    SUPABASE_ANON_KEY: "eyJhbGciOi...",      // Điền Anon key của bạn
    ENABLE_SIMULATOR: false                 // Tắt simulator để dùng dữ liệu thật
};
```

---

## 📡 Cấu trúc Gửi Dữ liệu từ ESP8266 lên Supabase (Giao tiếp REST API)

Vi điều khiển ESP8266 (hoặc Arduino Uno WiFi) chỉ cần gửi HTTP POST đơn giản lên Supabase REST API endpoint mà không cần thư viện phức tạp:

- **Endpoint:** `https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/rest/v1/sensor_logs`
- **Headers:**
  - `apikey: <YOUR_SUPABASE_ANON_KEY>`
  - `Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>`
  - `Content-Type: application/json`
- **JSON Body:**
```json
{
  "temperature": 28.5,
  "humidity": 65.0,
  "soil_moisture": 42.0,
  "light_level": 450.0,
  "is_dark": false
}
```

---

## 📁 Cấu trúc Mã nguồn Dự án

```text
d:\web_vlcntt\
├── index.html              # Trang Dashboard chính (Stitch UI HTML structure)
├── css\
│   └── styles.css          # Design System Stitch UI, Glassmorphism, Responsive CSS
├── js\
│   ├── config.js           # Cấu hình Supabase & Cài đặt Simulator Mode
│   ├── supabaseClient.js   # Khởi tạo Supabase Client SDK & WebSocket Realtime listener
│   ├── lcdSimulator.js     # Mô phỏng màn hình LCD 16x2 I2C (PCF8574)
│   ├── charts.js           # Khởi tạo và vẽ biểu đồ lịch sử Chart.js + Xuất CSV
│   ├── aiChatbot.js        # Động cơ suy luận AI Chatbot & Dự báo xu hướng
│   └── app.js              # Logic ứng dụng chính & xử lý sự kiện UI
└── supabase\
    └── schema.sql          # Script khởi tạo Database SQL 1-click trên Supabase
```