/**
 * Smart Terrarium IoT Dashboard - Historical Data Charts (Chart.js)
 * Vẽ biểu đồ thời gian thực & Truy vấn lịch sử thông số cảm biến
 */

(function (window) {
    let mainChart = null;
    let chartHistoryData = [];

    /**
     * Khởi tạo Biểu đồ Chart.js
     */
    function initChart() {
        const ctx = document.getElementById('historyChart');
        if (!ctx) return;

        mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Nhiệt độ (°C)',
                        data: [],
                        borderColor: '#f59e0b', // Yellow / Amber
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
                        borderColor: '#06b6d4', // Cyan
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
                        borderColor: '#10b981', // Emerald Green
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
                        labels: {
                            color: '#9ca3af',
                            font: { family: 'Outfit, sans-serif', size: 12 },
                            usePointStyle: true,
                            padding: 18
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

        // Giới hạn hiển thị 30 điểm trên biểu đồ
        if (mainChart.data.labels.length > 30) {
            mainChart.data.labels.shift();
            mainChart.data.datasets[0].data.shift();
            mainChart.data.datasets[1].data.shift();
            mainChart.data.datasets[2].data.shift();
        }

        mainChart.update('none'); // Update không bị khựng UI
    }

    /**
     * Thay đổi toàn bộ tập dữ liệu biểu đồ (Khi tải từ DB hoặc đổi khung thời gian)
     */
    function loadDataSet(dataList) {
        if (!mainChart || !Array.isArray(dataList)) return;

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
    }

    /**
     * Xuất dữ liệu biểu đồ ra file CSV
     */
    function exportToCSV() {
        if (!chartHistoryData.length) {
            alert("Chưa có dữ liệu cảm biến để xuất CSV!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,ThoiGian,NhietDo_C,DoAmKhaiKhi_%,DoAmDat_%,AnhSang_Lux,TroiToi\n";

        chartHistoryData.forEach(r => {
            const time = new Date(r.created_at || Date.now()).toLocaleString('vi-VN');
            const row = `"${time}",${r.temperature},${r.humidity},${r.soil_moisture},${r.light_level || 0},${r.is_dark ? 'CO' : 'KHONG'}`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `terrarium_sensor_logs_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Export module ra window.ChartService
    window.ChartService = {
        init: initChart,
        appendDataPoint: appendDataPoint,
        loadDataSet: loadDataSet,
        exportToCSV: exportToCSV,
        getHistoryData: () => chartHistoryData
    };

})(window);
