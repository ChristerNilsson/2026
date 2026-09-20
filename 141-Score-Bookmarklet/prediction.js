(() => {
  'use strict';
  const clean = cell => cell?.textContent.replace(/\s+/g, ' ').trim() || '';
  const rating = cell => Number(clean(cell).match(/^\d+/)?.[0]) || null;
  const format = score => score.toFixed(2).replace('.', ',');
  const roundNumber = label => /^(?:ROND\s*)?(\d+)$/.exec(label)?.[1];

  // Restore the page before calculating again, so a second click updates the same cells.
  document.querySelectorAll('[data-prediction-value]').forEach(node => node.remove());
  document.querySelectorAll('[data-prediction-column]').forEach(node => node.remove());
  let tables = 0, predictions = 0;
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.includes('POÄNG') && labels.some(label => roundNumber(label));
    });
    if (!header) continue;
    tables++;
    let position = 0;
    const headings = Array.from(header.cells).map((cell, index) => {
      const heading = { label: clean(cell).toUpperCase(), index, position, span: cell.colSpan || 1 };
      position += heading.span;
      return heading;
    });
    const nameHeading = headings.find(item => item.label === 'NAMN');
    const nameIndex = nameHeading.position + nameHeading.span - 1;
    const scoreHeading = headings.find(item => item.label === 'POÄNG');
    const scoreIndex = scoreHeading.position;
    const rankingIndex = headings.find(item => /^(?:RANKING|ELO)(?:\s|$)/.test(item.label))?.position ?? -1;
    const columns = headings.map(item => ({ round: roundNumber(item.label), index: item.position }))
      .filter(column => column.round !== undefined);
    const players = new Map();
    for (const row of table.rows) {
      if (row === header) continue;
      const number = Number(clean(row.cells[nameIndex - 1]));
      if (!Number.isInteger(number) || number < 1) continue;
      players.set(number, { row, elo: rankingIndex < 0 ? null : rating(row.cells[rankingIndex]),
        total: 0 });
    }

    const cellParts = cell => {
      if (!cell) return [];
      const parts = [];
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) parts.push(...walker.currentNode.textContent.trim().match(/\d+|½|[A-Za-z]+/g) || []);
      return parts;
    };
    const opponentNumber = cell => Number(cellParts(cell).find(part => /^\d+$/.test(part))) || null;
    // A round cell begins with two small numbers (opponent and pairing data).
    // A played result adds a third number, or a half-point/forfeit marker.
    const hasResult = cell => {
      if (!cell) return true;
      const parts = cellParts(cell);
      if (parts.includes('½') || /\b(?:0|1)[.,]5\b|\b(?:0|1)w\b/i.test(clean(cell))) return true;
      return parts.filter(part => /^\d+$/.test(part)).length > 2;
    };
    for (const { index } of columns) {
      for (const [number, player] of players) {
        const cell = player.row.cells[index];
        const otherNumber = opponentNumber(cell);
        if (!otherNumber || otherNumber <= number || hasResult(cell)) continue;
        const other = players.get(otherNumber);
        const otherCell = other?.row.cells[index];
        if (!otherCell || opponentNumber(otherCell) !== number || hasResult(otherCell)) continue;
        if (player.elo === null || other.elo === null) continue;
        const expected = 1 / (1 + 10 ** ((other.elo - player.elo) / 400));
        for (const [target, value] of [[player, expected], [other, 1 - expected]]) {
          const span = document.createElement('span');
          span.dataset.predictionValue = '';
          span.textContent = format(value);
          span.style.fontStyle = 'italic';
          span.style.display = 'inline-block';
          target.row.cells[index].append(span);
          target.total += value;
          predictions++;
        }
      }
    }
    const heading = document.createElement('th');
    heading.textContent = 'PRED POÄNG';
    heading.className = 'listheader js-sort-number';
    heading.scope = 'col';
    heading.dataset.predictionColumn = '';
    header.cells[scoreHeading.index].after(heading);
    for (const player of players.values()) {
      const actual = clean(player.row.cells[scoreIndex]);
      if (!/^\d+(?:[.,]\d+)?$/.test(actual)) continue;
      const cell = document.createElement('td');
      cell.className = 'listrighttext';
      cell.dataset.predictionColumn = '';
      cell.style.textAlign = 'right';
      cell.textContent = format(Number(actual.replace(',', '.')) + player.total);
      player.row.cells[scoreIndex].after(cell);
    }
  }
  if (!tables) alert('Kunde inte hitta ställningslistan med spelare och ronder.');
  else if (!predictions) {
    const table = Array.from(document.querySelectorAll('table')).find(item =>
      Array.from(item.rows).some(row => Array.from(row.cells).some(cell => clean(cell).toUpperCase() === 'POÄNG')));
    const rows = Array.from(table?.rows || []);
    const abbas = rows.find(row => Array.from(row.cells).some(cell => /Abbas Razavi/i.test(clean(cell))));
    const lars = rows.find(row => Array.from(row.cells).some(cell => /Lars A W Anderson/i.test(clean(cell))));
    const details = [abbas, lars].filter(Boolean).map(row =>
      Array.from(row.cells).map((cell, index) => `${index}: ${cell.outerHTML.slice(0, 280)}`).join('\n')).join('\n---\n');
    prompt('Inga prediktioner placerades. Kopiera diagnostiken och skicka den hit:', details.slice(0, 3500));
  }
})();
