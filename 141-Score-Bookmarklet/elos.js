(() => {
  'use strict';
  const players = [];
  const seen = new Set();
  const clean = cell => cell.textContent.replace(/\s+/g, ' ').trim();
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.some(label => /^(?:ELO|RANKING)(?:\s|$)/.test(label));
    });
    if (!header) continue;
    const labels = Array.from(header.cells).map(cell => clean(cell).toUpperCase());
    const nameIndex = labels.indexOf('NAMN');
    const eloIndex = labels.findIndex(label => /^ELO(?:\s|$)/.test(label));
    const ratingIndex = eloIndex >= 0 ? eloIndex : labels.findIndex(label => /^RANKING(?:\s|$)/.test(label));
    for (const row of table.rows) {
      if (row === header) continue;
      const nameCell = row.cells[nameIndex];
      const ratingCell = row.cells[ratingIndex];
      if (!nameCell || !ratingCell) continue;
      const name = clean(nameCell);
      if (!name || /^w\.?\s*o\.?$/i.test(name)) continue;
      const rating = clean(ratingCell);
      // RANKING can include a suffix such as S (snabb) or E.
      const elo = rating.match(/^(\d+)(?:\s*[A-Za-z])?$/)?.[1];
      if (rating && !elo && !/^[-–—]$/.test(rating)) continue;
      const action = nameCell.getAttribute('onclick') || '';
      const id = action.match(/postshowindtournamentresultform\('\d+'\s*,\s*'(\d+)'\)/)?.[1];
      const key = id || name;
      if (seen.has(key)) continue;
      seen.add(key);
      players.push({ name, elo: elo || '' });
    }
  }
  if (!players.length) {
    alert('Kunde inte hitta namn och Elo. Öppna turneringens deltagarlista eller ställningslista och försök igen.');
    return;
  }
  const text = ['Elo Namn', ...players.map(player => `${player.elo} ${player.name}`)].join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const tab = window.open(url, '_blank');
  if (!tab) {
    const link = document.createElement('a');
    const tournamentId = new URL(location.href).searchParams.get('id');
    link.href = url;
    link.download = tournamentId ? `elos-${tournamentId}.txt` : 'elos.txt';
    document.body.append(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
})();
