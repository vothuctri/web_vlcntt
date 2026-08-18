/**
 * Smart Terrarium IoT Dashboard - Notification Service Module
 * Đáp ứng Chức năng 7: Dịch vụ gửi Email & Thông báo nhanh qua điện thoại (Pushsafer)
 */

(function (window) {
    let lastPushsaferSentTime = 0;
    let lastEmailSentTime = 0;

    /**
     * 1. GỬI THÔNG BÁO NHANH QUA ĐIỆN THOẠI (PUSHSAFER REST API)
     * @param {string} title - Tiêu đề thông báo
     * @param {string} message - Nội dung thông báo
     * @param {object} options - Cấu hình icon, âm thanh, độ ưu tiên
     */
    async function sendPushsaferNotification(title, message, options = {}) {
        const config = window.APP_CONFIG;
        const privateKey = config.PUSHSAFER_PRIVATE_KEY || localStorage.getItem("biosync_pushsafer_key");

        if (!privateKey || privateKey.trim() === "") {
            console.warn("⚠️ Chưa cấu hình PUSHSAFER_PRIVATE_KEY trong Cài đặt.");
            return { success: false, error: "Chưa cấu hình Private Key Pushsafer" };
        }

        // Kiểm tra thời gian chờ chống spam (Cooldown) trừ khi là lệnh gửi Test
        const now = Date.now();
        if (!options.isTest && (now - lastPushsaferSentTime < (config.ALERT_COOLDOWN_MS || 60000))) {
            console.log("⏳ Bỏ qua gửi Pushsafer do đang trong thời gian giãn cách (Cooldown).");
            return { success: false, error: "Cooldown active" };
        }

        try {
            console.log(`📲 [Pushsafer] Đang gửi thông báo đẩy tới điện thoại: "${title}"...`);

            // Chuẩn bị tham số cho Pushsafer API
            const params = new URLSearchParams({
                k: privateKey.trim(),
                t: title || "Smart Terrarium Alert",
                m: message || "Thông báo từ hệ thống Terrarium",
                s: options.sound !== undefined ? options.sound : "1",      // Âm thanh
                v: options.vibrate !== undefined ? options.vibrate : "3",  // Kiểu rung
                i: options.icon !== undefined ? options.icon : "82",       // Icon cảm biến / nhiệt độ
                pr: options.priority !== undefined ? options.priority : "2" // Độ ưu tiên cao nhất
            });

            const response = await fetch("https://www.pushsafer.com/api", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params.toString()
            });

            const result = await response.json();

            if (result.status === 1) {
                lastPushsaferSentTime = now;
                console.log("✅ Đã gửi thông báo Pushsafer thành công tới điện thoại:", result);
                return { success: true, result };
            } else {
                console.warn("❌ Lỗi từ Pushsafer API:", result.error);
                return { success: false, error: result.error || "Gửi Pushsafer thất bại" };
            }
        } catch (err) {
            console.error("❌ Lỗi kết nối mạng tới Pushsafer:", err);
            return { success: false, error: err.message };
        }
    }

    /**
     * 2. DỊCH VỤ GỬI EMAIL CẢNH BÁO THỰC TẾ TỚI GMAIL (FORMSUBMIT API)
     * @param {string} subject - Chủ đề Email
     * @param {string} body - Nội dung Email
     * @param {string} recipient - Địa chỉ Email nhận
     */
    async function sendEmailNotification(subject, body, recipient) {
        const config = window.APP_CONFIG;
        const targetEmail = recipient || config.NOTIFICATION_EMAIL || localStorage.getItem("biosync_alert_email") || "vthuctri@gmail.com";

        const now = Date.now();
        if (now - lastEmailSentTime < 10000) { // Giảm thời gian chờ xuống 10 giây
            console.log("⏳ Bỏ qua gửi Email do đang trong thời gian giãn cách.");
            return { success: false, error: "Email Cooldown (vui lòng đợi vài giây)" };
        }

        try {
            console.log(`📧 [Email Alert] Đang gửi Email thực tế tới: ${targetEmail}...`);

            // Gửi email thật qua cổng FormSubmit REST API
            const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    _subject: `🌱 [Smart Terrarium Nhóm 05] ${subject || 'CẢNH BÁO HỆ THỐNG'}`,
                    "Tiêu Đề Cảnh Báo": subject,
                    "Nội Dung Chi Tiết": body,
                    "Hệ Thống Giám Sát": "BioSync Smart Terrarium - Lớp 24C03 (Nhóm 05)",
                    "Thời Gian Ghi Nhận": new Date().toLocaleString("vi-VN"),
                    _template: "table"
                })
            });

            const resData = await response.json();

            // Ghi nhật ký vào database Supabase Alert Logs
            if (window.SupabaseService && window.SupabaseService.isConnected()) {
                await window.SupabaseService.pushAlertLog({
                    alert_type: "EMAIL_NOTIFICATION",
                    severity: "WARNING",
                    message: `[Email to: ${targetEmail}] ${subject}: ${body}`
                });
            }

            lastEmailSentTime = now;
            console.log(`✅ [Email Alert] Đã gửi Email cảnh báo thành công tới ${targetEmail}:`, resData);
            return { success: true, recipient: targetEmail, data: resData };
        } catch (err) {
            console.error("❌ Lỗi gửi Email thực tế:", err);
            return { success: false, error: err.message };
        }
    }

    /**
     * 3. GỬI THÔNG BÁO TỰ ĐỘNG KHI BẬT / TẮT THIẾT BỊ (MÁY BƠM M1 & ĐÈN LED L1)
     * @param {string} deviceName - Tên thiết bị (Máy Bơm Nước M1 / Đèn LED Chiếu Sáng L1)
     * @param {string} action - Hành động (BẬT / TẮT)
     * @param {string} triggerMode - Chế độ kích hoạt (Thủ công / Tự động)
     */
    async function sendDeviceNotification(deviceName, action, triggerMode = "Thủ công") {
        const isPump = deviceName.toLowerCase().includes("bơm");
        const isOn = action.toUpperCase() === "BẬT";
        const iconCode = isPump ? (isOn ? "5" : "5") : (isOn ? "82" : "82");
        const iconEmoji = isPump ? (isOn ? "💧" : "🛑") : (isOn ? "💡" : "🌑");
        const timeStr = new Date().toLocaleTimeString("vi-VN");

        const title = `${iconEmoji} ${deviceName.toUpperCase()}: ĐÃ ${action.toUpperCase()} (${triggerMode})`;
        const message = `[Smart Terrarium] ${deviceName} vừa được ${action.toUpperCase()} vào lúc ${timeStr} (Chế độ: ${triggerMode}).`;

        console.log(`📢 [Device Notification] ${title}`);

        // 1. Gửi thông báo Pushsafer về điện thoại
        await sendPushsaferNotification(title, message, {
            isTest: true, // Bỏ qua cooldown để thông báo ngay lập tức
            icon: iconCode,
            priority: 1
        });

        // 2. Gửi Email cảnh báo / nhật ký về hòm thư
        await sendEmailNotification(title, message);
    }

    /**
     * 4. TỰ ĐỘNG XỬ LÝ & BẮN CẢNH BÁO KHI CẢM BIẾN VƯỢT NGƯỠNG
     */
    async function checkAndTriggerAlerts(sensorData, thresholds) {
        const temp = sensorData.temperature;
        const soil = sensorData.soil_moisture;

        // Quá nhiệt khẩn cấp
        if (temp > thresholds.TEMP_MAX) {
            const title = "🔥 CẢNH BÁO: QUÁ NHIỆT TERRARIUM!";
            const msg = `Nhiệt độ hiện tại đạt ${temp.toFixed(1)}°C (vượt ngưỡng cho phép ${thresholds.TEMP_MAX}°C). Vui lòng kiểm tra hệ sinh thái ngay lập tức!`;
            
            await sendPushsaferNotification(title, msg, { icon: 82, priority: 2 });
            await sendEmailNotification(title, msg);
        }

        // Đất khô cạn nước
        if (soil < thresholds.SOIL_MIN) {
            const title = "💧 CẢNH BÁO: ĐỘ ẨM ĐẤT QUÁ THẤP!";
            const msg = `Độ ẩm đất hiện chỉ còn ${soil.toFixed(0)}% (dưới ngưỡng tối thiểu ${thresholds.SOIL_MIN}%). Hệ thống đang kích hoạt máy bơm M1.`;
            
            await sendPushsaferNotification(title, msg, { icon: 5, priority: 1 });
        }
    }

    // Export module ra window.NotificationService
    window.NotificationService = {
        sendPushsaferNotification: sendPushsaferNotification,
        sendEmailNotification: sendEmailNotification,
        sendDeviceNotification: sendDeviceNotification,
        checkAndTriggerAlerts: checkAndTriggerAlerts,
        testPushsafer: async () => {
            return await sendPushsaferNotification(
                "🌿 Smart Terrarium Test",
                `Thông báo thử nghiệm kết nối thành công từ BioSync Dashboard vào lúc ${new Date().toLocaleTimeString()}!`,
                { isTest: true, icon: 82, priority: 1 }
            );
        },
        testEmail: async () => {
            return await sendEmailNotification(
                "🌿 Smart Terrarium Test Email",
                `Kiểm thử kết nối dịch vụ Email cảnh báo lúc ${new Date().toLocaleTimeString()}`
            );
        }
    };

})(window);
