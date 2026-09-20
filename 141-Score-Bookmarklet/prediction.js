(() => {
  'use strict';
  const clean = cell => cell?.textContent.replace(/\s+/g, ' ').trim() || '';
  const format = score => score.toFixed(2).replace('.', ',');

  // Restore values from an earlier click before calculating from the current page.
  document.querySelectorAll('[data-prediction-value], [data-prediction-column]')
    .forEach(node => node.remove());

  let tables = 0;
  let predictions = 0;
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.includes('POÄNG');
    });
    if (!header) continue;
    const rows = Array.from(table.rows).filter(row => row !== header && row.querySelector('td.rfrresultcentertext'));
    if (!rows.length) continue;
    tables++;

    const players = new Map();
    for (const row of rows) {
      const rounds = Array.from(row.querySelectorAll('td.rfrresultcentertext'));
      const firstRoundIndex = rounds[0].cellIndex;
      const preceding = Array.from(row.cells).slice(0, firstRoundIndex);
      const playerNumber = Number(preceding.map(clean).find(value => /^\d+$/.test(value)));
      const eloText = preceding.map(clean).reverse().find(value => /^\d{3,4}(?:[A-Za-z])?$/.test(value));
      const elo = eloText ? Number(eloText.match(/^\d+/)[0]) : null;
      const scoreCell = Array.from(row.cells).slice(rounds[rounds.length - 1].cellIndex + 1)
        .find(cell => /^\d+(?:[.,]\d+)?$/.test(clean(cell)));
      if (!playerNumber || !scoreCell) continue;
      players.set(playerNumber, { row, rounds, elo, scoreCell, predicted: 0 });
    }

    for (const [number, player] of players) {
      player.rounds.forEach((cell, round) => {
        const opponentText = clean(cell.querySelector('.CP_White, .CP_Black'));
        const opponentNumber = /^\d+$/.test(opponentText) ? Number(opponentText) : null;
        if (!opponentNumber || opponentNumber <= number) return;
        const other = players.get(opponentNumber);
        const otherCell = other?.rounds[round];
        if (!otherCell || clean(otherCell.querySelector('.CP_White, .CP_Black')) !== String(number)) return;
        const result = cell.querySelector('.rfrresult');
        const otherResult = otherCell.querySelector('.rfrresult');
        if (!result || !otherResult || clean(result) || clean(otherResult)) return;
        if (player.elo === null || other.elo === null) return;
        const expected = 1 / (1 + 10 ** ((other.elo - player.elo) / 400));
        for (const [target, resultCell, score] of [[player, result, expected], [other, otherResult, 1 - expected]]) {
          const value = document.createElement('span');
          value.dataset.predictionValue = '';
          value.textContent = format(score);
          value.style.fontStyle = 'italic';
          resultCell.append(value);
          target.predicted += score;
          predictions++;
        }
      });
    }

    const scoreHeading = Array.from(header.cells).find(cell => clean(cell).toUpperCase() === 'POÄNG');
    const heading = document.createElement('th');
    heading.textContent = 'PRED POÄNG';
    heading.className = 'listheader js-sort-number';
    heading.scope = 'col';
    heading.dataset.predictionColumn = '';
    scoreHeading.after(heading);
    for (const player of players.values()) {
      const actual = Number(clean(player.scoreCell).replace(',', '.'));
      const cell = document.createElement('td');
      cell.className = 'listrighttext';
      cell.dataset.predictionColumn = '';
      cell.style.textAlign = 'right';
      cell.textContent = format(actual + player.predicted);
      player.scoreCell.after(cell);
    }
  }
  if (!tables) alert('Kunde inte hitta ställningslistan med rondceller.');
  else if (!predictions) alert('Inga ospelade matcher med känd rating hittades.');
})();
