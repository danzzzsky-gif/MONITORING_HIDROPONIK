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

// --- 2. INISIALISASI GRAFIK ---
const ctxMain = document.getElementById('mainChart').getContext('2d');
const mainChart = new Chart(ctxMain, {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            label: 'TDS (ppm)', 
            data: [], 
            borderColor: '#f97316', 
            tension: 0.4, 
            fill: true, 
            backgroundColor: 'rgba(249, 115, 22, 0.05)' 
        }] 
    },
    options: { responsive: true, maintainAspectRatio: false }
});

let energyChart, tdsTrendChart;

function initAnalytics() {
    if (energyChart) return;
    const ctxEnergy = document.getElementById('energyChart').getContext('2d');
    energyChart = new Chart(ctxEnergy, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Panel (W)', data: [], borderColor: '#eab308', yAxisID: 'y' },
                { label: 'Baterai (V)', data: [], borderColor: '#22c55e', yAxisID: 'y1', borderDash: [5, 5] }
            ]
        },
        options: { 
            scales: { 
                y: { position: 'left', title: { display: true, text: 'Watt' } },
                y1: { position: 'right', min: 10, max: 15, title: { display: true, text: 'Volt' } }
            }
        }
    });
    const ctxTdsTrend = document.getElementById('tdsTrendChart').getContext('2d');
    tdsTrendChart = new Chart(ctxTdsTrend, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'TDS (ppm)', data: [], borderColor: '#f97316' }] }
    });
}

// --- 3. FUNGSI LOGGING & STATUS ---
function addLog(pesan, tipe = "info") {
    const logContainer = document.getElementById("log-container");
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    let warna = (tipe === "success") ? "#22c55e" : (tipe === "danger") ? "#ef4444" : "#f97316";

    const newLog = document.createElement("div");
    newLog.style.cssText = "border-bottom: 1px dashed #EFEFEF; padding: 6px 0; font-size: 11px;";
    newLog.innerHTML = `<span style="color: ${warna}; font-weight: 700;">[${time}]</span> ${pesan}`;
    
    logContainer.prepend(newLog);
    if (logContainer.children.length > 20) logContainer.removeChild(logContainer.lastChild);
}

function checkTdsStatus(val) {
    const stAir = document.getElementById("val-status-air");
    if (val < 560) { 
        stAir.innerText = "KURANG NUTRISI"; 
        stAir.style.color = "#f97316"; 
    } else if (val >= 560 && val <= 840) { 
        stAir.innerText = "OPTIMAL (SELADA)"; 
        stAir.style.color = "#22c55e"; 
    } else { 
        stAir.innerText = "NUTRISI TINGGI"; 
        stAir.style.color = "#ef4444"; 
    }
}

// --- 4. DATA REAL-TIME FIREBASE ---
onValue(ref(db, 'sanjaya_farm/sensors'), (snap) => {
    const data = snap.val(); 
    if (!data) return;
    const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });

    // Update UI Teks Kualitas Air & Panel
    document.getElementById("val-tds").innerText = data.tds || 0;
    document.getElementById("val-suhu").innerText = data.suhu || 0;
    checkTdsStatus(data.tds || 0);

    document.getElementById("val-p-watt").innerText = data.panel_watt || 0;
    document.getElementById("val-p-volt").innerText = data.panel_volt || 0;
    document.getElementById("val-p-amp").innerText = data.panel_amp || 0;
    
    // REVISI UTUH: PENGURUS DATA BATERAI BARU (Volt Utama, Arus, Watt)
    document.getElementById("val-b-volt-main").innerText = data.baterai_volt || "0.00";
    document.getElementById("bat-fill").style.width = (data.baterai_pct || 0) + "%";
    document.getElementById("val-b-amp").innerText = data.baterai_amp || "0.00";
    document.getElementById("val-b-watt").innerText = data.baterai_load || "0.00";

    // Update Status Pompa
    const updateP = (id, txtId, state, name) => {
        const el = document.getElementById(id); 
        const txt = document.getElementById(txtId);
        if (state === "ON") { 
            if (txt.innerText === "STANDBY") addLog(`${name} Menyala (Otomatis)`, "success"); 
            el.classList.add('active'); txt.innerText = "RUNNING"; 
        } else { 
            if (txt.innerText === "RUNNING") addLog(`${name} Dimatikan`, "info"); 
            el.classList.remove('active'); txt.innerText = "STANDBY"; 
        }
    };
    updateP("status-a", "txt-a", data.pompa_a, "Pompa Nutrisi");
    updateP("status-b", "txt-b", data.pompa_b, "Pompa Air Baku");

    // Update Grafik Live
    mainChart.data.labels.push(ts); 
    mainChart.data.datasets[0].data.push(data.tds);
    if (mainChart.data.labels.length > 10) { 
        mainChart.data.labels.shift(); 
        mainChart.data.datasets[0].data.shift(); 
    }
    mainChart.update();

    // Update Riwayat Tabel
    const row = `<tr><td>${ts}</td><td>${data.tds}</td><td>${data.suhu}</td><td>${data.panel_watt}W</td><td>${data.baterai_volt}V</td><td>${data.pompa_a==="ON"?"A ON":data.pompa_b==="ON"?"B ON":"STB"}</td></tr>`;
    const table = document.getElementById("history-table-body");
    table.insertAdjacentHTML('afterbegin', row);
    if (table.children.length > 50) table.removeChild(table.lastChild);
});

// --- 5. NAVIGASI TAB ---
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.getElementById("tab-overview").style.display = "none";
        document.getElementById("tab-analytics").style.display = "none";
        document.getElementById("tab-history-data").style.display = "none";
        
        btn.classList.add("active");
        const target = btn.id.replace("btn-", "tab-");
        document.getElementById(target).style.display = "flex";
        document.getElementById("page-title").innerText = btn.innerText;
        
        if (btn.id === "btn-analytics") initAnalytics();
    });
});

document.getElementById('display-date').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });