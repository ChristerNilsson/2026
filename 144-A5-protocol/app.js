'use strict';

const form = document.querySelector('#details');
const pages = document.querySelector('#pages');
const fields = [
  [['Tävling / match', 'event', 'wide'], ['Datum', 'date', '']],
  [['Klass / grupp', 'group', ''], ['Rond', 'round', 'small'], ['Bord', 'board', 'small'], ['Betänketid', 'time', 'wide']],
  [['Vit', 'white', 'wide'], ['Klubb', 'whiteClub', ''], ['Elo', 'whiteElo', 'small']],
  [['Svart', 'black', 'wide'], ['Klubb', 'blackClub', ''], ['Elo', 'blackElo', 'small']]
];

for (let side = 0; side < 2; side++) {
  const sheet = document.createElement('article');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-label', side === 0 ? 'Framsida, drag 1–60' : 'Baksida, drag 61–120');
  sheet.innerHTML = `
    <header class="sheet-header"><div>${side === 0 ? '<h2 class="sheet-title" data-value="heading"></h2>' : ''}</div><img class="sheet-logo" src="seniorschackstockholm.svg" alt="Arrangörens logotyp"></header>
    ${side === 0 ? `<div class="metadata">${fields.map(row => `<div class="field-row">${row.map(([label, key, size]) => `<div class="field ${size}"><span class="field-label">${label}</span><span class="field-value" data-value="${key}"></span></div>`).join('')}</div>`).join('')}<div class="score-box score-top">Poäng</div><div class="score-box score-bottom">Poäng</div></div>` : ''}
    <div class="moves">${Array.from({ length: 3 }, (_, column) => {
      const first = side * 60 + column * 20 + 1;
      return `<table aria-label="Drag ${first}–${first + 19}"><colgroup><col class="number"><col><col></colgroup><thead><tr><th scope="col" aria-label="Dragnummer"></th><th scope="col">VIT</th><th scope="col">SVART</th></tr></thead><tbody>${Array.from({ length: 20 }, (_, row) => `<tr><th scope="row">${first + row}</th><td></td><td></td></tr>`).join('')}</tbody></table>`;
    }).join('')}</div>
    ${side === 0 ? '<div class="result-row"><span>Vits underskrift:</span><span>Svarts underskrift:</span></div>' : `
      <section class="end-notes" aria-label="Schackdiagram och anteckningar">
        <svg class="chess-diagram" viewBox="0 0 88 88" role="img" aria-label="Tomt schackbräde med koordinater a till h och 1 till 8" xmlns="http://www.w3.org/2000/svg">
          ${Array.from({ length: 64 }, (_, square) => {
            const row = Math.floor(square / 8);
            const column = square % 8;
            return `<rect x="${7 + column * 10}" y="${1 + row * 10}" width="10" height="10" fill="${(row + column) % 2 ? '#d6d6d6' : '#fff'}" stroke="#555" stroke-width="0.2"/>`;
          }).join('')}
          ${Array.from({ length: 8 }, (_, index) => `<text x="3" y="${7 + index * 10}" text-anchor="middle">${8 - index}</text><text x="${12 + index * 10}" y="86" text-anchor="middle">${'abcdefgh'[index]}</text>`).join('')}
        </svg>
        <div class="note-lines" aria-label="Sju anteckningslinjer">${'<div class="note-line"></div>'.repeat(7)}</div>
      </section>`}`;
  pages.append(sheet);
}

function updateDetails() {
  const values = new FormData(form);
  document.querySelectorAll('[data-value]').forEach(element => {
    const key = element.dataset.value;
    element.textContent = values.get(key) || (key === 'heading' ? form.elements.heading.defaultValue : '');
  });
}
form.addEventListener('input', updateDetails);
form.addEventListener('submit', event => event.preventDefault());
updateDetails();
document.querySelector('#print').addEventListener('click', () => window.print());

let logoUrl;
let uploadVersion = 0;
const logoInput = document.querySelector('#logo');
const removeLogo = document.querySelector('#remove-logo');
const status = document.querySelector('#image-status');
logoInput.addEventListener('change', async () => {
  const version = ++uploadVersion;
  const file = logoInput.files[0];
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type) &&
      !(file.type === '' && /\.svg$/i.test(file.name))) {
    status.textContent = 'Välj en bild i PNG-, JPEG-, WebP- eller SVG-format.';
    logoInput.value = '';
    return;
  }
  const candidateUrl = URL.createObjectURL(file);
  const candidate = new Image();
  candidate.src = candidateUrl;
  try {
    await candidate.decode();
    if (version !== uploadVersion) { URL.revokeObjectURL(candidateUrl); return; }
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = candidateUrl;
    document.querySelectorAll('.sheet-logo').forEach(img => { img.src = logoUrl; img.hidden = false; });
    removeLogo.hidden = false;
    status.textContent = 'Bilden visas på båda sidor. Den laddas inte upp till någon server.';
  } catch {
    URL.revokeObjectURL(candidateUrl);
    if (version === uploadVersion) status.textContent = 'Bilden kunde inte läsas. Prova en annan bild.';
  }
});
removeLogo.addEventListener('click', () => {
  ++uploadVersion;
  document.querySelectorAll('.sheet-logo').forEach(img => { img.hidden = true; img.removeAttribute('src'); });
  if (logoUrl) URL.revokeObjectURL(logoUrl);
  logoUrl = undefined;
  logoInput.value = '';
  removeLogo.hidden = true;
  status.textContent = 'Bilden är borttagen.';
});
