/**
 * Smart Terrarium IoT Dashboard - Configuration
 * Tệp cấu hình kết nối Node-RED (ESP32 Backend), Supabase & Ngưỡng hệ thống
 */

window.APP_CONFIG = {
    // 1. Cấu hình Backend Node-RED (Trung gian kết nối ESP32 qua MQTT & WebSocket)
    // ESP32 -> MQTT (broker.emqx.io:1883) -> Node-RED -> WebSocket -> Web Frontend
    NODE_RED_HOST: window.location.hostname || "localhost", // Thay bằng IP máy chạy Node-RED nếu khác máy
    NODE_RED_PORT: 1880,
    NODE_RED_WS_PATH: "/ws/iot",
    NODE_RED_API_PATH: "/api/control",

    // MQTT Topics theo flow Node-RED (flows.json):
    // - Topic nhận dữ liệu từ ESP32: "smart_terrarium/nhom05/sensors"
    // - Topic gửi lệnh điều khiển xuống ESP32: "smart_terrarium/nhom05/control"
    // - Broker: broker.emqx.io (Port 1883)

    // 2. Chế độ Mô phỏng Phần cứng (Hardware Simulator)
    // Đặt false để ưu tiên nhận dữ liệu thực tế từ ESP32 qua Node-RED
    // Nếu mất kết nối Node-RED, hệ thống có thể tự kích hoạt simulator dự phòng nếu cấu hình true
    ENABLE_SIMULATOR: false,
    SIMULATOR_INTERVAL_MS: 3000,

    // 3. Cấu hình Supabase (Tùy chọn lưu trữ Cloud Database)
    SUPABASE_URL: "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

    // 4. Số điểm nạp dữ liệu ban đầu cho biểu đồ (Chart.js)
    MOCK_HISTORY_COUNT: 15,

    // 5. Ngưỡng an toàn mặc định cho hệ thống
    DEFAULT_THRESHOLDS: {
        TEMP_MAX: 38.0,      // Báo động quá nhiệt khi > 38°C
        SOIL_MIN: 35.0,      // Tự động kích hoạt máy bơm M1 khi độ ẩm đất < 35%
        LIGHT_DARK_LIMIT: 30 // Cường độ ánh sáng < 30% (hoặc < 100 Lux) là Trời tối -> bật Relay Đèn L1
    }
};
