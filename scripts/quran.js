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

listEl.addEventListener("click", e=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const num = Number(btn.dataset.num);
  playWithFallback(currentReciter, num);
});

reciterEl.addEventListener("change", ()=>{
  currentReciter = reciterEl.value;
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

// Try 128 -> 64 -> 32 until one works
async function playWithFallback(reciter, surahNumber){
  for (const rate of BITRATES){
    const url = CDN(rate, reciter, surahNumber);
    try {
      // Preflight check; if blocked by CORS, just set and rely on onerror fallback
      const headOk = await fetch(url, { method: "HEAD" }).then(r => r.ok).catch(() => false);
      audioEl.src = url;
      await audioEl.play();
      if (headOk) return; // success
      return; // if HEAD blocked but play started, also success
    } catch (e) {
      // try next bitrate
    }
  }
  alert("This reciter’s file for this surah isn’t available on the CDN. Try another reciter. I can also adjust the reciter ID.");
}

