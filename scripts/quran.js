/* Qur'an Player — MP3Quran-first with Vercel proxy + reciter search + auto-next
   - Loads ALL reciters from /api/mp3quran (proxy for mp3quran.net)
   - Falls back to known-good reciters if API fails
   - Reciter search, surah search, auto-next, saved preferences
*/

const API_PROXY_EN = "/api/mp3quran?lang=en";
const API_PROXY_AR = "/api/mp3quran?lang=ar";

const SURAH_NAMES = [
  "Al-Fātiḥah","Al-Baqarah","Āl ʿImrān","An-Nisā’","Al-Mā’idah","Al-Anʿām","Al-Aʿrāf","Al-Anfāl","At-Tawbah","Yūnus","Hūd","Yūsuf","Ar-Raʿd","Ibrāhīm",
  "Al-Ḥijr","An-Naḥl","Al-Isrā’","Al-Kahf","Maryam","Ṭā Hā","Al-Anbiyā’","Al-Ḥajj","Al-Mu’minūn","An-Nūr","Al-Furqān","Ash-Shuʿarā’","An-Naml",
  "Al-Qaṣaṣ","Al-ʿAnkabūt","Ar-Rūm","Luqmān","As-Sajdah","Al-Aḥzāb","Saba’","Fāṭir","Yā Sīn","As-Ṣaffāt","Ṣād","Az-Zumar","Ghāfir","Fuṣṣilat",
  "Ash-Shūrā","Az-Zukhruf","Ad-Dukhān","Al-Jāthiyah","Al-Aḥqāf","Muḥammad","Al-Fatḥ","Al-Ḥujurāt","Qāf","Adh-Dhāriyāt","Aṭ-Ṭūr","An-Najm",
  "Al-Qamar","Ar-Raḥmān","Al-Wāqiʿah","Al-Ḥadīd","Al-Mujādilah","Al-Ḥashr","Al-Mumtaḥanah","Aṣ-Ṣaff","Al-Jumuʿah","Al-Munāfiqūn","At-Taghābun",
  "Aṭ-Ṭalāq","At-Taḥrīm","Al-Mulk","Al-Qalam","Al-Ḥāqqah","Al-Maʿārij","Nūḥ","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyāmah","Al-Insān",
  "Al-Mursalāt","An-Naba’","An-Nāziʿāt","ʿAbasa","At-Takwīr","Al-Infiṭār","Al-Muṭaffifīn","Al-Inshiqāq","Al-Burūj","Aṭ-Ṭāriq","Al-Aʿlā","Al-Ghāshiyah",
  "Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Aḍ-Ḍuḥā","Ash-Sharḥ","At-Tīn","Al-ʿAlaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-ʿĀdiyāt","Al-Qāriʿah",
  "At-Takāthur","Al-ʿAṣr","Al-Humazah","Al-Fīl","Quraysh","Al-Māʿūn","Al-Kawthar","Al-Kāfirūn","An-Naṣr","Al-Masad","Al-Ikhlāṣ","Al-Falaq","An-Nās"
];

// DOM
const reciterEl     = document.getElementById("reciterSelect");
const moshafWrap    = document.getElementById("moshafWrap");
const moshafEl      = document.getElementById("moshafSelect");
const reciterSearch = document.getElementById("reciterSearch");
const autoNext      = document.getElementById("autoNext");
const listEl        = document.getElementById("surahList");
const searchEl      = document.getElementById("search");
const player        = document.getElementById("player");
const nowEl         = document.getElementById("now");

// helpers
const pad3 = n => String(n).padStart(3,"0");
function status(t){ nowEl.textContent = t || ""; }
function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

// state
let allReciters       = []; // [{id,name,moshaf:[{id,name,server,surah_list}]}]
let filteredReciters  = null;
let currentReciter    = null;
let currentMoshaf     = null;
let lastPlayedSurah   = null;

