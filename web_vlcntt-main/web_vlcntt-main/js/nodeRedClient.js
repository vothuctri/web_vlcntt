/**
 * Smart Terrarium IoT Dashboard - Node-RED Client Module
 * Web Frontend giao tiếp với Backend Node-RED qua WebSockets và HTTP Fetch
 */

(function (window) {
    let ws = null;
    let isConnected = false;

    // Địa chỉ trỏ thẳng tới Backend Node-RED đang chạy nội bộ
    const NODE_RED_WS_URL = "ws://localhost:1880/ws/iot";
    const NODE_RED_API_URL = "http://localhost:1880/api/control";

    function initNodeRed() {
        connectWebSocket();
        return true; 
    }

    function connectWebSocket() {
        ws = new WebSocket(NODE_RED_WS_URL);

        ws.onopen = function() {
            console.log("✅ Frontend đã kết nối Backend Node-RED thành công!");
            isConnected = true;
        };

        ws.onmessage = function(event) {
            try {
                // 1. Nhận chuỗi JSON gốc từ Node-RED & Arduino
                const rawData = JSON.parse(event.data);
                console.log("📡 Dữ liệu gốc từ mạch:", rawData);
                
                // 2. DỊCH TÊN BIẾN (Mapping) TỪ ARDUINO SANG CHUẨN CỦA WEB
                const mappedData = {
                    temperature: rawData.temp,
                    humidity: rawData.hum,
                    soil_moisture: rawData.soil,
                    light_level: rawData.ldr,
                    // Quy đổi ánh sáng LDR (< 30% là trời tối)
                    is_dark: rawData.ldr < 30 
                };

                // 3. Đồng bộ trạng thái Nút bấm/Công tắc từ mạch lên Web
                if (window.AppState) {
                    if (rawData.pump !== undefined) window.AppState.pumpStatus = (rawData.pump === 1);
                    if (rawData.led !== undefined) window.AppState.lampStatus = (rawData.led === 1);
                    if (rawData.auto !== undefined) window.AppState.systemMode = (rawData.auto === 1 ? 'auto' : 'manual');
                    
                    // Cập nhật giao diện công tắc
                    if (typeof window.updateAllUI === "function") window.updateAllUI();
                }

                // 4. Đẩy dữ liệu đã dịch sang app.js để cập nhật đồng hồ
                if (window.onCloudSensorData) {
                    window.onCloudSensorData(mappedData);
                }
            } catch (err) {
                console.error("Lỗi phân tích JSON từ Node-RED:", err);
            }
        };

        ws.onclose = function() {
            console.warn("⚠️ Mất kết nối tới Node-RED. Đang thử lại...");
            isConnected = false;
            setTimeout(connectWebSocket, 3000); 
        };
    }

    // Gửi lệnh điều khiển (bấm nút trên web) sang Node-RED qua HTTP POST
    async function updateDeviceControls(controlsPayload) {
        try {
            const response = await fetch(NODE_RED_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(controlsPayload)
            });
            
            if (response.ok) {
                console.log("🎛️ Đã gửi lệnh điều khiển tới Backend Node-RED");
                return true;
            }
            return false;
        } catch (err) {
            console.error("Lỗi API gọi Node-RED:", err);
            return false;
        }
    }

    window.NodeRedService = {
        init: initNodeRed,
        isConnected: () => isConnected,
        updateDeviceControls: updateDeviceControls
    };

})(window);