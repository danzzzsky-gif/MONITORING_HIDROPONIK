// Konfigurasi umum untuk grafik mini (hilangkan sumbu x & y)
const cleanOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
    layout: { padding: 0 }
};

// 1. Grafik Tegangan Panel (Bar Chart Hijau)
const ctxPanel = document.getElementById('panelChart').getContext('2d');
new Chart(ctxPanel, {
    type: 'bar',
    data: {
        labels: ['1', '2', '3', '4', '5', '6'],
        datasets: [{
            data: [12.5, 14.0, 16.2, 18.0, 18.4, 18.44], // Simulasi kenaikan tegangan
            backgroundColor: '#28a745',
            borderRadius: 4,
            barThickness: 8
        }]
    },
    options: cleanOptions
});

// 2. Grafik Suhu Air (Bar Chart Biru/Hijau Terang)
const ctxSuhu = document.getElementById('suhuChart').getContext('2d');
new Chart(ctxSuhu, {
    type: 'bar',
    data: {
        labels: ['1', '2', '3', '4', '5', '6'],
        datasets: [{
            data: [25.1, 25.5, 26.0, 26.5, 26.7, 26.8], 
            backgroundColor: '#17a2b8', // Warna biru untuk suhu air
            borderRadius: 4,
            barThickness: 8
        }]
    },
    options: cleanOptions
});

// 3. Grafik TDS (Bar Chart Oranye)
const ctxTds = document.getElementById('tdsChart').getContext('2d');
new Chart(ctxTds, {
    type: 'bar',
    data: {
        labels: ['1', '2', '3', '4', '5', '6'],
        datasets: [{
            data: [610, 615, 620, 625, 630, 632], 
            backgroundColor: '#f39c12',
            borderRadius: 4,
            barThickness: 8
        }]
    },
    options: cleanOptions
});

// 4. Grafik Baterai (Doughnut Chart)
const ctxBaterai = document.getElementById('bateraiChart').getContext('2d');
new Chart(ctxBaterai, {
    type: 'doughnut',
    data: {
        labels: ['Terisi', 'Kosong'],
        datasets: [{
            data: [72, 28], // 72% Baterai
            backgroundColor: ['#28a745', '#eef2f0'], // Hijau dan Abu-abu terang
            borderWidth: 0,
            hoverOffset: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', 
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        }
    }
});

// 5. Grafik Utama (TDS line chart) - Interval 15 Menit
const ctxMain = document.getElementById('mainChart').getContext('2d');
new Chart(ctxMain, {
    type: 'line',
    data: {
        // Label diubah menjadi interval 15 menit
        labels: ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15'],
        datasets: [{
            label: 'TDS (ppm)',
            data: [600, 610, 615, 632, 628, 620], // Data simulasi nilai TDS
            borderColor: '#f39c12',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3, // Saya tambahkan titik poin agar lebih jelas dibaca
            pointBackgroundColor: '#f39c12'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { borderDash: [5, 5] } }
        }
    }
});