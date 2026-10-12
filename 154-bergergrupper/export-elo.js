(() => {
  const clean = value => value.replace(/\s+/g, ' ').trim();
  // Use the participant table only; round tables also contain names and ratings.
  let players = [];
  for (const table of document.querySelectorAll('table')) {
    const rows = Array.from(table.rows);
    const header = rows.find(row => {
      const labels = Array.from(row.cells, cell => clean(cell.textContent).toUpperCase());
      return labels.includes('NAMN') && labels.some(label => /^(ELO|RATING|RANKING)(\b|$)/.test(label));
    });
    if (!header) continue;
    const labels = Array.from(header.cells, cell => clean(cell.textContent).toUpperCase());
    const nameIndex = labels.indexOf('NAMN');
    const eloIndex = labels.findIndex(label => /^ELO(\b|$)/.test(label));
    const ratingIndex = eloIndex >= 0 ? eloIndex : labels.findIndex(label => /^(RATING|RANKING)(\b|$)/.test(label));
    players = rows.slice(rows.indexOf(header) + 1).flatMap(row => {
      const name = clean(row.cells[nameIndex]?.textContent || '');
      const rating = clean(row.cells[ratingIndex]?.textContent || '').replace(/\s/g, '');
      if (!name || /^(W\.?O\.?|BYE)$/i.test(name)) return [];
      if (rating && !/^\d+$/.test(rating) && !/^[-–—]$/.test(rating)) return [];
      return [{ name, elo: /^\d+$/.test(rating) ? Number(rating) : null }];
    });
    if (players.length) break;
  }
  if (!players.length) {
    alert('Hittade ingen deltagartabell med NAMN och ELO/RATING/RANKING. Öppna turneringssidan och försök igen.');
    return;
  }
  players.sort((a, b) => (b.elo ?? -1) - (a.elo ?? -1) || a.name.localeCompare(b.name, 'sv'));
  const text = players.map(player => `${player.elo ?? ''}\t${player.name}`).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  const id = new URL(location.href).searchParams.get('id');
  link.href = url;
  link.download = `spelare${id ? '-' + id.replace(/[^a-z0-9_-]/gi, '') : ''}-elo.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
})();
