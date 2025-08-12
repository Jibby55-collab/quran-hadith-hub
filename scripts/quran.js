// --- Settings ---
const CDN_BASE = "https://cdn.islamic.network/quran/audio-surah/128";

// Add the reciters you want here.
// (If any track 404s, tell me — I’ll correct the slug from the official list.)
const RECITERS = [
  { id: "ar.alafasy",             name: "Mishary Alafasy" },        // working already
  { id: "ar.abdurrahmaansudais",  name: "Abdur-Rahman as-Sudais" }, // Sudais
  { id: "ar.saoodshuraym",        name: "Sa’ud ash-Shuraym" },      // Shuraim
  { id: "ar.badralturki",         name: "Badr Al-Turki" }           // Badr Al-Turki
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
    surahs = json.data.map(s => ({
      number: s.number,
      english: s.englishName,
      arabic: s.name
    }));
  } catch (e) {
    surahs = [
      { number: 1, english: "Al-Fātiḥah", arabic: "الفاتحة" },
      { number: 2, english: "Al-Baqarah", arabic: "البقرة" },
      { number: 112, english: "Al-Ikhlāṣ", arabic: "الإخلاص" }
    ];
    console.warn("Surah API failed; using fallback.", e);
  }
  filtered = surahs.slice();
  renderList();
}

function renderList(){
  listEl.innerHTML = "";
  filtered.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${s.number}. ${s.english}</strong>
        <div style="font-family:'Amiri', serif; opacity:.85">${s.arabic}</div>
      </div>
      <button class="primary" data-num="${s.number}">Play</button>
    `;
    listEl.appendChild(li);
  });
}

listEl.addEventListener("click", async e=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const num = Number(btn.dataset.num);
  const url = `${CDN_BASE}/${currentReciter}/${num}.mp3`;
  try {
    // Try to play; if the file is missing, catch and show a message
    audioEl.src = url;
    await audioEl.play();
  } catch {
    alert("This reciter’s file for this surah isn’t available at this bitrate. Try another reciter. I can also fix the reciter ID.");
  }
});

searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  renderList();
});

reciterEl.addEventListener("change", ()=>{
  currentReciter = reciterEl.value;
});
