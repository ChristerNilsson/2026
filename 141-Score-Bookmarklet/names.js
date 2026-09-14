(() => {
  'use strict';
  const players = [];
  const cleanName = cell => {
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('[data-player-score]').forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => cell.textContent.trim().toUpperCase());
      return ['BORD', 'VIT', 'SVART'].every(label => labels.includes(label));
    });
    if (!header) continue;
    const labels = Array.from(header.cells).map(cell => cell.textContent.trim().toUpperCase());
    for (const row of table.rows) {
      if (row === header) continue;
      const board = row.cells[labels.indexOf('BORD')]?.textContent.trim();
      if (!board || !/^\d+$/.test(board)) continue;
      for (const [label, color] of [['VIT', 'Vit'], ['SVART', 'Svart']]) {
        const cell = row.cells[labels.indexOf(label)];
        if (!cell) continue;
        const action = cell.getAttribute('onclick') || '';
        if (/[?&]partid=-1(?:\D|$)/.test(action)) continue;
        const name = cleanName(cell);
        if (!name || /^w\.?o\.?$/i.test(name)) continue;
        players.push({ name, board, color });
      }
    }
  }
  if (!players.length) {
    alert('Kunde inte hitta någon bordslista. Öppna turneringens bordslista och försök igen.');
    return;
  }
  const collator = new Intl.Collator('sv', { sensitivity: 'base', numeric: true });
  players.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.board, b.board));
  document.getElementById('chess-alphabetical-names')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'chess-alphabetical-names';
  dialog.style.cssText = 'background:white;color:#171717;border:1px solid #aaa;border-radius:8px;padding:24px;max-width:90vw;max-height:85vh;overflow:auto;font:16px system-ui';
  const close = document.createElement('button');
  close.textContent = 'Stäng';
  close.style.cssText = 'float:right;font:inherit;padding:4px 12px;cursor:pointer';
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  const title = document.createElement('h2');
  title.textContent = 'Alfabetisk namnlista';
  title.style.cssText = 'font: bold 22px system-ui;margin:0 80px 16px 0';
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse:collapse;width:100%;font:inherit;color:inherit';
  const heading = table.createTHead().insertRow();
  for (const label of ['Namn', 'Bord', 'Färg']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    cell.style.cssText = 'text-align:left;padding:8px 16px;border-bottom:2px solid #777';
    heading.append(cell);
  }
  const body = table.createTBody();
  for (const player of players) {
    const row = body.insertRow();
    for (const value of [player.name, player.board, player.color]) {
      const cell = row.insertCell();
      cell.textContent = value;
      cell.style.cssText = 'text-align:left;padding:6px 16px;border-bottom:1px solid #ddd';
    }
  }
  dialog.append(close, title, table);
  document.body.append(dialog);
  dialog.showModal();
})();
