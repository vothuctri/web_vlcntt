/**
 * Smart Terrarium IoT Dashboard - Configuration
 * Tệp cấu hình kết nối Supabase, Pushsafer, Google Gemini AI & Cài đặt hệ thống
 */

window.APP_CONFIG = {
    // 1. CẤU HÌNH CƠ SỞ DỮ LIỆU SUPABASE (Chức năng 4, 5, 6)
    // URL project Supabase (không bao gồm đuôi /rest/v1/)
    SUPABASE_URL: localStorage.getItem("biosync_supabase_url") || "https://qkholkseaivgjcvanokj.supabase.co",
    SUPABASE_ANON_KEY: localStorage.getItem("biosync_supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraG9sa3NlYWl2Z2pjdmFub2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMTIzMjksImV4cCI6MjEwMjU4ODMyOX0.CyfpMgv9EI0g1_s0HIAiBNqWfATm4Ls08h1NQyjZXww",

    // 2. CẤU HÌNH THÔNG BÁO PUSHSAFER QUA ĐIỆN THOẠI & EMAIL (Chức năng 7)
    // Lấy Private Key từ https://www.pushsafer.com/ -> Dashboard -> Private Key
    PUSHSAFER_PRIVATE_KEY: localStorage.getItem("biosync_pushsafer_key") || "nPGDjvwHIsj0IsfHpiLO", 
    NOTIFICATION_EMAIL: localStorage.getItem("biosync_alert_email") || "vthuctri@gmail.com",
    ENABLE_PUSHSAFER: true,
    ENABLE_EMAIL_ALERT: true,
    ALERT_COOLDOWN_MS: 60000, // Thời gian chờ tối thiểu giữa 2 lần gửi thông báo đẩy (1 phút)

    // 3. CẤU HÌNH TRỢ LÝ GOOGLE GEMINI AI (Chức năng 8)
    // Lấy API Key miễn phí tại https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: localStorage.getItem("biosync_gemini_key") || "AQ.Ab8RN6J8DDj41I-y6jRba5GRqnKfj7rUxVZKCd2k8D4lkmwzQA",
    GEMINI_MODEL: "gemini-3.5-flash-lite",

    // 4. CHẾ ĐỘ MÔ PHỎNG PHẦN CỨNG (SIMULATOR)
    // Để false để hiển thị dấu gạch ngang -- khi đang chờ mạch ESP8266 thật kết nối
    ENABLE_SIMULATOR: false,
    SIMULATOR_INTERVAL_MS: 3000, // Phát sinh dữ liệu mỗi 3 giây

    // 5. SỐ LƯỢNG BẢN GHI LỊCH SỬ BAN ĐẦU
    MOCK_HISTORY_COUNT: 25,

    // 6. NGƯỠNG AN TOÀN MẶC ĐỊNH
    DEFAULT_THRESHOLDS: {
        TEMP_MAX: 38.0,      // Báo động quá nhiệt khi > 38°C
        SOIL_MIN: 35.0,      // Tự động kích hoạt bơm M1 khi độ ẩm đất < 35%
        LIGHT_DARK_LIMIT: 30 // Ánh sáng < 30% là Trời tối (kích hoạt Đèn LED L1)
    }
};
