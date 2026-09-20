(() => {
  'use strict';
  const clean = cell => cell?.textContent.replace(/\s+/g, ' ').trim() || '';
  const format = score => score.toFixed(2).replace('.', ',');
  const formatPrediction = score => score.toFixed(2).replace(/^0/, '');
  const parseScore = value => {
    if (value === '½' || value === '1/2') return 0.5;
    if (/^(?:0|1|0[.,]5)$/.test(value)) return Number(value.replace(',', '.'));
    return null;
  };
  const performance = (opponents, score) => {
    if (!opponents.length || score <= 0 || score >= opponents.length) return null;
    let low = Math.min(...opponents) - 4000;
    let high = Math.max(...opponents) + 4000;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const expected = opponents.reduce((sum, rating) =>
        sum + 1 / (1 + 10 ** ((rating - mid) / 400)), 0);
      if (expected < score) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };

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
          value.dataset.predictionRaw = String(score);
          value.textContent = formatPrediction(score);
          value.style.fontStyle = 'italic';
          resultCell.append(value);
          target.predicted += score;
          predictions++;
        }
      });
    }

    const scoreHeading = Array.from(header.cells).find(cell => clean(cell).toUpperCase() === 'POÄNG');
    const oldKvpHeading = Array.from(header.cells).find(cell => /^(?:KV\.?P\.?|DIFF)$/.test(clean(cell).toUpperCase()));
    if (oldKvpHeading) {
      for (const player of players.values()) player.scoreCell.nextElementSibling?.remove();
      oldKvpHeading.remove();
    }
    const heading = document.createElement('th');
    heading.textContent = 'PRED';
    heading.title = 'Predikterad poäng';
    heading.className = 'listheader js-sort-number';
    heading.scope = 'col';
    heading.dataset.predictionColumn = '';
    heading.style.padding = '0 0.6em';
    scoreHeading.after(heading);
    const performanceHeading = document.createElement('th');
    performanceHeading.textContent = 'PR*';
    performanceHeading.className = 'listheader js-sort-number';
    performanceHeading.scope = 'col';
    performanceHeading.dataset.predictionColumn = '';
    performanceHeading.style.padding = '0 0.6em';
    heading.after(performanceHeading);
    const diffHeading = document.createElement('th');
    diffHeading.textContent = 'DIFF';
    diffHeading.className = 'listheader js-sort-number';
    diffHeading.scope = 'col';
    diffHeading.dataset.predictionColumn = '';
    diffHeading.style.padding = '0 0.6em';
    performanceHeading.after(diffHeading);
    for (const player of players.values()) {
      const actual = Number(clean(player.scoreCell).replace(',', '.'));
      const cell = document.createElement('td');
      cell.className = 'listrighttext';
      cell.dataset.predictionColumn = '';
      cell.style.textAlign = 'right';
      cell.style.padding = '0 0.6em';
      cell.style.whiteSpace = 'nowrap';
      cell.style.fontVariantNumeric = 'tabular-nums';
      cell.textContent = format(actual + player.predicted);
      player.scoreCell.after(cell);
      const opponents = [];
      let ratedScore = 0;
      for (const roundCell of player.rounds) {
        const opponentText = clean(roundCell.querySelector('.CP_White, .CP_Black'));
        const opponent = /^\d+$/.test(opponentText) ? players.get(Number(opponentText)) : null;
        const result = roundCell.querySelector('.rfrresult');
        if (!opponent || opponent.elo === null || !result) continue;
        const predicted = result.querySelector('[data-prediction-value]');
        const score = predicted ? Number(predicted.dataset.predictionRaw) : parseScore(clean(result));
        if (score === null) continue;
        opponents.push(opponent.elo);
        ratedScore += score;
      }
      const value = performance(opponents, ratedScore);
      const performanceCell = document.createElement('td');
      performanceCell.className = 'listrighttext';
      performanceCell.dataset.predictionColumn = '';
      performanceCell.style.textAlign = 'right';
      performanceCell.style.padding = '0 0.6em';
      performanceCell.style.whiteSpace = 'nowrap';
      performanceCell.style.fontVariantNumeric = 'tabular-nums';
      performanceCell.textContent = value === null ? '–' : format(value);
      if (value === null) performanceCell.title = 'Ingen ändlig performance rating vid noll eller full poäng.';
      cell.after(performanceCell);
      const diffCell = document.createElement('td');
      diffCell.className = 'listrighttext';
      diffCell.dataset.predictionColumn = '';
      diffCell.style.textAlign = 'right';
      diffCell.style.padding = '0 0.6em';
      diffCell.style.whiteSpace = 'nowrap';
      diffCell.style.fontVariantNumeric = 'tabular-nums';
      diffCell.textContent = value === null || player.elo === null ? '–' : format(value - player.elo);
      performanceCell.after(diffCell);
    }
  }
  if (!tables) alert('Kunde inte hitta ställningslistan med rondceller.');
  else if (!predictions) alert('Inga ospelade matcher med känd rating hittades.');
})();
