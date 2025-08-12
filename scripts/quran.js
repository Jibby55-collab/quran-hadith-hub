const reciters = [
  { name: "Mishary Alafasy", path: "MisharyRashidAlafasy_64kbps" },
  { name: "Saud Al-Shuraim", path: "SaudAlShuraim_64kbps" },
  { name: "Abdurrahman As-Sudais", path: "Abdurrahman_As-Sudais_64kbps" },
  { name: "Muhammad Ayyub", path: "Muhammad_Ayyub_64kbps" },
  { name: "Yasser Al-Dossari", path: "Yasser_Ad-Dussary_64kbps" },
  { name: "Abdul Basit", path: "Abdul_Basit_Murattal_64kbps" }
];

const surahs = Array.from({ length: 114 }, (_, i) => ({
  number: String(i + 1).padStart(3, "0"),
  name: `Surah ${i + 1}`
}));

function populateReciters() {
  const select = document.getElementById("reciterSelect");
  select.innerHTML = "";
  reciters.forEach(r => {
    const option = document.createElement("option");
    option.value = r.path;
    option.textContent = r.name;
    select.appendChild(option);
  });
}

function populateSurahs() {
  const list = document.getElementById("surahList");
  list.innerHTML = "";
  const reciterPath = document.getElementById("reciterSelect").value;
  
  surahs.forEach(s => {
    const li = document.createElement("li");
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = `https://everyayah.com/data/${reciterPath}/${s.number}.mp3`;
    li.textContent = s.name + " ";
    li.appendChild(audio);
    list.appendChild(li);
  });
}

document.getElementById("reciterSelect").addEventListener("change", populateSurahs);

populateReciters();
populateSurahs();
