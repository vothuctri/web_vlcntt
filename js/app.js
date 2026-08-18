/**
 * Smart Terrarium IoT Dashboard - Main Application Logic
 * Điều phối toàn bộ trạng thái hệ thống: Supabase Auth, Realtime WebSockets,
 * Pushsafer Notification, Gemini AI, Chart.js & Bộ điều khiển thiết bị
 */

(function (window) {
    const AppState = {
        isLoggedIn: false,
        currentUser: null,
        currentTab: 'dashboard',
        theme: 'light',
        systemMode: 'auto',
        pumpStatus: false,
        lampStatus: false,
        soilThreshold: 35.0,
        tempMaxThreshold: 38.0,
        
        currentSensorData: {
            temperature: null,
            humidity: null,
            soil_moisture: null,
            light_level: null,
            is_dark: false
        },
        
        alerts: []
    };

    window.AppState = AppState;
    let simulatorInterval = null;
    let quickChartInstance = null;

    /**
     * ====================================================================
     * KHỞI CHẠY ỨNG DỤNG
     * ====================================================================
     */
    document.addEventListener("DOMContentLoaded", async () => {
        console.log("🚀 Đang khởi chạy BioSync Smart Terrarium Dashboard...");

        // 1. Tải theme đã lưu (Light / Dark)
        const savedTheme = localStorage.getItem("biosync_theme") || "light";
        setTheme(savedTheme);

        // 2. Khởi tạo các Sub-module
        if (window.LCDSimulator) window.LCDSimulator.init();
        if (window.ChartService) window.ChartService.init();
        if (window.AIChatbot) window.AIChatbot.init();

        // 3. Khởi tạo Supabase Client (Chức năng 4, 5, 6)
        let supabaseReady = false;
        if (window.SupabaseService) {
            supabaseReady = window.SupabaseService.init();
        }

        // 4. Khởi tạo Cloud MQTT Client (ESP8266 - do_an_cay / esp_wifi)
        let mqttReady = false;
        if (window.MQTTService) {
            mqttReady = window.MQTTService.init();
        }

        // Gắn callback nhận dữ liệu cảm biến từ phần cứng
        window.onCloudSensorData = processIncomingSensorData;

        // 6. Kiểm tra phiên đăng nhập đã lưu (Supabase Auth / Local Session)
        await checkAuthSession();

        // 7. Gắn sự kiện giao diện
        bindUIEvents();
        initQuickDashboardChart();
        populateSettingsInputs();

        // 8. Đồng bộ dữ liệu ban đầu
        if (supabaseReady) {
            // Lắng nghe Realtime WebSockets từ Supabase (Chức năng 4)
            window.SupabaseService.subscribeRealtime({
                onSensorData: (data) => processIncomingSensorData(data),
                onDeviceControls: (controls) => onCloudControlChange(controls),
                onAlert: (alert) => addAlertLog(alert.alert_type, alert.severity, alert.message, false)
            });

            // Tải lịch sử đo đạc từ cơ sở dữ liệu Supabase (Chức năng 5)
            const loaded = await window.ChartService.loadFromSupabase(30);
            if (loaded) {
                loadQuickChartHistory(window.ChartService.getHistoryData());
            }

            // Tải trạng thái điều khiển mới nhất từ DB
            const controls = await window.SupabaseService.fetchDeviceControls();
            if (controls) onCloudControlChange(controls);
        }

        // 9. Khởi động bộ mô phỏng dữ liệu (Tự động chuyển sang dữ liệu thật ngay khi nhận được gói tin từ ESP8266)
        if (window.APP_CONFIG.ENABLE_SIMULATOR) {
            startHardwareSimulator();
        }

        updateAllUI();
    });

    /**
     * ====================================================================
     * 1. XỬ LÝ ĐĂNG NHẬP & XÁC THỰC SUPABASE (CHỨC NĂNG 6)
     * ====================================================================
     */
    async function checkAuthSession() {
        const savedSession = localStorage.getItem("biosync_local_session");
        
        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            const session = await window.SupabaseService.getCurrentSession();
            if (session && session.user) {
                setLoggedInUser(session.user);
                return;
            }
        }

        if (savedSession) {
            setLoggedInUser(JSON.parse(savedSession));
        } else {
            AppState.isLoggedIn = false;
            document.getElementById("view-login").classList.remove("hidden");
            document.getElementById("view-main-app").classList.add("hidden");
        }
    }

    function setLoggedInUser(userObj) {
        AppState.isLoggedIn = true;
        AppState.currentUser = userObj;
        
        const email = userObj.email || "admin@biosync.iot";
        const name = userObj.user_metadata?.full_name || "Võ Thúc Trí";

        const nameEl = document.getElementById("sidebar-user-name");
        const emailEl = document.getElementById("sidebar-user-email");
        const popEmailEl = document.getElementById("popup-user-email");

        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (popEmailEl) popEmailEl.textContent = email;

        document.getElementById("view-login").classList.add("hidden");
        document.getElementById("view-main-app").classList.remove("hidden");

        // Khởi tạo và nạp dữ liệu cho biểu đồ sau khi view-main-app đã hiển thị
        setTimeout(async () => {
            initQuickDashboardChart();
            if (window.ChartService) {
                window.ChartService.init();
                if (window.SupabaseService && window.SupabaseService.isConnected()) {
                    const loaded = await window.ChartService.loadFromSupabase(30);
                    if (loaded) {
                        loadQuickChartHistory(window.ChartService.getHistoryData());
                    }
                }
            }
        }, 60);

        switchTab("dashboard");
    }

    window.handleLogin = async function () {
        const emailInput = document.getElementById("login-username")?.value.trim();
        const pwdInput = document.getElementById("login-password")?.value;
        const errorMsg = document.getElementById("login-error-msg");
        const submitBtn = document.getElementById("login-submit-btn");

        if (errorMsg) errorMsg.classList.add("hidden");
        if (submitBtn) submitBtn.textContent = "ĐANG XÁC THỰC...";

        try {
            let authResult = null;
            if (window.SupabaseService && window.SupabaseService.isConnected()) {
                authResult = await window.SupabaseService.signInWithPassword(emailInput, pwdInput);
            }

            if (authResult && authResult.success) {
                localStorage.setItem("biosync_local_session", JSON.stringify(authResult.user));
                setLoggedInUser(authResult.user);
            } else {
                console.log("ℹ️ Đăng nhập tài khoản quản trị cục bộ (Demo Mode)");
                const fallbackUser = { email: emailInput, user_metadata: { full_name: "Võ Thúc Trí" } };
                localStorage.setItem("biosync_local_session", JSON.stringify(fallbackUser));
                setLoggedInUser(fallbackUser);
            }
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = "❌ Lỗi đăng nhập: " + err.message;
                errorMsg.classList.remove("hidden");
            }
        } finally {
            if (submitBtn) submitBtn.textContent = "ĐĂNG NHẬP VÀO HỆ THỐNG";
        }
    };

    window.handleLogout = async function () {
        if (window.SupabaseService) {
            await window.SupabaseService.signOut();
        }
        localStorage.removeItem("biosync_local_session");
        AppState.isLoggedIn = false;
        AppState.currentUser = null;

        document.getElementById("view-login").classList.remove("hidden");
        document.getElementById("view-main-app").classList.add("hidden");
        const popup = document.getElementById("user-popup-menu");
        if (popup) popup.classList.add("hidden");
    };

    /**
     * ====================================================================
     * QUẢN LÝ FORM QUÊN MẬT KHẨU
     * ====================================================================
     */
    window.showForgotPasswordForm = function () {
        const loginSection = document.getElementById("login-card-section");
        const forgotSection = document.getElementById("forgot-password-section");
        const forgotMsg = document.getElementById("forgot-msg");

        if (loginSection) loginSection.classList.add("hidden");
        if (forgotSection) forgotSection.classList.remove("hidden");
        if (forgotMsg) forgotMsg.classList.add("hidden");
    };

    window.showLoginForm = function () {
        const loginSection = document.getElementById("login-card-section");
        const forgotSection = document.getElementById("forgot-password-section");
        const errorMsg = document.getElementById("login-error-msg");

        if (loginSection) loginSection.classList.remove("hidden");
        if (forgotSection) forgotSection.classList.add("hidden");
        if (errorMsg) errorMsg.classList.add("hidden");
    };

    let currentResetPin = null;
    let currentResetEmail = null;
    let pinExpiryTime = 0;

    window.sendResetPinCode = async function () {
        const emailInput = document.getElementById("forgot-email-input")?.value.trim();
        const forgotMsg = document.getElementById("forgot-msg");
        const sendBtn = document.getElementById("forgot-send-pin-btn");
        const step2 = document.getElementById("forgot-step-2");

        if (!emailInput) {
            if (forgotMsg) {
                forgotMsg.textContent = "⚠️ Vui lòng nhập địa chỉ email của bạn!";
                forgotMsg.className = "text-xs py-2.5 px-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                forgotMsg.classList.remove("hidden");
            }
            return;
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> ĐANG TẠO & GỬI MÃ PIN...';
        }

        // Tạo mã PIN 6 số bảo mật ngẫu nhiên
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        currentResetPin = pin;
        currentResetEmail = emailInput;
        pinExpiryTime = Date.now() + 5 * 60 * 1000; // Có hiệu lực 5 phút

        try {
            // Lưu mã PIN lên Supabase
            if (window.SupabaseService && window.SupabaseService.isConnected()) {
                await window.SupabaseService.saveResetPin(emailInput, pin);
            }

            if (window.NotificationService) {
                await window.NotificationService.sendEmailNotification(
                    `🔐 MÃ PIN XÁC THỰC KHÔI PHỤC MẬT KHẨU: [ ${pin} ]`,
                    `Mã PIN tạm thời để đặt lại mật khẩu hệ thống BioSync Smart Terrarium của bạn là: [ ${pin} ]. Mã có hiệu lực trong 5 phút. Vui lòng nhập mã này vào trang web để tạo mật khẩu mới.`,
                    emailInput
                );
            }

            if (forgotMsg) {
                forgotMsg.textContent = `✅ Đã gửi mã PIN 6 số thành công tới "${emailInput}"! Vui lòng kiểm tra hộp thư Gmail (inbox / spam) và nhập mã bên dưới.`;
                forgotMsg.className = "text-xs py-2.5 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold";
                forgotMsg.classList.remove("hidden");
            }

            if (step2) {
                step2.classList.remove("hidden");
            }
        } catch (err) {
            if (forgotMsg) {
                forgotMsg.textContent = "❌ Lỗi khi gửi mã PIN: " + err.message;
                forgotMsg.className = "text-xs py-2.5 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                forgotMsg.classList.remove("hidden");
            }
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<span class="material-symbols-outlined text-sm">send</span> GỬI LẠI MÃ PIN';
            }
        }
    };

    window.verifyPinAndResetPassword = async function () {
        const pinInput = document.getElementById("forgot-pin-input")?.value.trim();
        const newPwd = document.getElementById("forgot-new-pwd")?.value;
        const confirmPwd = document.getElementById("forgot-confirm-pwd")?.value;
        const step2Msg = document.getElementById("forgot-step2-msg");
        const verifyBtn = document.getElementById("forgot-verify-btn");

        if (!pinInput || !newPwd || !confirmPwd) {
            if (step2Msg) {
                step2Msg.textContent = "⚠️ Vui lòng điền đầy đủ mã PIN và mật khẩu mới!";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                step2Msg.classList.remove("hidden");
            }
            return;
        }

        if (Date.now() > pinExpiryTime) {
            if (step2Msg) {
                step2Msg.textContent = "❌ Mã PIN đã hết hạn (sau 5 phút). Vui lòng nhấn 'Gửi lại mã PIN'!";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                step2Msg.classList.remove("hidden");
            }
            return;
        }

        if (pinInput !== currentResetPin) {
            if (step2Msg) {
                step2Msg.textContent = "❌ Mã PIN không chính xác! Vui lòng kiểm tra lại email.";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                step2Msg.classList.remove("hidden");
            }
            return;
        }

        if (newPwd.length < 6) {
            if (step2Msg) {
                step2Msg.textContent = "⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                step2Msg.classList.remove("hidden");
            }
            return;
        }

        if (newPwd !== confirmPwd) {
            if (step2Msg) {
                step2Msg.textContent = "❌ Mật khẩu xác nhận không khớp!";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                step2Msg.classList.remove("hidden");
            }
            return;
        }

        if (verifyBtn) verifyBtn.textContent = "ĐANG CẬP NHẬT MẬT KHẨU...";

        try {
            // Cập nhật mật khẩu băm mới lên cơ sở dữ liệu Supabase (bảng accounts)
            if (window.SupabaseService && window.SupabaseService.isConnected()) {
                await window.SupabaseService.resetPasswordWithPin(currentResetEmail, pinInput, newPwd);
            }

            // Lưu mật khẩu mới vào bộ nhớ
            localStorage.setItem(`biosync_custom_pwd_${currentResetEmail}`, newPwd);
            localStorage.setItem("biosync_admin_pwd", newPwd);

            // Tự động điền mật khẩu mới vào ô Đăng nhập
            const loginPwd = document.getElementById("login-password");
            const loginEmail = document.getElementById("login-username");
            if (loginPwd) loginPwd.value = newPwd;
            if (loginEmail) loginEmail.value = currentResetEmail;

            if (step2Msg) {
                step2Msg.textContent = "🎉 ĐỔI MẬT KHẨU THÀNH CÔNG! Đang chuyển về trang Đăng nhập...";
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
                step2Msg.classList.remove("hidden");
            }

            // Xóa mã PIN sau khi hoàn tất
            currentResetPin = null;

            setTimeout(() => {
                showLoginForm();
                const errorMsg = document.getElementById("login-error-msg");
                if (errorMsg) {
                    errorMsg.textContent = "✅ Đổi mật khẩu thành công! Nhấn 'ĐĂNG NHẬP' để vào hệ thống.";
                    errorMsg.className = "text-xs py-2 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold";
                    errorMsg.classList.remove("hidden");
                }
            }, 1800);

        } catch (err) {
            if (step2Msg) {
                step2Msg.textContent = "❌ Lỗi: " + err.message;
                step2Msg.className = "text-xs py-2.5 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                step2Msg.classList.remove("hidden");
            }
        } finally {
            if (verifyBtn) verifyBtn.textContent = "XÁC NHẬN & ĐỔI MẬT KHẨU";
        }
    };

    /**
     * ====================================================================
     * 2. CHUYỂN ĐỔI 4 KHU VỰC TRANG RIÊNG BIỆT (TAB SWITCHING)
     * ====================================================================
     */
    window.switchTab = function (tabId) {
        AppState.currentTab = tabId;

        // Ẩn tất cả tab
        document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active-tab"));

        // Hiện tab được chọn
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) targetTab.classList.add("active-tab");

        // Cập nhật nút active sidebar
        document.querySelectorAll(".nav-tab-btn").forEach(btn => {
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

        // Nếu chuyển sang Dashboard -> resize và cập nhật biểu đồ
        if (tabId === 'dashboard') {
            setTimeout(() => {
                if (!quickChartInstance) {
                    initQuickDashboardChart();
                } else {
                    quickChartInstance.resize();
                    quickChartInstance.update();
                }
            }, 60);
        }

        // Nếu chuyển sang Analytics -> resize chart và tự động cập nhật dữ liệu mới nhất
        if (tabId === 'analytics' && window.ChartService) {
            setTimeout(async () => {
                window.ChartService.init();
                if (window.SupabaseService && window.SupabaseService.isConnected()) {
                    const loaded = await window.ChartService.loadFromSupabase(30);
                    if (loaded) {
                        loadQuickChartHistory(window.ChartService.getHistoryData());
                    }
                }
            }, 60);
        }

        console.log(`📌 Đã chuyển sang tab: ${tabId.toUpperCase()}`);
    };

    /**
     * ====================================================================
     * 3. THEME & USER MODAL
     * ====================================================================
     */
    window.toggleUserMenu = function () {
        const popup = document.getElementById("user-popup-menu");
        if (popup) popup.classList.toggle("hidden");
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
            if (darkBtn) darkBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold bg-slate-800 text-emerald-400 shadow-sm transition-all";
            if (lightBtn) lightBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold text-slate-400 hover:text-slate-200 transition-all";
            if (headerIcon) headerIcon.textContent = "light_mode";
        } else {
            htmlEl.classList.remove("dark");
            htmlEl.classList.add("light");
            if (lightBtn) lightBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold bg-white text-emerald-700 shadow-sm transition-all";
            if (darkBtn) darkBtn.className = "flex items-center justify-center gap-1 py-1 rounded text-xs font-bold text-slate-400 hover:text-slate-700 transition-all";
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

    window.saveNewPassword = async function () {
        const next = document.getElementById("new-pwd-input")?.value;
        const confirm = document.getElementById("confirm-pwd-input")?.value;
        const msg = document.getElementById("pwd-change-msg");

        if (next !== confirm) {
            if (msg) {
                msg.textContent = "❌ Mật khẩu xác nhận không khớp!";
                msg.className = "text-xs py-2 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
            }
            return;
        }

        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            const res = await window.SupabaseService.updatePassword(next);
            if (!res.success) {
                if (msg) {
                    msg.textContent = "❌ " + res.error;
                    msg.className = "text-xs py-2 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 block";
                }
                return;
            }
        }

        if (msg) {
            msg.textContent = "✅ Đã cập nhật mật khẩu thành công!";
            msg.className = "text-xs py-2 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 block";
        }

        setTimeout(() => window.closeChangePasswordModal(), 1200);
    };

    /**
     * ====================================================================
     * 4. SỰ KIỆN UI & ĐIỀU KHIỂN THIẾT BỊ (ĐÈN L1 & MÁY BƠM M1)
     * ====================================================================
     */
    function bindUIEvents() {
        // Chế độ Auto / Manual
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");
        if (autoBtn && manualBtn) {
            autoBtn.addEventListener("click", () => setSystemMode('auto'));
            manualBtn.addEventListener("click", () => setSystemMode('manual'));
        }

        // Cài đặt ngưỡng
        const soilThreshInput = document.getElementById("soil-threshold-input");
        if (soilThreshInput) {
            soilThreshInput.addEventListener("change", (e) => {
                AppState.soilThreshold = parseFloat(e.target.value) || 35.0;
                notifyControlUpdate();
            });
        }

        const tempThreshInput = document.getElementById("temp-threshold-input");
        if (tempThreshInput) {
            tempThreshInput.addEventListener("change", (e) => {
                AppState.tempMaxThreshold = parseFloat(e.target.value) || 38.0;
                notifyControlUpdate();
            });
        }

        // Xuất CSV (Chức năng 5)
        const exportCsvBtn = document.getElementById("export-csv-btn");
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener("click", () => {
                if (window.ChartService) window.ChartService.exportToCSV();
            });
        }

        // Quick Prompts cho Gemini AI (Chức năng 8)
        document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const promptText = btn.getAttribute("data-prompt");
                const chatModal = document.getElementById("ai-chat-modal");
                if (chatModal) chatModal.classList.remove("hidden");
                if (window.AIChatbot) window.AIChatbot.sendQuickPrompt(promptText);
            });
        });
    }

    /**
     * CHUYỂN ĐỔI NHANH GIỮA AUTO VÀ MANUAL
     */
    window.toggleSystemMode = function () {
        const nextMode = AppState.systemMode === 'auto' ? 'manual' : 'auto';
        setSystemMode(nextMode);
        addAlertLog("MODE_CHANGE", "INFO", `Đã chuyển sang chế độ: ${nextMode.toUpperCase()}`);
    };

    /**
     * BẬT / TẮT ĐÈN LED L1 THỦ CÔNG (ĐỒNG BỘ 100% NHƯ test_mqtt.html)
     */
    window.toggleLamp = function (status) {
        if (status === undefined) status = !AppState.lampStatus;
        if (status) window.turnOnLamp();
        else window.turnOffLamp();
    };

    window.turnOnLamp = function () {
        AppState.systemMode = 'manual';
        setLampStatus(true);
        if (window.MQTTService) {
            window.MQTTService.sendCommand("LED:1");
        }
        addAlertLog("MANUAL_CONTROL", "INFO", `Đã gửi lệnh BẬT Đèn LED Chiếu Sáng L1.`);
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "BẬT", "Thủ công");
        }
    };

    window.turnOffLamp = function () {
        AppState.systemMode = 'manual';
        setLampStatus(false);
        if (window.MQTTService) {
            window.MQTTService.sendCommand("LED:0");
        }
        addAlertLog("MANUAL_CONTROL", "INFO", `Đã gửi lệnh TẮT Đèn LED Chiếu Sáng L1.`);
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "TẮT", "Thủ công");
        }
    };

    /**
     * BẬT / TẮT MÁY BƠM M1 THỦ CÔNG (ĐỒNG BỘ 100% NHƯ test_mqtt.html)
     */
    window.togglePump = function (status) {
        if (status === undefined) status = !AppState.pumpStatus;
        if (status) window.turnOnPump();
        else window.turnOffPump();
    };

    window.turnOnPump = function () {
        AppState.systemMode = 'manual';
        setPumpStatus(true);
        if (window.MQTTService) {
            window.MQTTService.sendCommand("PUMP:1");
        }
        addAlertLog("MANUAL_CONTROL", "INFO", `Đã gửi lệnh BẬT Máy Bơm Nước M1.`);
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "BẬT", "Thủ công");
        }
    };

    window.turnOffPump = function () {
        AppState.systemMode = 'manual';
        setPumpStatus(false);
        if (window.MQTTService) {
            window.MQTTService.sendCommand("PUMP:0");
        }
        addAlertLog("MANUAL_CONTROL", "INFO", `Đã gửi lệnh TẮT Máy Bơm Nước M1.`);
        if (window.NotificationService) {
            window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "TẮT", "Thủ công");
        }
    };

    function setSystemMode(mode) {
        AppState.systemMode = mode;
        const autoBtn = document.getElementById("mode-auto-btn");
        const manualBtn = document.getElementById("mode-manual-btn");
        const tag = document.getElementById("control-mode-tag");

        if (mode === 'auto') {
            if (autoBtn) autoBtn.className = "px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold shadow-sm transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 transition-all";
            if (tag) {
                tag.textContent = "Auto Mode ⚡";
                tag.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity";
            }
            if (window.MQTTService) window.MQTTService.sendCommand("MODE:AUTO");
        } else {
            if (autoBtn) autoBtn.className = "px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 transition-all";
            if (manualBtn) manualBtn.className = "px-3 py-1.5 rounded-md bg-emerald-600 text-white font-bold shadow-sm transition-all";
            if (tag) {
                tag.textContent = "Manual Mode ✋";
                tag.className = "text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity";
            }
            if (window.MQTTService) window.MQTTService.sendCommand("MODE:MANUAL");
        }

        notifyControlUpdate();
    }

    function setPumpStatus(status) {
        AppState.pumpStatus = Boolean(status);
        const pumpBadge = document.getElementById("pump-status-badge");
        const pumpToggle = document.getElementById("pump-toggle-switch");
        const pumpToggleBg = document.getElementById("pump-toggle-bg");
        const pumpIconBox = document.getElementById("pump-icon-box");
        const btnOn = document.getElementById("btn-pump-on");
        const btnOff = document.getElementById("btn-pump-off");

        if (pumpToggle) pumpToggle.checked = AppState.pumpStatus;
        if (pumpToggleBg) {
            if (AppState.pumpStatus) {
                pumpToggleBg.classList.add("bg-emerald-500");
                pumpToggleBg.classList.remove("bg-slate-300");
            } else {
                pumpToggleBg.classList.add("bg-slate-300");
                pumpToggleBg.classList.remove("bg-emerald-500");
            }
        }

        if (pumpIconBox) {
            if (AppState.pumpStatus) {
                pumpIconBox.className = "w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-500 transition-colors shadow-sm animate-pulse";
            } else {
                pumpIconBox.className = "w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors";
            }
        }

        if (btnOn && btnOff) {
            if (AppState.pumpStatus) {
                btnOn.className = "py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
            } else {
                btnOn.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
            }
        }

        if (pumpBadge) {
            if (AppState.pumpStatus) {
                pumpBadge.textContent = "Đang bơm nước 💧";
                pumpBadge.className = "text-[11px] font-bold text-emerald-600 dark:text-emerald-400";
            } else {
                pumpBadge.textContent = "Đang dừng";
                pumpBadge.className = "text-[11px] font-semibold text-slate-500 dark:text-slate-400";
            }
        }

        notifyControlUpdate();
    }

    function setLampStatus(status) {
        AppState.lampStatus = Boolean(status);
        const lampBadge = document.getElementById("lamp-status-badge");
        const lampToggle = document.getElementById("lamp-toggle-switch");
        const lampToggleBg = document.getElementById("lamp-toggle-bg");
        const lampIconBox = document.getElementById("lamp-icon-box");
        const btnOn = document.getElementById("btn-lamp-on");
        const btnOff = document.getElementById("btn-lamp-off");

        if (lampToggle) lampToggle.checked = AppState.lampStatus;
        if (lampToggleBg) {
            if (AppState.lampStatus) {
                lampToggleBg.classList.add("bg-emerald-500");
                lampToggleBg.classList.remove("bg-slate-300");
            } else {
                lampToggleBg.classList.add("bg-slate-300");
                lampToggleBg.classList.remove("bg-emerald-500");
            }
        }

        if (lampIconBox) {
            if (AppState.lampStatus) {
                lampIconBox.className = "w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-500 transition-colors shadow-sm animate-pulse";
            } else {
                lampIconBox.className = "w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 transition-colors";
            }
        }

        if (btnOn && btnOff) {
            if (AppState.lampStatus) {
                btnOn.className = "py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
            } else {
                btnOn.className = "py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center gap-1 transition-all";
                btnOff.className = "py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-md flex items-center justify-center gap-1 transition-all";
            }
        }

        if (lampBadge) {
            if (AppState.lampStatus) {
                lampBadge.textContent = "Đang sáng 💡";
                lampBadge.className = "text-[11px] font-bold text-amber-600 dark:text-amber-400";
            } else {
                lampBadge.textContent = "Đang tắt";
                lampBadge.className = "text-[11px] font-semibold text-slate-500 dark:text-slate-400";
            }
        }

        notifyControlUpdate();
    }

    window.triggerEmergencyStop = function () {
        console.warn("🚨 KÍCH HOẠT DỪNG KHẨN CẤP TOÀN BỘ HỆ THỐNG!");
        setSystemMode('manual');
        setPumpStatus(false);
        setLampStatus(false);

        addAlertLog("EMERGENCY_STOP", "CRITICAL", "🚨 ĐÃ DỪNG KHẨN CẤP TOÀN BỘ THIẾT BỊ (Máy bơm M1 & Đèn LED L1)!");
    };

    function notifyControlUpdate() {
        const payload = {
            system_mode: AppState.systemMode,
            pump_status: AppState.pumpStatus,
            lamp_status: AppState.lampStatus,
            soil_threshold: AppState.soilThreshold,
            temp_max_threshold: AppState.tempMaxThreshold
        };

        // 1. Đẩy lên Supabase
        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            window.SupabaseService.updateDeviceControls(payload);
        }
    }

    /**
     * ====================================================================
     * 5. XỬ LÝ DỮ LIỆU CẢM BIẾN & KÍCH HOẠT CẢNH BÁO
     * ====================================================================
     */
    let lastSensorAlertTime = 0;
    let lastNotificationServiceTime = 0;

    function processIncomingSensorData(data) {
        AppState.currentSensorData = { ...data };
        updateMetricCards(data);

        // 1. Cập nhật màn hình mô phỏng LCD 16x2
        if (window.LCDSimulator) {
            window.LCDSimulator.updateFromSensors(
                data.temperature,
                data.humidity,
                data.soil_moisture,
                data.is_dark
            );
        }

        // 2. Cập nhật biểu đồ Dashboard (nhẹ nhàng, không giật lag)
        appendQuickChartPoint(data);

        const now = Date.now();

        // 3. Tự động cập nhật trạng thái nếu ở chế độ Auto (không phát lại lệnh MQTT để tránh lặp vô tận)
        if (AppState.systemMode === 'auto') {
            if (data.soil_moisture < AppState.soilThreshold && !AppState.pumpStatus) {
                AppState.pumpStatus = true;
                if (window.MQTTService) window.MQTTService.updatePumpUI(true);
                if (window.NotificationService) {
                    window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "BẬT", "Tự động (Đất khô)");
                }
            } else if (data.soil_moisture >= AppState.soilThreshold + 8 && AppState.pumpStatus) {
                AppState.pumpStatus = false;
                if (window.MQTTService) window.MQTTService.updatePumpUI(false);
                if (window.NotificationService) {
                    window.NotificationService.sendDeviceNotification("Máy Bơm Nước M1", "TẮT", "Tự động (Đất đủ ẩm)");
                }
            }

            if (data.is_dark && !AppState.lampStatus) {
                AppState.lampStatus = true;
                if (window.MQTTService) window.MQTTService.updateLampUI(true);
                if (window.NotificationService) {
                    window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "BẬT", "Tự động (Trời tối)");
                }
            } else if (!data.is_dark && AppState.lampStatus) {
                AppState.lampStatus = false;
                if (window.MQTTService) window.MQTTService.updateLampUI(false);
                if (window.NotificationService) {
                    window.NotificationService.sendDeviceNotification("Đèn LED Chiếu Sáng L1", "TẮT", "Tự động (Trời sáng)");
                }
            }
        }

        // 4. Cảnh báo quá nhiệt trên bảng nhật ký Dashboard (Throttle 10 giây/lần)
        if (data.temperature > AppState.tempMaxThreshold && (now - lastSensorAlertTime > 10000)) {
            lastSensorAlertTime = now;
            addAlertLog("HIGH_TEMP", "CRITICAL", `🔥 CẢNH BÁO QUÁ NHIỆT: Nhiệt độ vượt ngưỡng (${data.temperature.toFixed(1)}°C > ${AppState.tempMaxThreshold}°C)!`);
        }

        // 5. Kích hoạt Pushsafer & Email (Chức năng 7 - có cooldown nội bộ độc lập)
        if (window.NotificationService && (now - lastNotificationServiceTime > 15000)) {
            lastNotificationServiceTime = now;
            window.NotificationService.checkAndTriggerAlerts(data, {
                TEMP_MAX: AppState.tempMaxThreshold,
                SOIL_MIN: AppState.soilThreshold
            });
        }
    }

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
            lightStateEl.className = data.is_dark ? "font-bold text-purple-600 dark:text-purple-400" : "font-bold text-amber-600 dark:text-amber-400";
        }
    }

    function addAlertLog(type, severity, message, syncToDb = true) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const alertObj = { time: timeStr, type, severity, message };

        AppState.alerts.unshift(alertObj);
        if (AppState.alerts.length > 50) AppState.alerts.pop();

        renderAlertLogs();

        if (syncToDb && window.SupabaseService && window.SupabaseService.isConnected()) {
            window.SupabaseService.pushAlertLog({
                alert_type: type,
                severity: severity,
                message: message
            });
        }
    }

    function renderAlertLogs() {
        const dashContainer = document.getElementById("alert-log-container");
        const fullContainer = document.getElementById("full-alert-list");
        const badge = document.getElementById("nav-alert-count");

        if (badge) {
            if (AppState.alerts.length > 0) {
                badge.textContent = AppState.alerts.length;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }

        const html = AppState.alerts.map(a => `
            <div class="flex items-start gap-3 p-3 rounded-xl border text-xs ${
                a.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300' :
                a.severity === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' :
                'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            }">
                <span class="material-symbols-outlined text-base mt-0.5">${
                    a.severity === 'CRITICAL' ? 'error' :
                    a.severity === 'WARNING' ? 'warning' : 'info'
                }</span>
                <div class="flex-1">
                    <div class="font-bold mb-0.5">${a.message}</div>
                    <div class="text-[10px] opacity-70">${a.time} • Loại: ${a.type}</div>
                </div>
            </div>
        `).join("");

        if (dashContainer) {
            dashContainer.innerHTML = AppState.alerts.length > 0 ? html.slice(0, 3) : `<div class="p-3 text-xs text-slate-500 text-center">Hệ thống đang hoạt động bình thường.</div>`;
        }

        if (fullContainer) {
            fullContainer.innerHTML = AppState.alerts.length > 0 ? html : `<div class="p-4 text-xs text-slate-500 text-center">Chưa có nhật ký cảnh báo nào.</div>`;
        }
    }

    window.clearAlertHistory = function () {
        AppState.alerts = [];
        renderAlertLogs();
    };

    /**
     * ====================================================================
     * 6. BIỂU ĐỒ QUICK CHART TRÊN DASHBOARD
     * ====================================================================
     */
    function initQuickDashboardChart() {
        const ctx = document.getElementById("quickViewChart");
        if (!ctx) return;

        if (quickChartInstance) {
            quickChartInstance.destroy();
        }

        quickChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Nhiệt độ (°C)',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Độ ẩm đất (%)',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2.5,
                        borderDash: [3, 3],
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
                scales: {
                    x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
                    y: { 
                        ticks: { color: '#9ca3af', font: { size: 10 } }, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        suggestedMin: 10,
                        suggestedMax: 100
                    }
                }
            }
        });

        // Nếu đã có dữ liệu trong bộ nhớ, nạp ngay vào biểu đồ
        if (window.ChartService && window.ChartService.getHistoryData().length > 0) {
            loadQuickChartHistory(window.ChartService.getHistoryData());
        }
    }

    function loadQuickChartHistory(dataList) {
        if (!quickChartInstance || !Array.isArray(dataList) || dataList.length === 0) return;
        const labels = dataList.map(r => new Date(r.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const temps = dataList.map(r => r.temperature);
        const soils = dataList.map(r => r.soil_moisture);

        quickChartInstance.data.labels = labels;
        quickChartInstance.data.datasets[0].data = temps;
        quickChartInstance.data.datasets[1].data = soils;
        quickChartInstance.update();
        console.log(`📈 Đã nạp ${dataList.length} bản ghi vào Quick Chart trên Dashboard.`);
    }

    function appendQuickChartPoint(record) {
        if (!quickChartInstance) return;
        const timeLabel = new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        quickChartInstance.data.labels.push(timeLabel);
        quickChartInstance.data.datasets[0].data.push(record.temperature);
        quickChartInstance.data.datasets[1].data.push(record.soil_moisture);

        if (quickChartInstance.data.labels.length > 20) {
            quickChartInstance.data.labels.shift();
            quickChartInstance.data.datasets[0].data.shift();
            quickChartInstance.data.datasets[1].data.shift();
        }
        quickChartInstance.update('none');
    }

    /**
     * ====================================================================
     * 7. CẤU HÌNH HỆ THỐNG & API KEYS (TAB SETTINGS)
     * ====================================================================
     */
    function populateSettingsInputs() {
        const pushKey = document.getElementById("pushsafer-key-input");
        const alertEmail = document.getElementById("alert-email-input");
        const geminiKey = document.getElementById("gemini-key-input");
        const spUrl = document.getElementById("supabase-url-input");
        const spKey = document.getElementById("supabase-key-input");

        if (pushKey) pushKey.value = "••••••••••••••••••••";
        if (alertEmail) alertEmail.value = window.APP_CONFIG.NOTIFICATION_EMAIL || "";
        if (geminiKey) geminiKey.value = window.APP_CONFIG.GEMINI_API_KEY || "";
        if (spUrl) spUrl.value = window.APP_CONFIG.SUPABASE_URL || "";
        if (spKey) spKey.value = window.APP_CONFIG.SUPABASE_ANON_KEY || "";
    }

    window.promptResetPushsaferKey = function () {
        const newKey = prompt("🔑 Nhập Pushsafer Private Key mới của bạn (từ pushsafer.com):");
        if (newKey !== null && newKey.trim() !== "") {
            const cleanKey = newKey.trim();
            localStorage.setItem("biosync_pushsafer_key", cleanKey);
            window.APP_CONFIG.PUSHSAFER_PRIVATE_KEY = cleanKey;
            const pushKey = document.getElementById("pushsafer-key-input");
            if (pushKey) pushKey.value = "••••••••••••••••••••";
            alert("✅ Đã đặt lại Private Key Pushsafer thành công!");
        }
    };

    window.saveNotificationConfig = function () {
        const email = document.getElementById("alert-email-input")?.value.trim();

        if (email) {
            localStorage.setItem("biosync_alert_email", email);
            window.APP_CONFIG.NOTIFICATION_EMAIL = email;
        }

        alert("✅ Đã lưu cấu hình Pushsafer & Email thành công!");
    };

    window.testPushsaferAlert = async function () {
        const feedbackEl = document.getElementById("test-notification-feedback");
        const btn = document.getElementById("btn-test-pushsafer");

        if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang gửi tin nhắn...';

        if (window.NotificationService) {
            const res = await window.NotificationService.testPushsafer();
            if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-base">send_to_mobile</span> GỬI TEST THÔNG BÁO PUSHSAFER VỀ ĐIỆN THOẠI';

            if (feedbackEl) {
                if (res.success) {
                    feedbackEl.textContent = `📲 Đã gửi thông báo Test Pushsafer thành công về điện thoại lúc ${new Date().toLocaleTimeString()}! Vui lòng kiểm tra thông báo trên app Pushsafer.`;
                    feedbackEl.className = "text-xs py-2 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold";
                    feedbackEl.classList.remove("hidden");
                } else {
                    feedbackEl.textContent = `❌ Gửi Pushsafer thất bại: ${res.error || 'Lỗi mạng'}. Vui lòng kiểm tra lại Private Key.`;
                    feedbackEl.className = "text-xs py-2 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                    feedbackEl.classList.remove("hidden");
                }
            } else {
                if (res.success) {
                    alert("📲 Đã gửi thông báo Test Pushsafer thành công về điện thoại!");
                } else {
                    alert("❌ Gửi Pushsafer thất bại: " + res.error);
                }
            }
        }
    };

    window.testEmailAlert = async function () {
        const feedbackEl = document.getElementById("test-notification-feedback");
        if (feedbackEl) {
            feedbackEl.textContent = "⏳ Đang kết nối máy chủ gửi Email cảnh báo tới vthuctri@gmail.com...";
            feedbackEl.className = "text-xs py-2 px-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
            feedbackEl.classList.remove("hidden");
        }

        if (window.NotificationService) {
            const res = await window.NotificationService.testEmail();
            if (feedbackEl) {
                if (res.success) {
                    feedbackEl.textContent = `📧 Đã gửi Email cảnh báo thành công tới "${res.recipient || 'vthuctri@gmail.com'}"! Lưu ý: Nếu là lần đầu tiên, FormSubmit sẽ gửi 1 email xác nhận kích hoạt (Check cả hộp thư Đến / Spam).`;
                    feedbackEl.className = "text-xs py-2.5 px-3 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold";
                    feedbackEl.classList.remove("hidden");
                } else {
                    feedbackEl.textContent = `❌ Gửi Email thất bại: ${res.error}`;
                    feedbackEl.className = "text-xs py-2 px-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
                    feedbackEl.classList.remove("hidden");
                }
            }
        }
    };

    window.saveGeminiConfig = function () {
        const key = document.getElementById("gemini-key-input")?.value.trim();
        localStorage.setItem("biosync_gemini_key", key);
        window.APP_CONFIG.GEMINI_API_KEY = key;
        alert("✅ Đã lưu Google Gemini API Key thành công!");
    };

    window.saveSupabaseConfig = function () {
        const url = document.getElementById("supabase-url-input")?.value.trim();
        const key = document.getElementById("supabase-key-input")?.value.trim();

        localStorage.setItem("biosync_supabase_url", url);
        localStorage.setItem("biosync_supabase_key", key);
        window.APP_CONFIG.SUPABASE_URL = url;
        window.APP_CONFIG.SUPABASE_ANON_KEY = key;

        if (window.SupabaseService) {
            window.SupabaseService.init();
        }
        alert("✅ Đã lưu cấu hình Supabase! Đang làm mới kết nối...");
    };

    /**
     * ====================================================================
     * 8. BỘ GIẢ LẬP PHẦN CỨNG (SIMULATOR MODE)
     * ====================================================================
     */
    function startHardwareSimulator() {
        let temp = 27.5, hum = 62.0, soil = 42.0, light = 480.0;

        simulatorInterval = setInterval(() => {
            temp += (Math.random() - 0.48) * 0.3;
            hum += (Math.random() - 0.5) * 0.6;
            
            // Nếu Bơm đang bật -> độ ẩm đất tăng nhanh
            if (AppState.pumpStatus) {
                soil += 3.0;
                if (soil > 90) soil = 90;
            } else {
                // Bơm tắt -> đất khô dần từ từ
                soil -= 0.2;
                if (soil < 15) soil = 15;
            }

            // Nếu Đèn LED đang bật -> ánh sáng cao
            if (AppState.lampStatus) {
                light = 850.0 + (Math.random() - 0.5) * 20;
            } else {
                light = 350.0 + (Math.random() - 0.5) * 30;
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
        }, window.APP_CONFIG.SIMULATOR_INTERVAL_MS || 3000);
    }

    function stopHardwareSimulator() {
        if (simulatorInterval) {
            clearInterval(simulatorInterval);
            simulatorInterval = null;
            console.log("🛑 Đã dừng bộ giả lập (chuyển sang nhận dữ liệu từ mạch thật)");
        }
    }

    window.startHardwareSimulator = startHardwareSimulator;
    window.stopHardwareSimulator = stopHardwareSimulator;
    window.updateAllUI = updateAllUI;

    function loadMockHistory() {
        const count = window.APP_CONFIG.MOCK_HISTORY_COUNT || 25;
        const mockList = [];
        let baseTime = Date.now() - count * 60000;
        let t = 26.5, h = 60.0, s = 45.0;

        for (let i = 0; i < count; i++) {
            t += (Math.random() - 0.48) * 0.4;
            h += (Math.random() - 0.5) * 0.8;
            s += (Math.random() - 0.5) * 0.6;

            mockList.push({
                created_at: new Date(baseTime + i * 60000).toISOString(),
                temperature: parseFloat(t.toFixed(1)),
                humidity: parseFloat(h.toFixed(1)),
                soil_moisture: parseFloat(s.toFixed(1)),
                light_level: 450.0,
                is_dark: false
            });
        }

        if (window.ChartService) {
            window.ChartService.loadDataSet(mockList);
        }
    }

    function onCloudControlChange(controls) {
        if (!controls) return;
        // Nếu người dùng đang điều khiển thủ công trên Web thì không để Realtime cũ đè lên
        if (AppState.systemMode === 'manual') return;

        if (controls.system_mode && controls.system_mode !== AppState.systemMode) {
            AppState.systemMode = controls.system_mode;
            const tag = document.getElementById("control-mode-tag");
            if (tag) {
                tag.textContent = controls.system_mode === 'auto' ? "Auto Mode ⚡" : "Manual Mode ✋";
                tag.className = controls.system_mode === 'auto' 
                    ? "text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                    : "text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold cursor-pointer hover:opacity-80 transition-opacity";
            }
        }
        if (controls.pump_status !== undefined && controls.pump_status !== AppState.pumpStatus) {
            AppState.pumpStatus = Boolean(controls.pump_status);
            if (window.MQTTService) window.MQTTService.updatePumpUI(AppState.pumpStatus);
        }
        if (controls.lamp_status !== undefined && controls.lamp_status !== AppState.lampStatus) {
            AppState.lampStatus = Boolean(controls.lamp_status);
            if (window.MQTTService) window.MQTTService.updateLampUI(AppState.lampStatus);
        }
    }

    function updateAllUI() {
        setSystemMode(AppState.systemMode);
        setPumpStatus(AppState.pumpStatus);
        setLampStatus(AppState.lampStatus);
    }

})(window);
