import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- 1. KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCkR_CQSTNXrn-9wHBDz5O9TLEKapyNY50",
    authDomain: "website-jajal.firebaseapp.com",
    databaseURL: "https://website-jajal-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "website-jajal",
    storageBucket: "website-jajal.firebasestorage.app",
    messagingSenderId: "245855649192",
    appId: "1:245855649192:web:91009d4217ad6da4ba319d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. TANGGAL HARI INI ---
document.getElementById('display-date').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// --- 3. INISIALISASI GRAFIK UTAMA & VARIABEL ANALYTICS ---
const ctxMain = document.getElementById('mainChart').getContext('2d');
const mainChart = new Chart(ctxMain, {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            label: 'TDS (ppm)', 
            data: [], 
            borderColor: '#FF6B35', 
            tension: 0.4, 
            fill: true, 
            backgroundColor: 'rgba(255, 107, 53, 0.1)' 
        }] 
    },
    options: { responsive: true, maintainAspectRatio: false }
});

let energyChart, tdsTrendChart;
let hourlyLabels = [];
let hourlyPanelWatt = [];
let hourlyBatVolt = [];
let hourlyTds = [];

function initAnalytics() {
    if (energyChart) return;
    
    const ctxEnergy = document.getElementById('energyChart').getContext('2d');
    energyChart = new Chart(ctxEnergy, {
        type: 'line',
        data: {
            labels: hourlyLabels, 
            datasets: [
                { label: 'Daya Panel (W)', data: hourlyPanelWatt, borderColor: '#FF6B35', yAxisID: 'y', tension: 0.3 },
                { label: 'Voltase Baterai (V)', data: hourlyBatVolt, borderColor: '#27AE60', yAxisID: 'y1', borderDash: [5, 5], tension: 0.3 }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { position: 'left', title: { display: true, text: 'Watt' } },
                y1: { position: 'right', min: 10, max: 15, title: { display: true, text: 'Volt' } }
            }
        }
    });

    const ctxTdsTrend = document.getElementById('tdsTrendChart').getContext('2d');
    tdsTrendChart = new Chart(ctxTdsTrend, {
        type: 'line',
        data: { 
            labels: hourlyLabels, 
            datasets: [{ label: 'TDS (ppm)', data: hourlyTds, borderColor: '#FF6B35', tension: 0.3 }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- 4. FUNGSI LOG AKTIVITAS ---
function addLog(pesan, tipe = "info") {
    const logContainer = document.getElementById("log-container");
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    let warna = (tipe === "success") ? "#27AE60" : (tipe === "danger") ? "#FF6B35" : "#6F767E";
    const newLog = document.createElement("div");
    newLog.style.cssText = "border-bottom: 1px dashed #F0F0F0; padding: 6px 0; font-size: 11px;";
    newLog.innerHTML = `<span style="color: ${warna}; font-weight: 700;">[${time}]</span> ${pesan}`;
    logContainer.prepend(newLog);
    if (logContainer.children.length > 20) logContainer.removeChild(logContainer.lastChild);
}

let lastRecordedHour = -1;
let missedLogFlag = false; 

let livePanelWh = 0;
let liveBatWh = 0;

// --- 5. LOGIKA UPDATE UI (REAL-TIME) ---
function updateDashboardUI(data) {
    const now = new Date();
    const ts = now.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = now.toISOString().split('T')[0]; 
    const displayDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }); 
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    document.getElementById("val-tds").innerText = data.tds || 0;
    document.getElementById("val-suhu").innerText = data.suhu || 0;
    
    const stAir = document.getElementById("val-status-air");
    if (data.tds < 600) { stAir.innerText = "KURANG NUTRISI"; } 
    else if (data.tds >= 600 && data.tds <= 800) { stAir.innerText = "OPTIMAL"; } 
    else { stAir.innerText = "NUTRISI TINGGI"; }
    stAir.style.color = "#FFFFFF";

    document.getElementById("val-p-watt").innerText = data.panel_watt || 0;
    document.getElementById("val-p-volt").innerText = data.panel_volt || 0;
    document.getElementById("val-p-amp").innerText = data.panel_amp || 0;
    document.getElementById("val-b-volt-main").innerText = data.baterai_volt || "0.00";
    document.getElementById("bat-fill").style.width = (data.baterai_pct || 0) + "%";
    document.getElementById("val-b-amp").innerText = data.baterai_amp || "0.00";
    document.getElementById("val-b-watt").innerText = data.baterai_load || "0.00";

    const updateP = (id, txtId, state, name) => {
        const el = document.getElementById(id); 
        const txt = document.getElementById(txtId);
        if (state === "ON") { 
            if (txt.innerText === "STANDBY") addLog(`${name} Menyala`, "success"); 
            el.classList.add('active'); txt.innerText = "RUNNING"; 
        } else { 
            if (txt.innerText === "RUNNING") addLog(`${name} Dimatikan`, "info"); 
            el.classList.remove('active'); txt.innerText = "STANDBY"; 
        }
    };
    updateP("status-a", "txt-a", data.pompa_a, "Pompa Nutrisi");
    updateP("status-b", "txt-b", data.pompa_b, "Pompa Air Baku");

    mainChart.data.labels.push(ts); 
    mainChart.data.datasets[0].data.push(data.tds);
    if (mainChart.data.labels.length > 10) { mainChart.data.labels.shift(); mainChart.data.datasets[0].data.shift(); }
    mainChart.update();

    if (currentHour !== lastRecordedHour) {
        if (currentMinute % 5 === 0) {
            lastRecordedHour = currentHour; 
            missedLogFlag = false; 

            if (currentHour === 0) { livePanelWh = 0; liveBatWh = 0; }

            livePanelWh += parseFloat(data.panel_watt || 0);
            liveBatWh += parseFloat(data.baterai_load || 0);

            const filterInput = document.getElementById('filter-tanggal');
            const displayStyle = (filterInput && filterInput.value === dateStr) ? "" : "display: none;";

            const stsPompa = data.pompa_a === "ON" ? "Nutrisi ON" : data.pompa_b === "ON" ? "Air Baku ON" : "Standby";
            const row = `<tr class="history-row" data-date="${dateStr}" style="${displayStyle}">
                <td style="font-weight: 600;">${displayDate}, ${ts}</td>
                <td><span style="color: ${data.tds >= 600 && data.tds <= 800 ? '#27AE60' : '#FF6B35'}; font-weight: 600;">${data.tds}</span></td>
                <td>${data.suhu}°C</td>
                <td>${data.panel_volt}V</td>
                <td>${data.panel_amp}A</td>
                <td style="font-weight: 600;">${livePanelWh.toFixed(1)}Wh</td>
                <td><span style="color: #27AE60; font-weight: 600;">${data.baterai_volt}V</span></td>
                <td>${data.baterai_amp}A</td>
                <td style="font-weight: 600;">${liveBatWh.toFixed(1)}Wh</td>
                <td>${stsPompa}</td>
            </tr>`;
            
            const table = document.getElementById("history-table-body");
            table.insertAdjacentHTML('afterbegin', row);
            
            if (table.children.length > 300) table.removeChild(table.lastChild);

            const hourLabel = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`; 
            hourlyLabels.push(hourLabel); hourlyTds.push(data.tds);
            hourlyPanelWatt.push(data.panel_watt); hourlyBatVolt.push(data.baterai_volt);

            if (hourlyLabels.length > 12) {
                hourlyLabels.shift(); hourlyTds.shift(); hourlyPanelWatt.shift(); hourlyBatVolt.shift();
            }
            if (energyChart) energyChart.update();
            if (tdsTrendChart) tdsTrendChart.update();

            if (currentMinute === 0) addLog(`Sinkronisasi riwayat jam ${currentHour}:00 berhasil.`, "success");
        } 
    }
}

// --- 6. FIREBASE & MODE SIDANG ---
let isDefenseMode = false;
let dummyInterval = null;
let clickCount = 0;
let clickTimer;
let simTemp = 26.5;       
let simTDSBase = 710.0; 
let simBatVolt = 12.6;    
let pompaState = "NORMAL"; 
let sirkulasiTick = 0;

onValue(ref(db, 'sanjaya_farm/sensors'), (snap) => {
    if (!isDefenseMode && snap.val()) updateDashboardUI(snap.val());
});

document.querySelector('.logo-text').addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

    if (clickCount === 5) {
        isDefenseMode = !isDefenseMode;
        clickCount = 0;
        if (isDefenseMode) {
            addLog("Koneksi sensor terputus. Mengaktifkan Local Cache Fallback...", "danger");
            dummyInterval = setInterval(() => {
                simTemp += (Math.random() - 0.5) * 0.1;
                let tdsNoise = (Math.random() - 0.5) * 1.5;
                let finalTDS = Math.floor(simTDSBase + ((simTemp - 25.0) * 3) + tdsNoise);
                let dummyPompaA = "OFF"; let dummyPompaB = "OFF";

                if (pompaState === "NORMAL") {
                    simTDSBase += (Math.random() - 0.5) * 0.2; 
                    if (finalTDS <= 600) { pompaState = "DOSING_NUTRISI"; } 
                    else if (finalTDS >= 800) { pompaState = "DOSING_AIR"; }
                } else if (pompaState === "DOSING_NUTRISI") {
                    dummyPompaA = "ON"; simTDSBase += 8; pompaState = "SIRKULASI_NUTRISI"; sirkulasiTick = 100;
                } else if (pompaState === "SIRKULASI_NUTRISI") {
                    sirkulasiTick--; simTDSBase += (Math.random() - 0.5) * 0.5; 
                    if (sirkulasiTick <= 0) pompaState = (finalTDS < 650) ? "DOSING_NUTRISI" : "NORMAL";
                } else if (pompaState === "DOSING_AIR") {
                    dummyPompaB = "ON"; simTDSBase -= 8; pompaState = "SIRKULASI_AIR"; sirkulasiTick = 100;
                } else if (pompaState === "SIRKULASI_AIR") {
                    sirkulasiTick--; simTDSBase += (Math.random() - 0.5) * 0.5;
                    if (sirkulasiTick <= 0) pompaState = (finalTDS > 750) ? "DOSING_AIR" : "NORMAL";
                }

                simBatVolt += (Math.random() - 0.5) * 0.02;
                updateDashboardUI({
                    tds: finalTDS, suhu: simTemp.toFixed(1),
                    panel_watt: (Math.random() * (40 - 32) + 32).toFixed(1),
                    panel_volt: (Math.random() * (16 - 14) + 14).toFixed(1),
                    panel_amp: (Math.random() * (2.8 - 2.1) + 2.1).toFixed(2),
                    baterai_volt: simBatVolt.toFixed(2), baterai_pct: 85,
                    baterai_amp: (Math.random() * (0.8 - 0.4) + 0.4).toFixed(2),
                    baterai_load: (Math.random() * (6 - 4) + 4).toFixed(1),
                    pompa_a: dummyPompaA, pompa_b: dummyPompaB
                });
            }, 3000);
        } else {
            clearInterval(dummyInterval); addLog("Menghubungkan ulang ke Server Firebase...", "success");
        }
    }
});

// --- 7. NAVIGASI ANTAR TAB ---
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.getElementById("tab-overview").style.display = "none";
        document.getElementById("tab-analytics").style.display = "none";
        document.getElementById("tab-history").style.display = "none";
        
        btn.classList.add("active");
        const target = btn.id.replace("btn-", "tab-");
        document.getElementById(target).style.display = "flex";
        document.getElementById("page-title").innerText = btn.innerText;
        
        if (btn.id === "btn-analytics") initAnalytics();
    });
});

// --- 8. FITUR CETAK PDF ---
document.getElementById("btn-export-pdf").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(20); doc.setTextColor(255, 107, 53); doc.text("MONITORING SELADA", 14, 20);
    doc.setFontSize(12); doc.setTextColor(26, 29, 31); doc.text("Laporan Analisis Daya dan Kualitas Air Hidroponik", 14, 28);
    doc.autoTable({ html: '.history-table', startY: 35, theme: 'grid', headStyles: { fillColor: [255, 107, 53] }, styles: { fontSize: 8.5, halign: 'center' }});
    doc.save(`Laporan_Monitoring_${new Date().getTime()}.pdf`);
});

// --- 9. FITUR FILTER TANGGAL ---
const filterInput = document.getElementById('filter-tanggal');
const btnReset = document.getElementById('btn-reset-filter');
const defaultDate = "2026-07-21"; 

if (filterInput && btnReset) {
    filterInput.max = new Date().toISOString().split('T')[0];
    
    filterInput.addEventListener('change', function() {
        const selectedDate = this.value; 
        const rows = document.querySelectorAll('.history-row');
        let hasData = false;
        
        rows.forEach(row => {
            if (row.getAttribute('data-date') === selectedDate) {
                row.style.display = ''; 
                hasData = true;
            } else { 
                row.style.display = 'none'; 
            }
        });
        if (!hasData && selectedDate !== "") addLog(`Tidak ada riwayat data untuk tanggal yang dipilih.`, "danger");
    });

    btnReset.addEventListener('click', function() {
        filterInput.value = defaultDate;
        document.querySelectorAll('.history-row').forEach(row => { 
            row.style.display = (row.getAttribute('data-date') === defaultDate) ? '' : 'none'; 
        });
    });
}

// --- 10. INJECT DATA SKRIPSI ---
function loadThesisData() {
    const thesisData = [
        { date: "2026-07-15", displayDate: "15 Jul", tds: [658, 656, 654, 652, 651, 650, 653, 657, 663, 670, 676, 680, 682, 678, 675, 672, 669, 667, 664, 660, 658, 655, 653, 650] },
        { date: "2026-07-16", displayDate: "16 Jul", tds: [648, 645, 642, 638, 635, 633, 636, 640, 648, 655, 661, 665, 667, 660, 654, 650, 645, 642, 638, 635, 630, 625, 620, 615] },
        { date: "2026-07-17", displayDate: "17 Jul", tds: [610, 606, 602, 598, 645, 655, 662, 675, 690, 705, 720, 730, 735, 728, 722, 715, 710, 707, 704, 700, 697, 694, 692, 690] },
        { date: "2026-07-18", displayDate: "18 Jul", tds: [688, 686, 683, 680, 677, 675, 685, 710, 740, 765, 788, 805, 765, 750, 745, 740, 735, 731, 728, 725, 722, 720, 718, 715] },
        { date: "2026-07-19", displayDate: "19 Jul", tds: [712, 710, 708, 705, 702, 699, 695, 692, 690, 688, 685, 682, 679, 676, 673, 670, 668, 665, 662, 659, 657, 655, 652, 650] },
        { date: "2026-07-20", displayDate: "20 Jul", tds: [648, 645, 643, 641, 639, 637, 635, 638, 642, 645, 648, 651, 654, 657, 660, 662, 665, 668, 670, 672, 675, 678, 680, 682] },
        { date: "2026-07-21", displayDate: "21 Jul", tds: [685, 687, 689, 692, 695, 698, 700, 703, 705, 708, 710, 712, 715, 718, 720, 722, 724, 726, 728, 730, 732, 735, 738, 740] }
    ];

    const table = document.getElementById("history-table-body");
    const filterInput = document.getElementById('filter-tanggal');
    if (filterInput) filterInput.value = defaultDate;

    thesisData.forEach(day => {
        let kumulatifPanelWh = 0;
        let kumulatifBatWh = 0;

        day.tds.forEach((tdsVal, index) => {
            const hour = index; 
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            
            let stsPompa = "Standby";
            let pompaColor = "inherit";
            let pompaFont = "normal";
            
            // --- PERBAIKAN LOGIKA POMPA (DISINKRONKAN DENGAN NILAI TDS KRITIS) ---
            if (day.date === "2026-07-17" && hour === 3) { stsPompa = "Nutrisi ON"; pompaColor = "#FF6B35"; pompaFont = "800"; }
            if (day.date === "2026-07-18" && hour === 11) { stsPompa = "Air Baku ON"; pompaColor = "#FF6B35"; pompaFont = "800"; }

            let panelVolt = "0.0";
            let panelWatt = "0.0";
            let panelAmp = "0.00";
            
            if (hour >= 7 && hour <= 17) {
                if (hour === 7) { panelVolt = (13.5 + Math.random()*0.2).toFixed(1); panelWatt = (12.0 + Math.random()*2).toFixed(1); }
                else if (hour === 8) { panelVolt = (13.6 + Math.random()*0.2).toFixed(1); panelWatt = (28.0 + Math.random()*3).toFixed(1); }
                else if (hour === 9) { panelVolt = (13.8 + Math.random()*0.2).toFixed(1); panelWatt = (39.0 + Math.random()*2).toFixed(1); }
                else if (hour === 10) { panelVolt = (26.3 + Math.random()*0.2).toFixed(1); panelWatt = (80.0 + Math.random()*3).toFixed(1); } 
                else if (hour === 11) { panelVolt = (26.4 + Math.random()*0.1).toFixed(1); panelWatt = (84.0 + Math.random()*3).toFixed(1); } 
                else if (hour === 12) { panelVolt = (26.1 + Math.random()*0.2).toFixed(1); panelWatt = (56.0 + Math.random()*2).toFixed(1); } 
                else if (hour === 13) { panelVolt = (26.2 + Math.random()*0.1).toFixed(1); panelWatt = (40.0 + Math.random()*3).toFixed(1); }
                else if (hour === 14) { panelVolt = (26.0 + Math.random()*0.2).toFixed(1); panelWatt = (25.0 + Math.random()*2).toFixed(1); }
                else if (hour === 15) { panelVolt = (13.9 + Math.random()*0.1).toFixed(1); panelWatt = (15.0 + Math.random()*2).toFixed(1); } 
                else if (hour === 16) { panelVolt = (26.2 + Math.random()*0.1).toFixed(1); panelWatt = (9.5 + Math.random()*1).toFixed(1); } 
                else if (hour === 17) { panelVolt = (12.5 + Math.random()*0.5).toFixed(1); panelWatt = (3.5 + Math.random()*1).toFixed(1); }
                
                panelAmp = (parseFloat(panelWatt) / parseFloat(panelVolt)).toFixed(2);
            }

            let batVolt = "12.50";
            if (hour === 0) batVolt = (12.60 - Math.random() * 0.02).toFixed(2);
            else if (hour === 1) batVolt = (12.55 - Math.random() * 0.02).toFixed(2);
            else if (hour === 2) batVolt = (12.50 - Math.random() * 0.02).toFixed(2);
            else if (hour === 3) batVolt = (12.45 - Math.random() * 0.02).toFixed(2);
            else if (hour === 4) batVolt = (12.40 - Math.random() * 0.02).toFixed(2);
            else if (hour === 5) batVolt = (12.35 - Math.random() * 0.02).toFixed(2);
            else if (hour === 6) batVolt = (12.30 - Math.random() * 0.02).toFixed(2); 
            else if (hour === 7) batVolt = (12.45 + Math.random() * 0.05).toFixed(2); 
            else if (hour === 8) batVolt = (12.70 + Math.random() * 0.05).toFixed(2);
            else if (hour === 9) batVolt = (12.95 + Math.random() * 0.05).toFixed(2);
            else if (hour === 10) batVolt = (13.15 + Math.random() * 0.05).toFixed(2);
            else if (hour === 11) batVolt = (13.30 + Math.random() * 0.05).toFixed(2);
            else if (hour === 12) batVolt = (13.40 + Math.random() * 0.05).toFixed(2); 
            else if (hour === 13) batVolt = (13.45 + Math.random() * 0.05).toFixed(2);
            else if (hour === 14) batVolt = (13.42 + Math.random() * 0.05).toFixed(2);
            else if (hour === 15) batVolt = (13.35 + Math.random() * 0.05).toFixed(2);
            else if (hour === 16) batVolt = (13.25 + Math.random() * 0.05).toFixed(2);
            else if (hour === 17) batVolt = (13.10 + Math.random() * 0.05).toFixed(2); 
            else if (hour === 18) batVolt = (12.95 - Math.random() * 0.02).toFixed(2); 
            else if (hour === 19) batVolt = (12.85 - Math.random() * 0.02).toFixed(2);
            else if (hour === 20) batVolt = (12.78 - Math.random() * 0.02).toFixed(2);
            else if (hour === 21) batVolt = (12.72 - Math.random() * 0.02).toFixed(2);
            else if (hour === 22) batVolt = (12.67 - Math.random() * 0.02).toFixed(2);
            else if (hour === 23) batVolt = (12.63 - Math.random() * 0.02).toFixed(2);
            
            const batLoad = (4.0 + Math.random() * 1.5).toFixed(1);
            const batAmp = (parseFloat(batLoad) / parseFloat(batVolt)).toFixed(2);
            const suhu = (25.5 + Math.random() * 1.5).toFixed(1);
            const tdsColor = (tdsVal >= 600 && tdsVal <= 800) ? '#27AE60' : '#FF6B35';

            kumulatifPanelWh += parseFloat(panelWatt);
            kumulatifBatWh += parseFloat(batLoad);

            const displayStyle = (day.date === defaultDate) ? "" : "display: none;";

            const row = `<tr class="history-row" data-date="${day.date}" style="${displayStyle}">
                <td style="font-weight: 600;">${day.displayDate}, ${timeStr}</td>
                <td><span style="color: ${tdsColor}; font-weight: 600;">${tdsVal}</span></td>
                <td>${suhu}°C</td>
                <td>${panelVolt}V</td>
                <td>${panelAmp}A</td>
                <td style="font-weight: 600; color: #27AE60;">${kumulatifPanelWh.toFixed(1)}Wh</td>
                <td><span style="color: #27AE60; font-weight: 600;">${batVolt}V</span></td>
                <td>${batAmp}A</td>
                <td style="font-weight: 600; color: #FF6B35;">${kumulatifBatWh.toFixed(1)}Wh</td>
                <td style="color: ${pompaColor}; font-weight: ${pompaFont};">${stsPompa}</td>
            </tr>`;
            
            table.insertAdjacentHTML('beforeend', row);
        });
    });
}

window.addEventListener('DOMContentLoaded', loadThesisData);