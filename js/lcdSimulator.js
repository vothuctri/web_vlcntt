/**
 * Smart Terrarium IoT Dashboard - LCD 16x2 I2C Simulator Module
 * Mô phỏng màn hình hiển thị LCD 16x2 (Module PCF8574 + Arduino U1 + DHT11)
 */

(function (window) {
    let line1Element = null;
    let line2Element = null;
    let backlightElement = null;
    let isBacklightOn = true;

    /**
     * Định dạng chuỗi chính xác 16 ký tự (Cắt ngắn hoặc chèn thêm khoảng trắng)
     */
    function pad16(str) {
        if (!str) str = "";
        if (str.length > 16) return str.substring(0, 16);
        return str.padEnd(16, " ");
    }

    /**
     * Khởi tạo giao diện LCD Simulator
     */
    function initLCD() {
        line1Element = document.getElementById("lcd-line-1");
        line2Element = document.getElementById("lcd-line-2");
        backlightElement = document.getElementById("lcd-screen-container");

        updateDisplay("LCD 16x2 I2C READY", "DHT11 CONNECTED");
    }

    /**
     * Cập nhật nội dung hiển thị 2 dòng của LCD 16x2
     */
    function updateDisplay(line1Text, line2Text) {
        if (line1Element) {
            line1Element.textContent = pad16(line1Text);
        }
        if (line2Element) {
            line2Element.textContent = pad16(line2Text);
        }
    }

    /**
     * Cập nhật hiển thị theo thông số cảm biến thời gian thực
     * Mô phỏng chuẩn giao tiếp I2C PCF8574 trên Arduino
     */
    function updateFromSensors(temp, hum, soil, lightIsDark) {
        // Dòng 1: Nhiệt độ & Độ ẩm không khí (DHT11)
        // Ví dụ: "T:28.5C   H:65.0%"
        const tStr = temp !== undefined ? temp.toFixed(1) : "--.-";
        const hStr = hum !== undefined ? hum.toFixed(0) : "--";
        const l1 = `Temp:${tStr}C H:${hStr}%`;

        // Dòng 2: Độ ẩm đất & Ánh sáng
        // Ví dụ: "Soil:45% Lgt:DARK"
        const sStr = soil !== undefined ? soil.toFixed(0) : "--";
        const lightStr = lightIsDark ? "DARK" : "SUNNY";
        const l2 = `Soil:${sStr}% Lgt:${lightStr}`;

        updateDisplay(l1, l2);
    }

    /**
     * Bật / Tắt Đèn nền LCD (LCD Backlight Toggle)
     */
    function toggleBacklight(status) {
        isBacklightOn = status !== undefined ? status : !isBacklightOn;
        if (backlightElement) {
            if (isBacklightOn) {
                backlightElement.classList.remove("lcd-off");
            } else {
                backlightElement.classList.add("lcd-off");
            }
        }
    }

    // Export module ra window.LCDSimulator
    window.LCDSimulator = {
        init: initLCD,
        updateDisplay: updateDisplay,
        updateFromSensors: updateFromSensors,
        toggleBacklight: toggleBacklight
    };

})(window);
