/* Qur'an Player — OG 3 + 5 more with strong per-reciter fallbacks
   Reciters (8 total):
   - Mishary Rashid Alafasy (OG)
   - Saud Al-Shuraim (OG)
   - Abdul Rahman As-Sudais (OG)
   - Abdul Basit Abdus Samad
   - Abdullah Al-Juhany
   - Yasser Al-Dossari
   - Saad Al-Ghamdi
   - Muhammad Ayyub

   Per reciter we try multiple hosts in this order (if configured):
   Quran.com → Islamic Network → MP3Quran → EveryAyah
   If a 404/error occurs, we move to the next host FOR THAT SAME RECITER.
*/

/* ---------- Local Sūrah Names (always visible) ---------- */
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
const pad3 = n => String(n).padStart(3, "0");
function status(t){ nowEl.textContent = t || ""; }

/* ---------- Reciters with exact host configs ---------- */
const RECITERS = [
  // OG 3 (unchanged)
  {
    key:"alafasy", label:"Mishary Rashid Alafasy",
    quranMatch:["alafasy","mishary","rashid"],
    islamic:["ar.alafasy"],
    mp3:{ folder:"afs", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net","https://server12.mp3quran.net"] },
    everyayah:null
  },
  {
    key:"shuraym", label:"Saud Al-Shuraim",
    quranMatch:["shuraym","shuraim","saud"],
    islamic:["ar.saoodshuraym","ar.shuraym","ar.saudshuraim"],
    mp3:{ folder:"shur", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"AlShuraim_64kbps"
  },
  {
    key:"sudais", label:"Abdul Rahman As-Sudais",
    quranMatch:["sudais","alsudais","abdurrahman"],
    islamic:["ar.abdurrahmaansudais","ar.sudais","ar.abdulrahmanalsudais"],
    mp3:{ folder:"sds", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Abdurrahmaan_As-Sudais_64kbps"
  },

  // New 5 with strong sources
  {
    key:"basit", label:"Abdul Basit Abdus Samad",
    quranMatch:["abdul basit","abdelbaset","abdus samad","basit"],
    islamic:[], // not needed; better sources below
    mp3:{ folder:"basit", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Abdul_Basit_Murattal_64kbps"
  },
  {
    key:"juhany", label:"Abdullah Al-Juhany",
    quranMatch:["juhany","johani","al juhany","al-juhany","al johani"],
    islamic:[], // not reliable; try Quran.com or MP3Quran folder guesses
    // Try a few plausible MP3Quran folders (mirrors differ)
    mp3Guesses:[
      { folder:"jhn", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
      { folder:"juh", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
      { folder:"aljuhany", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] }
    ],
    everyayah:null
  },
  {
    key:"dossari", label:"Yasser Al-Dossari",
    quranMatch:["dossari","dosari","yasser","yasir"],
    islamic:[], // rely on MP3Quran and Quran.com
    mp3:{ folder:"yasser", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:null
  },
  {
    key:"ghamdi", label:"Saad Al-Ghamdi",
    quranMatch:["ghamdi","saad"],
    islamic:["ar.saadghamdi"], // very reliable
    mp3:{ folder:"gmd", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:null
  },
  {
    key:"ayyub", label:"Muhammad Ayyub",
    quranMatch:["ayyub","ayyoob","ayoub"],
    islamic:[], // usually not needed
    mp3:{ folder:"ayy", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Muhammad_Ayyoub_128kbps"
  }
];

/* Cross-reciter fallback (only if all hosts for the chosen reciter fail) */
const CROSS_FALLBACK = ["alafasy","basit","ghamdi","dossari"];

/* ---------- Quran.com API ---------- */
const API_RECITERS = "https://api.quran.com/api/v4/resources/recitations?language=en";
const API_CHAPTER_RECITATIONS = id => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`;

/* ---------- Cache ---------- */
const recitationIds = {}; // { key: id }
const quranMaps     = {}; // { key: { surahNum: url } }

/* ---------- UI Boot ---------- */
hydrateReciters();
renderList();

function hydrateReciters(){
  reciterEl.innerHTML = RECITERS.map((r,i)=>`<option value="${i}">${r.label}</option>`).join("");
  reciterEl.value = "0";
}
function renderList(data = SURAH_NAMES.map((n,i)=>({number:i+1, english:n}))){
  listEl.innerHTML = "";
  data.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div><strong>${s.number}. ${s.english}</strong></div>
      <button class="primary" data-num="${s.number}">Play</button>`;
    listEl.appendChild(li);
  });
}
searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  const filtered = SURAH_NAMES
    .map((n,i)=>({number:i+1, english:n}))
    .filter(s => s.english.toLowerCase().includes(q) || String(s.number).includes(q));
  renderList(filtered);
});

/* ---------- Click-to-play ---------- */
listEl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const surah = Number(btn.dataset.num);
  const rec   = RECITERS[Number(reciterEl.value)];
  btn.textContent = "Loading…";
  const ok = await playForReciter(rec, surah);
  btn.textContent = ok ? "Now playing" : "Play";
  if (ok) setTimeout(()=>btn.textContent="Play", 1400);
});

/* ---------------- Core logic ---------------- */
async function playForReciter(rec, surah){
  status(`Trying ${rec.label} • Sūrah ${surah}…`);

  // 1) Quran.com (official)
  if (await tryQuranCom(rec, surah)) return true;

  // 2) Islamic Network (slugs)
  if (await tryIslamic(rec, surah)) return true;

  // 3) MP3Quran mirrors (single folder)
  if (await tryMp3Quran(rec, surah)) return true;

  // 3b) MP3Quran folder guesses (Juhany special case)
  if (await tryMp3QuranGuesses(rec, surah)) return true;

  // 4) EveryAyah
  if (await tryEveryAyah(rec, surah)) return true;

  // Cross-reciter fallback as a last resort so audio still plays
  for (const key of CROSS_FALLBACK){
    const r2 = RECITERS.find(x=>x.key===key);
    if (!r2 || r2.key===rec.key) continue;
    if (await tryQuranCom(r2, surah) || await tryIslamic(r2, surah) || await tryMp3Quran(r2, surah) || await tryEveryAyah(r2, surah)){
      status(`This sūrah wasn’t available for ${rec.label}. Playing from ${r2.label}.`);
      return true;
    }
  }

  status(`Couldn’t find audio for ${rec.label}, Sūrah ${surah}. Try another reciter for this one.`);
  return false;
}

/* ---- Quran.com helpers ---- */
async function ensureQuranComId(rec){
  if (recitationIds[rec.key]) return recitationIds[rec.key];
  try{
    const r = await fetch(API_RECITERS, { cache:"no-store" });
    const j = await r.json();
    const list = j.recitations || [];
    const lower = s => (s||"").toLowerCase();
    const found = list.find(it => rec.quranMatch.some(k => lower(it.reciter_name).includes(lower(k))));
    if (found){
      recitationIds[rec.key] = found.id;
      return found.id;
    }
  }catch{}
  return null;
}
async function ensureQuranMap(rec){
  if (quranMaps[rec.key]) return quranMaps[rec.key];
  const id = await ensureQuranComId(rec);
  if (!id) return null;
  try{
    const r = await fetch(API_CHAPTER_RECITATIONS(id), { cache:"no-store" });
    const j = await r.json();
    const map = {};
    (j.audio_files || []).forEach(a => { if(a.chapter_id && a.audio_url) map[a.chapter_id] = a.audio_url; });
    quranMaps[rec.key] = map;
    return map;
  }catch{}
  return null;
}
async function tryQuranCom(rec, surah){
  const map = await ensureQuranMap(rec);
  if (!map) return false;
  const url = map[surah];
  if (!url) return false;
  return await tryPlay(url, `${rec.label} (Quran.com)`);
}

/* ---- Islamic Network ---- */
async function tryIslamic(rec, surah){
  if (!rec.islamic || !rec.islamic.length) return false;
  const bitrates = [128, 64, 32];
  for (const slug of rec.islamic){
    for (const br of bitrates){
      const url = `https://cdn.islamic.network/quran/audio-surah/${br}/${slug}/${surah}.mp3`;
      if (await tryPlay(url, `${rec.label} (Islamic Network ${br}kbps)`)) return true;
    }
  }
  return false;
}

/* ---- MP3Quran (single folder) ---- */
async function tryMp3Quran(rec, surah){
  if (!rec.mp3) return false;
  const s3 = pad3(surah);
  for (const base of rec.mp3.servers || []){
    const url = `${base}/${rec.mp3.folder}/${s3}.mp3`;
    if (await tryPlay(url, `${rec.label} (MP3Quran)`)) return true;
  }
  return false;
}

/* ---- MP3Quran (folder guesses, for Juhany) ---- */
async function tryMp3QuranGuesses(rec, surah){
  if (!rec.mp3Guesses) return false;
  const s3 = pad3(surah);
  for (const guess of rec.mp3Guesses){
    for (const base of guess.servers || []){
      const url = `${base}/${guess.folder}/${s3}.mp3`;
      if (await tryPlay(url, `${rec.label} (MP3Quran guess)`)) return true;
    }
  }
  return false;
}

/* ---- EveryAyah ---- */
async function tryEveryAyah(rec, surah){
  if (!rec.everyayah) return false;
  const s3 = pad3(surah);
  const url = `https://everyayah.com/data/${rec.everyayah}/${s3}.mp3`;
  return await tryPlay(url, `${rec.label} (EveryAyah)`);
}

/* ---- Player with quick success/fail detector ---- */
async function tryPlay(url, label){
  return new Promise((resolve)=>{
    let settled = false;
    function done(ok){
      if (settled) return;
      settled = true;
      player.removeEventListener("playing", onPlay);
      player.removeEventListener("error", onErr);
      clearTimeout(t);
      resolve(ok);
    }
    function onPlay(){ status(`Now playing • ${label}`); done(true); }
    function onErr(){ done(false); }

    player.addEventListener("playing", onPlay, { once:true });
    player.addEventListener("error", onErr, { once:true });
    player.src = url;
    // Some browsers block autoplay—this is user initiated (button), so should be allowed:
    player.play().catch(()=>{});
    const t = setTimeout(()=>done(false), 7000);
  });
}
