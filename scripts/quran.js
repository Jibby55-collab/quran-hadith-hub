/* Qur'an Player — multi-host for specific reciters (no Mishary fallback)  */

/* ===== Reciter Sources (edit here if we need to swap a host) =====
   Each reciter has an ordered list of "sources". Every source builds a URL
   for a given surahNumber (1..114). We try them in order until one plays.
   If all fail, we show a friendly message and log the exact URLs we tried.
=================================================================== */

const RECITERS = [
  {
    key: "alafasy",
    name: "Mishary Alafasy",
    sources: [
      // islamic.network (strong & complete)
      { kind: "islamic", bitrates: [128, 64, 32], slugs: ["ar.alafasy"] },
    ]
  },
  {
    key: "shuraym",
    name: "Saud Al-Shuraim",
    sources: [
      // EveryAyah is typically complete for Shuraim
      { kind: "everyayah", folder: "AlShuraim_64kbps" },
      // islamic.network (some slugs exist)
      { kind: "islamic", bitrates: [128, 64, 32], slugs: ["ar.saoodshuraym", "ar.shuraym", "ar.saudshuraim"] },
      // MP3Quran (common pattern; adjust server if needed)
      { kind: "mp3quran", folder: "shur", server: "https://server8.mp3quran.net" } // 3-digit files 001.mp3
    ]
  },
  {
    key: "sudais",
    name: "Abdul Rahman As-Sudais",
    sources: [
      // islamic.network first (often available for many surahs)
      { kind: "islamic", bitrates: [128, 64, 32], slugs: ["ar.abdurrahmaansudais", "ar.sudais", "ar.abdulrahmanalsudais"] },
      // MP3Quran (very common path for Sudais)
      { kind: "mp3quran", folder: "sds", server: "https://server8.mp3quran.net" },
      // EveryAyah (some mirrors use slightly different casing/folders; if this 404s we’ll remove)
      { kind: "everyayah", folder: "Abdurrahmaan_As-Sudais_64kbps" }
    ]
  },
  {
    key: "badr",
    name: "Badr Al-Turki",
    sources: [
      // EveryAyah often has Badr
      { kind: "everyayah", folder: "Badr_64kbps" },
      // islamic.network variants
      { kind: "islamic", bitrates: [128, 64, 32], slugs: ["ar.badralturki", "ar.bdr", "ar.badr_al_turki"] },
      // MP3Quran guess (folder "bdr" is used on some servers)
      { kind: "mp3quran", folder: "bdr", server: "https://server8.mp3quran.net" }
    ]
  }
];

/* ============= URL builders (3 hosts) ============= */
const pad3 = n => String(n).padStart(3, "0");

function islamicUrls(bitrates, slugs, surahNumber){
  const urls = [];
  for (const slug of slugs) {
    for (const br of bitrates) {
      urls.push(`https://cdn.islamic.network/quran/audio-surah/${br}/${slug}/${surahNumber}.mp3`);
    }
  }
  return urls;
}
function everyAyahUrls(folder, surahNumber){
  return [`https://everyayah.com/data/${folder}/${pad3(surahNumber)}.mp3`];
}
function mp3QuranUrls(server, folder, surahNumber){
  // MP3Quran typically uses /<folder>/###.mp3 (e.g., /sds/001.mp3)
  return [`${server}/${folder}/${pad3(surahNumber)}.mp3`];
}

/* ============= DOM ============= */
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

/* ============= State ============= */
let surahs = [];
let filtered = [];

/* ============= Init ============= */
populateReciters();
loadSurahs().then(renderList);

/* ============= UI ============= */
function populateReciters(){
  reciterEl.innerHTML = "";
  RECITERS.forEach((r,i)=>{
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.name;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = "0";
}

async function loadSurahs(){
  try{
    const res = await fetch("https://api.alquran.cloud/v1/surah", { cache: "no-store" });
    const json = await res.json();
    surahs = json.data.map(s => ({ number: s.number, english: s.englishName, arabic: s.name }));
  }catch{
    surahs = [
      { number: 1, english: "Al-Fātiḥah", arabic: "الفاتحة" },
      { number: 2, english: "Al-Baqarah", arabic: "البقرة" },
      { number: 112, english: "Al-Ikhlāṣ", arabic: "الإخلاص" }
    ];
  }
  filtered = surahs.slice();
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

searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  renderList();
});

listEl.addEventListener("click", (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const num = Number(btn.dataset.num);
  playSelected(Number(reciterEl.value), num, btn);
});

/* ============= Playback with multi-host fallback (no Mishary auto-fallback) ============= */
function showStatus(text){ statusEl.textContent = text; }

function buildUrlsFor(reciter, surahNumber){
  const urls = [];
  for (const src of reciter.sources){
    if (src.kind === "islamic") {
      urls.push(...islamicUrls(src.bitrates || [128,64,32], src.slugs || [], surahNumber));
    } else if (src.kind === "everyayah") {
      urls.push(...everyAyahUrls(src.folder, surahNumber));
    } else if (src.kind === "mp3quran") {
      urls.push(...mp3QuranUrls(src.server, src.folder, surahNumber));
    }
  }
  return urls;
}

async function tryPlay(url){
  // Try to play and resolve true/false based on success
  return new Promise((resolve)=>{
    audioEl.src = url;
    let settled = false;
    const onGood = () => { if(!settled){ settled=true; cleanup(); resolve(true); } };
    const onBad  = () => { if(!settled){ settled=true; cleanup(); resolve(false);} };
    function cleanup(){
      audioEl.removeEventListener("playing", onGood);
      audioEl.removeEventListener("error", onBad);
    }
    audioEl.addEventListener("playing", onGood, { once:true });
    audioEl.addEventListener("error", onBad, { once:true });
    audioEl.play().catch(()=>{}); // let events decide
    // small timeout in case some browsers don't fire error quickly
    setTimeout(()=>{ if(!settled){ cleanup(); resolve(false); } }, 5000);
  });
}

async function playSelected(reciterIndex, surahNumber, btn){
  const rec = RECITERS[reciterIndex];
  const original = btn.textContent;
  btn.textContent = "Loading…";
  showStatus("");

  const urls = buildUrlsFor(rec, surahNumber);

  // log URLs we’ll try for quick debugging if needed
  console.log(`[${rec.name}] Trying URLs for Surah ${surahNumber}:`, urls);

  for (const url of urls){
    if (await tryPlay(url)) {
      btn.textContent = "Now playing";
      showStatus(`Now playing: Sūrah ${surahNumber} • ${rec.name}`);
      setTimeout(()=>btn.textContent = original, 1500);
      return;
    }
  }

  showStatus(`Couldn’t find this track for ${rec.name}. Check console for the URLs tried.`);
  alert(`Audio not available for this reciter/sūrah on the usual hosts.\nWe tried ${urls.length} URLs.\nPick another reciter for now, and I’ll map a working host.`);
  btn.textContent = original;
}

// EOF OK
