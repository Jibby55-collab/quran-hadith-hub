/* Qur'an Player — stable (hardcoded reciters + bitrate fallback) */

/* ---------- Config ---------- */
const BITRATES = [128, 64, 32];

// Known-good slugs (Alafasy works everywhere; the others will try common variants)
const RECITERS = [
  { name: "Mishary Alafasy",        slugs: ["ar.alafasy"] },
  { name: "Sa’ud ash-Shuraym",      slugs: ["ar.saoodshuraym", "ar.shuraym", "ar.saudshuraim"] },
  { name: "Abdur-Rahman as-Sudais", slugs: ["ar.abdurrahmaansudais", "ar.sudais", "ar.abdulrahmanalsudais"] },
  { name: "Badr Al-Turki",          slugs: ["ar.badralturki", "ar.bdr", "ar.badr_al_turki"] }
];

const cdnUrl = (rate, slug, surah) =>
  `https://cdn.islamic.network/quran/audio-surah/${rate}/${slug}/${surah}.mp3`;

/* ---------- DOM ---------- */
const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");

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
  reciterEl.value = "0";
}

async function loadSurahs() {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah", { cache: "no-store" });
    const json = await res.json();
    surahs = json.data.map(s => ({
      number: s.number,
      english: s.englishName,
      arabic: s.name
    }));
  } catch (e) {
    // Minimal fallback if API is down
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

function renderList() {
  listEl.innerHTML = "";
  filtered.forEach(s => {
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

async function playWithFallback(reciterIdx, surahNumber, btn) {
  const { slugs } = RECITERS[reciterIdx];
  const originalText = btn.textContent;
  btn.textContent = "Loading…";

  for (const slug of slugs) {
    for (const rate of BITRATES) {
      const url = cdnUrl(rate, slug, surahNumber);
      try {
        audioEl.src = url;
        await audioEl.play();
        btn.textContent = "Now playing";
        setTimeout(() => { btn.textContent = originalText; }, 1500);
        return; // success
      } catch (e) {
        // try next candidate
      }
    }
  }
  alert("This reciter’s file for this surah isn’t on the CDN at the usual bitrates. Try another reciter.");
  btn.textContent = originalText;
}

/* ---------- Events ---------- */
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.primary");
  if (!btn) return;
  const num = Number(btn.dataset.num);
  playWithFallback(Number(reciterEl.value), num, btn);
});

reciterEl.addEventListener("change", () => {
  // value already used on click
});

searchEl.addEventListener("input", () => {
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  renderList();
});

// EOF OK
