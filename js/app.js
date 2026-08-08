/**
 * Smart Terrarium IoT Dashboard - Main Application Logic
 * Quản lý Trạng thái Ứng dụng, Sự kiện UI & Đồng bộ Phần cứng / Supabase
 */

(function (window) {
    // State quản lý toàn bộ hệ thống Web
    const AppState = {
        systemMode: 'auto',       // 'auto' hoặc 'manual'
        pumpStatus: false,        // Bơm M1
        lampStatus: false,        // Đèn L1
        rgbColor: '#00FF88',      // LED RGB D2
        rgbBrightness: 100,       // Độ sáng LED RGB (%)
        soilThreshold: 35.0,      // Ngưỡng bật bơm tự động
        tempMaxThreshold: 38.0,   // Ngưỡng cảnh báo nhiệt độ
        
        currentSensorData: {
            temperature: 27.5,
            humidity: 62.0,
            soil_moisture: 42.0,
            light_level: 480.0,
            is_dark: false
        },
        
        alerts: []
    };

    window.AppState = AppState;

    let simulatorInterval = null;

    /**
     * Hàm Khởi chạy Ứng dụng
     */
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("🚀 Đang khởi chạy Smart Terrarium Web Dashboard (Stitch Style)...");

        // 1. Khởi tạo các module con
        if (window.LCDSimulator) window.LCDSimulator.init();
        if (window.ChartService) window.ChartService.init();
        if (window.AIChatbot) window.AIChatbot.init();

        // 2. Khởi tạo Supabase
        const supabaseReady = window.SupabaseService ? window.SupabaseService.init() : false;

        // 3. Gắn sự kiện cho giao diện điều khiển (Control Panel)
        bindUIEvents();

        // 4. Nếu Supabase sẵn sàng, tải dữ liệu từ Cloud
        if (supabaseReady) {
            await syncFromSupabase();
            window.SupabaseService.subscribeRealtime(
                onCloudSensorData,
                onCloudControlChange
            );
        } else {
            // Nạp dữ liệu mẫu lịch sử giả lập
            loadMockHistory();
        }

        // 5. Khởi động Simulator (khi chạy offline / demo)
        if (window.APP_CONFIG.ENABLE_SIMULATOR && !supabaseReady) {
            startHardwareSimulator();
        }

        // 6. Đọc ban đầu cập nhật UI
        updateAllUI();
    });

    /**
     * Gắn các lắng nghe sự kiện trên giao diện UI
     */
    function bindUIEvents() {
        // Nấc chọn Chế độ Tự động / Thủ công
        const modeAutoBtn = document.getElementById("mode-auto-btn");
        const modeManualBtn = document.getElementById("mode-manual-btn");

        if (modeAutoBtn && modeManualBtn) {
            modeAutoBtn.addEventListener("click", () => setSystemMode('auto'));
            modeManualBtn.addEventListener("click", () => setSystemMode('manual'));
        }

        // Switch điều khiển Bơm nước M1
        const pumpToggle = document.getElementById("pump-toggle-switch");
        if (pumpToggle) {
            pumpToggle.addEventListener("change", (e) => {
                setPumpStatus(e.target.checked);
            });
        }

        // Switch điều khiển Bóng đèn sưởi L1 (Relay K2)
        const lampToggle = document.getElementById("lamp-toggle-switch");
        if (lampToggle) {
            lampToggle.addEventListener("change", (e) => {
                setLampStatus(e.target.checked);
            });
        }

        // Color Picker cho Đèn LED RGB D2
        const colorPicker = document.getElementById("rgb-color-picker");
        if (colorPicker) {
            colorPicker.addEventListener("input", (e) => {
                setRGBColor(e.target.value);
            });
        }

        // Thanh trượt Độ sáng RGB
        const brightnessSlider = document.getElementById("rgb-brightness-slider");
        if (brightnessSlider) {
            brightnessSlider.addEventListener("input", (e) => {
                setRGBBrightness(parseInt(e.target.value));
            });
        }

        // Thanh trượt cài đặt Ngưỡng Độ ẩm đất
        const soilThreshInput = document.getElementById("soil-threshold-input");
        if (soilThreshInput) {
            soilThreshInput.addEventListener("change", (e) => {
                AppState.soilThreshold = parseFloat(e.target.value) || 35.0;
                notifyControlUpdate();
            });
        }

        // Thanh trượt cài đặt Ngưỡng Nhiệt độ Tối đa
        const tempThreshInput = document.getElementById("temp-threshold-input");
        if (tempThreshInput) {
            tempThreshInput.addEventListener("change", (e) => {
                AppState.tempMaxThreshold = parseFloat(e.target.value) || 38.0;
                notifyControlUpdate();
            });
        }

        // Nút Xuất CSV
        const exportCsvBtn = document.getElementById("export-csv-btn");
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener("click", () => {
                if (window.ChartService) window.ChartService.exportToCSV();
            });
        }

        // Nút Gợi ý nhanh Chatbot AI
        const promptBtns = document.querySelectorAll(".quick-prompt-btn");
        promptBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const promptText = btn.getAttribute("data-prompt");
                if (window.AIChatbot) window.AIChatbot.sendQuickPrompt(promptText);
            });
        });
    }

    /**
     * Thay đổi chế độ Hệ thống (Auto / Manual)
     */
    function setSystemMode(mode) {
        AppState.systemMode = mode;
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");

        if (mode === 'auto') {
            if (autoBtn) autoBtn.classList.add("active");
            if (manualBtn) manualBtn.classList.remove("active");
        } else {
            if (autoBtn) autoBtn.classList.remove("active");
            if (manualBtn) manualBtn.classList.add("active");
        }

        notifyControlUpdate();
    }

    /**
     * Bật / Tắt Bơm M1
     */
    function setPumpStatus(status) {
        AppState.pumpStatus = status;
        const pumpBadge = document.getElementById("pump-status-badge");
        const pumpToggle = document.getElementById("pump-toggle-switch");

        if (pumpToggle) pumpToggle.checked = status;
        if (pumpBadge) {
            if (status) {
                pumpBadge.textContent = "Đang bơm 💧";
                pumpBadge.className = "status-badge badge-active";
            } else {
                pumpBadge.textContent = "Đang dừng";
                pumpBadge.className = "status-badge badge-inactive";
            }
        }

        notifyControlUpdate();
    }

    /**
     * Bật / Tắt Đèn sưởi L1
     */
    function setLampStatus(status) {
        AppState.lampStatus = status;
        const lampBadge = document.getElementById("lamp-status-badge");
        const lampToggle = document.getElementById("lamp-toggle-switch");

        if (lampToggle) lampToggle.checked = status;
        if (lampBadge) {
            if (status) {
                lampBadge.textContent = "Đang bật 💡";
                lampBadge.className = "status-badge badge-active";
            } else {
                lampBadge.textContent = "Tắt";
                lampBadge.className = "status-badge badge-inactive";
            }
        }

        notifyControlUpdate();
    }

    /**
     * Đổi màu Đèn LED RGB D2
     */
    function setRGBColor(colorHex) {
        AppState.rgbColor = colorHex;
        const ledPreview = document.getElementById("rgb-led-preview");
        if (ledPreview) {
            ledPreview.style.backgroundColor = colorHex;
            ledPreview.style.boxShadow = `0 0 15px ${colorHex}`;
        }
        notifyControlUpdate();
    }

    /**
     * Đổi độ sáng LED RGB
     */
    function setRGBBrightness(value) {
        AppState.rgbBrightness = value;
        const bText = document.getElementById("rgb-brightness-value");
        if (bText) bText.textContent = `${value}%`;

        const ledPreview = document.getElementById("rgb-led-preview");
        if (ledPreview) {
            ledPreview.style.opacity = (value / 100).toString();
        }
        notifyControlUpdate();
    }

    /**
     * Đẩy sự thay đổi trạng thái điều khiển lên Supabase
     */
    function notifyControlUpdate() {
        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            window.SupabaseService.updateDeviceControls({
                system_mode: AppState.systemMode,
                pump_status: AppState.pumpStatus,
                lamp_status: AppState.lampStatus,
                rgb_color: AppState.rgbColor,
                rgb_brightness: AppState.rgbBrightness,
                soil_threshold: AppState.soilThreshold,
                temp_max_threshold: AppState.tempMaxThreshold
            });
        }
    }

    /**
     * Nhận dữ liệu cảm biến mới
     */
    function processIncomingSensorData(data) {
        AppState.currentSensorData = { ...data };

        // 1. Cập nhật thẻ chỉ số số (Metric Cards)
        updateMetricCards(data);

        // 2. Cập nhật màn hình LCD 16x2 I2C Simulator
        if (window.LCDSimulator) {
            window.LCDSimulator.updateFromSensors(
                data.temperature,
                data.humidity,
                data.soil_moisture,
                data.is_dark
            );
        }

        // 3. Cập nhật biểu đồ Chart.js
        if (window.ChartService) {
            window.ChartService.appendDataPoint(data);
        }

        // 4. Kiểm tra Logic Chế độ Tự động (Auto Mode Logic)
        if (AppState.systemMode === 'auto') {
            // Tự động bật bơm M1 nếu đất khô dưới ngưỡng
            if (data.soil_moisture < AppState.soilThreshold && !AppState.pumpStatus) {
                setPumpStatus(true);
                addAlertLog("DRY_SOIL", "WARNING", `Độ ẩm đất khô (${data.soil_moisture}% < ${AppState.soilThreshold}%). Tự động bật máy bơm M1.`);
            } else if (data.soil_moisture >= AppState.soilThreshold + 5 && AppState.pumpStatus) {
                setPumpStatus(false);
                addAlertLog("PUMP_ACTIVE", "INFO", `Đất đã đủ ẩm (${data.soil_moisture}%). Tự động ngắt máy bơm M1.`);
            }

            // Tự động bật Đèn L1 nếu trời tối
            if (data.is_dark && !AppState.lampStatus) {
                setLampStatus(true);
                addAlertLog("SYSTEM_WARN", "INFO", `Cảm biến quang trở LDR báo trời tối. Kích hoạt Relay bật đèn L1.`);
            } else if (!data.is_dark && AppState.lampStatus) {
                setLampStatus(false);
            }
        }

        // 5. Cảnh báo quá nhiệt
        if (data.temperature > AppState.tempMaxThreshold) {
            addAlertLog("HIGH_TEMP", "CRITICAL", `🔥 CẢNH BÁO QUÁ NHIỆT: Nhiệt độ vượt ngưỡng (${data.temperature}°C > ${AppState.tempMaxThreshold}°C)!`);
        }
    }

    /**
     * Cập nhật các thẻ thông số cảm biến trên UI
     */
    function updateMetricCards(data) {
        const tempEl = document.getElementById("metric-temp-val");
        const humEl = document.getElementById("metric-hum-val");
        const soilEl = document.getElementById("metric-soil-val");
        const lightEl = document.getElementById("metric-light-val");
        const lightStateEl = document.getElementById("metric-light-state");

        if (tempEl) tempEl.textContent = `${data.temperature.toFixed(1)}°C`;
        if (humEl) humEl.textContent = `${data.humidity.toFixed(0)}%`;
        if (soilEl) soilEl.textContent = `${data.soil_moisture.toFixed(0)}%`;
        if (lightEl) lightEl.textContent = `${(data.light_level || 0).toFixed(0)} Lux`;
        if (lightStateEl) {
            lightStateEl.textContent = data.is_dark ? "Trời tối 🌙" : "Trời sáng ☀️";
            lightStateEl.className = data.is_dark ? "badge-dark" : "badge-sunny";
        }
    }

    /**
     * Ghi nhận cảnh báo và hiển thị lên danh sách nhật ký
     */
    function addAlertLog(type, severity, message) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const alertObj = { time: timeStr, type, severity, message };

        AppState.alerts.unshift(alertObj);
        if (AppState.alerts.length > 20) AppState.alerts.pop();

        renderAlertLogs();

        // Đẩy lên Supabase nếu có
        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            window.SupabaseService.pushAlertLog({
                alert_type: type,
                severity: severity,
                message: message
            });
        }
    }

    /**
     * Render lại danh sách cảnh báo trên giao diện Web
     */
    function renderAlertLogs() {
        const container = document.getElementById("alert-log-container");
        if (!container) return;

        if (AppState.alerts.length === 0) {
            container.innerHTML = `<div class="empty-alert">Hệ thống đang hoạt động bình thường, không có cảnh báo.</div>`;
            return;
        }

        container.innerHTML = AppState.alerts.map(a => `
            <div class="alert-item alert-${a.severity.toLowerCase()}">
                <span class="alert-time">${a.time}</span>
                <span class="alert-msg">${a.message}</span>
            </div>
        `).join("");
    }

    /**
     * Khởi chạy Trình mô phỏng Phần cứng Giả lập (Simulator)
     */
    function startHardwareSimulator() {
        console.log("🎮 Đang chạy Simulator phát sinh dữ liệu cảm biến giả lập...");

        let temp = 28.0;
        let hum = 60.0;
        let soil = 40.0;
        let light = 450.0;

        simulatorInterval = setInterval(() => {
            // Biến đổi nhẹ các thông số cảm biến
            temp += (Math.random() - 0.48) * 0.4;
            hum += (Math.random() - 0.5) * 0.8;
            
            // Nếu bơm đang bật, độ ẩm đất tăng
            if (AppState.pumpStatus) {
                soil += 2.5;
                if (soil > 85) soil = 85;
            } else {
                soil -= 0.3; // Đất khô dần
                if (soil < 15) soil = 15;
            }

            temp = Math.max(18, Math.min(42, temp));
            hum = Math.max(30, Math.min(95, hum));

            const isDark = light < 100;

            const record = {
                created_at: new Date().toISOString(),
                temperature: parseFloat(temp.toFixed(1)),
                humidity: parseFloat(hum.toFixed(1)),
                soil_moisture: parseFloat(soil.toFixed(1)),
                light_level: parseFloat(light.toFixed(1)),
                is_dark: isDark
            };

            processIncomingSensorData(record);
        }, window.APP_CONFIG.SIMULATOR_INTERVAL_MS);
    }

    /**
     * Nạp lịch sử giả lập mẫu cho Biểu đồ khi mới mở Web
     */
    function loadMockHistory() {
        const count = window.APP_CONFIG.MOCK_HISTORY_COUNT || 20;
        const mockList = [];
        let baseTime = Date.now() - count * 60000;
        let t = 26.5, h = 65.0, s = 45.0;

        for (let i = 0; i < count; i++) {
            t += (Math.random() - 0.48) * 0.5;
            h += (Math.random() - 0.5) * 1.0;
            s += (Math.random() - 0.5) * 0.8;

            mockList.push({
                created_at: new Date(baseTime + i * 60000).toISOString(),
                temperature: parseFloat(t.toFixed(1)),
                humidity: parseFloat(h.toFixed(1)),
                soil_moisture: parseFloat(s.toFixed(1)),
                light_level: 420.0,
                is_dark: false
            });
        }

        if (window.ChartService) {
            window.ChartService.loadDataSet(mockList);
        }
    }

    /**
     * Đồng bộ dữ liệu ban đầu từ Supabase
     */
    async function syncFromSupabase() {
        if (!window.SupabaseService || !window.SupabaseService.isConnected()) return;

        // 1. Tải trạng thái điều khiển
        const controls = await window.SupabaseService.fetchDeviceControls();
        if (controls) {
            onCloudControlChange(controls);
        }

        // 2. Tải lịch sử cảm biến
        const history = await window.SupabaseService.fetchSensorHistory(30);
        if (history && history.length > 0) {
            window.ChartService.loadDataSet(history);
            processIncomingSensorData(history[history.length - 1]);
        }
    }

    function onCloudSensorData(data) {
        processIncomingSensorData(data);
    }

    function onCloudControlChange(controls) {
        if (controls.system_mode) setSystemMode(controls.system_mode);
        if (controls.pump_status !== undefined) setPumpStatus(controls.pump_status);
        if (controls.lamp_status !== undefined) setLampStatus(controls.lamp_status);
        if (controls.rgb_color) setRGBColor(controls.rgb_color);
        if (controls.rgb_brightness !== undefined) setRGBBrightness(controls.rgb_brightness);
    }

    function updateAllUI() {
        setSystemMode(AppState.systemMode);
        setPumpStatus(AppState.pumpStatus);
        setLampStatus(AppState.lampStatus);
        setRGBColor(AppState.rgbColor);
        setRGBBrightness(AppState.rgbBrightness);
    }

})(window);
