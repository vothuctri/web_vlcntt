/**
 * Smart Terrarium IoT Dashboard - Supabase Client Module
 * Quản lý kết nối Cơ sở dữ liệu và Lắng nghe Sự thay đổi Realtime (WebSockets)
 */

(function (window) {
    let client = null;
    let isConnected = false;
    let realtimeChannel = null;

    /**
     * Khởi tạo Supabase Client
     */
    function initSupabase() {
        const url = window.APP_CONFIG.SUPABASE_URL;
        const key = window.APP_CONFIG.SUPABASE_ANON_KEY;

        // Kiểm tra xem URL đã được điền thông tin thật chưa
        const isPlaceholder = !url || url.includes("your-project-id");

        if (window.supabase && !isPlaceholder) {
            try {
                client = window.supabase.createClient(url, key);
                isConnected = true;
                console.log("✅ Supabase Client kết nối thành công:", url);
            } catch (err) {
                console.warn("⚠️ Không thể khởi tạo Supabase Client:", err);
                isConnected = false;
            }
        } else {
            console.log("ℹ️ Đang chạy ở chế độ Mô phỏng (Simulated Offline Mode). Cấu hình Supabase URL trong js/config.js để bật Realtime.");
            isConnected = false;
        }

        return isConnected;
    }

    /**
     * Đăng ký lắng nghe sự thay đổi thời gian thực từ Supabase
     */
    function subscribeRealtime(onSensorNewData, onDeviceControlChange) {
        if (!client || !isConnected) return;

        // Lắng nghe bản ghi cảm biến mới
        realtimeChannel = client
            .channel('public:iot_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_logs' }, (payload) => {
                console.log("📡 [Supabase Realtime] Sensor mới:", payload.new);
                if (typeof onSensorNewData === 'function') {
                    onSensorNewData(payload.new);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'device_controls' }, (payload) => {
                console.log("🎛️ [Supabase Realtime] Lệnh điều khiển mới:", payload.new);
                if (typeof onDeviceControlChange === 'function') {
                    onDeviceControlChange(payload.new);
                }
            })
            .subscribe((status) => {
                console.log(`🔌 Supabase Realtime Status: ${status}`);
            });
    }

    /**
     * Lấy danh sách lịch sử cảm biến từ Supabase
     */
    async function fetchSensorHistory(limit = 30) {
        if (!client || !isConnected) return null;

        try {
            const { data, error } = await client
                .from('sensor_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data ? data.reverse() : [];
        } catch (err) {
            console.error("Lỗi khi tải lịch sử cảm biến từ Supabase:", err);
            return null;
        }
    }

    /**
     * Gửi nhật ký cảm biến mới (ESP8266 hoặc Simulator có thể gọi)
     */
    async function pushSensorData(sensorPayload) {
        if (!client || !isConnected) return false;

        try {
            const { data, error } = await client
                .from('sensor_logs')
                .insert([sensorPayload]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Lỗi khi lưu dữ liệu cảm biến lên Supabase:", err);
            return false;
        }
    }

    /**
     * Cập nhật trạng thái điều khiển thiết bị (Bơm M1, Đèn L1, LED D2)
     */
    async function updateDeviceControls(controlsPayload) {
        if (!client || !isConnected) return false;

        try {
            const { data, error } = await client
                .from('device_controls')
                .update(controlsPayload)
                .eq('id', 1);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Lỗi khi cập nhật trạng thái điều khiển lên Supabase:", err);
            return false;
        }
    }

    /**
     * Đọc trạng thái điều khiển thiết bị hiện tại
     */
    async function fetchDeviceControls() {
        if (!client || !isConnected) return null;

        try {
            const { data, error } = await client
                .from('device_controls')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Lỗi khi đọc trạng thái điều khiển từ Supabase:", err);
            return null;
        }
    }

    /**
     * Đưa cảnh báo mới vào bảng alert_logs
     */
    async function pushAlertLog(alertPayload) {
        if (!client || !isConnected) return false;

        try {
            const { data, error } = await client
                .from('alert_logs')
                .insert([alertPayload]);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Lỗi khi đẩy cảnh báo lên Supabase:", err);
            return false;
        }
    }

    // Export module ra window.SupabaseService
    window.SupabaseService = {
        init: initSupabase,
        isConnected: () => isConnected,
        subscribeRealtime,
        fetchSensorHistory,
        pushSensorData,
        updateDeviceControls,
        fetchDeviceControls,
        pushAlertLog
    };

})(window);
