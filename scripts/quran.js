/* Qur'an Player — 6 reciters via Quran.com + local surah list
   Reciters: Alafasy, Shuraim, Sudais, Abdul Basit, Abdullah Al-Juhany, Yasser Al-Dossari
   - Surah list is local (always shows 1–114)
   - Loads reciter IDs from Quran.com and preloads chapter->MP3 URL maps
   - If chosen reciter is missing a chapter, fall back to: Alafasy → Abdul Basit → Yasser Dossari
*/

const SURAH_NAMES = [
  "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf","Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm","Al-Ḥijr","An-Naḥl","Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr","Al-Furqān","Ash-Shuʿarā’","An-Naml","Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah","Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat","Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt","Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm","Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah","Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun","Aṭ-Ṭalāq","At-Taḥrīm","Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah","Al-Insān","Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn","Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah","At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr","Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
];

const reciterEl = document.getElementById("reciterSelect");
const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const player    = document.getElementById("player");
const nowEl     = document.getElementById("now");
function status(t){ nowEl.textContent = t || ""; }

/* Desired 6 (keywords used to match Quran.com reciter_name) */
const DESIRED = [
  { key:"alafasy", label:"Mishary Rashid Alafasy",  match:["alafasy","mishary","rashid"] },
  { key:"shuraym", label:"Saud Al-Shuraim",         match:["shuraym","shuraim","saud"] },
  { key:"sudais",  label:"Abdul Rahman Al-Sudais",  match:["sudais","alsudais","abdurrahman"] },
  { key:"basit",   label:"Abdul Basit Abdus Samad", match:["abdul basit","abdelbaset","abdus samad","basit"] },
  { key:"juhany",  label:"Abdullah Al-Juhany",      match:["juhany","johani","al juhany","al-juhany","al johani"] },
  { key:"dossari", label:"Yasser Al-Dossari",       match:["dossari","dosari","yasser","yasir"] }
];

/* Fallback order if chosen reciter lacks that specific chapter */
const FALLBACK_ORDER = ["alafasy","basit","dossari"];

/* Quran.com API */
const API_RECITERS = "https://api.quran.com/api/v4/resources/recitations?language=en";
const API_CHAPTER_RECITATIONS = (id) => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`;

/* State */
let reciters = [];                  // [{key,label,id,urlByChapter:{1:url,...}}]
const reciterByKey = Object.create(null);

/* Build surah list immediately (no API needed) */
hydrateSurahList();
initReciters(); // async

function hydrateSurahList(data = SURAH_NAMES.map((n,i)=>({number:i+1, english:n}))){
  renderList(data);
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
  if(!chosen){ alert("Reciters are still loading. Please wait a moment and refresh."); return; }

  btn.textContent = "Loading…";
  const ok = await playChosenOrFallback(chosen, surah);
  btn.textContent = ok ? "Now playing" : "Play";
  if (ok) setTimeout(()=>btn.textContent="Play", 1500);
});

async function initReciters(){
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

    // Populate dropdown with whatever matched
    reciterEl.innerHTML = "";
    if (!reciters.length){
      reciterEl.innerHTML = "<option>No reciters loaded</option>";
      return;
    }
    reciters.forEach((r,i)=>{
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = r.label;
      reciterEl.appendChild(opt);
    });
    reciterEl.value = "0";
  }catch(e){
    console.error("Failed to load reciters:", e);
    reciterEl.innerHTML = "<option>Reciters unavailable</option>";
    return;
  }

  // Preload chapter URL maps for each matched reciter
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

async function playChosenOrFallback(chosen, surah){
  // 1) chosen first
  const direct = chosen.urlByChapter[surah];
  if (direct){
    status(`Now playing: Sūrah ${surah} • ${chosen.label}`);
    return await playUrl(direct);
  }
  // 2) fallbacks
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
    setTimeout(()=>done(false), 7000);
  });
}
