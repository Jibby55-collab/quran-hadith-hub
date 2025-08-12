/* Qur'an Player — improved with multiple reciters + bitrate & slug fallbacks */

/* ---------- Config ---------- */

// We’ll try each bitrate (highest first)
const BITRATES = [128, 64, 32];

// Reciters with several possible CDN slugs each (so playback works even if one path is missing)
const RECITERS = [
  {
    name: "Mishary Alafasy",
    slugs: ["ar.alafasy"]
  },
  {
    name: "Sa’ud ash-Shuraym",
    // Common variants found on the CDN
    slugs: ["ar.saoodshuraym", "ar.shuraym", "ar.saudshuraim"]
  },
  {
    name: "Abdur-Rahman as-Sudais",
    slugs: ["ar.abdurrahmaansudais", "ar.sudais", "ar.abdulrahmanalsudais"]
  },
  {
    name: "Badr Al-Turki",
    slugs: ["ar.badralturki", "ar.bdr", "ar.badr_al_turki"]
  }
];

// Build a CDN URL
const urlFor = (rate, slug, surah) =>
  `https://cdn.islamic.network/quran/audio-surah/${rate}/${slug}/${surah}.mp3`;

/* ---------- DOM ---------- */

const listEl = document.getElementById("surahList");
const searchEl = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");

// Single audio element at bottom of page
const audioEl = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
audioEl.style.marginTop = "1rem";
document.querySelector("main.container").appendChild(audioEl);

/* ---------- State ---------- */

let surahs = [];
let filtered = [];
let currentReciterIndex = 0;

/* ---------- Init ---------- */

populateReciters();
loadSurahs();

/* ---------- Functions ---------- */

function populateReciters() {
  reciterEl.innerHTML = "";
  RECITERS.forEach((r, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.name;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = String(currentReciterIndex);
}

async function loadSurahs() {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah");
    const json = await res.json();
    surahs = json.data.map((s) => ({
      number: s.number,
      english: s.englishName,
      arabic: s.name,
    }));
  } catch {
    // Minimal fallback if API is down
    surahs = [
      { number: 1, engli
