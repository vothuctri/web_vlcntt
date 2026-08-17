/**
 * Smart Terrarium IoT Dashboard - Node-RED Client Module
 * Web Frontend giao tiếp với Backend Node-RED qua WebSockets (nhận dữ liệu ESP32) và HTTP Fetch (gửi lệnh)
 */

(function (window) {
    let ws = null;
    let isConnected = false;
    let reconnectTimer = null;
    let lastDataTimestamp = null;

    /**
     * Lấy đường dẫn WebSocket và API từ cấu hình
     */
    function getEndpoints() {
        const config = window.APP_CONFIG || {};
        const host = config.NODE_RED_HOST || (window.location.hostname || "localhost");
        const port = config.NODE_RED_PORT || 1880;
        const wsPath = config.NODE_RED_WS_PATH || "/ws/iot";
        const apiPath = config.NODE_RED_API_PATH || "/api/control";

        // Tự động nhận diện giao thức ws hoặc wss nếu chạy trên HTTPS
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const httpProtocol = window.location.protocol === "https:" ? "https:" : "http:";

        return {
            wsUrl: `${wsProtocol}//${host}:${port}${wsPath.startsWith('/') ? '' : '/'}${wsPath}`,
            apiUrl: `${httpProtocol}//${host}:${port}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`
        };
    }

    /**
     * Khởi tạo kết nối Node-RED
     */
    function initNodeRed() {
        connectWebSocket();
        return true;
    }

    /**
     * Kết nối WebSocket tới Node-RED (Chuyển tiếp dữ liệu MQTT từ ESP32)
     */
    function connectWebSocket() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        const { wsUrl } = getEndpoints();
        console.log(`🔌 Đang kết nối tới Node-RED WebSocket: ${wsUrl}`);
        updateConnectionStatus(false, "Đang kết nối...");

        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = function () {
                console.log("✅ Frontend đã kết nối WebSocket Node-RED thành công!");
                isConnected = true;
                updateConnectionStatus(true, "ESP32 / Node-RED Trực Tuyến");
            };

            ws.onmessage = function (event) {
                try {
                    let rawData = event.data;
                    
                    // Nếu là dạng chuỗi, tiến hành parse JSON
                    if (typeof rawData === "string") {
                        try {
                            rawData = JSON.parse(rawData);
                        } catch (parseErr) {
                            console.warn("⚠️ Dữ liệu nhận được không phải chuỗi JSON hợp lệ:", event.data);
                            return;
                        }
                    }

                    if (!rawData || typeof rawData !== "object") {
                        console.warn("⚠️ Gói tin không hợp lệ:", rawData);
                        return;
                    }

                    console.log("📡 Dữ liệu nhận từ ESP32 qua Node-RED:", rawData);
                    lastDataTimestamp = new Date();

                    // 1. DỊCH VÀ CHUẨN HÓA CÁC TRƯỜNG DỮ LIỆU TỪ ESP32 VỀ CHUẨN DASHBOARD
                    // Hỗ trợ cả tên ngắn gọn (temp, hum, soil, ldr) và tên đầy đủ
                    const temp = rawData.temp !== undefined ? Number(rawData.temp) :
                                 (rawData.temperature !== undefined ? Number(rawData.temperature) :
                                 (rawData.t !== undefined ? Number(rawData.t) : 25.0));

                    const hum = rawData.hum !== undefined ? Number(rawData.hum) :
                                (rawData.humidity !== undefined ? Number(rawData.humidity) :
                                (rawData.h !== undefined ? Number(rawData.h) : 60.0));

                    const soil = rawData.soil !== undefined ? Number(rawData.soil) :
                                 (rawData.soil_moisture !== undefined ? Number(rawData.soil_moisture) :
                                 (rawData.soilMoisture !== undefined ? Number(rawData.soilMoisture) :
                                 (rawData.sm !== undefined ? Number(rawData.sm) : 50.0)));

                    const light = rawData.ldr !== undefined ? Number(rawData.ldr) :
                                  (rawData.light !== undefined ? Number(rawData.light) :
                                  (rawData.light_level !== undefined ? Number(rawData.light_level) :
                                  (rawData.lux !== undefined ? Number(rawData.lux) : 400.0)));

                    // Xác định trời tối (Dark mode detection): Nếu ESP32 gửi is_dark thì dùng, nếu không thì so sánh với ngưỡng < 30 hoặc < 100 lux
                    let isDark = false;
                    if (rawData.is_dark !== undefined) {
                        isDark = Boolean(rawData.is_dark);
                    } else if (rawData.dark !== undefined) {
                        isDark = Boolean(rawData.dark);
                    } else {
                        // Giả định LDR giá trị ADC hoặc % độ sáng
                        isDark = light < 30;
                    }

                    const mappedData = {
                        created_at: new Date().toISOString(),
                        temperature: parseFloat(temp.toFixed(1)),
                        humidity: parseFloat(hum.toFixed(1)),
                        soil_moisture: parseFloat(soil.toFixed(1)),
                        light_level: parseFloat(light.toFixed(1)),
                        is_dark: isDark
                    };

                    // 2. ĐỒNG BỘ TRẠNG THÁI THIẾT BỊ TỪ PHẦN CỨNG LÊN WEB (NẾU ESP32 TRẢ VỀ)
                    if (window.AppState) {
                        if (rawData.pump !== undefined) {
                            window.AppState.pumpStatus = (rawData.pump === 1 || rawData.pump === true || rawData.pump === "1");
                        } else if (rawData.pump_status !== undefined) {
                            window.AppState.pumpStatus = Boolean(rawData.pump_status);
                        }

                        if (rawData.led !== undefined) {
                            window.AppState.lampStatus = (rawData.led === 1 || rawData.led === true || rawData.led === "1");
                        } else if (rawData.lamp !== undefined) {
                            window.AppState.lampStatus = (rawData.lamp === 1 || rawData.lamp === true || rawData.lamp === "1");
                        } else if (rawData.lamp_status !== undefined) {
                            window.AppState.lampStatus = Boolean(rawData.lamp_status);
                        }

                        if (rawData.auto !== undefined) {
                            window.AppState.systemMode = (rawData.auto === 1 || rawData.auto === true || rawData.auto === "1" ? 'auto' : 'manual');
                        } else if (rawData.mode !== undefined) {
                            window.AppState.systemMode = String(rawData.mode).toLowerCase();
                        } else if (rawData.system_mode !== undefined) {
                            window.AppState.systemMode = String(rawData.system_mode).toLowerCase();
                        }

                        if (typeof window.updateAllUI === "function") {
                            window.updateAllUI();
                        }
                    }

                    // 3. ĐẨY DỮ LIỆU ĐÃ CHUẨN HÓA VÀO APP.JS ĐỂ CẬP NHẬT UI, LCD, BIỂU ĐỒ VÀ CẢNH BÁO
                    if (typeof window.onCloudSensorData === "function") {
                        window.onCloudSensorData(mappedData);
                    }

                    // Cập nhật trạng thái nhận dữ liệu thành công trên giao diện
                    updateConnectionStatus(true, `ESP32 Nhận lúc ${new Date().toLocaleTimeString()}`);

                } catch (err) {
                    console.error("❌ Lỗi phân tích gói tin WebSocket từ Node-RED:", err);
                }
            };

            ws.onerror = function (err) {
                console.warn("⚠️ Lỗi WebSocket Node-RED:", err);
                isConnected = false;
                updateConnectionStatus(false, "Lỗi kết nối Node-RED");
            };

            ws.onclose = function () {
                console.warn("⚠️ Mất kết nối tới Node-RED WebSocket. Đang tự động kết nối lại sau 3 giây...");
                isConnected = false;
                updateConnectionStatus(false, "Mất kết nối (Đang thử lại...)");
                reconnectTimer = setTimeout(connectWebSocket, 3000);
            };

        } catch (e) {
            console.error("❌ Không thể khởi tạo WebSocket:", e);
            isConnected = false;
            updateConnectionStatus(false, "Không thể kết nối");
            reconnectTimer = setTimeout(connectWebSocket, 3000);
        }
    }

    /**
     * Cập nhật badge trạng thái kết nối lên thanh Header của Web Dashboard
     */
    function updateConnectionStatus(connected, text) {
        const badge = document.getElementById("connection-status-badge");
        const dot = document.getElementById("connection-status-dot");
        const label = document.getElementById("connection-status-label");

        if (dot) {
            if (connected) {
                dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
            } else {
                dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
            }
        }

        if (label) {
            label.textContent = text || (connected ? "ESP32 Live" : "Đang kết nối lại...");
        }

        if (badge) {
            if (connected) {
                badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 transition-all";
            } else {
                badge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 transition-all";
            }
        }
    }

    /**
     * Gửi lệnh điều khiển từ Web sang Node-RED qua HTTP POST
     * Node-RED sẽ nhận tại /api/control và chuyển tiếp lệnh MQTT xuống ESP32
     */
    async function updateDeviceControls(controlsPayload) {
        const { apiUrl } = getEndpoints();
        try {
            console.log(`📤 Đang gửi lệnh điều khiển tới Node-RED (${apiUrl}):`, controlsPayload);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(controlsPayload)
            });

            if (response.ok) {
                console.log("✅ Đã gửi lệnh điều khiển thành công tới Node-RED & ESP32");
                return true;
            } else {
                console.warn("⚠️ Node-RED trả về lỗi HTTP:", response.status);
                return false;
            }
        } catch (err) {
            console.warn("⚠️ Không thể gửi lệnh tới Node-RED (API có thể chưa bật hoặc sai cổng):", err.message);
            return false;
        }
    }

    // Export module ra window.NodeRedService
    window.NodeRedService = {
        init: initNodeRed,
        reconnect: connectWebSocket,
        isConnected: () => isConnected,
        getLastDataTimestamp: () => lastDataTimestamp,
        updateDeviceControls: updateDeviceControls
    };

})(window);