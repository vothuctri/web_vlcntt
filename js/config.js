/**
 * Smart Terrarium IoT Dashboard - Configuration
 * Tệp cấu hình kết nối Supabase & Cấu hình mặc định hệ thống
 */

window.APP_CONFIG = {
    // 1. Cấu hình Supabase (Thay thế thông tin từ Supabase Project Dashboard của bạn)
    // Mở https://supabase.com -> Project Settings -> API
    SUPABASE_URL: "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

    // 2. Chế độ Mô phỏng Phần cứng (Dùng cho Demo Web khi chưa cắm ESP8266)
    // Nếu set ENABLE_SIMULATOR: true, hệ thống sẽ tự động phát sinh biến động nhiệt độ, độ ẩm giả lập
    ENABLE_SIMULATOR: true,
    SIMULATOR_INTERVAL_MS: 3000, // Phát sinh dữ liệu mỗi 3 giây

    // 3. Nút nạp dữ liệu mẫu lịch sử
    MOCK_HISTORY_COUNT: 25,

    // 4. Ngưỡng an toàn mặc định
    DEFAULT_THRESHOLDS: {
        TEMP_MAX: 38.0,      // Báo động nhiệt độ vượt 38°C
        SOIL_MIN: 35.0,      // Tự động kích hoạt máy bơm M1 khi độ ẩm đất < 35%
        LIGHT_DARK_LIMIT: 20 // Cường độ ánh sáng < 20% là Trời tối (kích hoạt Relay L1)
    }
};
