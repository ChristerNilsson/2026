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
  document.getElementById('chess-alphabetical-names')?.close();
  const dialog = document.createElement('dialog');
  dialog.id = 'chess-alphabetical-names';
  dialog.style.cssText = 'position:fixed;inset:0;box-sizing:border-box;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:16px;border:0;background:white;color:#171717;overflow:hidden';
  const host = document.createElement('div');
  host.style.cssText = 'height:100%;width:100%';
  dialog.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { font:16px system-ui; }
    .screen { height:100%;display:flex;flex-direction:column;gap:12px; }
    header { display:flex;align-items:center;justify-content:space-between;gap:16px; }
    h2 { font-size:22px;margin:0; }
    button { font:16px system-ui;padding:4px 12px;cursor:pointer; }
    main { flex:1;min-height:0;display:grid;align-items:start;column-gap:20px;overflow:hidden; }
    table { border-collapse:collapse;width:100%;white-space:nowrap;line-height:1.25; }
    th,td { text-align:left;padding:.18em .3em; }
    th { background:#e5e7eb;font-weight:600; }
    tbody tr:nth-child(even) { background:#f3f4f6; }
    th:nth-child(2),td:nth-child(2) { text-align:right; }
  `;
  const screen = document.createElement('div');
  screen.className = 'screen';
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'Alfabetisk namnlista';
  const close = document.createElement('button');
  close.textContent = 'Stäng';
  close.onclick = () => dialog.close();
  header.append(title, close);
  const lists = document.createElement('main');
  screen.append(header, lists);
  shadow.append(style, screen);
  const context = document.createElement('canvas').getContext('2d');
  const width = (text, bold = false) => {
    context.font = `${bold ? '600 ' : ''}100px system-ui`;
    return context.measureText(text).width / 100;
  };
  const nameWidths = players.map(player => width(player.name));
  const boardWidths = players.map(player => width(player.board));
  const colorWidth = Math.max(width('Vit'), width('Svart'), width('Färg', true));
  const render = (columns, size) => {
    lists.replaceChildren();
    lists.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    lists.style.fontSize = `${size}px`;
    const rows = Math.ceil(players.length / columns);
    for (let start = 0; start < players.length; start += rows) {
      const table = document.createElement('table');
      const heading = table.createTHead().insertRow();
      for (const label of ['Namn', 'Bord', 'Färg']) {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = label;
        heading.append(cell);
      }
      const body = table.createTBody();
      for (const player of players.slice(start, start + rows)) {
        const row = body.insertRow();
        for (const value of [player.name, player.board, player.color]) {
          row.insertCell().textContent = value;
        }
      }
      lists.append(table);
    }
  };
  const fit = () => {
    const availableWidth = lists.clientWidth;
    const availableHeight = lists.clientHeight;
    let best = { columns: 1, size: 0 };
    for (let columns = 1; columns <= players.length; columns++) {
      const rows = Math.ceil(players.length / columns);
      const actualColumns = Math.ceil(players.length / rows);
      const columnWidth = (availableWidth - 20 * (actualColumns - 1)) / actualColumns;
      if (columnWidth <= 0) break;
      let units = 0;
      for (let start = 0; start < players.length; start += rows) {
        units = Math.max(units,
          Math.max(width('Namn', true), ...nameWidths.slice(start, start + rows)) +
          Math.max(width('Bord', true), ...boardWidths.slice(start, start + rows)) + colorWidth + 1.8);
      }
      const size = Math.min(columnWidth / units, availableHeight / ((rows + 1) * 1.61));
      if (size > best.size) best = { columns: actualColumns, size };
    }
    let size = Math.max(0.1, Math.floor(best.size * 10) / 10 - 0.2);
    render(best.columns, size);
    // Verify actual browser dimensions, including font rounding.
    while (size > 0.1 && Array.from(lists.children).some(table =>
      table.getBoundingClientRect().bottom > lists.getBoundingClientRect().bottom ||
      table.scrollWidth > table.clientWidth ||
      table.getBoundingClientRect().width > (availableWidth - 20 * (best.columns - 1)) / best.columns + 0.1 ||
      table.getBoundingClientRect().right > lists.getBoundingClientRect().right)) {
      size = Math.max(0.1, size - 0.2);
      lists.style.fontSize = `${size}px`;
    }
  };
  let frame;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  };
  dialog.addEventListener('close', () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(frame);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
  fit();
  window.addEventListener('resize', resize);
})();
