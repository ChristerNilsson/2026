(() => {
  'use strict';
  // Read only the detailed standings already present on the page.
  const clean = cell => {
    if (!cell) return '';
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('[data-prediction-value]').forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };
  const groups = [];
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => clean(cell).toUpperCase());
      return labels.includes('NAMN') && labels.includes('POÄNG');
    });
    if (!header) continue;
    const labels = Array.from(header.cells).map(cell => clean(cell).toUpperCase());
    const players = new Map();
    for (const row of table.rows) {
      if (row === header) continue;
      const cells = Array.from(row.querySelectorAll('td.rfrresultcentertext'));
      if (!cells.length) continue;
      const preceding = Array.from(row.cells).slice(0, cells[0].cellIndex);
      const number = Number(preceding.map(clean).find(value => /^\d+$/.test(value)));
      if (!number) continue;
      const rounds = cells.map(cell => {
        const opponentCell = cell.querySelector('.CP_White, .CP_Black');
        const opponentText = clean(opponentCell);
        return {
          opponent: /^\d+$/.test(opponentText) ? Number(opponentText) : null,
          white: opponentCell?.classList.contains('CP_White') ?? false,
          result: clean(cell.querySelector('.rfrresult')),
          hasResult: Boolean(cell.querySelector('.rfrresult')),
          bye: /^(?:w\.?o\.?|frirond)$/i.test(opponentText)
        };
      });
      const scoreText = clean(row.cells[labels.indexOf('POÄNG')]);
      const score = /^\d+(?:[.,]\d+)?$/.test(scoreText) ? Number(scoreText.replace(',', '.')) : null;
      const postponed = rounds.filter(round => round.opponent > 0 && round.hasResult && !round.result).length;
      const ratingIndex = labels.indexOf('ELO') >= 0 ? labels.indexOf('ELO') : labels.indexOf('RANKING');
      players.set(number, {
        number, name: clean(row.cells[labels.indexOf('NAMN')]),
        elo: ratingIndex >= 0 ? clean(row.cells[ratingIndex]) : '',
        score: score === null ? '' : String(score + postponed * 0.5).replace('.', ','),
        rounds
      });
    }
    if (players.size) groups.push({ table, players });
  }
  if (!groups.length) {
    alert('Kunde inte hitta någon ställning med detaljer. Öppna ställningslistan med rondkolumner och försök igen.');
    return;
  }

  const gamesForRound = (players, index) => {
    const games = [];
    const seen = new Set();
    for (const player of players.values()) {
      const round = player.rounds[index];
      if (!round || seen.has(player.number)) continue;
      const opponent = players.get(round.opponent);
      if (opponent) {
        const other = opponent.rounds[index];
        if (opponent === player || other?.opponent !== player.number || other.white === round.white) continue;
        const white = round.white ? player : opponent;
        const black = round.white ? opponent : player;
        const whiteResult = white.rounds[index].result;
        const blackResult = black.rounds[index].result;
        games.push({ white, black, result: whiteResult || blackResult ? `${whiteResult || '?'}–${blackResult || '?'}` : '–' });
        seen.add(player.number);
        seen.add(opponent.number);
      } else if (round.bye || round.opponent === 0) {
        const wo = { name: 'W.O.', elo: '', score: '' };
        games.push({ white: round.white ? player : wo, black: round.white ? wo : player,
          result: round.result || '–', number: player.number });
        seen.add(player.number);
      }
    }
    return games.sort((a, b) => (a.white.number ?? a.number) - (b.white.number ?? b.number));
  };

  document.getElementById('chess-score2')?.remove();
  const section = document.createElement('section');
  section.id = 'chess-score2';
  section.style.cssText = 'margin:1em 0;padding:1em;border:1px solid #aaa;background:white;color:#171717;overflow:auto';
  const title = document.createElement('h2');
  title.textContent = 'Bordslista från detaljställningen';
  const label = document.createElement('label');
  label.textContent = 'Rond: ';
  const select = document.createElement('select');
  const roundCount = Math.max(...groups.flatMap(group => Array.from(group.players.values(), player => player.rounds.length)));
  let lastPaired = 0;
  for (let index = 0; index < roundCount; index++) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = String(index + 1);
    select.append(option);
    if (groups.some(group => gamesForRound(group.players, index).length)) lastPaired = index;
  }
  select.value = String(lastPaired);
  label.append(select);
  const close = document.createElement('button');
  close.textContent = 'Stäng';
  close.style.marginLeft = '1em';
  close.onclick = () => section.remove();
  const note = document.createElement('p');
  note.textContent = 'Bord numreras efter vits startnummer. Poäng är aktuell totalpoäng inklusive 0,5 för varje uppskjutet parti.';
  const content = document.createElement('div');
  section.append(title, label, close, note, content);
  const render = () => {
    content.replaceChildren();
    groups.forEach((group, groupIndex) => {
      if (groups.length > 1) {
        const heading = document.createElement('h3');
        heading.textContent = `Ställningslista ${groupIndex + 1}`;
        content.append(heading);
      }
      const games = gamesForRound(group.players, Number(select.value));
      if (!games.length) {
        const message = document.createElement('p');
        message.textContent = 'Ingen lottning hittades för denna rond.';
        content.append(message);
        return;
      }
      const table = document.createElement('table');
      table.style.cssText = 'border-collapse:collapse;width:100%';
      const header = table.createTHead().insertRow();
      for (const text of ['BORD', 'VIT', 'POÄNG', 'ELO', 'RESULTAT', 'ELO', 'SVART', 'POÄNG']) {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = text;
        cell.style.cssText = 'padding:.4em;text-align:left;border-bottom:2px solid #888';
        header.append(cell);
      }
      const body = table.createTBody();
      games.forEach((game, index) => {
        const row = body.insertRow();
        if (index % 2) row.style.background = '#f3f4f6';
        for (const value of [index + 1, game.white.name, game.white.score, game.white.elo,
          game.result, game.black.elo, game.black.name, game.black.score]) {
          const cell = row.insertCell();
          cell.textContent = String(value);
          cell.style.padding = '.4em';
        }
      });
      content.append(table);
    });
  };
  select.onchange = render;
  groups[0].table.before(section);
  render();
  section.scrollIntoView({ block: 'start' });
})();
