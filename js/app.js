/**
 * Smart Terrarium IoT Dashboard - Main Application Logic
 * Quản lý Trạng thái Ứng dụng, Nhận dữ liệu ESP32 từ Node-RED, Cập nhật LCD 16x2, Chart.js & Cảnh báo
 */

(function (window) {
    const AppState = {
        isLoggedIn: true,
        currentTab: 'dashboard',
        theme: 'light',
        systemMode: 'auto',
        pumpStatus: false,
        lampStatus: false,
        rgbColor: '#00FF88',
        rgbBrightness: 100,
        soilThreshold: 35.0,
        tempMaxThreshold: 38.0,
        
        currentSensorData: {
            temperature: 26.5,
            humidity: 65.0,
            soil_moisture: 45.0,
            light_level: 450.0,
            is_dark: false
        },
        
        alerts: []
    };

    window.AppState = AppState;
    let simulatorInterval = null;

    /**
     * KHỞI CHẠY ỨNG DỤNG KHI DOM SẴN SÀNG
     */
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("🚀 Đang khởi chạy Smart Terrarium IoT Dashboard...");

        // 1. Tải theme đã lưu (Light / Dark)
        const savedTheme = localStorage.getItem("biosync_theme") || "light";
        setTheme(savedTheme);

        // 2. Khởi tạo các sub-module
        if (window.LCDSimulator) window.LCDSimulator.init();
        if (window.ChartService) window.ChartService.init();
        if (window.AIChatbot) window.AIChatbot.init();

        // 3. Gắn hàm tiếp nhận dữ liệu thời gian thực từ ESP32 qua Node-RED
        window.onCloudSensorData = processIncomingSensorData;

        // 4. Khởi tạo kết nối WebSocket Node-RED (nhận dữ liệu ESP32)
        if (window.NodeRedService) {
            window.NodeRedService.init();
        }

        // 5. Lắng nghe sự kiện UI (nút gạt, nút chuyển tab, form đăng nhập)
        bindUIEvents();

        // 6. Trạng thái Đăng nhập
        if (!AppState.isLoggedIn) {
            const loginView = document.getElementById("view-login");
            const mainView = document.getElementById("view-main-app");
            if (loginView) loginView.classList.remove("hidden");
            if (mainView) mainView.classList.add("hidden");
        } else {
            const loginView = document.getElementById("view-login");
            const mainView = document.getElementById("view-main-app");
            if (loginView) loginView.classList.add("hidden");
            if (mainView) mainView.classList.remove("hidden");
        }

        // 7. Nạp dữ liệu khởi tạo ban đầu cho biểu đồ lịch sử
        loadMockHistory();

        // 8. Kích hoạt bộ sinh dữ liệu mô phỏng dự phòng (chỉ khi cấu hình ENABLE_SIMULATOR = true)
        if (window.APP_CONFIG && window.APP_CONFIG.ENABLE_SIMULATOR) {
            startHardwareSimulator();
        }

        // 9. Cập nhật dữ liệu và giao diện ban đầu
        processIncomingSensorData(AppState.currentSensorData);
        updateAllUI();
    });

    /**
     * 1. XỬ LÝ ĐĂNG NHẬP & ĐĂNG XUẤT
     */
    window.handleLogin = function () {
        AppState.isLoggedIn = true;
        document.getElementById("view-login")?.classList.add("hidden");
        document.getElementById("view-main-app")?.classList.remove("hidden");
        switchTab("dashboard");
    };

    window.handleLogout = function () {
        AppState.isLoggedIn = false;
        document.getElementById("view-login")?.classList.remove("hidden");
        document.getElementById("view-main-app")?.classList.add("hidden");
        const popup = document.getElementById("user-popup-menu");
        if (popup) popup.classList.add("hidden");
    };

    /**
     * 2. CHUYỂN ĐỔI 4 KHU VỰC TRANG RIÊNG BIỆT (TAB SWITCHING)
     * - dashboard: Tổng quan (Bento Grid, 4 Cảm biến, Quick status)
     * - analytics: Phân tích lịch sử (Màn hình LCD 16x2, Biểu đồ Chart.js, Phân tích AI, Xuất CSV)
     * - controls: Điều khiển thiết bị & Cài đặt ngưỡng
     * - notifications: Nhật ký sự kiện & Cảnh báo
     */
    window.switchTab = function (tabId) {
        AppState.currentTab = tabId;

        // 1. Ẩn tất cả các khu vực tab
        const allTabs = document.querySelectorAll(".tab-content");
        allTabs.forEach(t => t.classList.remove("active-tab"));

        // 2. Hiện khu vực tab được chọn
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) {
            targetTab.classList.add("active-tab");
        }

        // 3. Cập nhật giao diện nút menu sidebar
        const navBtns = document.querySelectorAll(".nav-tab-btn");
        navBtns.forEach(btn => {
            btn.classList.remove("bg-primary-container", "text-on-primary-container", "font-semibold");
            btn.classList.add("text-on-surface-variant", "dark:text-slate-300");
        });

        const activeNavBtn = document.getElementById(`nav-btn-${tabId}`);
        if (activeNavBtn) {
            activeNavBtn.classList.add("bg-primary-container", "text-on-primary-container", "font-semibold");
            activeNavBtn.classList.remove("text-on-surface-variant", "dark:text-slate-300");
        }

        // Đóng popup user nếu đang mở
        const popup = document.getElementById("user-popup-menu");
        if (popup) popup.classList.add("hidden");

        console.log(`📌 Đã chuyển sang khu vực: ${tabId.toUpperCase()}`);
    };

    /**
     * 3. XỬ LÝ THEME SÁNG / TỐI (LIGHT / DARK THEME)
     */
    window.toggleUserMenu = function () {
        const popup = document.getElementById("user-popup-menu");
        if (popup) {
            popup.classList.toggle("hidden");
        }
    };

    window.setTheme = function (themeMode) {
        AppState.theme = themeMode;
        localStorage.setItem("biosync_theme", themeMode);

        const htmlEl = document.documentElement;
        const lightBtn = document.getElementById("theme-light-btn");
        const darkBtn = document.getElementById("theme-dark-btn");
        const headerIcon = document.getElementById("header-theme-icon");

        if (themeMode === 'dark') {
            htmlEl.classList.add("dark");
            htmlEl.classList.remove("light");

            if (darkBtn) {
                darkBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold bg-slate-800 text-emerald-400 shadow-sm transition-all";
            }
            if (lightBtn) {
                lightBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 transition-all";
            }
            if (headerIcon) headerIcon.textContent = "light_mode";
        } else {
            htmlEl.classList.remove("dark");
            htmlEl.classList.add("light");

            if (lightBtn) {
                lightBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold bg-white text-emerald-700 shadow-sm transition-all";
            }
            if (darkBtn) {
                darkBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 transition-all";
            }
            if (headerIcon) headerIcon.textContent = "dark_mode";
        }
    };

    window.openChangePasswordModal = function () {
        const modal = document.getElementById("change-password-modal");
        const popup = document.getElementById("user-popup-menu");
        if (popup) popup.classList.add("hidden");
        if (modal) {
            modal.classList.remove("hidden");
            const msg = document.getElementById("pwd-change-msg");
            if (msg) msg.classList.add("hidden");
            const curInput = document.getElementById("current-pwd-input");
            if (curInput) curInput.value = "";
            const newInput = document.getElementById("new-pwd-input");
            if (newInput) newInput.value = "";
            const confirmInput = document.getElementById("confirm-pwd-input");
            if (confirmInput) confirmInput.value = "";
        }
    };

    window.closeChangePasswordModal = function () {
        const modal = document.getElementById("change-password-modal");
        if (modal) modal.classList.add("hidden");
    };

    window.saveNewPassword = function () {
        const next = document.getElementById("new-pwd-input")?.value;
        const confirm = document.getElementById("confirm-pwd-input")?.value;
        const msg = document.getElementById("pwd-change-msg");

        if (next !== confirm) {
            if (msg) {
                msg.textContent = "❌ Mật khẩu xác nhận không khớp!";
                msg.className = "text-xs py-1.5 px-2 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
            }
            return;
        }

        if (msg) {
            msg.textContent = "✅ Đổi mật khẩu thành công!";
            msg.className = "text-xs py-1.5 px-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 block";
        }

        setTimeout(() => {
            window.closeChangePasswordModal();
        }, 1200);
    };

    /**
     * 4. GẮN SỰ KIỆN UI & NÚT ĐIỀU KHIỂN
     */
    function bindUIEvents() {
        // Nút chọn Chế độ Tự động / Thủ công (Auto / Manual)
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");

        if (autoBtn && manualBtn) {
            autoBtn.addEventListener("click", () => setSystemMode('auto'));
            manualBtn.addEventListener("click", () => setSystemMode('manual'));
        }

        // Công tắc Bơm M1
        const pumpToggle = document.getElementById("pump-toggle-switch");
        if (pumpToggle) {
            pumpToggle.addEventListener("change", (e) => setPumpStatus(e.target.checked));
        }

        // Công tắc Đèn L1 / LED (Hỗ trợ cả id led-toggle và lamp-toggle-switch)
        const ledToggle = document.getElementById("led-toggle");
        const lampToggle = document.getElementById("lamp-toggle-switch");

        if (ledToggle) {
            ledToggle.addEventListener("change", (e) => setLampStatus(e.target.checked));
        }
        if (lampToggle) {
            lampToggle.addEventListener("change", (e) => setLampStatus(e.target.checked));
        }

        // Chọn màu LED RGB
        const colorPicker = document.getElementById("rgb-color-picker");
        if (colorPicker) {
            colorPicker.addEventListener("input", (e) => setRGBColor(e.target.value));
        }

        // Thanh trượt độ sáng LED RGB
        const brightnessSlider = document.getElementById("rgb-brightness-slider");
        if (brightnessSlider) {
            brightnessSlider.addEventListener("input", (e) => setRGBBrightness(parseInt(e.target.value)));
        }

        // Cài đặt ngưỡng độ ẩm đất
        const soilThreshInput = document.getElementById("soil-threshold-input");
        if (soilThreshInput) {
            soilThreshInput.addEventListener("change", (e) => {
                AppState.soilThreshold = parseFloat(e.target.value) || 35.0;
                notifyControlUpdate();
            });
        }

        // Cài đặt ngưỡng quá nhiệt
        const tempThreshInput = document.getElementById("temp-threshold-input");
        if (tempThreshInput) {
            tempThreshInput.addEventListener("change", (e) => {
                AppState.tempMaxThreshold = parseFloat(e.target.value) || 38.0;
                notifyControlUpdate();
            });
        }

        // Nút xuất file CSV
        const exportCsvBtn = document.getElementById("export-csv-btn");
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener("click", () => {
                if (window.ChartService) window.ChartService.exportToCSV();
            });
        }

        // Nút Prompt nhanh của AI Assistant
        const promptBtns = document.querySelectorAll(".quick-prompt-btn");
        promptBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const promptText = btn.getAttribute("data-prompt");
                const chatModal = document.getElementById("ai-chat-modal");
                if (chatModal) chatModal.classList.remove("hidden");
                if (window.AIChatbot) window.AIChatbot.sendQuickPrompt(promptText);
            });
        });
    }

    /**
     * CẬP NHẬT TRẠNG THÁI CHẾ ĐỘ (AUTO / MANUAL)
     */
    function setSystemMode(mode) {
        AppState.systemMode = mode;
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");

        if (mode === 'auto') {
            if (autoBtn) autoBtn.className = "px-3 py-1 rounded bg-primary-container text-on-primary-container font-semibold shadow-sm transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1 rounded text-on-surface-variant dark:text-slate-400 transition-all";
        } else {
            if (autoBtn) autoBtn.className = "px-3 py-1 rounded text-on-surface-variant dark:text-slate-400 transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1 rounded bg-primary-container text-on-primary-container font-semibold shadow-sm transition-all";
        }

        notifyControlUpdate();
    }

    /**
     * CẬP NHẬT TRẠNG THÁI MÁY BƠM M1
     */
    function setPumpStatus(status) {
        AppState.pumpStatus = status;
        const pumpBadge = document.getElementById("pump-status-badge");
        const pumpToggle = document.getElementById("pump-toggle-switch");

        if (pumpToggle) {
            pumpToggle.checked = status;
            const label = pumpToggle.nextElementSibling;
            if (label && label.classList.contains("toggle-label")) {
                label.style.backgroundColor = status ? '#10b981' : '#e0e3e5';
            }
        }

        if (pumpBadge) {
            if (status) {
                pumpBadge.textContent = "Đang bơm 💧";
                pumpBadge.className = "text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
            } else {
                pumpBadge.textContent = "Đang dừng";
                pumpBadge.className = "text-xs font-bold px-2.5 py-1 rounded bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
            }
        }
        notifyControlUpdate();
    }

    /**
     * CẬP NHẬT TRẠNG THÁI ĐÈN SƯỞI L1 / LED RGB
     */
    function setLampStatus(status) {
        AppState.lampStatus = status;
        const lampBadge = document.getElementById("lamp-status-badge");
        const ledToggle = document.getElementById("led-toggle");
        const lampToggle = document.getElementById("lamp-toggle-switch");

        if (ledToggle) {
            ledToggle.checked = status;
            const label = ledToggle.nextElementSibling;
            if (label && label.classList.contains("toggle-label")) {
                label.style.backgroundColor = status ? '#10b981' : '#e0e3e5';
            }
        }

        if (lampToggle) {
            lampToggle.checked = status;
            const label = lampToggle.nextElementSibling;
            if (label && label.classList.contains("toggle-label")) {
                label.style.backgroundColor = status ? '#10b981' : '#e0e3e5';
            }
        }

        if (lampBadge) {
            if (status) {
                lampBadge.textContent = "Đang bật 💡";
                lampBadge.className = "text-xs font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
            } else {
                lampBadge.textContent = "Tắt";
                lampBadge.className = "text-xs font-bold px-2.5 py-1 rounded bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
            }
        }
        notifyControlUpdate();
    }

    /**
     * CẬP NHẬT MÀU ĐÈN LED RGB
     */
    function setRGBColor(colorHex) {
        AppState.rgbColor = colorHex;
        const colorPicker = document.getElementById("rgb-color-picker");
        if (colorPicker && colorPicker.value !== colorHex) {
            colorPicker.value = colorHex;
        }

        const ledPreview = document.getElementById("rgb-led-preview");
        if (ledPreview) {
            ledPreview.style.backgroundColor = colorHex;
            ledPreview.style.boxShadow = `0 0 12px ${colorHex}`;
        }
        notifyControlUpdate();
    }

    /**
     * CẬP NHẬT ĐỘ SÁNG ĐÈN LED RGB
     */
    function setRGBBrightness(value) {
        AppState.rgbBrightness = value;
        const bText = document.getElementById("rgb-brightness-value");
        if (bText) bText.textContent = `${value}%`;

        const brightnessSlider = document.getElementById("rgb-brightness-slider");
        if (brightnessSlider && parseInt(brightnessSlider.value) !== value) {
            brightnessSlider.value = value;
        }

        const ledPreview = document.getElementById("rgb-led-preview");
        if (ledPreview) {
            ledPreview.style.opacity = (value / 100).toString();
        }
        notifyControlUpdate();
    }

    /**
     * GỬI LỆNH ĐIỀU KHIỂN SANG NODE-RED (ĐỂ CHUYỂN TIẾP XUỐNG ESP32 QUA MQTT)
     */
    function notifyControlUpdate() {
        if (window.NodeRedService) {
            window.NodeRedService.updateDeviceControls({
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
     * 5. XỬ LÝ DỮ LIỆU CẢM BIẾN NHẬN ĐƯỢC TỪ ESP32 QUA NODE-RED
     */
    function processIncomingSensorData(data) {
        if (!data) return;

        AppState.currentSensorData = { ...data };

        // 1. Cập nhật các thẻ thông số môi trường trên Dashboard
        updateMetricCards(data);

        // 2. Cập nhật màn hình mô phỏng LCD 16x2 I2C
        if (window.LCDSimulator) {
            window.LCDSimulator.updateFromSensors(
                data.temperature,
                data.humidity,
                data.soil_moisture,
                data.is_dark
            );
        }

        // 3. Thêm điểm dữ liệu thời gian thực vào Biểu đồ Chart.js
        if (window.ChartService) {
            window.ChartService.appendDataPoint(data);
        }

        // 4. Logic tự động hóa (Auto mode) dựa trên ngưỡng cảm biến
        if (AppState.systemMode === 'auto') {
            // Tự động bật máy bơm M1 khi đất khô
            if (data.soil_moisture < AppState.soilThreshold && !AppState.pumpStatus) {
                setPumpStatus(true);
                addAlertLog("DRY_SOIL", "WARNING", `Độ ẩm đất khô (${data.soil_moisture}% < ${AppState.soilThreshold}%). Tự động kích hoạt máy bơm M1.`);
            } else if (data.soil_moisture >= AppState.soilThreshold + 5 && AppState.pumpStatus) {
                setPumpStatus(false);
                addAlertLog("PUMP_ACTIVE", "INFO", `Đất đã đủ ẩm (${data.soil_moisture}%). Tự động ngắt máy bơm M1.`);
            }

            // Tự động bật đèn L1 khi cảm biến LDR báo trời tối
            if (data.is_dark && !AppState.lampStatus) {
                setLampStatus(true);
                addAlertLog("LIGHT_DARK", "INFO", `Cảm biến quang trở LDR báo trời tối. Tự động bật đèn sưởi L1.`);
            } else if (!data.is_dark && AppState.lampStatus) {
                setLampStatus(false);
            }
        }

        // 5. Kiểm tra cảnh báo quá nhiệt
        if (data.temperature > AppState.tempMaxThreshold) {
            addAlertLog("HIGH_TEMP", "CRITICAL", `🔥 CẢNH BÁO QUÁ NHIỆT: Nhiệt độ vượt ngưỡng (${data.temperature}°C > ${AppState.tempMaxThreshold}°C)!`);
        }
    }

    /**
     * CẬP NHẬT CÁC THẺ CARD TRÊN DASHBOARD
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
            lightStateEl.className = data.is_dark 
                ? "text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" 
                : "text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
        }
    }

    /**
     * 6. QUẢN LÝ NHẬT KÝ & CẢNH BÁO (ALERT LOGS)
     */
    function addAlertLog(type, severity, message) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const alertObj = { time: timeStr, type, severity, message };

        // Tránh trùng lặp cảnh báo giống hệt trong thời gian ngắn
        if (AppState.alerts.length > 0 && AppState.alerts[0].message === message) {
            return;
        }

        AppState.alerts.unshift(alertObj);
        if (AppState.alerts.length > 20) AppState.alerts.pop();

        renderAlertLogs();
    }

    function renderAlertLogs() {
        const container = document.getElementById("alert-log-container");
        if (!container) return;

        if (AppState.alerts.length === 0) {
            container.innerHTML = `<li class="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">Hệ thống đang hoạt động bình thường, không có cảnh báo.</li>`;
            return;
        }

        container.innerHTML = AppState.alerts.slice(0, 5).map(a => `
            <li class="flex items-start gap-sm p-sm rounded-lg border text-xs ${
                a.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' :
                a.severity === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300' :
                'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
            }">
                <span class="material-symbols-outlined text-sm mt-0.5">${a.severity === 'CRITICAL' ? 'error' : a.severity === 'WARNING' ? 'warning' : 'check_circle'}</span>
                <div>
                    <p class="font-semibold">${a.message}</p>
                    <p class="text-[10px] opacity-75 mt-0.5">${a.time}</p>
                </div>
            </li>
        `).join("");
    }

    /**
     * 7. NẠP DỮ LIỆU BAN ĐẦU CHO BIỂU ĐỒ
     */
    function loadMockHistory() {
        const count = window.APP_CONFIG?.MOCK_HISTORY_COUNT || 15;
        const mockList = [];
        let baseTime = Date.now() - count * 60000;
        let t = 26.5, h = 65.0, s = 45.0;

        for (let i = 0; i < count; i++) {
            t += (Math.random() - 0.48) * 0.4;
            h += (Math.random() - 0.5) * 0.8;
            s += (Math.random() - 0.5) * 0.6;

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
     * BỘ MÔ PHỎNG DỰ PHÒNG (HARDWARE SIMULATOR)
     */
    function startHardwareSimulator() {
        let temp = 28.0, hum = 60.0, soil = 40.0, light = 450.0;

        simulatorInterval = setInterval(() => {
            // Nếu đã có kết nối Node-RED thật thì không chạy simulator để tránh đè dữ liệu ESP32
            if (window.NodeRedService && window.NodeRedService.isConnected()) {
                return;
            }

            temp += (Math.random() - 0.48) * 0.4;
            hum += (Math.random() - 0.5) * 0.8;
            
            if (AppState.pumpStatus) {
                soil += 2.5;
                if (soil > 85) soil = 85;
            } else {
                soil -= 0.3;
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
        }, window.APP_CONFIG?.SIMULATOR_INTERVAL_MS || 3000);
    }

    /**
     * ĐỒNG BỘ TOÀN BỘ TRẠNG THÁI GIAO DIỆN
     */
    function updateAllUI() {
        setSystemMode(AppState.systemMode);
        setPumpStatus(AppState.pumpStatus);
        setLampStatus(AppState.lampStatus);
        setRGBColor(AppState.rgbColor);
        setRGBBrightness(AppState.rgbBrightness);
    }

    window.updateAllUI = updateAllUI;

})(window);
