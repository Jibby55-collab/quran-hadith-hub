/* Qur'an Player — local surah list + Quran.com audio (with graceful fallback)
   - Always shows 1–114 from a local array (no API)
   - Loads 7 reciters via Quran.com and preloads chapter -> mp3 URL maps
   - If a chosen reciter lacks a chapter, falls back to: Alafasy → Abdul Basit → Yasser Dossari
   - Status line tells what’s playing / any fallback taken
*/

/* ---------- Local Sūrah Names (never empty) ---------- */
const SURAH_NAMES = [
  "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf","Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm","Al-Ḥijr","An-Naḥl","Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr","Al-Furqān","Ash-Shuʿarā’","An-Naml","Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah","Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat","Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt","Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm","Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah","Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun","Aṭ-Ṭalāq","At-Taḥrīm","Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah","Al-Insān","Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn","Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah","At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr","Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
];

/* ---------- DOM ---------- */
const reciterEl = document.getElementById("reciterSelect");
const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const player    = document.getElementById("player");
const nowEl     = document.getElementById("now");

/* ---------- Helpers ---------- */
function status(t){ nowEl.textContent = t || ""; }

/* ---------- Desired reciters (match keywords for Quran.com) ---------- */
const DESIRED = [
  { key:"shuraym",  label:"Saud Al-Shuraim",            match:["shuraym","shuraim","saud"] },
  { key:"sudais",   label:"Abdul Rahman Al-Sudais",     match:["sudais","alsudais","abdurrahman"] },
  { key:"alafasy",  label:"Mishary Rashid Alafasy",     match:["alafasy","mishary","rashid"] },
  { key:"badr",     label:"Badr Al-Turki",              match:["badr","turki"] },
  { key:"ayyub",    label:"Muhammad Ayyub",             match:["ayyub","ayyoob"] },
  { key:"dossari",  label:"Yasser Al-Dossari",          match:["dossari","dosari","yasser","yasir"] },
  { key:"basit",    label:"Abdul Basit Abdus Samad",    match:["abdul basit","abdelbaset","abdus samad","basit"] }
];

// If a chapter is missing for the chosen reciter, try these in order:
const FALLBACK_ORDER = ["alafasy","basit","dossari"];

/* ---------- Quran.com API endpoints ---------- */
const API_RECITERS = "https://api.quran.com/api/v4/resources/recitations?language=en";
const API_CHAPTER_RECITATIONS = (id) => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`;

/* ---------- State ---------- */
let reciters = [];            // [{ key,label,id,urlByChapter:{1:url,...} }]
const reciterByKey = {};      // quick index

/* ---------- Build UI (surah list is local) ---------- */
hydrateSurahList();
init(); // kick off reciter/audio loading

function hydrateSurahList(data = SURAH_NAMES.map((n,i)=>({number:i+1, english:n}))){
  renderList(data);
  // search
  searchEl.addEventListener("input", ()=>{
    const q = searchEl.value.toLowerCase().trim();
    const filtered = SURAH_NAMES
      .map((n,i)=>({number:i+1, english:n}))
      .filter(s => s.english.toLowerCase().includes(q) || String(s.number).includes(q));
    renderList(filtered);
  });
}

function renderList(rows){
  listEl.innerHTML = "";
  rows.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div><strong>${s.number}. ${s.english}</strong></div>
      <button class="primary" data-num="${s.number}">Play</button>
    `;
    listEl.appendChild(li);
  });
}

listEl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const surah = Number(btn.dataset.num);
  const idx = Number(reciterEl.value);
  const chosen = reciters[idx];
  if(!chosen){ alert("Reciter list not ready yet. Give it a second and refresh."); return; }

  btn.textContent = "Loading…";
  const ok = await playChosenOrFallback(chosen, surah);
  btn.textContent = ok ? "Now playing" : "Play";
  if (ok) setTimeout(()=>btn.textContent="Play", 1500);
});

/* ---------- Load reciters + chapter URL maps ---------- */
async function init(){
  // Load and match reciters by name
  try{
    const r = await fetch(API_RECITERS, { cache:"no-store" });
    const j = await r.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();

    reciters = [];
    DESIRED.forEach(d=>{
      const found = list.find(item => d.match.some(k => lower(item.reciter_name).includes(lower(k))));
      if(found){
        const entry = { key:d.key, label:d.label, id:found.id, urlByChapter:{} };
        reciters.push(entry);
        reciterByKey[d.key] = entry;
      } else {
        console.warn("Not found in Quran.com:", d.label);
      }
    });

    // Populate dropdown (even if some aren’t found yet)
    reciterEl.innerHTML = "";
    reciters.forEach((r,i)=>{
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = r.label;
      reciterEl.appendChild(opt);
    });
    if (reciters.length) reciterEl.value = "0";

  }catch(e){
    console.error("Failed to load reciters from Quran.com", e);
    reciterEl.innerHTML = `<option>Reciters unavailable</option>`;
    return;
  }

  // Load chapter audio maps for each reciter
  for (const rct of reciters){
    try{
      const resp = await fetch(API_CHAPTER_RECITATIONS(rct.id), { cache:"no-store" });
      const json = await resp.json();
      const files = json.audio_files || [];
      rct.urlByChapter = {};
      files.forEach(a => { if(a.chapter_id && a.audio_url) rct.urlByChapter[a.chapter_id] = a.audio_url; });
      // console.log(`[Audio map] ${rct.label}:`, Object.keys(rct.urlByChapter).length);
    }catch(e){
      console.error("Failed to load chapter URLs for", rct.label, e);
    }
  }
}

/* ---------- Playback with fallback ---------- */
async function playChosenOrFallback(chosen, surah){
  // 1) Try the chosen reciter
  const direct = chosen.urlByChapter[surah];
  if (direct) {
    status(`Now playing: Sūrah ${surah} • ${chosen.label}`);
    return await playUrl(direct);
  }

  // 2) Try fallback chain (Alafasy → Basit → Dossari)
  for (const key of FALLBACK_ORDER){
    const r = reciterByKey[key];
    if (!r) continue;
    const url = r.urlByChapter[surah];
    if (url){
      status(`This sūrah isn’t available for ${chosen.label}. Falling back to ${r.label}.`);
      return await playUrl(url);
    }
  }

  status(`Couldn’t find Sūrah ${surah} for ${chosen.label} (or fallbacks).`);
  return false;
}

async function playUrl(url){
  return new Promise((resolve)=>{
    let settled = false;
    const done = ok => { if(settled) return; settled = true; cleanup(); resolve(ok); };
    const onPlay = () => done(true);
    const onErr  = () => done(false);
    function cleanup(){
      player.removeEventListener("playing", onPlay);
      player.removeEventListener("error", onErr);
    }
    player.addEventListener("playing", onPlay, { once:true });
    player.addEventListener("error", onErr, { once:true });
    player.src = url;
    player.play().catch(()=>{});
    setTimeout(()=>done(false), 7000); // safety
  });
}
