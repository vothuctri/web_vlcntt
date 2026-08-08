/**
 * Smart Terrarium IoT Dashboard - AI Chatbot & Predictive Analytics Engine
 * Chức năng 8: Phân tích, dự đoán dựa trên dữ liệu lịch sử & Tư vấn thông minh
 */

(function (window) {
    let chatMessagesContainer = null;
    let chatInput = null;

    /**
     * Khởi tạo giao diện Chatbot
     */
    function initChatbot() {
        chatMessagesContainer = document.getElementById("chat-messages");
        chatInput = document.getElementById("chat-input-field");

        const sendBtn = document.getElementById("chat-send-btn");
        if (sendBtn) {
            sendBtn.addEventListener("click", handleUserSend);
        }

        if (chatInput) {
            chatInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleUserSend();
            });
        }
    }

    /**
     * Xử lý khi người dùng gửi tin nhắn
     */
    function handleUserSend() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // Hiển thị tin nhắn người dùng
        appendMessage("user", text);
        chatInput.value = "";

        // Trả lời từ AI Chatbot
        setTimeout(() => {
            const aiResponse = generateAIResponse(text);
            appendMessage("bot", aiResponse);
        }, 600);
    }

    /**
     * Gửi gợi ý nhanh từ các nút bấm (Quick prompt)
     */
    function sendQuickPrompt(promptText) {
        if (chatInput) {
            chatInput.value = promptText;
            handleUserSend();
        }
    }

    /**
     * Thêm tin nhắn vào khung Chat
     */
    function appendMessage(sender, text) {
        if (!chatMessagesContainer) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-bubble ${sender === "user" ? "chat-user" : "chat-bot"}`;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="chat-sender-name">${sender === "user" ? "Bạn" : "Terrarium AI Assistant 🤖"}</div>
            <div class="chat-text">${text}</div>
            <div class="chat-timestamp">${timeStr}</div>
        `;

        chatMessagesContainer.appendChild(msgDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    /**
     * Động cơ suy luận AI giả lập dựa trên dữ liệu cảm biến thực tế
     */
    function generateAIResponse(userText) {
        const text = userText.toLowerCase();

        // Lấy dữ liệu cảm biến mới nhất từ App State
        const currentData = window.AppState ? window.AppState.currentSensorData : { temperature: 28.5, humidity: 65, soil_moisture: 45, light_level: 450, is_dark: false };
        const historyData = window.ChartService ? window.ChartService.getHistoryData() : [];

        // 1. Phân tích sức khỏe Terrarium
        if (text.includes("sức khỏe") || text.includes("tình trạng") || text.includes("dự đoán")) {
            let status = "tối ưu";
            let advice = [];

            if (currentData.temperature > 32) {
                advice.push("⚠️ Nhiệt độ khá cao (trên 32°C), nguy cơ làm héo lá non. Nên kích hoạt quạt thông gió hoặc bật quạt làm mát.");
                status = "cảnh báo quá nhiệt";
            } else if (currentData.temperature < 18) {
                advice.push("🥶 Nhiệt độ thấp (dưới 18°C). Bật Bóng đèn sưởi L1 (Relay K2) để giữ ấm hệ sinh thái.");
            }

            if (currentData.soil_moisture < 35) {
                advice.push("🌱 Độ ẩm đất đang khô (< 35%). Động cơ bơm nước M1 nên được kích hoạt.");
                status = "cần bổ sung nước";
            }

            if (advice.length === 0) {
                advice.push("✅ Tất cả các thông số Nhiệt độ, Độ ẩm không khí & Đất đang duy trì ở mức cân bằng lý tưởng cho hệ sinh thái Terrarium.");
            }

            return `📊 **Phân tích Thời gian thực:**\n` +
                `• Nhiệt độ: **${currentData.temperature.toFixed(1)}°C**\n` +
                `• Độ ẩm khí: **${currentData.humidity.toFixed(0)}%**\n` +
                `• Độ ẩm đất: **${currentData.soil_moisture.toFixed(0)}%**\n\n` +
                `💡 **Đánh giá & Dự báo AI:** Trạng thái hệ sinh thái đang ở mức **${status.toUpperCase()}**.\n` + advice.join("\n");
        }

        // 2. Dự báo xu hướng nhiệt độ / độ ẩm
        if (text.includes("xu hướng") || text.includes("tương lai") || text.includes("24h")) {
            if (historyData.length > 5) {
                const firstTemp = historyData[0].temperature;
                const lastTemp = historyData[historyData.length - 1].temperature;
                const diff = (lastTemp - firstTemp).toFixed(1);
                const trendStr = diff > 0 ? `tăng nhẹ +${diff}°C` : diff < 0 ? `giảm nhẹ ${diff}°C` : `ổn định`;

                return `📈 **Dự báo Xu hướng (Trend Analysis):**\n` +
                    `Dựa trên ${historyData.length} bản ghi gần nhất, nhiệt độ có xu hướng **${trendStr}**.\n` +
                    `Tần suất tưới khuyến nghị: 1 - 2 lần / ngày. Máy bơm M1 đang ở chế độ tự động sẵn sàng kích hoạt khi đất khô.`;
            }
            return `📈 **Dự báo:** Hệ thống đang thu thập thêm dữ liệu chuỗi thời gian. Xu hướng nhiệt độ dự kiến tiếp tục duy trì mức trung bình 26°C - 30°C trong 24 giờ tới.`;
        }

        // 3. Tư vấn tưới cây / Chăm sóc
        if (text.includes("tưới") || text.includes("bơm") || text.includes("khi nào")) {
            return `💧 **Tư vấn Tưới nước:**\n` +
                `Cảm biến độ ẩm đất hiện tại báo: **${currentData.soil_moisture}%**.\n` +
                `Ngưỡng tự động bật máy bơm M1 là **35%**. Bạn có thể điều chỉnh ngưỡng này trong phần Cấu hình Hệ thống hoặc nhấn nút "Bật bơm" trên bảng điều khiển.`;
        }

        // 4. Mặc định
        return `🤖 Xin chào! Tôi là Trợ lý AI Terrarium.\n` +
            `Tôi đang giám sát các linh kiện: DHT11 (Nhiệt/Ẩm), Cảm biến đất (Bơm M1), Quang trở LDR (Đèn L1) và LED RGB D2.\n` +
            `Bạn có thể hỏi tôi: "Phân tích sức khỏe Terrarium", "Dự báo xu hướng 24h", hoặc "Khi nào cần tưới nước?".`;
    }

    // Export module ra window.AIChatbot
    window.AIChatbot = {
        init: initChatbot,
        sendQuickPrompt: sendQuickPrompt
    };

})(window);
