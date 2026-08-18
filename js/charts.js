/**
 * Smart Terrarium IoT Dashboard - Historical Data Charts (Chart.js)
 * Đáp ứng Chức năng 5: Cơ sở dữ liệu (Supabase) & Biểu đồ Time-series (Chart.js), hỗ trợ xuất CSV
 */

(function (window) {
    let mainChart = null;
    let chartHistoryData = [];

    /**
     * Khởi tạo Biểu đồ Chart.js đa đường
     */
    function initChart() {
        const ctx = document.getElementById('historyChart');
        if (!ctx) return;

        // Tránh khởi tạo đè biểu đồ cũ
        if (mainChart) {
            mainChart.destroy();
        }

        mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Nhiệt độ (°C)',
                        data: [],
                        borderColor: '#f59e0b', // Màu Vàng / Hổ phách
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        borderWidth: 2.5,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        yAxisID: 'yTemp'
                    },
                    {
                        label: 'Độ ẩm không khí (%)',
                        data: [],
                        borderColor: '#06b6d4', // Màu Cyan
                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                        borderWidth: 2,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        yAxisID: 'yPercent'
                    },
                    {
                        label: 'Độ ẩm đất (%)',
                        data: [],
                        borderColor: '#10b981', // Màu Xanh lá Emerald
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        yAxisID: 'yPercent'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#9ca3af',
                            font: { family: 'Inter, sans-serif', size: 12 },
                            usePointStyle: true,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f3f4f6',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#9ca3af', font: { size: 11 } }
                    },
                    yTemp: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Nhiệt độ (°C)', color: '#f59e0b', font: { size: 11 } },
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#9ca3af' },
                        suggestedMin: 15,
                        suggestedMax: 45
                    },
                    yPercent: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Độ ẩm (%)', color: '#06b6d4', font: { size: 11 } },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#9ca3af' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });

        // Nếu đã có dữ liệu trong bộ nhớ, nạp ngay vào biểu đồ mới
        if (chartHistoryData && chartHistoryData.length > 0) {
            loadDataSet(chartHistoryData);
        }
    }

    /**
     * Thêm 1 điểm dữ liệu cảm biến thời gian thực vào biểu đồ
     */
    function appendDataPoint(record) {
        if (!mainChart) return;

        const timeLabel = new Date(record.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        chartHistoryData.push(record);
        if (chartHistoryData.length > 50) {
            chartHistoryData.shift();
        }

        mainChart.data.labels.push(timeLabel);
        mainChart.data.datasets[0].data.push(record.temperature);
        mainChart.data.datasets[1].data.push(record.humidity);
        mainChart.data.datasets[2].data.push(record.soil_moisture);

        // Giới hạn hiển thị 30 điểm gần nhất trên màn hình để không bị nghẽn
        if (mainChart.data.labels.length > 30) {
            mainChart.data.labels.shift();
            mainChart.data.datasets[0].data.shift();
            mainChart.data.datasets[1].data.shift();
            mainChart.data.datasets[2].data.shift();
        }

        mainChart.update('none'); // Update không bị khựng UI
    }

    /**
     * Nạp toàn bộ tập dữ liệu (Tải từ Cơ sở Dữ liệu Supabase)
     */
    function loadDataSet(dataList) {
        if (!mainChart || !Array.isArray(dataList) || dataList.length === 0) return;

        chartHistoryData = [...dataList];

        const labels = dataList.map(r => new Date(r.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const temps = dataList.map(r => r.temperature);
        const hums = dataList.map(r => r.humidity);
        const soils = dataList.map(r => r.soil_moisture);

        mainChart.data.labels = labels;
        mainChart.data.datasets[0].data = temps;
        mainChart.data.datasets[1].data = hums;
        mainChart.data.datasets[2].data = soils;

        mainChart.update();
        console.log(`📊 Đã tải ${dataList.length} bản ghi lịch sử vào biểu đồ.`);
    }

    /**
     * Tải dữ liệu lịch sử trực tiếp từ bảng `sensor_logs` của Supabase
     */
    async function loadFromSupabase(limit = 30) {
        if (window.SupabaseService && window.SupabaseService.isConnected()) {
            const dbData = await window.SupabaseService.fetchSensorHistory(limit);
            if (dbData && dbData.length > 0) {
                loadDataSet(dbData);
                return true;
            }
        }
        return false;
    }

    /**
     * Xuất dữ liệu biểu đồ ra file CSV chuẩn UTF-8
     */
    function exportToCSV() {
        if (!chartHistoryData.length) {
            alert("Chưa có dữ liệu cảm biến để xuất CSV!");
            return;
        }

        // Tạo nội dung CSV với BOM UTF-8 để mở tiếng Việt trên Excel không bị lỗi font
        let csvContent = "\uFEFFThoiGian,NhietDo_C,DoAmKhongKhi_%,DoAmDat_%,AnhSang_Lux,TroiToi\n";

        chartHistoryData.forEach(r => {
            const time = new Date(r.created_at || Date.now()).toLocaleString('vi-VN');
            const row = `"${time}",${r.temperature},${r.humidity},${r.soil_moisture},${r.light_level || 0},${r.is_dark ? 'CO' : 'KHONG'}`;
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `biosync_sensor_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log("📥 Đã xuất file CSV lịch sử dữ liệu cảm biến thành công!");
    }

    // Export module ra window.ChartService
    window.ChartService = {
        init: initChart,
        appendDataPoint: appendDataPoint,
        loadDataSet: loadDataSet,
        loadFromSupabase: loadFromSupabase,
        exportToCSV: exportToCSV,
        getHistoryData: () => chartHistoryData
    };

})(window);
