/* Qur'an Player — Quran.com v4 API, robust chapters + 7 reciters
   Reciters: Shuraym, Sudais, Alafasy, Badr Al-Turki, Muhammad Ayyub,
             Yasser Al-Dossari, Abdul Basit.
   - Loads chapters from Quran.com
   - Matches reciters by name from Quran.com list
   - Preloads per-chapter audio URLs
   - Shows friendly status if a chapter is missing for a reciter
*/

const API = {
  CHAPTERS: "https://api.quran.com/api/v4/chapters",
  RECITERS: "https://api.quran.com/api/v4/resources/recitations?language=en",
  CHAPTER_RECITATIONS: (id) => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`
};

// Keywords to match Quran.com reciter names
const DESIRED = [
  { key: "shuraym",  label: "Saud Al-Shuraim",                 match: ["shuraym","shuraim","saud"] },
  { key: "sudais",   label: "Abdul Rahman Al-Sudais",          match: ["sudais","alsudais","abdurrahman"] },
  { key: "alafasy",  label: "Mishary Alafasy",                 match: ["alafasy","afasy","afasi","rashid"] },
  { key: "badr",     label: "Badr Al-Turki",                   match: ["badr","turki"] },
  { key: "ayyub",    label: "Muhammad Ayyub",                  match: ["ayyub","ayyoob","muhammad ay"] },
  { key: "dossari",  label: "Yasser Al-Dossari",               match: ["dossari","dosari","yasser","yasir"] },
  { key: "basit",    label: "Abdul Basit Abdus Samad",         match: ["abdul basit","abdelbaset","abdus samad","basit"] }
];

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
statusEl.style.fontSize   = ".9rem";
statusEl.style.opacity    = ".85";
document.querySelector("main.container").appendChild(statusEl);

let surahs   = [];
let filtered = [];
let reciters = []; // [{key,label,id,urlByChapter:{1:url,...}}]

// ---- bootstrap ----
init();

async function init(){
  console.log("[QuranJS] init");
  await loadChapters();
  await loadReciters();
  await preloadAudioMaps();
  hydrateDropdown();
  renderList();
}

/* ---------- Chapters ---------- */
async function loadChapters(){
  try{
    const r = await fetch(API.CHAPTERS, { cache:"no-store" });
    const j = await r.json();
    if (!j || !Array.isArray(j.chapters) || !j.chapters.length) throw new Error("Empty chapters");
    surahs = j.chapters.map(c => ({
      number: c.id,
      english: c.name_simple,
      arabic:  c.name_arabic
    }));
    filtered = surahs.slice();
    console.log("[QuranJS] Chapters loaded:", surahs.length);
  }catch(e){
    console.warn("[QuranJS] Chapter API failed, using fallback list.", e);
    // Fallback list so the UI never stays empty
    const names = [
      "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf",
      "Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm","Al-Ḥijr","An-Naḥl",
      "Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr",
      "Al-Furqān","Ash-Shuʿarā’","An-Naml","Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah",
      "Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat",
      "Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt",
      "Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm","Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah",
      "Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun","Aṭ-Ṭalāq","At-Taḥrīm",
      "Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah",
      "Al-Insān","Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn",
      "Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl",
      "Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah",
      "At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr",
      "Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
    ];
    surahs = names.map((n,i)=>({ number:i+1, english:n, arabic:n }));
    filtered = surahs.slice();
  }
}

/* ---------- Reciters (match by name) ---------- */
async function loadReciters(){
  try{
    const r = await fetch(API.RECITERS, { cache:"no-store" });
    const j = await r.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();

    reciters = [];
    DESIRED.forEach(d=>{
      const match = list.find(item => {
        const nm = lower(item.reciter_name || "");
        return d.match.some(k => nm.includes(lower(k)));
      });
      if (match) reciters.push({ key:d.key, label:d.label, id:match.id, urlByChapter:{} });
      else console.warn("[QuranJS] Reciter not found in catalog:", d.label);
    });

    if (!reciters.length) {
      console.warn("[QuranJS] No reciters matched; dropdown will show a placeholder.");
    }
  }catch(e){
    console.error("[QuranJS] Reciters API failed:", e);
  }
}

/* ---------- Preload audio URL maps per reciter ---------- */
async function preloadAudioMaps(){
  for (const r of reciters) {
    try{
      const resp = await fetch(API.CHAPTER_RECITATIONS(r.id), { cache:"no-store" });
      const json = await resp.json();
      const arr = json.audio_files || [];
      r.urlByChapter = {};
      arr.forEach(a => { if (a.chapter_id && a.audio_url) r.urlByChapter[a.chapter_id] = a.audio_url; });
      console.log(`[QuranJS] URLs for ${r.label}:`, Object.keys(r.urlByChapter).length, "chapters");
    }catch(e){
      console.error("[QuranJS] Failed to load audio map for", r.label, e);
    }
  }
}

/* ---------- UI ---------- */
function hydrateDropdown(){
  reciterEl.innerHTML = "";
  if (!reciters.length){
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

/* ---------- Events ---------- */
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
