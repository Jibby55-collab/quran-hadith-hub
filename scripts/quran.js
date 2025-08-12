/* Qur'an Player — local surah list + multi-host audio
   Tries in order for each reciter/surah:
   1) Islamic Network (128 -> 64 -> 32, multiple slugs)
   2) MP3Quran (several servers)
   3) EveryAyah (if we know the folder)

   NOTE: If a specific track is missing on all hosts, you’ll see a message.
   Tell me the reciter + surah number and I’ll tweak that one’s path/host.
*/

/* ---------- Local Surah Names (no API needed) ---------- */
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
function status(txt){ nowEl.textContent = txt || ""; }

/* ---------- Reciters + host hints ---------- */
const RECITERS = [
  {
    key:"alafasy",
    label:"Mishary Rashid Alafasy",
    islamic:["ar.alafasy"],
    mp3:{ folder:"afs", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net","https://server12.mp3quran.net"] },
    everyayah:null
  },
  {
    key:"shuraym",
    label:"Saud Al-Shuraim",
    islamic:["ar.saoodshuraym","ar.shuraym","ar.saudshuraim"],
    mp3:{ folder:"shur", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"AlShuraim_64kbps"
  },
  {
    key:"sudais",
    label:"Abdul Rahman As-Sudais",
    islamic:["ar.abdurrahmaansudais","ar.sudais","ar.abdulrahmanalsudais"],
    mp3:{ folder:"sds", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Abdurrahmaan_As-Sudais_64kbps"
  },
  {
    key:"badr",
    label:"Badr Al-Turki",
    islamic:["ar.badralturki","ar.bdr","ar.badr_al_turki"],
    mp3:{ folder:"bdr", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Badr_64kbps"
  },
  {
    key:"ayyub",
    label:"Muhammad Ayyub",
    islamic:[],
    mp3:{ folder:"ayy", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Muhammad_Ayyoub_128kbps"
  },
  {
    key:"dossari",
    label:"Yasser Al-Dossari",
    islamic:[],
    mp3:{ folder:"yasser", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Yasser_Ad-Dussary_128kbps"
  },
  {
    key:"basit",
    label:"Abdul Basit Abdus Samad",
    islamic:[],
    mp3:{ folder:"basit", servers:["https://server8.mp3quran.net","https://server11.mp3quran.net"] },
    everyayah:"Abdul_Basit_Murattal_64kbps"
  }
];

/* ---------- Build UI ---------- */
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
hydrateReciters();
renderList();

/* ---------- Search ---------- */
searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  const filtered = SURAH_NAMES
    .map((n,i)=>({number:i+1, english:n}))
    .filter(s => s.english.toLowerCase().includes(q) || String(s.number).includes(q));
  renderList(filtered);
});

/* ---------- Click to play ---------- */
listEl.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const surah = Number(btn.dataset.num);
  const rec   = RECITERS[Number(reciterEl.value)];
  btn.textContent = "Loading…";
  const ok = await playMultiHost(rec, surah);
  btn.textContent = ok ? "Now playing" : "Play";
  if (ok) setTimeout(()=>btn.textContent="Play", 1400);
});

/* ---------- Core: multi-host attempts ---------- */
async function playMultiHost(rec, surah){
  status(`Trying ${rec.label} • Sūrah ${surah}…`);

  // 1) Islamic Network
  if (await tryIslamic(rec, surah)) return true;

  // 2) MP3Quran mirrors
  if (await tryMp3Quran(rec, surah)) return true;

  // 3) EveryAyah
  if (await tryEveryAyah(rec, surah)) return true;

  status(`Couldn’t find audio for ${rec.label}, Sūrah ${surah}. Try another reciter for this one.`);
  return false;
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

/* ---- Unified player wrapper ---- */
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
    player.play().catch(()=>{});
    const t = setTimeout(()=>done(false), 6000); // safety timeout
  });
}
