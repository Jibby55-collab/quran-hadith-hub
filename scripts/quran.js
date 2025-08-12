document.addEventListener("DOMContentLoaded", async () => {
  const reciters = [
    { name: "Mishary Rashid Alafasy", folder: "Alafasy_64kbps" },
    { name: "Saud Al-Shuraim", folder: "Shuraim_64kbps" },
    { name: "Abdurrahman As-Sudais", folder: "Sudais_64kbps" },
    { name: "Badr Al-Turki", folder: "Badr_64kbps" },
    { name: "Muhammad Ayyub", folder: "Muhammad_Ayyub_128kbps" },
    { name: "Yasser Al-Dossari", folder: "Yasser_Ad-Dussary_128kbps" },
    { name: "Abdul Basit", folder: "Abdul_Basit_Mujawwad_128kbps" }
  ];

  const reciterSelect = document.getElementById("reciterSelect");
  reciterSelect.innerHTML = reciters.map(r => `<option value="${r.folder}">${r.name}</option>`).join("");

  const surahList = document.getElementById("surahList");
  const search = document.getElementById("search");

  const surahs = await fetch("https://api.quran.sutanlab.id/surah").then(res => res.json());
  let surahData = surahs.data;

  function renderList(filter = "") {
    surahList.innerHTML = "";
    surahData
      .filter(s => s.name.transliteration.en.toLowerCase().includes(filter.toLowerCase()))
      .forEach(s => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div>
            <strong>${s.number}. ${s.name.transliteration.en}</strong> 
            <div style="opacity:0.8">${s.name.translation.en} — ${s.numberOfAyahs} ayahs</div>
          </div>
          <button data-surah="${s.number}">▶ Play</button>
        `;
        surahList.appendChild(li);
      });
  }

  renderList();

  search.addEventListener("input", e => renderList(e.target.value));

  surahList.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") {
      const surahNum = String(e.target.dataset.surah).padStart(3, "0");
      const reciterFolder = reciterSelect.value;
      const audioUrl = `https://everyayah.com/data/${reciterFolder}/${surahNum}.mp3`;

      const audio = new Audio(audioUrl);
      audio.play().catch(err => alert("Audio not available for this reciter/surah."));
    }
  });
});
