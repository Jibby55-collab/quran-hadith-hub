// --- Settings ---
const BITRATES = [128, 64, 32];
const CDN = (rate, reciter, surah) =>
  `https://cdn.islamic.network/quran/audio-surah/${rate}/${reciter}/${surah}.mp3`;

// Reciters (we can tweak slugs later if any specific one still 404s)
const RECITERS = [
  { id: "ar.alafasy",            name: "Mishary Alafasy" },
  { id: "ar.saoodshuraym",       name: "Sa’ud ash-Shuraym" },
  { id: "ar.abdurrahmaansudais", name: "Abdur-Rahman as-Sudais" },
  { id: "ar.bdr",                name: "Badr Al-Turki" } // temp slug; we’ll adjust if needed
];

// Elements
const listEl = document.getElementById("surahList");
const searchEl = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");
const audioEl = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
audioEl.style.marginTop = "1rem";
document.querySelector("main.container").appendChild(audioEl);

// State
let surahs = [];
let filtered = [];
let currentReciter = RECITERS[0].id;

// Init
populateReciters();
loadSurahs();

function populateReciters(){
  reciterEl.innerHTML = "";
  RECITERS.forEach(r=>{
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = currentReciter;
}

async function loadSurahs(){
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah");
    const json = await res.json();
    surahs = json.data.map(s =>
