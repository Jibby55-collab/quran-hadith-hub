/* Qur'an Player (MP3Quran-first)
   - Loads ALL reciters from mp3quran.net API
   - For each reciter, uses their "moshaf" (style) which defines a base `server` and a `surah_list`
   - Audio URL = `${server}${NNN}.mp3` (NNN = 001..114)
   - If the API fails (CORS/network), we fall back to a small curated set with known-good servers.
*/

const API_EN = "https://www.mp3quran.net/api/v3/reciters?language=en";
const API_AR = "https://www.mp3quran.net/api/v3/reciters?language=ar";

const SURAH_NAMES = [
  "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf","Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm","Al-Ḥijr","An-Naḥl","Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr","Al-Furqān","Ash-Shuʿarā’","An-Naml","Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah","Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat","Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt","Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm","Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah","Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun","Aṭ-Ṭalāq","At-Taḥrīm","Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah","Al-Insān","Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn","Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah","At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr","Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
];

// DOM
const reciterEl = document.getElementById("reciterSelect");
const moshafWrap = document.getElementById("moshafWrap");
const moshafEl  = document.getElementById("moshafSelect");
const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const player    = document.getElementById("player");
const nowEl     = document.getElementById("now");

const pad3 = n => String(n).padStart(3,"0");
function status(t){ nowEl.textContent = t || ""; }

// Global state
let allReciters = []; // [{id,name,moshaf:[{id,name,server,surah_list}]}]
let currentReciter = null;
let currentMoshaf  = null;

// Boot
init();

async function init(){
  // Try English API → then Arabic API → then fallback hardcoded
  let data = await fetchJson(API_EN);
  if (!data || !data.reciters) data = await fetchJson(API_AR);
  if (data && data.reciters) {
    allReciters = data.reciters.filter(r => Array.isArray(r.moshaf) && r.moshaf.length);
  } else {
    // Fallback minimal set (guaranteed servers)
    allReciters = FALLBACK_RECITERS;
  }

  // Sort by name (stable)
  allReciters.sort((a,b)=>a.name.localeCompare(b.name));

  // Populate reciter dropdown
  reciterEl.innerHTML = allReciters.map((r,i)=>`<option value="${i}">${r.name}</option>`).join("");
  reciterEl.value = "0";
  onChooseReciter(0);

  // Bind events
  reciterEl.addEventListener("change", (e)=> onChooseReciter(Number(e.target.value)));
  moshafEl.addEventListener("change",  (e)=> onChooseMoshaf(Number(e.target.value)));
  searchEl.addEventListener("input", onSearch);
}

async function fetchJson(url){
  try{
    const r = await fetch(url, { cache:"no-store" });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

function onChooseReciter(idx){
  currentReciter = allReciters[idx];
  // Some reciters have multiple moshaf (styles); pick the first by default
  if (currentReciter && currentReciter.moshaf && currentReciter.moshaf.length){
    moshafWrap.style.display = currentReciter.moshaf.length > 1 ? "" : "none";
    moshafEl.innerHTML = currentReciter.moshaf.map((m,i)=>`<option value="${i}">${m.name || ("Style "+(i+1))}</option>`).join("");
    moshafEl.value = "0";
    onChooseMoshaf(0);
  } else {
    moshafWrap.style.display = "none";
    currentMoshaf = null;
    renderList(); // still render 1–114, but buttons will be disabled
  }
}

function onChooseMoshaf(i){
  currentMoshaf = currentReciter.moshaf[i];
  renderList();
}

function onSearch(){
  const q = searchEl.value.toLowerCase().trim();
  renderList(q);
}

function availableSetFromMoshaf(m){
  // m.surah_list is e.g. "1,2,3,..." (string) — create a Set of numbers
  if (!m || !m.surah_list) return null;
  const set = new Set();
  m.surah_list.split(",").forEach(s=>{
    const n = parseInt(s.trim(), 10);
    if (!isNaN(n)) set.add(n);
  });
  return set.size ? set : null;
}

function renderList(query=""){
  listEl.innerHTML = "";
  const avail = availableSetFromMoshaf(currentMoshaf); // may be null → unknown list (we still try)
  const server = currentMoshaf ? currentMoshaf.server : null;

  SURAH_NAMES.forEach((name, i)=>{
    const num = i+1;
    const show = !query ||
      name.toLowerCase().includes(query) ||
      String(num).includes(query);
    if (!show) return;

    const li = document.createElement("li");
    li.className = "card";

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Play";
    btn.dataset.num = String(num);

    // Disable if we know it’s unavailable for this moshaf
    const knownMissing = avail && !avail.has(num);
    if (!server || knownMissing){
      btn.disabled = true;
      btn.title = "This surah isn’t in this style for this reciter.";
    }

    btn.addEventListener("click", ()=> playFromMoshaf(currentReciter, currentMoshaf, num));

    const label = document.createElement("div");
    label.innerHTML = `<strong>${num}. ${name}</strong>`;

    li.appendChild(label);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

async function playFromMoshaf(reciter, moshaf, surahNum){
  if (!reciter || !moshaf) return;
  const base = moshaf.server.endsWith("/") ? moshaf.server : (moshaf.server + "/");
  const url = `${base}${pad3(surahNum)}.mp3`;
  status(`Trying ${reciter.name} • ${moshaf.name || "Style"} • Sūrah ${surahNum}…`);
  const ok = await tryPlay(url);
  if (!ok){
    status(`Couldn’t load from this style. If available, pick a different style (moshaf) for ${reciter.name}.`);
  }
}

/* Simple player with quick success/fail signal */
async function tryPlay(url){
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
    function onPlay(){ status(`Now playing • ${url.split("/").slice(0,4).join("/")}/…`); done(true); }
    function onErr(){ done(false); }

    player.addEventListener("playing", onPlay, { once:true });
    player.addEventListener("error", onErr, { once:true });
    player.src = url;
    player.play().catch(()=>{});
    const t = setTimeout(()=>done(false), 7000);
  });
}

/* Fallback reciters if the API is down or blocked by CORS.
   Each has a minimal moshaf array with a known-good `server` and a generic name. */
const FALLBACK_RECITERS = [
  {
    id: 10001, name: "Mishary Rashid Alafasy",
    moshaf: [{ id: 1, name: "Murattal 64kbps", server: "https://server8.mp3quran.net/afs/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10002, name: "Saud Al-Shuraim",
    moshaf: [{ id: 1, name: "Murattal 64kbps", server: "https://server8.mp3quran.net/shur/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10003, name: "Abdul Rahman As-Sudais",
    moshaf: [{ id: 1, name: "Murattal 64kbps", server: "https://server8.mp3quran.net/sds/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10004, name: "Yasser Al-Dossari",
    moshaf: [{ id: 1, name: "Murattal", server: "https://server8.mp3quran.net/yasser/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10005, name: "Abdul Basit Abdus Samad",
    moshaf: [{ id: 1, name: "Murattal 64kbps", server: "https://server8.mp3quran.net/basit/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10006, name: "Saad Al-Ghamdi",
    moshaf: [{ id: 1, name: "Murattal", server: "https://server8.mp3quran.net/gmd/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10007, name: "Muhammad Ayyub",
    moshaf: [{ id: 1, name: "Murattal", server: "https://server8.mp3quran.net/ayy/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  },
  {
    id: 10008, name: "Abdullah Al-Juhany",
    moshaf: [{ id: 1, name: "Murattal (mirror)", server: "https://server11.mp3quran.net/jhn/", surah_list: Array.from({length:114},(_,i)=>i+1).join(",") }]
  }
];
