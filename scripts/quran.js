/* Qur'an Player — Quran.com audio API
   Now includes: Shuraym, Sudais, Alafasy, Badr Al-Turki, Muhammad Ayyub,
   Yasser Al-Dossari, Abdul Basit Abdus Samad.
   Finds reciters by name via Quran.com, loads chapter audio URLs for each. */

const DESIRED = [
  { key: "shuraym",  label: "Saud Al-Shuraim",                 match: ["shuraym","shuraim","saud"] },
  { key: "sudais",   label: "Abdul Rahman Al-Sudais",          match: ["sudais","alsudais","abdurrahman"] },
  { key: "alafasy",  label: "Mishary Alafasy",                 match: ["alafasy","afasy","afasi"] },
  { key: "badr",     label: "Badr Al-Turki",                   match: ["badr","turki"] },
  { key: "ayyub",    label: "Muhammad Ayyub",                  match: ["ayyub","ayyoob","muhammad ayyub","muhammad ayub"] },
  { key: "dossari",  label: "Yasser Al-Dossari",               match: ["dossari","dosari","yasser","yasir"] },
  { key: "basit",    label: "Abdul Basit Abdus Samad",         match: ["abdul basit","abd al-basit","abdelbaset","abdus samad","basit"] }
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
  }catch{
    surahs = [
      { number:1, english:"Al-Fātiḥah", arabic:"الفاتحة" },
      { number:2, english:"Al-Baqarah", arabic:"البقرة" },
      { number:112, english:"Al-Ikhlāṣ", arabic:"الإخلاص" }
    ];
  }
  filtered = surahs.slice();
}

/* --- Get reciter IDs from Quran.com and match our desired list --- */
async function loadRecitersFromAPI(){
  reciters = [];
  try{
    const r = await fetch(API_RECITERS, { cache:"no-store" });
    const j = await r.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();

    // Map desired -> first list item whose reciter_name includes any keyword
    DESIRED.forEach(d=>{
      const found = list.find(item => {
        const nm = lower(item.reciter_name || "");
        return d.match.some(k => nm.includes(lower(k)));
      });
      if(found){
        reciters.push({ key:d.key, label:d.label, id:found.id, urlByChapter:{} });
      } else {
        console.warn("Reciter not found in Quran.com catalog:", d.label);
      }
    });

    if(!reciters.length){
      status("No reciters loaded from Quran.com. Please refresh.");
    }
  }catch(e){
    status("Couldn’t reach Quran.com audio API. Please refresh.");
    console.error("Recitations list failed", e);
  }
}

/* --- For each reciter, load all chapter audio URLs once --- */
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
      // If a few are missing, that’s normal; we’ll just show a friendly status on click.
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
    status(`Now playing: Sūrah ${n} • ${r.label}`);
    audioEl.src = url;
    try{ await audioEl.play(); }catch{}
  }else{
    status(`This chapter isn’t available for ${r.label} via Quran.com right now. Try another reciter for this one.`);
    console.warn("Missing chapter URL", r.label, n);
  }
});

// EOF OK
