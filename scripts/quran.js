/* Qur'an Player — multi-CDN fallback (islamic.network → everyayah) */

/* ---------- Config ---------- */
const BITRATES = [128, 64, 32]; // for islamic.network first

// Per-reciter: try islamic.network slugs first, then EveryAyah folder (3-digit files)
const RECITERS = [
  {
    name: "Mishary Alafasy",
    slugs: ["ar.alafasy"],
    everyayah: null // not needed (islamic works)
  },
  {
    name: "Saud Al-Shuraim",
    slugs: ["ar.saoodshuraym", "ar.shuraym", "ar.saudshuraim"],
    everyayah: "AlShuraim_64kbps"
  },
  {
    name: "Abdul Rahman Al-Sudais",
    slugs: ["ar.abdurrahmaansudais", "ar.sudais", "ar.abdulrahmanalsudais"],
    everyayah: "Abdurrahmaan_As-Sudais_64kbps"
  },
  {
    name: "Badr Al-Turki",
    slugs: ["ar.badralturki", "ar.bdr", "ar.badr_al_turki"],
    everyayah: "Badr_64kbps"
  }
];

const islamicUrl = (rate, slug, surah) =>
  `https://cdn.islamic.network/quran/audio-surah/${rate}/${slug}/${surah}.mp3`;

const pad3 = n => String(n).padStart(3, "0");
const everyAyahUrl = (folder, surah) =>
  `https://everyayah.com/data/${folder}/${pad3(surah)}.mp3`;

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

async function tryPlay(url) {
  return new Promise((resolve, reject) => {
    audioEl.src = url;
    const onPlay = () => { cleanup(); resolve(true); };
    const onError = () => { cleanup(); reject(false); };
    function cleanup(){ audioEl.removeEventListener("playing", onPlay); audioEl.removeEventListener("error", onError); }
    audioEl.addEventListener("playing", onPlay, { once:true });
    audioEl.addEventListener("error", onError, { once:true });
    audioEl.play().catch(()=>{}); // let events decide
  });
}

async function playWithFallback(reciterIdx, surahNumber, btn) {
  const rec = RECITERS[reciterIdx];
  const original = btn.textContent;
  btn.textContent = "Loading…";

  // 1) Try islamic.network (all slugs × bitrates)
  for (const slug of rec.slugs) {
    for (const rate of BITRATES) {
      const url = islamicUrl(rate, slug, surahNumber);
      try {
        if (await tryPlay(url)) {
          btn.textContent = "Now playing";
          setTimeout(()=>btn.textContent = original, 1500);
          return;
        }
      } catch {}
    }
  }

  // 2) Fallback to EveryAyah if configured (usually works for Shuraym/Sudais/Badr)
  if (rec.everyayah) {
    const url = everyAyahUrl(rec.everyayah, surahNumber);
    try {
      if (await tryPlay(url)) {
        btn.textContent = "Now playing";
        setTimeout(()=>btn.textContent = original, 1500);
        return;
      }
    } catch {}
  }

  alert("Audio not available for this reciter/sūrah at the common locations. Try a different reciter.");
  btn.textContent = original;
}

/* ---------- Events ---------- */
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.primary");
  if (!btn) return;
  const num = Number(btn.dataset.num);
  playWithFallback(Number(reciterEl.value), num, btn);
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
