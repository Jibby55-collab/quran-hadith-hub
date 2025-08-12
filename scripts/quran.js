/* Qur'an Player — auto-detect reciter slugs & bitrates from CDN */

/* ---------- Where the truth lives (official list) ----------
   Doc: https://alquran.cloud/cdn  (see "Audio by Surah" JSON)
   JSON of available editions+bitrates:
   https://raw.githubusercontent.com/islamic-network/cdn/master/info/cdn_surah_audio.json
------------------------------------------------------------- */

const CDN_INFO_URL = "https://raw.githubusercontent.com/islamic-network/cdn/master/info/cdn_surah_audio.json";

// Your target reciters by friendly name + keywords to match slug(s)
const DESIRED_RECITERS = [
  { name: "Mishary Alafasy",  keywords: ["alafasy"] },
  { name: "Sa’ud ash-Shuraym", keywords: ["shuraym", "shuraim", "shur"] },
  { name: "Abdur-Rahman as-Sudais", keywords: ["sudais", "alsudais", "abdulrahman"] },
  { name: "Badr Al-Turki",   keywords: ["badr", "turki"] }
];

const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");

const audioEl = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
audioEl.style.marginTop = "1rem";
document.querySelector("main.container").appendChild(audioEl);

let surahs = [];
let filtered = [];
let reciters = [];              // [{name, slug, bitrates:[...]}]
let currentReciterIndex = 0;

init();

async function init(){
  populateRecitersStaticPlaceholder();
  await Promise.all([loadSurahs(), detectReciters()]);
  renderList();
}

function populateRecitersStaticPlaceholder(){
  reciterEl.innerHTML = `<option>Loading…</option>`;
}

/* ---------- Load 114 surahs ---------- */
async function loadSurahs(){
  try{
    const res = await fetch("https://api.alquran.cloud/v1/surah");
    const json = await res.json();
    surahs = json.data.map(s => ({ number:s.number, english:s.englishName, arabic:s.name }));
  }catch{
    surahs = [
      { number: 1, english: "Al-Fātiḥah", arabic: "الفاتحة" },
      { number: 2, english: "Al-Baqarah", arabic: "البقرة" },
      { number: 112, english: "Al-Ikhlāṣ", arabic: "الإخلاص" }
    ];
  }
  filtered = surahs.slice();
}

/* ---------- Detect real slugs & bitrates from CDN JSON ---------- */
async function detectReciters(){
  let data;
  try{
    const res = await fetch(CDN_INFO_URL, { cache: "no-store" });
    data = await res.json();
  }catch{
    // Fallback: known-good Alafasy only (so user still gets audio)
    reciters = [{ name:"Mishary Alafasy", slug:"ar.alafasy", bitrates:[128,64,32] }];
    hydrateReciterDropdown();
    return;
  }

  // Normalize JSON into [{identifier, bitrates:[...]}]
  let editions = [];
  if (Array.isArray(data)) {
    editions = data;
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.editions)) editions = data.editions;
    else editions = Object.keys(data).map(k => ({ identifier:k, bitrates:data[k] }));
  }

  function findSlug(keywords){
    const lower = (s)=> String(s).toLowerCase();
    return editions.find(ed => {
      const id = lower(ed.identifier || ed.id || "");
      return keywords.some(k => id.includes(lower(k)));
    });
  }

  reciters = [];
  DESIRED_RECITERS.forEach(r=>{
    const match = findSlug(r.keywords);
    if(match){
      const bitrates = (match.bitrates || match.bitrate || match.sizes || []).map(n=>Number(n)).filter(Boolean).sort((a,b)=>b-a);
      reciters.push({ name:r.name, slug: match.identifier || match.id, bitrates: bitrates.length? bitrates : [128,64,32] });
    }
  });

  // Ensure at least one working option (Alafasy)
  if(!reciters.length){
    reciters = [{ name:"Mishary Alafasy", slug:"ar.alafasy", bitrates:[128,64,32] }];
  }

  hydrateReciterDropdown();
}

function hydrateReciterDropdown(){
  reciterEl.innerHTML = "";
  reciters.forEach((r, i)=>{
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = r.name;
    reciterEl.appendChild(opt);
  });
  reciterEl.value = "0";
  currentReciterIndex = 0;
}

/* ---------- UI Rendering ---------- */
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

/* ---------- Events ---------- */
listEl.addEventListener("click", e=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const num = Number(btn.dataset.num);
  playCurrent(num, btn);
});

reciterEl.addEventListener("change", ()=>{
  currentReciterIndex = Number(reciterEl.value);
});

searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  renderList();
});

/* ---------- Playback with smart fallback ---------- */
async function playCurrent(surahNumber, btn){
  const original = btn.textContent;
  btn.textContent = "Loading…";

  const r = reciters[currentReciterIndex] || reciters[0];
  const rates = (r && r.bitrates && r.bitrates.length) ? r.bitrates : [128,64,32];

  for (const rate of rates){
    const url = `https://cdn.islamic.network/quran/audio-surah/${rate}/${r.slug}/${surahNumber}.mp3`;
    try{
      audioEl.src = url;
      await audioEl.play();
      btn.textContent = "Now playing";
      setTimeout(()=>btn.textContent = original, 1500);
      return;
    }catch{
      // try next
    }
  }
  alert("This reciter’s file for this surah isn’t available on the CDN. Try another reciter.");
  btn.textContent = original;
}
