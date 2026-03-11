function updateData(){

// contoh data simulasi
let tegangan = (12 + Math.random()).toFixed(2);
let arus = (1 + Math.random()).toFixed(2);
let suhu = (25 + Math.random()*5).toFixed(1);
let tds = (600 + Math.random()*100).toFixed(0);
let pompa = Math.random() > 0.5 ? "ON" : "OFF";

document.getElementById("tegangan").innerHTML = tegangan + " V";
document.getElementById("arus").innerHTML = arus + " A";
document.getElementById("suhu").innerHTML = suhu + " °C";
document.getElementById("tds").innerHTML = tds + " ppm";
document.getElementById("pompa").innerHTML = pompa;

}

// update tiap 2 detik
setInterval(updateData,2000);