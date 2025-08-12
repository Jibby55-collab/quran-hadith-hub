// Minimal baseline: Mishary only + full surah list
console.log("[QuranJS] Booting minimal");

const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");
const audioEl   = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
document.querySelector("main.container").appendChild(audioEl);

// populate reciter
const RECITERS = [{ name: "Mishary Alafasy", slug: "ar.alafasy" }];
reciterEl.innerHTML = `<option value="0">Mishary Alafasy</option>`;

// load surahs
let surahs = [], filtered = [];
fetch("https://api.alquran.cloud/v1/surah", { cache:"no-store" })
  .then(r=>r.json()).then(j=>{
    surahs = j.data.map(s=>({ number:s.number, english:s.englishName, arabic:s.name }));
    filtered = surahs.slice();
    render();
    console.log("[QuranJS] Surahs loaded:", surahs.length);
  }).catch(()=>{
    surahs = [
      { number: 1, english: "Al-Fātiḥah", arabic: "الفاتحة" },
      { number: 2, english: "Al-Baqarah", arabic: "البقرة" },
      { number: 112, english: "Al-Ikhlāṣ", arabic: "الإخلاص" }
    ];
    filtered = surahs.slice();
    render();
  });

function render(){
  listEl.innerHTML = "";
  filtered.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${s.number}. ${s.english}</strong>
        <div style="font-family:'Amiri', serif; opacity:.85">${s.arabic}</div>
      </div>
      <button class="primary" data-num="${s.number}">Play</button>`;
    listEl.appendChild(li);
  });
}

listEl.addEventListener("click", e=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const n = Number(btn.dataset.num);
  const url = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${n}.mp3`;
  console.log("[QuranJS] Playing:", url);
  audioEl.src = url;
  audioEl.play().catch(()=>{});
});

searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.toLowerCase().trim();
  filtered = surahs.filter(s =>
    String(s.number).includes(q) ||
    s.english.toLowerCase().includes(q) ||
    s.arabic.includes(q)
  );
  render();
});
