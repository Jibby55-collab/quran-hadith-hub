console.log("[QuranJS] Booting + Shuraim");

const listEl    = document.getElementById("surahList");
const searchEl  = document.getElementById("search");
const reciterEl = document.getElementById("reciterSelect");
const audioEl   = document.createElement("audio");
audioEl.controls = true;
audioEl.style.width = "100%";
document.querySelector("main.container").appendChild(audioEl);

// Known-working sources:
const RECITERS = [
  { key:"alafasy", name:"Mishary Alafasy", type:"islamic", slug:"ar.alafasy" },
  { key:"shuraym", name:"Saud Al-Shuraim", type:"everyayah", folder:"AlShuraim_64kbps" }
];

// Populate dropdown
reciterEl.innerHTML = RECITERS.map((r,i)=>`<option value="${i}">${r.name}</option>`).join("");
reciterEl.value = "0";

// Load surahs
let surahs=[], filtered=[];
fetch("https://api.alquran.cloud/v1/surah",{cache:"no-store"})
  .then(r=>r.json()).then(j=>{
    surahs = j.data.map(s=>({ number:s.number, english:s.englishName, arabic:s.name }));
    filtered = surahs.slice();
    render();
    console.log("[QuranJS] Surahs:", surahs.length);
  }).catch(()=>{
    surahs = [{number:1,english:"Al-Fātiḥah",arabic:"الفاتحة"}];
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

function pad3(n){ return String(n).padStart(3,"0"); }

listEl.addEventListener("click", e=>{
  const btn = e.target.closest("button.primary");
  if(!btn) return;
  const n = Number(btn.dataset.num);
  const r = RECITERS[Number(reciterEl.value)];
  let url = "";
  if(r.type==="islamic"){
    url = `https://cdn.islamic.network/quran/audio-surah/128/${r.slug}/${n}.mp3`;
  }else if(r.type==="everyayah"){
    url = `https://everyayah.com/data/${r.folder}/${pad3(n)}.mp3`;
  }
  console.log("[QuranJS] Playing:", r.name, url);
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
