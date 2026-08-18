/**
 * Smart Terrarium IoT Dashboard - Gemini AI Chatbot & Environmental Advisory
 * Đáp ứng Chức năng 8: Dịch vụ Chatbot (Google Gemini AI)
 */

(function (window) {
    let chatMessagesContainer = null;
    let chatInput = null;
    let isWaitingResponse = false;

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
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleUserSend();
                }
            });
        }
    }

    /**
     * Xử lý khi người dùng gửi tin nhắn
     */
    async function handleUserSend() {
        if (!chatInput || isWaitingResponse) return;
        const text = chatInput.value.trim();
        if (!text) return;

        // 1. Hiển thị tin nhắn của người dùng
        appendMessage("user", text);
        chatInput.value = "";
        isWaitingResponse = true;

        // 2. Hiển thị tin nhắn tạm "Đang suy nghĩ..."
        const loadingId = appendLoadingMessage();

        try {
            // 3. Gọi Trợ lý Gemini AI
            const aiResponse = await requestGeminiAI(text);
            removeLoadingMessage(loadingId);
            appendMessage("bot", aiResponse);
        } catch (err) {
            console.error("Lỗi khi xử lý Chatbot:", err);
            removeLoadingMessage(loadingId);
            // Fallback sang động cơ suy luận cục bộ nếu lỗi mạng
            const fallbackRes = generateLocalAIResponse(text);
            appendMessage("bot", fallbackRes);
        } finally {
            isWaitingResponse = false;
        }
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
     * GỌI GOOGLE GEMINI 1.5 FLASH REST API
     */
    async function requestGeminiAI(userPrompt) {
        const config = window.APP_CONFIG;
        const apiKey = config.GEMINI_API_KEY || localStorage.getItem("biosync_gemini_key");

        // Nếu chưa cấu hình API Key -> dùng ngay Động cơ phân tích cục bộ
        if (!apiKey || apiKey.trim() === "") {
            console.log("ℹ️ Chưa có Gemini API Key, sử dụng Động cơ phân tích Terrarium cục bộ.");
            // Giả lập độ trễ 500ms tạo cảm giác tự nhiên
            await new Promise(r => setTimeout(r, 600));
            return generateLocalAIResponse(userPrompt);
        }

        // 1. Thu thập dữ liệu cảm biến thời gian thực làm ngữ cảnh cho Gemini
        const currentData = window.AppState ? window.AppState.currentSensorData : null;
        const hasData = currentData && currentData.temperature !== null && currentData.temperature !== undefined;
        const pumpState = window.AppState ? (window.AppState.pumpStatus ? "Đang BẬT" : "Đang TẮT") : "TẮT";
        const ledState = window.AppState ? (window.AppState.lampStatus ? "Đang BẬT" : "Đang TẮT") : "TẮT";
        const sysMode = window.AppState ? window.AppState.systemMode : "auto";

        const sensorContext = hasData
            ? `- Nhiệt độ không khí: ${parseFloat(currentData.temperature).toFixed(1)}°C (Ngưỡng an toàn: < 38°C)\n` +
              `- Độ ẩm không khí: ${parseFloat(currentData.humidity).toFixed(0)}% (Mức chuẩn: 50% - 80%)\n` +
              `- Độ ẩm đất: ${parseFloat(currentData.soil_moisture).toFixed(0)}% (Ngưỡng tự động bơm: < 35%)\n` +
              `- Cường độ ánh sáng: ${currentData.light_level ? parseFloat(currentData.light_level).toFixed(0) : 400} Lux (${currentData.is_dark ? "Trời tối" : "Trời sáng"})\n`
            : `Hệ thống đang ở trạng thái CHỜ KẾT NỐI MẠCH ESP8266 (chưa có gói tin cảm biến thực tế đo được).\n`;

        const systemContext = `Bạn là Trợ lý AI chuyên gia sinh học & kỹ thuật IoT quản lý Hệ sinh thái thu nhỏ thông minh (Smart Terrarium BioSync).
Dữ liệu cảm biến thời gian thực của Terrarium hiện tại:
${sensorContext}
- Trạng thái máy bơm M1: ${pumpState}
- Trạng thái Đèn LED: ${ledState}
- Chế độ vận hành: ${sysMode.toUpperCase()}

Nhiệm vụ: Trả lời câu hỏi của người dùng bằng tiếng Việt, ngắn gọn, súc tích, đưa ra phân tích chính xác dựa trên các số liệu cảm biến trên, và đưa ra lời khuyên chăm sóc thực tế. Nếu chưa có dữ liệu cảm biến (đang chờ ESP8266), hãy thông báo rõ ràng cho người dùng.`;

        const model = config.GEMINI_MODEL || "gemini-2.0-flash";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `${systemContext}\n\nCâu hỏi của người dùng: ${userPrompt}` }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        };

        // Danh sách các model Flash tiên tiến được hỗ trợ
        const modelList = [config.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

        for (const m of modelList) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey.trim()}`;
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    const cand = data.candidates?.[0];
                    const parts = cand?.content?.parts || [];
                    // Lọc bỏ phần suy nghĩ ngầm (thought) chỉ lấy nội dung văn bản trả lời cho người dùng
                    const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
                    if (text && text.length > 0) {
                        return text;
                    }
                } else {
                    console.warn(`Model ${m} trả về mã:`, response.status);
                }
            } catch (e) {
                console.warn(`Lỗi khi gọi model ${m}:`, e.message);
            }
        }

        return generateLocalAIResponse(userPrompt);
    }

    /**
     * ĐỘNG CƠ SUY LUẬN AI PHÂN TÍCH TERRARIUM CỤC BỘ (FALLBACK ENGINE)
     */
    function generateLocalAIResponse(userText) {
        const text = userText.toLowerCase();
        const currentData = window.AppState ? window.AppState.currentSensorData : null;
        const historyData = window.ChartService ? window.ChartService.getHistoryData() : [];

        // Kiểm tra xem đã nhận được dữ liệu cảm biến thực tế từ ESP8266 chưa
        const hasData = currentData && currentData.temperature !== null && currentData.temperature !== undefined;

        if (!hasData) {
            return `🤖 **Thông Báo Trạng Thái:**\n\n` +
                `Hiện tại hệ thống đang ở trạng thái **Chờ kết nối mạch ESP8266** (chưa nhận được gói tin cảm biến thực tế từ DHT11 / SMS-V1 / LDR).\n\n` +
                `👉 **Hướng dẫn:** Vui lòng cấp nguồn cho ESP8266 và Arduino Uno. Ngay khi mạch gửi số liệu thời gian thực lên MQTT, tôi sẽ lập tức phân tích số liệu chính xác cho bạn!`;
        }

        const temp = parseFloat(currentData.temperature);
        const hum = parseFloat(currentData.humidity);
        const soil = parseFloat(currentData.soil_moisture);
        const light = parseFloat(currentData.light_level || 0);

        // 1. Hỏi về độ ẩm đất / nước / tưới
        if (text.includes("đất") || text.includes("ẩm đất") || text.includes("tưới") || text.includes("bơm") || text.includes("nước")) {
            const isDry = soil < 35;
            return `🌱 **Thông Tin Độ Ẩm Đất:**\n` +
                `• Độ ẩm đất hiện tại đo được: **${soil.toFixed(0)}%**\n` +
                `• Ngưỡng kích hoạt máy bơm tự động: **35%**\n` +
                `• **Đánh giá:** ${isDry ? "Đất đang bị khô cằn, máy bơm M1 đã sẵn sàng được bật để cấp nước." : "Đất hiện đang đủ ẩm, rất lý tưởng cho bộ rễ phát triển, chưa cần tưới thêm!"}`;
        }

        // 2. Hỏi về nhiệt độ / quá nhiệt / nóng / lạnh
        if (text.includes("nhiệt độ") || text.includes("nóng") || text.includes("lạnh") || text.includes("nhiệt")) {
            let evalStr = "ở mức lý tưởng (22°C - 30°C)";
            if (temp > 38) evalStr = "⚠️ QUÁ NHIỆT NGUY HIỂM! Cần tản nhiệt ngay.";
            else if (temp > 32) evalStr = "hơi cao, nên thông gió.";
            else if (temp < 18) evalStr = "hơi thấp, nên bật đèn để sưởi ấm.";

            return `🌡️ **Thông Tin Nhiệt Độ Không Khí (DHT11):**\n` +
                `• Nhiệt độ đo được: **${temp.toFixed(1)}°C**\n` +
                `• Ngưỡng cảnh báo tối đa: **38.0°C**\n` +
                `• **Đánh giá:** Nhiệt độ hiện tại ${evalStr}`;
        }

        // 3. Hỏi về độ ẩm không khí
        if (text.includes("ẩm không khí") || text.includes("ẩm khí") || text.includes("độ ẩm")) {
            return `💧 **Độ Ẩm Không Khí (DHT11):**\n` +
                `• Độ ẩm không khí hiện tại: **${hum.toFixed(0)}%**\n` +
                `• Dải độ ẩm tối ưu cho Terrarium: **50% - 80%**\n` +
                `• **Đánh giá:** ${hum >= 50 && hum <= 80 ? "Độ ẩm không khí đang ở mức rất lý tưởng cho sự thoát hơi nước của lá cây." : "Cần lưu ý thông gió hoặc phun sương bổ sung."}`;
        }

        // 4. Hỏi về ánh sáng / đèn / quang hợp
        if (text.includes("ánh sáng") || text.includes("sáng") || text.includes("tối") || text.includes("đèn") || text.includes("lux")) {
            return `☀️ **Cường Độ Ánh Sáng (LDR):**\n` +
                `• Cường độ sáng đo được: **${light.toFixed(0)} Lux** (${currentData.is_dark ? "Trời tối 🌙" : "Trời sáng ☀️"})\n` +
                `• Trạng thái Đèn LED L1: **${window.AppState && window.AppState.lampStatus ? "Đang BẬT" : "Đang TẮT"}**\n` +
                `• **Lời khuyên:** ${currentData.is_dark ? "Trời đang tối, bạn có thể bật Đèn LED L1 để hỗ trợ cây quang hợp." : "Cường độ ánh sáng tự nhiên đang đầy đủ cho cây."}`;
        }

        // 5. Phân tích sức khỏe Terrarium tổng thể
        if (text.includes("sức khỏe") || text.includes("tình trạng") || text.includes("phân tích") || text.includes("tổng quan")) {
            let status = "Tối ưu";
            let adviceList = [];

            if (temp > 32) {
                adviceList.push(`⚠️ **Nhiệt độ cao (${temp.toFixed(1)}°C):** Có nguy cơ làm héo lá non. Khuyến nghị bật quạt thông gió tản nhiệt.`);
                status = "Cảnh báo quá nhiệt";
            } else if (temp < 18) {
                adviceList.push(`🥶 **Nhiệt độ thấp (${temp.toFixed(1)}°C):** Khuyến nghị bật Đèn LED để giữ ấm hệ sinh thái.`);
                status = "Nhiệt độ thấp";
            }

            if (soil < 35) {
                adviceList.push(`🌱 **Đất khô (${soil.toFixed(0)}% < 35%):** Cần bổ sung nước. Máy bơm M1 đã sẵn sàng được kích hoạt.`);
                status = "Cần bổ sung nước";
            }

            if (adviceList.length === 0) {
                adviceList.push("✅ Tất cả các thông số Nhiệt độ, Độ ẩm không khí & Đất đang duy trì ở mức cân bằng lý tưởng cho cây trồng.");
            }

            return `📊 **Phân Tích Sức Khỏe Terrarium (Thời gian thực):**\n` +
                `• Nhiệt độ: **${temp.toFixed(1)}°C**\n` +
                `• Độ ẩm khí: **${hum.toFixed(0)}%**\n` +
                `• Độ ẩm đất: **${soil.toFixed(0)}%**\n` +
                `• Ánh sáng: **${light.toFixed(0)} Lux** (${currentData.is_dark ? "Trời tối" : "Trời sáng"})\n\n` +
                `💡 **Đánh giá:** Trạng thái hệ sinh thái: **${status.toUpperCase()}**\n` +
                adviceList.join("\n");
        }

        // 6. Dự báo xu hướng chuỗi thời gian 24h
        if (text.includes("xu hướng") || text.includes("dự báo") || text.includes("24h") || text.includes("tương lai")) {
            if (historyData.length > 5) {
                const firstTemp = historyData[0].temperature;
                const lastTemp = historyData[historyData.length - 1].temperature;
                const diff = (lastTemp - firstTemp).toFixed(1);
                const trendStr = diff > 0 ? `tăng nhẹ +${diff}°C` : diff < 0 ? `giảm nhẹ ${diff}°C` : `ổn định`;

                return `📈 **Dự Báo Xu Hướng 24h (Trend Analysis):**\n` +
                    `• Dựa trên ${historyData.length} bản ghi gần nhất, nhiệt độ có xu hướng **${trendStr}**.\n` +
                    `• Độ ẩm đất dự kiến sẽ tiêu hao khoảng 3 - 5% sau 6 giờ.\n` +
                    `• Khuyến nghị: Duy trì chế độ Auto để hệ thống tự động bù ẩm khi đất khô.`;
            }
            return `📈 **Dự Báo:** Nhiệt độ hiện tại đang ở mức **${temp.toFixed(1)}°C**. Dự kiến tiếp tục dao động ổn định trong 24 giờ tới.`;
        }

        // 7. Câu hỏi thông thường
        return `🌿 **Dữ liệu hiện tại của hệ sinh thái Terrarium:**\n` +
            `• Nhiệt độ: **${temp.toFixed(1)}°C**\n` +
            `• Độ ẩm không khí: **${hum.toFixed(0)}%**\n` +
            `• Độ ẩm đất: **${soil.toFixed(0)}%**\n` +
            `• Cường độ sáng: **${light.toFixed(0)} Lux**\n\n` +
            `Bạn có thể hỏi tôi chi tiết về việc tưới nước, bật đèn quang hợp, hay phân tích sức khỏe cây trồng bất cứ lúc nào!`;
    }

    /**
     * Thêm tin nhắn vào khung Chat
     */
    function appendMessage(sender, text) {
        if (!chatMessagesContainer) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-bubble ${sender === "user" ? "chat-user" : "chat-bot"} p-3 rounded-lg text-xs leading-relaxed ${
            sender === "user" 
            ? "bg-primary-container text-on-primary-container ml-6 self-end" 
            : "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-gray-800 dark:text-slate-200 mr-6"
        }`;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Chuyển đổi định dạng Markdown (Tiêu đề, Đậm, Nghiêng, Bullet point, Dòng mới)
        let formattedText = text
            .replace(/### (.*?)(<br>|\n|$)/g, '<h4 class="font-bold text-emerald-800 dark:text-emerald-300 mt-2 mb-1">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\* (.*?)(<br>|\n|$)/g, '• $1<br>')
            .replace(/\n/g, '<br>');

        msgDiv.innerHTML = `
            <div class="font-bold mb-1 ${sender === "user" ? "text-emerald-950" : "text-emerald-700 dark:text-emerald-400"}">
                ${sender === "user" ? "👤 Bạn" : "🤖 Terrarium Gemini AI"}
            </div>
            <div>${formattedText}</div>
            <div class="text-[10px] opacity-60 mt-1.5 text-right">${timeStr}</div>
        `;

        chatMessagesContainer.appendChild(msgDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function appendLoadingMessage() {
        if (!chatMessagesContainer) return null;
        const id = "loading-" + Date.now();
        const loadDiv = document.createElement("div");
        loadDiv.id = id;
        loadDiv.className = "chat-bubble chat-bot bg-gray-100 dark:bg-slate-800 p-2.5 rounded-lg text-xs text-slate-500 mr-6 flex items-center gap-2";
        loadDiv.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Gemini AI đang suy nghĩ...</span>
        `;
        chatMessagesContainer.appendChild(loadDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        return id;
    }

    function removeLoadingMessage(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Export module ra window.AIChatbot
    window.AIChatbot = {
        init: initChatbot,
        sendQuickPrompt: sendQuickPrompt,
        requestGeminiAI: requestGeminiAI
    };

})(window);
