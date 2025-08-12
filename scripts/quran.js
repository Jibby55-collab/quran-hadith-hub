/* Qur'an Player — local surah list + multi-host audio fallback
   Order per play:
   1) Quran.com official chapter audio for chosen reciter
   2) Islamic Network (128 → 64 → 32; multiple slug guesses)
   3) MP3Quran mirrors (several servers)
   4) EveryAyah (if folder known)
*/

const SURAH_NAMES = [
  "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf","Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm","Al-Ḥijr","An-Naḥl","Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr","Al-Furqān","Ash-Shuʿarā’","An-Naml","Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah","Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat","Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt","Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm","Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah","Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun","Aṭ-Ṭalāq","At-Taḥrīm","Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah","Al-Insān","Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn","Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah","At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr","Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
];

// DOM
const reciterEl = document.getElementById("reciterSelect");
const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const player    = document.getElementById("player");
const nowEl     = document.getElementById("nowPlaying");

// helpers
const pad3 = n => String(n).padStart(3,"0");

// Desired reciters + known host hints
const RECITERS = [
  {
    key:"alafasy",
    label:"Mishary Rashid Alafasy",
    // Quran.com match keywords (used to find recitation id)
    quranMatch:["alafasy","mishary","rashid"],
    // islamic.network slugs (try in order)
    islamic:["ar.alafasy"],
    // mp3quran mirrors (folder + server list)
    mp3:{ folder:"afs", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net","https://server12.mp3quran.net"] },
    // everyayah folder (if any)
    everyayah:null
  },
  {
    key:"shuraym",
    label:"Saud Al-Shuraim",
    quranMatch:["shuraym","shuraim","saud"],
    islamic:["ar.saoodshuraym","ar.shuraym","ar.saudshuraim"],
    mp3:{ folder:"shur", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"AlShuraim_64kbps"
  },
  {
    key:"sudais",
    label:"Abdul Rahman As-Sudais",
    quranMatch:["sudais","alsudais","abdurrahman"],
    islamic:["ar.abdurrahmaansudais","ar.sudais","ar.abdulrahmanalsudais"],
    mp3:{ folder:"sds", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Abdurrahmaan_As-Sudais_64kbps"
  },
  {
    key:"badr",
    label:"Badr Al-Turki",
    quranMatch:["badr","turki"],
    islamic:["ar.badralturki","ar.bdr","ar.badr_al_turki"],
    mp3:{ folder:"bdr", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Badr_64kbps"
  },
  {
    key:"ayyub",
    label:"Muhammad Ayyub",
    quranMatch:["ayyub","ayyoob"],
    islamic:[],
    mp3:{ folder:"ayy", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] }, // common code, may vary
    everyayah:"Muhammad_Ayyoub_128kbps"
  },
  {
    key:"dossari",
    label:"Yasser Al-Dossari",
    quranMatch:["dossari","dosari","yasser","yasir"],
    islamic:[],
    mp3:{ folder:"yasser", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] }, // may vary
    everyayah:"Yasser_Ad-Dussary_128kbps"
  },
  {
    key:"basit",
    label:"Abdul Basit Abdus Samad",
    quranMatch:["abdul basit","abdelbaset","abdus samad","basit"],
    islamic:[],
    mp3:{ folder:"basit", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] }, // may vary
    everyayah:"Abdul_Basit_Murattal_64kbps" // or Mujawwad 128kbps on some mirrors
  }
];

// cache: quran.com recitation id -> chapter url map
const quranMaps = {};        // { reciterKey: { surahNumber: url } }
const recitationIds = {};    // { reciterKey: id }

// Build UI immediately (no external dependency)
function renderList(data = SURAH_NAMES.map((n,i)=>({number:i+1, english:n}))){
  listEl.innerHTML = "";
  data.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${s.number}. ${s.english}</strong>
      </div>
      <button class="primary" data-num="${s.number}">Play</button>`;
    listEl.appendChild(li);
  });
}

function hydrateReciters(){
  reciterEl.innerHTML = RECITERS.map((r,i)=>`<option value="${i}">${r.label}</option>`).join("");
  reciterEl.value = "0";
}

hydrateReciters();
renderList();

// Search
searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  const filtered = SURAH_NAMES
    .map((n,i)=>({number:i+1, english:n}))
    .filter(s => s.english.toLowerCase().includes(q) || String(s.number).includes(q));
  renderList(filtered);
});

// Click to play
listEl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const surah = Number(btn.dataset.num);
  const rec   = RECITERS[Number(reciterEl.value)];
  btn.textContent = "Loading…";

  try{
    const ok = await playMultiHost(rec, surah);
    if(ok) btn.textContent = "Now playing", setTimeout(()=>btn.textContent="Play", 1400);
    else   btn.textContent = "Play";
  }catch{
    btn.textContent = "Play";
  }
});

function status(msg){ nowEl.textContent = msg || ""; }

/* ----------------- Core: multi-host attempt ----------------- */
async function playMultiHost(rec, surah){
  status(`Trying ${rec.label} • Sūrah ${surah}…`);

  // 1) Quran.com (official)
  const okQ = await tryQuranCom(rec, surah);
  if (okQ) return true;

  // 2) Islamic Network (bitrates & slugs)
  const okI = await tryIslamic(rec, surah);
  if (okI) return true;

  // 3) MP3Quran mirrors
  const okM = await tryMp3Quran(rec, surah);
  if (okM) return true;

  // 4) EveryAyah
  const okE = await tryEveryAyah(rec, surah);
  if (okE) return true;

  status(`Couldn’t find audio for ${rec.label}, Sūrah ${surah}. Try another reciter for this one.`);
  return false;
}

/* ---- Quran.com helpers ---- */
const API_RECITERS = "https://api.quran.com/api/v4/resources/recitations?language=en";
const API_CHAPTER_RECITATIONS = id => `https://api.quran.com/api/v4/chapter_recitations/${id}?language=en`;

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
  return await tryPlay(url, `${rec.label} (Quran.com) • Sūrah ${surah}`);
}

/* ---- Islamic Network ---- */
async function tryIslamic(rec, surah){
  if (!rec.islamic || !rec.islamic.length) return false;
  const bitrates = [128, 64, 32];
  for (const slug of rec.islamic){
    for (const br of bitrates){
      const url = `https://cdn.islamic.network/quran/audio-surah/${br}/${slug}/${surah}.mp3`;
      if (await tryPlay(url, `${rec.label} (Islamic Network) • ${br}kbps`)) return true;
    }
  }
  return false;
}

/* ---- MP3Quran ---- */
async function tryMp3Quran(rec, surah){
  if (!rec.mp3) return false;
  const s3 = pad3(surah);
  for (const base of rec.mp3.servers || []){
    const url = `${base}/${rec.mp3.folder}/${s3}.mp3`;
    if (await tryPlay(url, `${rec.label} (MP3Quran)`)) return true;
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

/* ---- Player ---- */
async function tryPlay(url, label){
  // quick probe with fetch HEAD (some hosts don’t like HEAD; if it fails we