// persistence
function saveState(){
  const s = { reciterName: currentReciter?.name || null,
              moshafName:  currentMoshaf?.name  || null,
              autoNext:    !!autoNext.checked };
  try { localStorage.setItem("qh_state", JSON.stringify(s)); } catch {}
}
function restoreState(){
  try { const raw = localStorage.getItem("qh_state"); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

// fetch with timeout so UI never hangs
async function fetchJson(url, timeoutMs=7000){
  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { cache:"no-store", signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(to);
    return null;
  }
}

// boot
init();
async function init(){
  status("Loading reciters…");
  const mem = restoreState(); if (mem) autoNext.checked = !!mem.autoNext;

  // Try proxy EN → AR → fallback list
  let data = await fetchJson(API_PROXY_EN);
  if (!data?.reciters) data = await fetchJson(API_PROXY_AR);

  if (data?.reciters) {
    allReciters = data.reciters.filter(r => Array.isArray(r.moshaf) && r.moshaf.length);
    status("");
  } else {
    allReciters = FALLBACK_RECITERS; // guaranteed mirrors
    status("Using fallback list (API unavailable).");
  }

  allReciters.sort((a,b)=>a.name.localeCompare(b.name));
  renderReciters(0);

  // events
  reciterEl.addEventListener("change", (e)=> onChooseReciter(Number(e.target.value)));
  moshafEl.addEventListener("change",  (e)=> onChooseMoshaf(Number(e.target.value)));
  searchEl.addEventListener("input", onSearch);
  reciterSearch.addEventListener("input", debounce(()=>{
    const q = reciterSearch.value.toLowerCase().trim();
    filteredReciters = q ? allReciters.filter(r => r.name.toLowerCase().includes(q)) : null;
    renderReciters(0);
  }, 120));

  // auto-next
  player.addEventListener("ended", ()=>{
    if (!autoNext.checked || !currentMoshaf || !lastPlayedSurah) return;
    const avail = availableSetFromMoshaf(currentMoshaf);
    let n = lastPlayedSurah + 1;
    while (n <= 114) {
      if (!avail || avail.has(n)) { playFromMoshaf(currentReciter, currentMoshaf, n); return; }
      n++;
    }
  });
}

/* ---------- reciter list / filtering ---------- */
function getActiveReciters(){
  return (filteredReciters && filteredReciters.length) ? filteredReciters : allReciters;
}

function renderReciters(selectIndex=0){
  const list = getActiveReciters();
  reciterEl.innerHTML = list.map((r,i)=>`<option value="${i}">${r.name}</option>`).join("");
  reciterEl.value = String(selectIndex);

  onChooseReciter(selectIndex);

  // restore exact reciter/style if saved
  const st = restoreState();
  if (st) {
    const idx = list.findIndex(r => r.name === st.reciterName);
    if (idx >= 0) {
      reciterEl.value = String(idx);
      onChooseReciter(idx);
      if (st.moshafName && currentReciter?.moshaf?.length) {
        const midx = currentReciter.moshaf.findIndex(m => m.name === st.moshafName);
        if (midx >= 0) { moshafEl.value = String(midx); onChooseMoshaf(midx); }
      }
    }
  }
}

function onChooseReciter(idx){
  const list = getActiveReciters();
  currentReciter = list[idx];

  if (currentReciter?.moshaf?.length){
    moshafWrap.style.display = currentReciter.moshaf.length > 1 ? "" : "none";
    moshafEl.innerHTML = currentReciter.moshaf.map((m,i)=>`<option value="${i}">${m.name || ("Style "+(i+1))}</option>`).join("");
    moshafEl.value = "0";
    onChooseMoshaf(0);
  } else {
    moshafWrap.style.display = "none";
    currentMoshaf = null;
    renderList();
  }
  saveState();
}

function onChooseMoshaf(i){
  currentMoshaf = currentReciter.moshaf[i];
  renderList();
  saveState();
}

/* ---------- list / search ---------- */
function onSearch(){
  const q = searchEl.value.toLowerCase().trim();
  renderList(q);
}

function availableSetFromMoshaf(m){
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
  const avail  = availableSetFromMoshaf(currentMoshaf); // may be null → unknown list
  const server = currentMoshaf ? currentMoshaf.server : null;

  SURAH_NAMES.forEach((name, i)=>{
    const num = i+1;
    const show = !query || name.toLowerCase().includes(query) || String(num).includes(query);
    if (!show) return;

    const li  = document.createElement("li");
    li.className = "card";

    const label = document.createElement("div");
    label.innerHTML = `<strong>${num}. ${name}</strong>`;

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Play";
    btn.dataset.num = String(num);

    const knownMissing = avail && !avail.has(num);
    if (!server || knownMissing){
      btn.disabled = true;
      btn.title = "This sūrah isn’t in this style for this reciter.";
    }

    btn.addEventListener("click", ()=> playFromMoshaf(currentReciter, currentMoshaf, num));

    li.appendChild(label);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

/* ---------- play ---------- */
async function playFromMoshaf(reciter, moshaf, surahNum){
  if (!reciter || !moshaf) return;
  const base = moshaf.server.endsWith("/") ? moshaf.server : (moshaf.server + "/");
  const url  = `${base}${pad3(surahNum)}.mp3`;
  status(`Trying ${reciter.name} • ${moshaf.name || "Style"} • Sūrah ${surahNum}…`);
  const ok = await tryPlay(url);
  if (ok) {
    lastPlayedSurah = surahNum;
  } else {
    status(`Couldn’t load from this style. Try another Style (moshaf) for ${reciter.name}.`);
  }
}

async function tryPlay(url){
  return new Promise((resolve)=>{
    let settled = false;
    function done(ok){ if (settled) return; settled = true; cleanup(); resolve(ok); }
    function cleanup(){
      player.removeEventListener("playing", onPlay);
      player.removeEventListener("error", onErr);
      clearTimeout(t);
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

/* ---------- fallback reciters if API/proxy fails ---------- */
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
