(() => {
  'use strict';
  const clean = cell => cell?.textContent.replace(/\s+/g, ' ').trim() || '';
  const id = cell => (cell?.getAttribute('onclick') || '').match(/postshowindtournamentresultform\('\d+'\s*,\s*'(\d+)'\)/i)?.[1];
  const elo = cell => Number(clean(cell).match(/^\d+/)?.[0]) || null;
  const format = value => value.toFixed(2).replace('.', ',');
  const standings = [];
  const rounds = new Set();
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.includes('POÄNG') && labels.some(label => /^(?:ROND\s*)?\d+$/.test(label));
    });
    if (!header) continue;
    const labels = Array.from(header.cells).map(cell => clean(cell).toUpperCase());
    const columns = new Map();
    labels.forEach((label, index) => {
      const match = label.match(/^(?:ROND\s*)?(\d+)$/);
      if (match) { columns.set(Number(match[1]), index); rounds.add(Number(match[1])); }
    });
    standings.push({ table, header, columns, name: labels.indexOf('NAMN'),
      score: labels.indexOf('POÄNG'), elo: labels.findIndex(label => /^ELO(?:\s|$)/.test(label)) });
  }
  if (!standings.length) {
    alert('Kunde inte hitta en ställningslista med spelare och ronder.');
    return;
  }
  const players = new Map();
  for (const info of standings) for (const row of info.table.rows) {
    if (row === info.header) continue;
    const player = Array.from(row.cells).map(id).find(Boolean);
    if (player) players.set(player, { row, info, elo: info.elo < 0 ? null : elo(row.cells[info.elo]) });
  }
  const games = page => {
    const found = [];
    for (const table of page.querySelectorAll('table')) {
      const header = Array.from(table.rows).find(row => {
        const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
        return ['BORD', 'VIT', 'SVART', 'RESULTAT'].every(label => labels.includes(label));
      });
      if (!header) continue;
      const labels = Array.from(header.cells).map(cell => clean(cell).toUpperCase());
      const white = labels.indexOf('VIT'), black = labels.indexOf('SVART');
      const result = labels.indexOf('RESULTAT'), board = labels.indexOf('BORD');
      const whiteElo = labels.indexOf('ELO'), blackElo = labels.indexOf('ELO', whiteElo + 1);
      for (const row of table.rows) {
        if (row === header || !/^\d+$/.test(clean(row.cells[board]))) continue;
        const w = id(row.cells[white]), b = id(row.cells[black]);
        if (w && b) found.push({ w, b, result: clean(row.cells[result]),
          we: whiteElo < 0 ? null : elo(row.cells[whiteElo]),
          be: blackElo < 0 ? null : elo(row.cells[blackElo]) });
      }
    }
    return found;
  };
  const roundLinks = new Map();
  for (const element of document.querySelectorAll('[onclick], a[href]')) {
    const source = `${element.getAttribute('onclick') || ''} ${element.getAttribute('href') || ''}`;
    const match = source.match(/ShowTournamentServlet\?[^'"\s]*[?&]round=(\d+)/i);
    if (match) roundLinks.set(Number(match[1]), new URL(match[0], location.href));
  }
  const base = new URL(location.href);
  base.searchParams.delete('listingtype');
  (async () => {
    const byRound = new Map(), failures = [];
    await Promise.all(Array.from(rounds).map(async round => {
      try {
        const url = new URL(roundLinks.get(round) || base);
        url.searchParams.delete('listingtype');
        url.searchParams.set('round', round);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        byRound.set(round, games(new DOMParser().parseFromString(await response.text(), 'text/html')));
      } catch { failures.push(round); }
    }));
    document.querySelectorAll('[data-prediction]').forEach(cell => {
      cell.textContent = cell.dataset.predictionOriginal;
      cell.style.fontStyle = cell.dataset.predictionStyle;
      delete cell.dataset.prediction;
      delete cell.dataset.predictionOriginal;
      delete cell.dataset.predictionStyle;
    });
    document.querySelectorAll('[data-prediction-column]').forEach(cell => cell.remove());
    const totals = new Map();
    let count = 0;
    for (const [round, items] of byRound) for (const game of items) {
      if (game.result && !/^[-–—?]$/.test(game.result)) continue;
      const we = players.get(game.w)?.elo ?? game.we;
      const be = players.get(game.b)?.elo ?? game.be;
      if (we === null || be === null) continue;
      const white = 1 / (1 + 10 ** ((be - we) / 400));
      for (const [playerId, score] of [[game.w, white], [game.b, 1 - white]]) {
        const player = players.get(playerId);
        const index = player?.info.columns.get(round);
        const cell = index === undefined ? null : player.row.cells[index];
        if (!cell || !/^(?:|[-–—?])$/.test(clean(cell))) continue;
        cell.dataset.predictionOriginal = cell.textContent;
        cell.dataset.predictionStyle = cell.style.fontStyle;
        cell.dataset.prediction = '';
        cell.textContent = format(score);
        cell.style.fontStyle = 'italic';
        totals.set(playerId, (totals.get(playerId) || 0) + score);
        count++;
      }
    }
    for (const info of standings) {
      const heading = document.createElement('th');
      heading.textContent = 'PRED POÄNG';
      heading.className = 'listheader js-sort-number';
      heading.scope = 'col';
      heading.dataset.predictionColumn = '';
      info.header.cells[info.score].after(heading);
      for (const row of info.table.rows) {
        if (row === info.header) continue;
        const player = Array.from(row.cells).map(id).find(Boolean), actual = clean(row.cells[info.score]);
        if (!player || !/^\d+(?:[.,]\d+)?$/.test(actual)) continue;
        const cell = document.createElement('td');
        cell.className = 'listrighttext';
        cell.dataset.predictionColumn = '';
        cell.style.textAlign = 'right';
        cell.textContent = format(Number(actual.replace(',', '.')) + (totals.get(player) || 0));
        row.cells[info.score].after(cell);
      }
    }
    if (!count) alert('Inga ospelade partier med känd Elo och lottning hittades.');
    if (failures.length) alert(`Kunde inte hämta rond ${failures.join(', ')}. Predikterad poäng kan vara ofullständig.`);
  })();
})();
