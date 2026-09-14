(() => {
  'use strict';
  const playerId = cell => {
    const action = cell.getAttribute('onclick') || '';
    return action.match(/postshowindtournamentresultform\('\d+'\s*,\s*'(\d+)'\)/)?.[1]
      || action.match(/[?&]partid=(\d+)/)?.[1];
  };
  const scores = new Map();
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row =>
      Array.from(row.cells).some(cell => cell.textContent.trim().toUpperCase() === 'POÄNG'));
    if (!header) continue;
    const index = Array.from(header.cells).findIndex(cell => cell.textContent.trim().toUpperCase() === 'POÄNG');
    for (const row of table.rows) {
      const id = Array.from(row.cells).map(playerId).find(Boolean);
      const score = row.cells[index]?.textContent.trim();
      if (id && score && /^\d+(?:[.,]\d+)?$/.test(score)) scores.set(id, score);
    }
  }
  let count = 0;
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => cell.textContent.trim().toUpperCase());
      return labels.includes('BORD') && labels.includes('VIT') && labels.includes('SVART');
    });
    if (!header) continue;
    table.querySelectorAll('[data-player-score], [data-score-column]').forEach(node => node.remove());
    const positions = Array.from(header.cells)
      .map((cell, index) => ({ index, name: cell.textContent.trim().toUpperCase() }))
      .filter(({ name }) => name === 'VIT' || name === 'SVART')
      .reverse();
    for (const row of table.rows) {
      for (const { index, name } of positions) {
        const playerCell = row.cells[index];
        if (!playerCell) continue;
        if (row !== header && !row.querySelector('td[onclick]')) continue;
        const cell = document.createElement(row === header ? 'th' : 'td');
        cell.dataset.scoreColumn = name;
        cell.className = row === header ? 'listheader' : 'listrighttext';
        cell.style.padding = '0 0.6em';
        cell.style.textAlign = 'right';
        if (row === header) {
          cell.textContent = 'POÄNG';
          cell.scope = 'col';
        } else {
          const score = scores.get(playerId(playerCell));
          cell.textContent = score ?? '';
          if (score !== undefined) count++;
        }
        playerCell.after(cell);
      }
    }
  }
  if (!count) alert('Kunde inte hitta poäng och bordslista. Öppna turneringssidan med båda listorna och försök igen.');
})();
