/* Qur'an Player — Quran.com audio API build
   - Finds reciters by name from Quran.com
   - Loads chapter audio URLs for each reciter
   - Plays the right MP3 per surah (no guessing folders)
   Docs: Recitations list + chapter audio files (Quran Foundation / Quran.com v4). */

const DESIRED = [
  { key: "shuraym", label: "Saud Al-Shuraim", match: ["shuraym","shuraim"] },
  { key: "sudais",  label: "Abdul Rahman Al-Sudais", match: ["sudais","alsudais"] },
  { key: "alafasy", label: "Mishary Alafasy", match: ["afasy","afasy","alafasy","afasi"] },
  { key: "badr",    label: "Badr Al-Turki", match: ["badr","turki"] } // might not exist in Quran.com catalog
];

const API_RECITERS = "https://api.quran.com/api/v4/resources/recitations?language=en";
const API_CHAPTERS = "https://api.quran.com/api/v4/chapters";
const API_CHAPTER_RECITATIONS = (recitationId) =>
  `https://api.quran.com/api/v4/chapter_recitations/${recitationId}?language=en`;

const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");

const audioEl = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
audioEl.style.marginTop = "1rem";
document.querySelector("main.container").appendChild(audioEl);

const statusEl = document.createElement("div");
statusEl.style.marginTop = ".5rem";
statusEl.style.fontSize = ".9rem";
statusEl.style.opacity = ".85";
document.querySelector("main.container").appendChild(statusEl);

let surahs = [];
let filtered = [];
let reciters = []; // [{key,label,id,urlByChapter:{1:url,...}}]

init();

async function init(){
  console.log("[QuranJS] init");
  await loadChapters();
  await loadRecitersFromAPI();
  await loadAudioMaps();
  hydrateDropdown();
  renderList();
}

/* --- Load 114 surahs --- */
async function loadChapters(){
  try{
    const r = await fetch(API_CHAPTERS, { cache:"no-store" });
    const j = await r.json();
    surahs = j.chapters.map(c => ({ number:c.id, english:c.name_simple, arabic:c.name_arabic }));
    filtered = surahs.slice();
    console.log("[QuranJS] Surahs:", surahs.length);
  }catch(e){
    console.warn("Chapter API failed; using tiny fallback", e);
    surahs = [
      { number:1, english:"Al-Fātiḥah", arabic:"الفاتحة" },
      { number:112, english:"Al-Ikhlāṣ", arabic:"الإخلاص" }
    ];
    filtered = surahs.slice();
  }
}

/* --- Get reciter IDs from Quran.com --- */
async function loadRecitersFromAPI(){
  reciters = [];
  try{
    const r = await fetch(API_RECITERS, { cache:"no-store" });
    const j = await r.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();

    DESIRED.forEach(d=>{
      const found = list.find(item => {
        const name = lower(item.reciter_name || "");
        return d.match.some(k => name.includes(k));
      });
      if(found){
        reciters.push({ key:d.key, label:d.label, id:found.id, urlByChapter:{} });
      }else{
        console.warn("Not found in Quran.com recitations:", d.label);
      }
    });
    // Always keep Alafasy as a fallback option if found
    if(!reciters.length){
      status("Couldn’t find the requested reciters from Quran.com right now.");
    }
    console.log("[QuranJS] Matched reciters:", reciters.map(r=>`${r.label}#${r.id}`).join(", "));
  }catch(e){
    status("Couldn’t reach Quran.com audio API. Please refresh.");
    console.error("Recitations list failed", e);
  }
}

/* --- For each matched reciter, load all chapter audio URLs once --- */
async function loadAudioMaps(){
  for(const r of reciters){
    try{
      const resp = await fetch(API_CHAPTER_RECITATIONS(r.id), { cache:"no-store" });
      const json = await resp.json();
      const arr = json.audio_files || [];
      r.urlByChapter = {};
      arr.forEach(a => {
        if(a.chapter_id && a.audio_url){
          r.urlByChapter[a.chapter_id] = a.audio_url;
        }
      });
      console.log(`[QuranJS] Loaded URLs for ${r.label}:`, Object.keys(r.urlByChapter).length, "chapters");
    }catch(e){
      console.error("Chapter recitations load failed for", r.label, e);
    }
  }
}

/* --- UI helpers --- */
function hydrateDropdown(){
  reciterEl.innerHTML = "";
  if(!reciters.length){
    const opt = document.createElement("option");
    opt.textContent = "No reciters loaded";
    reciterEl.appendChild(opt);
    return;
  }
  reciters.forEach((r,i)=>{
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.label;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = "0";
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

function status(t){ statusEl.textContent = t || ""; }

/* --- Events --- */
searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  renderList();
});

listEl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const n = Number(btn.dataset.num);
  const r = reciters[Number(reciterEl.value)];
  if(!r){ alert("No reciter selected."); return; }

  const url = r.urlByChapter[n];
  if(url){
    console.log("[QuranJS] play", r.label, n, url);
    status(`Now playing: Sūrah ${n} • ${r.label}`);
    audioEl.src = url;
    try{ await audioEl.play(); }catch{}
  }else{
    status(`This chapter is missing for ${r.label} via Quran.com. Try another reciter for this one.`);
    console.warn("Missing chapter URL", r.label, n);
  }
});

// EOF OK
