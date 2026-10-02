(() => {
  'use strict';
  const clean = node => {
    if (!node) return '';
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[data-prediction-value], [data-player-score]').forEach(value => value.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  const number = value => /^\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(',', '.')) : null;
  const groups = [];
  let tournamentId = new URL(location.href).searchParams.get('id');
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.some(label => /^PO[Ä\uFFFD]NG$/.test(label));
    });
    if (!header) continue;
    const labels = Array.from(header.cells).map(cell => clean(cell).toUpperCase());
    const roundColumns = labels.flatMap((label, index) => /^\d+$/.test(label) ? [{ index, round: Number(label) }] : []);
    if (!roundColumns.length) continue;
    const nameIndex = labels.indexOf('NAMN');
    const clubIndex = labels.indexOf('KLUBB');
    const scoreIndex = labels.findIndex(label => /^PO[Ä\uFFFD]NG$/.test(label));
    const eloIndex = labels.findIndex(label => /^ELO(?:\s|$)/.test(label));
    const ratingIndex = eloIndex >= 0 ? eloIndex : labels.findIndex(label => /^RANKING(?:\s|$)/.test(label));
    const players = [];
    for (const row of table.rows) {
      if (row === header || !row.querySelector('.CP_White, .CP_Black, .rfrresult')) continue;
      const nameCell = row.cells[nameIndex];
      const name = clean(nameCell);
      const playerNumber = Array.from(row.cells).slice(0, nameIndex).map(clean).find(value => /^\d+$/.test(value));
      if (!playerNumber || !name || /^w\.?\s*o\.?$/i.test(name)) continue;
      const ids = (nameCell?.getAttribute('onclick') || '').match(/postshowindtournamentresultform\(['"](\d+)['"]\s*,\s*['"](\d+)['"]\)/);
      tournamentId ||= ids?.[1] || null;
      const ratingText = clean(row.cells[ratingIndex]);
      const rounds = roundColumns.map(({ index, round }) => {
        const cell = row.cells[index];
        const opponentCell = cell?.querySelector('.CP_White, .CP_Black');
        const opponentText = clean(opponentCell);
        const resultText = clean(cell?.querySelector('.rfrresult'));
        const opponentNumber = number(opponentText);
        const paired = Boolean(opponentText);
        const bye = /^(?:F|frirond|w\.?\s*o\.?)$/i.test(opponentText) || opponentNumber === 0;
        // A suffix (e.g. 1w) is retained, even when its numeric score is known.
        const scoreText = resultText.replace(/[wb+\-]$/i, '');
        const result = /^(?:½|1\/2)$/.test(scoreText) ? 0.5 : number(scoreText);
        return {
          round, opponentNumber: bye ? null : opponentNumber, opponentText,
          color: paired && !bye ? (opponentCell?.classList.contains('CP_White') ? 'white' : 'black') : null,
          bye, paired, result, resultText,
          status: !paired ? 'unpaired' : !resultText ? 'pending' : result === null ? 'special' : 'finished'
        };
      });
      players.push({
        number: Number(playerNumber), id: ids?.[2] || null, name,
        club: clean(row.cells[clubIndex]),
        rating: ratingText.match(/^\d+(?:\s*[A-Za-z])?$/) ? Number(ratingText.match(/^\d+/)[0]) : null,
        ratingText, score: number(clean(row.cells[scoreIndex])), rounds
      });
    }
    if (!players.length) continue;
    players.sort((a, b) => a.number - b.number);
    const lastPairedRound = Math.max(0, ...players.flatMap(player => player.rounds.filter(round => round.paired).map(round => round.round)));
    const totalRounds = Math.max(...roundColumns.map(column => column.round));
    groups.push({
      ratingLabel: ratingIndex >= 0 ? labels[ratingIndex] : null,
      totalRounds, lastPairedRound, nextRound: lastPairedRound < totalRounds ? lastPairedRound + 1 : null,
      players
    });
  }
  if (!groups.length) {
    alert('Kunde inte hitta någon ställning med rondhistorik. Öppna ställningen med detaljer (listingtype=2) och försök igen.');
    return;
  }
  const data = {
    schemaVersion: 1, exportedAt: new Date().toISOString(), sourceUrl: location.href,
    tournament: { id: tournamentId, name: clean(document.querySelector('h4.header')) || document.title },
    groups
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = tournamentId ? `${tournamentId}.json` : 'tournament.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
})();
