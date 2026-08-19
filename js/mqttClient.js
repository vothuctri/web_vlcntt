/**
 * Smart Terrarium IoT Dashboard - MQTT Cloud Client Module
 * Tích hợp trực tiếp 100% cơ chế kết nối từ test_mqtt.html
 * Broker: wss://broker.emqx.io:8084/mqtt
 * Topic nhận: smart_terrarium/nhom05/sensors
 * Topic gửi: smart_terrarium/nhom05/control
 */

(function (window) {
    const TOPIC_SENSORS = "smart_terrarium/nhom05/sensors";
    const TOPIC_CONTROL = "smart_terrarium/nhom05/control";
    const brokerUrl = "wss://broker.emqx.io:8084/mqtt";

    let client = null;
    let isConnected = false;
    let hasReceivedHardwareData = false;
    let lastChartTime = 0;

    // Khởi tạo kết nối MQTT ngay lập tức khi file được nạp (giống test_mqtt.html)
    function startMQTTConnection() {
        if (typeof mqtt === "undefined") {
            console.warn("⚠️ Đang đợi thư viện MQTT.js nạp từ CDN...");
            setTimeout(startMQTTConnection, 500);
            return;
        }

        try {
            console.log("🌐 [MQTT] Đang kết nối tới:", brokerUrl);

            client = mqtt.connect(brokerUrl, {
                clientId: "WebMain_" + Math.random().toString(16).substr(2, 8),
                clean: true,
                connectTimeout: 5000,
                reconnectPeriod: 3000
            });

            client.on("connect", () => {
                console.log("🟢 [MQTT] ĐÃ KẾT NỐI THÀNH CÔNG CLOUD MQTT!");
                isConnected = true;
                client.subscribe(TOPIC_SENSORS, (err) => {
                    if (!err) {
                        console.log("📡 Đã đăng ký nhận dữ liệu từ topic:", TOPIC_SENSORS);
                    }
                });

                if (!hasReceivedHardwareData) {
                    updateStatusBadge(true, "🟢 Đã kết nối Cloud MQTT - Đang đợi ESP8266...");
                    const espDot = document.getElementById("esp-status-dot");
                    const espText = document.getElementById("esp-status-text");
                    if (espDot) espDot.className = "w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse";
                    if (espText) espText.textContent = "Đang đợi ESP8266...";
                } else {
                    updateStatusBadge(true, "🟢 ESP8266 Đang Gửi Dữ Liệu Thời Gian Thực");
                }
            });

            client.on("message", (topic, message) => {
                if (topic === TOPIC_SENSORS) {
                    const payloadStr = message.toString();
                    hasReceivedHardwareData = true;
                    console.log("📥 [MQTT Gói tin cảm biến]:", payloadStr);

                    // Tắt mô phỏng nếu có gói tin thật từ ESP8266
                    if (window.stopHardwareSimulator) {
                        window.stopHardwareSimulator();
                    }

                    // Cập nhật huy hiệu đã nhận gói tin thật từ ESP8266
                    updateStatusBadge(true, "🟢 ESP8266 Đang Gửi Dữ Liệu Thời Gian Thực");
                    const espDot = document.getElementById("esp-status-dot");
                    const espText = document.getElementById("esp-status-text");
                    if (espDot) espDot.className = "w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse";
                    if (espText) espText.textContent = "ESP8266 Connected";

                    try {
                        const data = JSON.parse(payloadStr);

                        const mapped = {
                            temperature: data.temp !== undefined ? parseFloat(data.temp) : 0.0,
                            humidity: data.hum !== undefined ? parseFloat(data.hum) : 0.0,
                            soil_moisture: data.soil !== undefined ? parseFloat(data.soil) : 0.0,
                            light_level: data.ldr !== undefined ? (parseFloat(data.ldr) * 10) : 0.0,
                            is_dark: data.ldr !== undefined ? (parseFloat(data.ldr) < 30) : false,
                            created_at: new Date().toISOString()
                        };

                        // 1. Cập nhật thẻ chỉ số đo đạc trên giao diện
                        const tempEl = document.getElementById("metric-temp-val");
                        const humEl = document.getElementById("metric-hum-val");
                        const soilEl = document.getElementById("metric-soil-val");
                        const lightEl = document.getElementById("metric-light-val");
                        const stateEl = document.getElementById("metric-light-state");

                        if (tempEl) tempEl.textContent = `${mapped.temperature.toFixed(1)}°C`;
                        if (humEl) humEl.textContent = `${mapped.humidity.toFixed(0)}%`;
                        if (soilEl) soilEl.textContent = `${mapped.soil_moisture.toFixed(0)}%`;
                        if (lightEl) lightEl.textContent = `${mapped.light_level.toFixed(0)} Lux`;
                        if (stateEl) {
                            stateEl.textContent = mapped.is_dark ? "Trời tối 🌙" : "Trời sáng ☀️";
                            stateEl.className = mapped.is_dark ? "font-bold text-purple-600 dark:text-purple-400" : "font-bold text-amber-600 dark:text-amber-400";
                        }

                        // 2. Đồng bộ trạng thái thiết bị nếu đang ở chế độ Auto
                        if (window.AppState && window.AppState.systemMode === 'auto') {
                            if (data.pump !== undefined) updatePumpUI(data.pump === 1);
                            if (data.led !== undefined) updateLampUI(data.led === 1);
                        }

                        // 3. Cập nhật AppState, LCD 16x2 và Biểu đồ
                        const now = Date.now();
                        if (now - lastChartTime > 1500) {
                            lastChartTime = now;

                            if (window.AppState) {
                                window.AppState.currentSensorData = mapped;
                            }

                            if (window.LCDSimulator) {
                                window.LCDSimulator.updateFromSensors(mapped.temperature, mapped.humidity, mapped.soil_moisture, mapped.is_dark);
                            }
                            if (window.ChartService) {
                                window.ChartService.appendDataPoint(mapped);
                            }
                            if (typeof window.appendQuickChartPoint === "function") {
                                window.appendQuickChartPoint(mapped);
                            }
                        }

                    } catch (e) {
                        console.error("Lỗi parse JSON MQTT:", e);
                    }
                }
            });

            client.on("error", (err) => {
                console.warn("⚠️ Lỗi kết nối MQTT:", err.message);
                isConnected = false;
                updateStatusBadge(false, "❌ Lỗi kết nối Cloud MQTT (broker.emqx.io)");
                resetMetricsToPlaceholder();
            });

            client.on("close", () => {
                isConnected = false;
                updateStatusBadge(false, "⏳ Đang kết nối lại MQTT...");
                resetMetricsToPlaceholder();
            });

        } catch (err) {
            console.error("Lỗi khởi tạo MQTT:", err);
        }
    }

    /**
     * Gửi lệnh trực tiếp qua MQTT
     */
    function sendCommand(cmd) {
        if (client && client.connected) {
            client.publish(TOPIC_CONTROL, cmd);
            console.log(`📤 [MQTT GỬI LỆNH]: ${cmd} tới topic: ${TOPIC_CONTROL}`);
            return true;
        } else {
            console.warn("⚠️ Chưa kết nối được tới máy chủ Cloud MQTT!");
            return false;
        }
    }

    function sendPumpCommand(isOn) {
        const cmd = isOn ? "PUMP:1" : "PUMP:0";
        return sendCommand(cmd);
    }

    function sendLampCommand(isOn) {
        const cmd = isOn ? "LED:1" : "LED:0";
        return sendCommand(cmd);
    }

    function sendModeCommand(mode) {
        const cmd = mode === 'auto' ? "MODE:AUTO" : "MODE:MANUAL";
        return sendCommand(cmd);
    }

    // ================= GẮN HÀM TOÀN CỤC CHO CÁC NÚT BẤM =================
    window.sendCommand = sendCommand;

    window.turnOnPump = function () {
        if (window.AppState) window.AppState.systemMode = 'manual';
        sendPumpCommand(true);
        updatePumpUI(true);
        updateModeBadge('manual');
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "BẬT", "Thủ công");
        }
    };

    window.turnOffPump = function () {
        if (window.AppState) window.AppState.systemMode = 'manual';
        sendPumpCommand(false);
        updatePumpUI(false);
        updateModeBadge('manual');
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "TẮT", "Thủ công");
        }
    };

    window.turnOnLamp = function () {
        if (window.AppState) window.AppState.systemMode = 'manual';
        sendLampCommand(true);
        updateLampUI(true);
        updateModeBadge('manual');
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "BẬT", "Thủ công");
        }
    };

    window.turnOffLamp = function () {
        if (window.AppState) window.AppState.systemMode = 'manual';
        sendLampCommand(false);
        updateLampUI(false);
        updateModeBadge('manual');
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "TẮT", "Thủ công");
        }
    };

    window.togglePump = function (status) {
        if (status === undefined) {
            status = !(window.AppState && window.AppState.pumpStatus);
        }
        if (status) window.turnOnPump();
        else window.turnOffPump();
    };

    window.toggleLamp = function (status) {
        if (status === undefined) {
            status = !(window.AppState && window.AppState.lampStatus);
        }
        if (status) window.turnOnLamp();
        else window.turnOffLamp();
    };

    window.toggleSystemMode = function () {
        const current = (window.AppState && window.AppState.systemMode) || 'auto';
        const next = current === 'auto' ? 'manual' : 'auto';
        if (next === 'auto') {
            sendModeCommand("auto");
            updateModeBadge("auto");
        } else {
            sendModeCommand("manual");
            updateModeBadge("manual");
        }
    };

    function updatePumpUI(isOn) {
        if (window.AppState) window.AppState.pumpStatus = isOn;
        const badge = document.getElementById("pump-status-badge");
        const toggle = document.getElementById("pump-toggle-switch");
        const toggleBg = document.getElementById("pump-toggle-bg");
        const icon = document.getElementById("pump-icon-box");
        const btnOn = document.getElementById("btn-pump-on");
        const btnOff = document.getElementById("btn-pump-off");

        if (toggle) toggle.checked = isOn;
        if (toggleBg) {
            toggleBg.className = isOn
                ? "w-12 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 bg-emerald-500 transition-colors"
                : "w-12 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 bg-slate-300 transition-colors";
        }
        if (icon) {
            icon.className = isOn
                ? "w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-500 transition-colors shadow-sm animate-pulse"
                : "w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors";
        }
        if (badge) {
            badge.textContent = isOn ? "Đang bơm nước 💧" : "Đang dừng";
            badge.className = isOn ? "text-[11px] font-bold text-emerald-600 dark:text-emerald-400" : "text-[11px] font-semibold text-slate-500 dark:text-slate-400";
        }
        if (btnOn && btnOff) {
            if (isOn) {
                btnOn.className = "py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
            } else {
                btnOn.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
            }
        }
    }

    function updateLampUI(isOn) {
        if (window.AppState) window.AppState.lampStatus = isOn;
        const badge = document.getElementById("lamp-status-badge");
        const toggle = document.getElementById("lamp-toggle-switch");
        const toggleBg = document.getElementById("lamp-toggle-bg");
        const icon = document.getElementById("lamp-icon-box");
        const btnOn = document.getElementById("btn-lamp-on");
        const btnOff = document.getElementById("btn-lamp-off");

        if (toggle) toggle.checked = isOn;
        if (toggleBg) {
            toggleBg.className = isOn
                ? "w-12 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 bg-emerald-500 transition-colors"
                : "w-12 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 bg-slate-300 transition-colors";
        }
        if (icon) {
            icon.className = isOn
                ? "w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-500 transition-colors shadow-sm animate-pulse"
                : "w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors";
        }
        if (badge) {
            badge.textContent = isOn ? "Đang sáng 💡" : "Đang tắt";
            badge.className = isOn ? "text-[11px] font-bold text-amber-600 dark:text-amber-400" : "text-[11px] font-semibold text-slate-500 dark:text-slate-400";
        }
        if (btnOn && btnOff) {
            if (isOn) {
                btnOn.className = "py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
            } else {
                btnOn.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
            }
        }
    }

    function updateModeBadge(mode) {
        if (window.AppState) window.AppState.systemMode = mode;
        const tag = document.getElementById("control-mode-tag");
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");

        if (mode === 'auto') {
            if (tag) {
                tag.textContent = "Auto Mode ⚡";
                tag.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity";
            }
            if (autoBtn) autoBtn.className = "px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold shadow-sm transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 transition-all";
        } else {
            if (tag) {
                tag.textContent = "Manual Mode ✋";
                tag.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity";
            }
            if (autoBtn) autoBtn.className = "px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold shadow-sm transition-all";
        }
    }

    function updateStatusBadge(online, text) {
        const ind = document.getElementById("cloud-status-indicator");
        const txt = document.getElementById("cloud-status-text");
        if (txt) txt.textContent = text;
        if (ind) {
            ind.className = online
                ? "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
        }
    }

    function resetMetricsToPlaceholder() {
        if (!hasReceivedHardwareData) {
            const temp = document.getElementById("metric-temp-val");
            const hum = document.getElementById("metric-hum-val");
            const soil = document.getElementById("metric-soil-val");
            const light = document.getElementById("metric-light-val");
            const lightState = document.getElementById("metric-light-state");
            const espDot = document.getElementById("esp-status-dot");
            const espText = document.getElementById("esp-status-text");

            if (temp) temp.textContent = "-- °C";
            if (hum) hum.textContent = "-- %";
            if (soil) soil.textContent = "-- %";
            if (light) light.textContent = "-- Lux";
            if (lightState) {
                lightState.textContent = "Đang đợi...";
                lightState.className = "font-bold text-slate-500 dark:text-slate-400";
            }
            if (espDot) espDot.className = "w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse";
            if (espText) espText.textContent = "Đang đợi ESP8266...";
        }
    }

    // Tự động chạy kết nối ngay
    startMQTTConnection();

    window.MQTTService = {
        init: startMQTTConnection,
        isConnected: () => isConnected,
        hasReceivedHardwareData: () => hasReceivedHardwareData,
        sendCommand: sendCommand,
        sendPumpCommand: sendPumpCommand,
        sendLampCommand: sendLampCommand,
        sendModeCommand: sendModeCommand,
        updatePumpUI: updatePumpUI,
        updateLampUI: updateLampUI,
        updateModeUI: updateModeBadge
    };

})(window);
