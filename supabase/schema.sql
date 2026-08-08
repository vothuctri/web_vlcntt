-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR SMART TERRARIUM IOT SYSTEM
-- Hướng dẫn: Mở Supabase Project -> SQL Editor -> Paste & Run script này.
-- ====================================================================

-- 1. Bảng lưu nhật ký thông số cảm biến (Sensor Logs - Time Series)
CREATE TABLE IF NOT EXISTS public.sensor_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    temperature NUMERIC(4, 1) NOT NULL,    -- Nhiệt độ (°C) từ DHT11
    humidity NUMERIC(4, 1) NOT NULL,       -- Độ ẩm không khí (%) từ DHT11
    soil_moisture NUMERIC(4, 1) NOT NULL,  -- Độ ẩm đất (%)
    light_level NUMERIC(6, 1) NOT NULL,    -- Cường độ ánh sáng (Lux hoặc %) từ Quang trở LDR
    is_dark BOOLEAN DEFAULT FALSE          -- Trạng thái trời tối (LM393)
);

-- Tạo chỉ mục để tối ưu truy vấn đồ thị theo thời gian
CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at ON public.sensor_logs(created_at DESC);

-- 2. Bảng lưu trạng thái điều khiển thiết bị (Device Controls)
CREATE TABLE IF NOT EXISTS public.device_controls (
    id INT PRIMARY KEY DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    system_mode VARCHAR(20) DEFAULT 'auto' CHECK (system_mode IN ('auto', 'manual')), -- Nấc chế độ Tự động / Thủ công
    pump_status BOOLEAN DEFAULT FALSE,         -- Trạng thái Động cơ bơm nước M1 (Transistor T1)
    lamp_status BOOLEAN DEFAULT FALSE,         -- Trạng thái Bóng đèn sưởi L1 (Relay SPDT K2)
    rgb_color VARCHAR(10) DEFAULT '#00FF88',   -- Màu đèn LED RGB D2 (Hex Code)
    rgb_brightness INT DEFAULT 100 CHECK (rgb_brightness BETWEEN 0 AND 100), -- Độ sáng LED RGB (%)
    soil_threshold NUMERIC(4, 1) DEFAULT 35.0,  -- Ngưỡng tự động bật bơm (độ ẩm đất %)
    temp_max_threshold NUMERIC(4, 1) DEFAULT 38.0 -- Ngưỡng nhiệt độ tối đa phát cảnh báo (°C)
);

-- Khởi tạo bản ghi mặc định cho bảng điều khiển (Chỉ có 1 dòng id = 1)
INSERT INTO public.device_controls (id, system_mode, pump_status, lamp_status, rgb_color, rgb_brightness, soil_threshold, temp_max_threshold)
VALUES (1, 'auto', false, false, '#00FF88', 100, 35.0, 38.0)
ON CONFLICT (id) DO NOTHING;

-- 3. Bảng lưu nhật ký Cảnh báo (Alert Logs)
CREATE TABLE IF NOT EXISTS public.alert_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'HIGH_TEMP', 'DRY_SOIL', 'PUMP_ACTIVE', 'SYSTEM_WARN'
    severity VARCHAR(20) DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON public.alert_logs(created_at DESC);

-- ====================================================================
-- KÍCH HOẠT SUPABASE REALTIME REPLICATION
-- Cho phép Web & ESP8266 nhận sự thay đổi dữ liệu tức thì (WebSockets)
-- ====================================================================

-- Bật Realtime cho các bảng
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_controls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_logs;

-- Cấp quyền truy cập công khai (ROW LEVEL SECURITY - RLS) cho dự án Demo
ALTER TABLE public.sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép đọc/ghi dữ liệu công khai (dành cho API Key Anon)
CREATE POLICY "Allow public read sensor_logs" ON public.sensor_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert sensor_logs" ON public.sensor_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read device_controls" ON public.device_controls FOR SELECT USING (true);
CREATE POLICY "Allow public update device_controls" ON public.device_controls FOR UPDATE USING (true);

CREATE POLICY "Allow public read alert_logs" ON public.alert_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert alert_logs" ON public.alert_logs FOR INSERT WITH CHECK (true);
