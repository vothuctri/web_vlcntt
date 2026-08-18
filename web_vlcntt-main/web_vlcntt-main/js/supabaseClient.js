/**
 * Smart Terrarium IoT Dashboard - Supabase Integration Module
 * Quản lý Xác thực Tài khoản (Auth), Truy vấn Cơ sở Dữ liệu & Lắng nghe Realtime WebSockets
 * Đáp ứng Chức năng 4 (Realtime), Chức năng 5 (Database) & Chức năng 6 (Bảo mật tài khoản)
 */

(function (window) {
    let supabaseClient = null;
    let realtimeChannel = null;
    let isConnected = false;

    /**
     * Khởi tạo Supabase Client
     */
    function initSupabase() {
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            console.warn("⚠️ Supabase JS SDK chưa sẵn sàng. Đang chờ tải CDN...");
            return false;
        }

        const config = window.APP_CONFIG;
        if (!config || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            console.warn("⚠️ Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong js/config.js");
            return false;
        }

        try {
            // Chuẩn hóa URL nếu có đuôi /rest/v1/
            let cleanUrl = config.SUPABASE_URL.trim();
            if (cleanUrl.endsWith("/rest/v1/")) {
                cleanUrl = cleanUrl.replace("/rest/v1/", "");
            } else if (cleanUrl.endsWith("/rest/v1")) {
                cleanUrl = cleanUrl.replace("/rest/v1", "");
            }

            supabaseClient = window.supabase.createClient(cleanUrl, config.SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                }
            });

            isConnected = true;
            console.log("✅ Khởi tạo Supabase Client thành công:", cleanUrl);
            return true;
        } catch (err) {
            console.error("❌ Lỗi khi khởi tạo Supabase Client:", err);
            isConnected = false;
            return false;
        }
    }

    /**
     * ====================================================================
     * 1. CHỨC NĂNG 6: XÁC THỰC TÀI KHOẢN (SUPABASE AUTH)
     * ====================================================================
     */
    async function signInWithPassword(email, password) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return { success: false, error: "Supabase chưa được khởi tạo" };

        try {
            // 1. Kiểm tra xác thực qua RPC verify_login (Bảng accounts bảo mật Bcrypt)
            const { data: rpcData, error: rpcError } = await supabaseClient.rpc('verify_login', {
                p_email: email.trim(),
                p_password: password
            });

            if (!rpcError && rpcData) {
                if (rpcData.success) {
                    console.log("✅ Đăng nhập bảng accounts (Bcrypt Hash) thành công:", rpcData.user?.email);
                    return { success: true, user: rpcData.user };
                } else {
                    return { success: false, error: rpcData.error || "Mật khẩu không chính xác" };
                }
            }

            // 2. Fallback sang Supabase Auth chuẩn
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                console.warn("Supabase Auth sign-in error:", error.message);
                return { success: false, error: error.message };
            }

            console.log("✅ Đăng nhập Supabase Auth thành công:", data.user?.email);
            return { success: true, user: data.user, session: data.session };
        } catch (err) {
            console.error("Lỗi đăng nhập:", err);
            return { success: false, error: err.message };
        }
    }

    async function signOut() {
        if (!supabaseClient) return;
        try {
            await supabaseClient.auth.signOut();
            console.log("🚪 Đã đăng xuất khỏi Supabase Auth");
        } catch (err) {
            console.error("Lỗi khi đăng xuất:", err);
        }
    }

    async function getCurrentSession() {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return null;

        try {
            const { data } = await supabaseClient.auth.getSession();
            return data.session;
        } catch (err) {
            return null;
        }
    }

    async function updatePassword(newPassword) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return { success: false, error: "Chưa kết nối Supabase" };

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) return { success: false, error: error.message };
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async function saveResetPin(email, pin) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return { success: false, error: "Chưa kết nối Supabase" };

        try {
            const { data, error } = await supabaseClient.rpc('save_reset_pin', {
                p_email: email.trim(),
                p_pin: pin.trim()
            });

            if (error) return { success: false, error: error.message };
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async function resetPasswordWithPin(email, pin, newPassword) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return { success: false, error: "Chưa kết nối Supabase" };

        try {
            const { data, error } = await supabaseClient.rpc('reset_password_with_pin', {
                p_email: email.trim(),
                p_pin: pin.trim(),
                p_new_password: newPassword
            });

            if (error) return { success: false, error: error.message };
            return { success: data.success, error: data.error, message: data.message };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async function resetPasswordForEmail(email) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return { success: false, error: "Chưa kết nối Supabase" };

        try {
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin + window.location.pathname
            });

            if (error) return { success: false, error: error.message };
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * ====================================================================
     * 2. CHỨC NĂNG 4: LẮNG NGHE REALTIME WEBSOCKETS (SUPABASE REALTIME)
     * ====================================================================
     */
    function subscribeRealtime(callbacks = {}) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return null;

        if (realtimeChannel) {
            supabaseClient.removeChannel(realtimeChannel);
        }

        console.log("📡 Đang mở kênh lắng nghe Supabase WebSockets Realtime...");

        realtimeChannel = supabaseClient
            .channel('public:smart_terrarium_realtime')
            // Lắng nghe bản ghi cảm biến mới chèn từ ESP8266
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_logs' }, payload => {
                console.log("⚡ [Realtime Supabase] Dữ liệu cảm biến mới từ ESP8266:", payload.new);
                if (callbacks.onSensorData) {
                    callbacks.onSensorData(payload.new);
                }
            })
            // Lắng nghe thay đổi trạng thái điều khiển thiết bị
            .on('postgres_changes', { event: '*', schema: 'public', table: 'device_controls' }, payload => {
                console.log("🎛️ [Realtime Supabase] Thay đổi điều khiển thiết bị:", payload.new);
                if (callbacks.onDeviceControls) {
                    callbacks.onDeviceControls(payload.new);
                }
            })
            // Lắng nghe cảnh báo mới
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_logs' }, payload => {
                console.log("🚨 [Realtime Supabase] Cảnh báo mới:", payload.new);
                if (callbacks.onAlert) {
                    callbacks.onAlert(payload.new);
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log("🟢 Đã kết nối Supabase WebSockets Realtime thành công!");
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn("⚠️ Trạng thái kênh Realtime Supabase:", status, err);
                }
            });

        return realtimeChannel;
    }

    /**
     * ====================================================================
     * 3. CHỨC NĂNG 5: TRUY VẤN CƠ SỞ DỮ LIỆU (DATABASE QUERY)
     * ====================================================================
     */
    async function fetchSensorHistory(limit = 30) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient
                .from('sensor_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.warn("Lỗi khi tải lịch sử cảm biến từ Supabase:", error.message);
                return null;
            }

            // Đảo lại thứ tự thời gian tăng dần để vẽ biểu đồ từ trái sang phải
            return (data || []).reverse();
        } catch (err) {
            console.error("Lỗi fetchSensorHistory:", err);
            return null;
        }
    }

    async function fetchLatestSensorData() {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient
                .from('sensor_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

    async function fetchDeviceControls() {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return null;

        try {
            const { data, error } = await supabaseClient
                .from('device_controls')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (error) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

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

            if (error) {
                console.warn("Lỗi updateDeviceControls:", error.message);
                return false;
            }
            return true;
        } catch (err) {
            console.error("Lỗi updateDeviceControls:", err);
            return false;
        }
    }

    async function pushSensorData(record) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return false;

        try {
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

    async function fetchAlertLogs(limit = 20) {
        if (!supabaseClient) initSupabase();
        if (!supabaseClient) return [];

        try {
            const { data, error } = await supabaseClient
                .from('alert_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return [];
            return data || [];
        } catch (err) {
            return [];
        }
    }

    // Export module ra window.SupabaseService
    window.SupabaseService = {
        init: initSupabase,
        isConnected: () => isConnected,
        signInWithPassword: signInWithPassword,
        signOut: signOut,
        getCurrentSession: getCurrentSession,
        updatePassword: updatePassword,
        saveResetPin: saveResetPin,
        resetPasswordWithPin: resetPasswordWithPin,
        resetPasswordForEmail: resetPasswordForEmail,
        subscribeRealtime: subscribeRealtime,
        fetchSensorHistory: fetchSensorHistory,
        fetchLatestSensorData: fetchLatestSensorData,
        fetchDeviceControls: fetchDeviceControls,
        updateDeviceControls: updateDeviceControls,
        pushSensorData: pushSensorData,
        pushAlertLog: pushAlertLog,
        fetchAlertLogs: fetchAlertLogs
    };

})(window);
