/* Qur'an Player — Combined EveryAyah + Quran.com strategy
   Reciters include: Shuraim, Sudais, Alafasy, Badr, Ayyoub, Dussari, Abdul Basit
   Tries EveryAyah first if full folder exists, then falls back to Quran.com when needed
*/

const DESIRED = [
  { key: "shuraym", label: "Saud Al-Shuraim", ea_folder: "AlShuraim_64kbps" },
  { key: "sudais",  label: "Abdul Rahman Al-Sudais", ea_folder: "Abdurrahmaan_As-Sudais_64kbps" },
  { key: "alafasy", label: "Mishary Alafasy", ea_folder: null },
  { key: "badr",    label: "Badr Al-Turki", ea_folder: "Badr_64kbps" },
  { key: "ayyub",   label: "Muhammad Ayyoub", ea_folder: "Muhammad_Ayyoub_128kbps" },
  { key: "dussari", label: "Yasser Al-Dossari", ea_folder: "Yasser_Ad-Dussary_128kbps" },
  { key: "basit",   label: "Abdul Basit Abdus Samad", ea_folder: "Abdul_Basit_Murattal_64kbps" }
];

const API = {
  CHAPTERS: "https://api.quran.com/api/v4/chapters",
  RECITERS: "https://api.quran.com/api/v4/resources/recitations?language=en",
  CHAPTER_RECITATIONS: (id) => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`
};

const listEl    = document.getElementById("surahList");
const reciterEl = document.getElementById("reciterSelect");
const searchEl  = document.getElementById("search");
const audioEl   = document.createElement("audio");
const statusEl  = document.createElement("div");
let surahs = [], filtered = [], reciters = [];

initialize();

async function initialize(){
  audioEl.controls = true;
  audioEl.style.width = "100%";
  audioEl.style.marginTop = "1rem";
  document.querySelector("main.container").appendChild(audioEl);

  statusEl.style.marginTop = ".5rem";
  statusEl.style.fontSize = ".9rem";
  statusEl.style.opacity = ".85";
  document.querySelector("main.container").appendChild(statusEl);

  await loadChapters();
  await loadQuranComReciters();
  prepareEveryAyahMapping();
  await loadAudioMaps();
  setupUI();
}

/* ---------- Load Chapters ---------- */
async function loadChapters(){
  try{
    const resp = await fetch(API.CHAPTERS, { cache:"no-store" });
    const j = await resp.json();
    surahs = j.chapters.map(c => ({ number:c.id, english:c.name_simple, arabic:c.name_arabic }));
  } catch {
    surahs = [{ number:1, english:"Al-Fātiḥah", arabic:"الفاتحة" }];
  }
  filtered = surahs.slice();
}

/* ---------- Match Quran.com IDs ---------- */
async function loadQuranComReciters(){
  reciters = [];
  try{
    const resp = await fetch(API.RECITERS, { cache:"no-store" });
    const j = await resp.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();

    DESIRED.forEach(d=>{
      const found = list.find(x => lower(x.reciter_name).includes(lower(d.label)));
      if(found) reciters.push({ ...d, qcid: found.id, urlMap: {} });
      else console.warn("Missing reciter on Quran.com:", d.label);
    });
  }catch(e){
    console.error("Reciters load error", e);
  }
}

/* ---------- EveryAyah mapping existence ---------- */
const eaAvailable = {};
function prepareEveryAyahMapping(){
  DESIRED.forEach(d => {
    if(d.ea_folder){
      eaAvailable[d.key] = true; // assume exists
      // Could add a HEAD check per folder, but trusting site structure
    } else {
      eaAvailable[d.key] = false;
    }
  });
}

/* ---------- Preload Quran.com audio maps ---------- */
async function loadAudioMaps(){
  for(const r of reciters){
    try{
      const resp = await fetch(API.CHAPTER_RECITATIONS(r.qcid), { cache:"no-store" });
      const j = await resp.json();
      r.urlMap = {};
      j.audio_files.forEach(a => {
        if(a.chapter_id && a.audio_url) r.urlMap[a.chapter_id] = a.audio_url;
      });
    } catch(e){
      console.error("ChapterRecitations failed for", r.label, e);
    }
  }
}

/* ---------- UI Setup ---------- */
function setupUI(){
  reciterEl.innerHTML = "";
  reciters.forEach((r,i)=>{
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.label;
    reciterEl.appendChild(opt);
  });

  renderList();

  searchEl.addEventListener("input", () => {
    const q = searchEl.value.toLowerCase().trim();
    filtered = surahs.filter(s =>
      s.english.toLowerCase().includes(q) ||
      s.arabic.includes(q) ||
      String(s.number).includes(q)
    );
    renderList();
  });

  listEl.addEventListener("click", async e => {
    const btn = e.target.closest("button.primary");
    if(!btn) return;
    const sn = Number(btn.dataset.surah);
    const rec = reciters[Number(reciterEl.value)];

    let url = null;

    if(eaAvailable[rec.key]){
      const s3 = String(sn).padStart(3,"0");
      url = `https://everyayah.com/data/${rec.ea_folder}/${s3}.mp3`;
    }
    if(!url || !(await tryPlaySniffer(url))){
      // fallback to Quran.com
      url = rec.urlMap[sn];
    }

    if(url){
      status(`Now playing: Sūrah ${sn} • ${rec.label}`);
      audioEl.src = url;
      try{ await audioEl.play(); }catch{}
    } else {
      status(`Couldn’t find Sūrah ${sn} for ${rec.label}.`);
      console.warn("No audio for", rec.label, sn);
    }
  });
}

function renderList(){
  listEl.innerHTML = "";
  filtered.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${s.number}. ${s.english}</strong>
        <div style="font-family:'Amiri', serif; opacity:.85">${s.arabic}</div>
      </div>
      <button class="primary" data-surah="${s.number}">Play</button>`;
    listEl.appendChild(li);
  });
}

function status(txt){ statusEl.textContent = txt || ""; }

async function tryPlaySniffer(u){
  return fetch(u, { method:"HEAD" }).then(r=>r.ok).catch(()=>false);
}
