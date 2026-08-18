# 🌿 BioSync - Smart Terrarium IoT Web Dashboard

**ĐỒ ÁN CUỐI KỲ MÔN VẬT LÝ CHO CÔNG NGHỆ THÔNG TIN - NHÓM 05 (LỚP 24C03)**
- **Thành viên 1:** Võ Thúc Trí - MSSV: 24127570
- **Thành viên 2:** Nguyễn Trung Kiên - MSSV: 24127068
- **Thành viên 3:** Nguyễn Minh Trí - MSSV: 24127569

---

## 🎨 Danh Sách 8 Chức Năng Hoàn Chỉnh (Khớp 100% Báo Cáo)

### I. Chức Năng Căn Bản (Basic Features)
1. **Chức năng 1 (Nguyễn Trung Kiên):** Cảm biến nhiệt độ DHT11, Màn hình LCD 16x2 I2C (PCF8574 Simulator retro trên Web).
2. **Chức năng 2 (Võ Thúc Trí):** Cảm biến độ ẩm đất SMS-V1, Động cơ máy bơm M1 (Tự động tưới khi đất khô dưới ngưỡng 35%).
3. **Chức năng 3 (Nguyễn Minh Trí):** Cảm biến ánh sáng LM393 (Quang trở LDR), Điều khiển Đèn LED chiếu sáng & LED RGB (Đổi từ bóng đèn sưởi relay sang Đèn LED).

### II. Chức Năng Nâng Cao (Advanced Features)
4. **Chức năng 4 (Võ Thúc Trí - 1.5đ):** Board Arduino Uno R3 tích hợp WiFi ESP8266 gửi dữ liệu lên nền tảng Cloud IoT. Lắng nghe dữ liệu thời gian thực giữa ESP8266 và Web qua **Supabase WebSockets (Realtime PostgreSQL)**.
5. **Chức năng 5 (Nguyễn Trung Kiên - 1.5đ):** Cơ sở dữ liệu (**Supabase Database**) & Biểu đồ Time-series: Đồ thị lịch sử đa đường (**Chart.js**) cho Nhiệt độ, Độ ẩm không khí và Độ ẩm đất, hỗ trợ xuất báo cáo **CSV UTF-8**.
6. **Chức năng 6 (Nguyễn Minh Trí - 1.5đ):** Bảo mật hệ thống tài khoản được lưu trong database (**Supabase Authentication** - Đăng nhập, Duy trì phiên đăng nhập & Đổi mật khẩu).
7. **Chức năng 7 (Nguyễn Trung Kiên - 2.0đ):** Dịch vụ gửi **Email cảnh báo (Supabase)** và Thông báo nhanh qua điện thoại (**Pushsafer REST API** khi quá nhiệt > 38°C hoặc cạn nước).
8. **Chức năng 8 (Nguyễn Minh Trí - 1.5đ):** Dịch vụ Chatbot thông minh (**Google Gemini 1.5 Flash AI**) tư vấn sức khỏe Terrarium và dự báo xu hướng chuỗi thời gian 24h.

---

## 🚀 Hướng Dẫn Khởi Chạy & Kiểm Thử

### 1. Khởi chạy Web tại Local
Mở trực tiếp file `index.html` bằng trình duyệt (Chrome, Edge, Firefox) hoặc dùng Live Server trong VS Code.
> 💡 **Simulator Mode:** Web tích hợp sẵn bộ phát sinh dữ liệu cảm biến ngẫu nhiên theo thời gian thực để demo mượt mà ngay cả khi không có kết nối phần cứng.

### 2. Cài đặt Cơ sở dữ liệu Supabase
1. Vào [Supabase Dashboard](https://supabase.com), tạo project mới.
2. Mở mục **SQL Editor**, copy toàn bộ nội dung file `supabase/schema.sql` dán vào và nhấn **Run**.
3. Vào **Settings -> API**, copy URL và `anon public key` dán vào tab **Cài Đặt & Cấu Hình** trên Dashboard.

### 3. Cấu hình Thông báo Pushsafer & Gemini AI
1. **Pushsafer:** Đăng ký tài khoản tại [pushsafer.com](https://www.pushsafer.com), copy **Private Key** dán vào tab **Cài Đặt** trên Web để nhận thông báo về app trên điện thoại.
2. **Gemini AI:** Lấy API Key miễn phí tại [aistudio.google.com](https://aistudio.google.com/app/apikey) dán vào tab **Cài Đặt** để kích hoạt trợ lý AI Gemini.

---

## 📁 Cấu Trúc Mã Nguồn

```text
web_vlcntt-main/
├── index.html                  # Giao diện chính 4 Tab & Cấu trúc Tailwind CSS
├── css/
│   └── styles.css              # Custom CSS styles
├── js/
│   ├── config.js               # File cấu hình Supabase, Pushsafer & Gemini
│   ├── supabaseClient.js       # Module Supabase Auth, DB Query & WebSockets Realtime
│   ├── notificationService.js  # Module Pushsafer REST API & Email Alert
│   ├── nodeRedClient.js        # Module giao tiếp Backend Node-RED (Arduino)
│   ├── lcdSimulator.js         # Mô phỏng màn hình LCD 16x2 I2C (PCF8574)
│   ├── charts.js               # Biểu đồ lịch sử Chart.js & Xuất file CSV
│   ├── aiChatbot.js            # Trợ lý Gemini 1.5 Flash AI & Động cơ phân tích
│   └── app.js                  # Điều phối trạng thái chính & Xử lý sự kiện UI
└── supabase/
    └── schema.sql              # Script SQL 1-click tạo bảng & Realtime
```