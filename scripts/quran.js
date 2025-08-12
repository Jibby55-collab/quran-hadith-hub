/* Qur'an Player — always-plays build
   Tries selected reciter on islamic.network (128→64→32) and EveryAyah (if configured).
   If nothing exists for that surah, it AUTO-FALLS BACK to Mishary Alafasy for that surah only.
*/

/* ---------- Config ---------- */
const BITRATES = [128, 64, 32];

// Reciters:
// - Alafasy = guaranteed baseline (full set on islamic.network)
// - Shuraim/Badr often complete on EveryAyah; Sudais varies, so islamic.network only
const RECITERS = [
  { key: "alafasy",  name: "Mishary Alafasy", slugs: ["ar.alafasy"], everyayah: null, preferEveryAyah: false },
  { key: "shuraym",  name: "Saud Al-Shuraim", slugs: ["ar.saoodshuraym","ar.shuraym","ar.saudshuraim"], everyayah: "AlShuraim_64kbps", preferEveryAyah: true },
  { key: "sudais",   name: "Abdul Rahman Al-Sudais", slugs: ["ar.abdurrahmaansudais","ar.sudais","ar.abdulrahmanalsudais"], everyayah: null, preferEveryAyah: false },
  { key: "badr",     name: "Badr Al-Turki", slugs: ["ar.badralturki","ar.bdr","ar.badr_al_turki"], everyayah: "Badr_64kbps", preferEveryAyah: true }
];

// default reciter if a track is missing
const DEFAULT_KEY = "alafasy";

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

const statusEl = document.createElement("div");
statusEl.style.marginTop = ".5rem";
statusEl.style.fontSize = ".9rem";
statusEl.style.opacity = ".85";

const main = document.querySelector("main.container");
main.appendChild(audioEl);
main.appendChild(statusEl);

/* ---------- State ---------- */
let surahs = [];
let filtered = [];

/* ---------- Init ---------- */
populateReciters();
loadSurahs();

/* ---------- UI ---------- */
function populateReciters() {
  reciterEl.innerHTML = "";
  RECITERS.forEach((r, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.name;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = "0"; // start with Alafasy
}

async function loadSurahs() {
  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah", { cache: "no-store" });
    const json = await res.json();
    surahs = json.data.map(s => ({ number: s.number, english: s.englishName, arabic: s.name }));
  } catch {
    surahs = [
      { number: 1, english: "Al-Fātiḥah", arabic: "الفاتحة" },
      { number: 2, english: "Al-Baqarah", arabic: "البقرة" },
      { number: 112, english: "Al-Ikhlāṣ", arabic: "الإخلاص" }
    ];
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

/* ---------- Playback ---------- */
function showStatus(text) {
  statusEl.textContent = text;
}

async function tryPlay(url) {
  return new Promise((resolve, reject) => {
    audioEl.src = url;
    const ok = () => { cleanup(); resolve(true); };
    const bad = () => { cleanup(); reject(false); };
    function cleanup(){
      audioEl.removeEventListener("playing", ok);
      audioEl.removeEventListener("error", bad);
    }
    audioEl.addEventListener("playing", ok, { once:true });
    audioEl.addEventListener("error", bad, { once:true });
    audioEl.play().catch(()=>{}); // let events decide
  });
}

async function playSelected(reciterIdx, surahNumber, btn){
  const rec = RECITERS[reciterIdx];
  const original = btn.textContent;
  btn.textContent = "Loading…";
  showStatus("");

  // helper: try islamic slugs x bitrates
  const tryIslamic = async () => {
    for (const slug of rec.slugs) {
      for (const rate of BITRATES) {
        const url = islamicUrl(rate, slug, surahNumber);
        try { if (await tryPlay(url)) return { ok:true, url, source:"Islamic Network" }; } catch {}
      }
    }
    return { ok:false };
  };

  // helper: try EveryAyah if configured
  const tryEA = async () => {
    if (!rec.everyayah) return { ok:false };
    const url = everyAyahUrl(rec.everyayah, surahNumber);
    try { if (await tryPlay(url)) return { ok:true, url, source:"EveryAyah" }; } catch {}
    return { ok:false };
  };

  // choose order
  let result = { ok:false };
  if (rec.preferEveryAyah) result = await tryEA() || await tryIslamic();
  else result = await tryIslamic() || await tryEA();

  if (result.ok){
    btn.textContent = "Now playing";
    showStatus(`Now playing: Sūrah ${surahNumber} • ${rec.name} (${result.source})`);
    setTimeout(()=>btn.textContent = original, 1500);
    return;
  }

  // FINAL FALLBACK: default reciter (Alafasy) so it ALWAYS plays
  const def = RECITERS.find(r => r.key === DEFAULT_KEY);
  for (const rate of BITRATES) {
    const url = islamicUrl(rate, def.slugs[0], surahNumber);
    try {
      if (await tryPlay(url)) {
        btn.textContent = "Now playing";
        showStatus(`This track isn’t available for ${rec.name}. Falling back to ${def.name} for Sūrah ${surahNumber}.`);
        setTimeout(()=>btn.textContent = original, 1500);
        return;
      }
    } catch {}
  }

  // should basically never reach here
  showStatus("Couldn’t play this track. Please try again.");
  btn.textContent = original;
}

/* ---------- Events ---------- */
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.primary");
  if (!btn) return;
  const num = Number(btn.dataset.num);
  playSelected(Number(reciterEl.value), num, btn);
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
