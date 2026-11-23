const settings = document.querySelector('#settings');
const groups = document.querySelector('#groups');
const size = document.querySelector('#size');
const count = document.querySelector('#count');
const printButton = document.querySelector('#print');
const sheets = document.querySelector('#sheets');
const printableWidth = 180;
const printableHeight = 267;

function renderSheets() {
  const names = groups.value.trim().split(/\s+/).filter(Boolean);
  groups.setCustomValidity(names.length ? '' : 'Ange minst ett gruppnamn.');
  printButton.disabled = !settings.checkValidity();
  sheets.replaceChildren();

  if (printButton.disabled) return;

  const side = size.valueAsNumber;
  const columns = Math.floor(printableWidth / side);
  const rows = Math.floor(printableHeight / side);
  const tilesPerPage = columns * rows;
  const tilesPerGroup = count.valueAsNumber;
  const pages = document.createDocumentFragment();

  for (const name of names) {
    for (let start = 1; start <= tilesPerGroup; start += tilesPerPage) {
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.style.setProperty('--columns', columns);
      sheet.style.setProperty('--sheet-width', `${columns * side}mm`);
      sheet.style.setProperty('--tile-size', `${side}mm`);
      sheet.style.setProperty('--tile-padding', `${side / 20}mm`);

      const end = Math.min(start + tilesPerPage - 1, tilesPerGroup);
      for (let number = start; number <= end; number++) {
        const index = number - start;
        const tile = document.createElement('div');
        tile.className = 'tile';
        if (index % columns === 0) tile.classList.add('first-column');
        if (index < columns) tile.classList.add('first-row');
        tile.textContent = name + number;
        const fontRatio = Math.min(0.6, 1.48 / tile.textContent.length);
        tile.style.setProperty('--tile-font', `${side * fontRatio}mm`);
        tile.style.setProperty('--preview-font', `${(90 * fontRatio) / columns}vw`);
        sheet.append(tile);
      }

      pages.append(sheet);
    }
  }

  sheets.append(pages);
}

settings.addEventListener('input', renderSheets);
settings.addEventListener('submit', (event) => {
  event.preventDefault();
  renderSheets();
  if (!printButton.disabled) window.print();
});

renderSheets();
