(() => {
  'use strict';
  const clean = value => value.replace(/\s+/g, ' ').trim();
  const title = clean(document.querySelector('h4.header')?.textContent || document.title);
  const match = title.match(/^Grupper\s+(.+?)\s+(.+)$/i);
  const group = match?.[1] || '';
  const tournament = match?.[2] || title;
  const rounds = new Map();
  for (const cell of document.querySelectorAll('[onclick]')) {
    const action = cell.getAttribute('onclick') || '';
    const url = action.match(/ShowTournamentServlet\?[^'"\s]*[?&]round=(\d+)/i);
    if (url) rounds.set(Number(url[1]), Number(url[1]));
  }
  if (!rounds.size) {
    alert('Kunde inte hitta några ronder på turneringssidan.');
    return;
  }
  const base = new URL(location.href);
  const parse = html => {
    const page = new DOMParser().parseFromString(html, 'text/html');
    for (const table of page.querySelectorAll('table')) {
      const header = Array.from(table.rows).find(row => {
        const labels = Array.from(row.cells).map(cell => clean(cell.textContent).toUpperCase());
        return ['BORD', 'VIT', 'SVART', 'RESULTAT'].every(label => labels.includes(label)) && labels.filter(label => label === 'ELO').length >= 2;
      });
      if (!header) continue;
      const labels = Array.from(header.cells).map(cell => clean(cell.textContent).toUpperCase());
      const boardIndex = labels.indexOf('BORD');
      const whiteIndex = labels.indexOf('VIT');
      const blackIndex = labels.indexOf('SVART');
      const whiteEloIndex = labels.indexOf('ELO');
      const blackEloIndex = labels.indexOf('ELO', whiteEloIndex + 1);
      const resultIndex = labels.indexOf('RESULTAT');
      return Array.from(table.rows).filter(row => row !== header).map(row => {
        const get = index => clean(row.cells[index]?.textContent || '');
        const board = get(boardIndex);
        if (!/^\d+$/.test(board)) return null;
        const name = index => {
          const prefix = clean(row.cells[index - 2]?.textContent || '');
          return [prefix, get(index)].filter(Boolean).join(' ');
        };
        return {
          board,
          white: name(whiteIndex),
          whiteElo: get(whiteEloIndex).match(/^\d+/)?.[0] || '',
          result: get(resultIndex) || '-',
          blackElo: get(blackEloIndex).match(/^\d+/)?.[0] || '',
          black: name(blackIndex)
        };
      }).filter(Boolean);
    }
    throw new Error('Lottningstabell saknas');
  };
  const render = data => {
    const entries = data.flatMap(round => round.games);
    const widths = {
      board: Math.max(4, ...entries.map(game => game.board.length)),
      white: Math.max(3, ...entries.map(game => game.white.length)),
      whiteElo: Math.max(3, ...entries.map(game => game.whiteElo.length)),
      result: Math.max(8, ...entries.map(game => game.result.length)),
      blackElo: Math.max(3, ...entries.map(game => game.blackElo.length))
    };
    const line = (board, white, whiteElo, result, blackElo, black) =>
      `${board.padEnd(widths.board)} ${white.padEnd(widths.white)} ${whiteElo.padStart(widths.whiteElo)} ${result.padStart(widths.result)} ${blackElo.padStart(widths.blackElo)} ${black}`.trimEnd();
    return [tournament, ...(group ? [`Grupp ${group}`] : []), ...data.flatMap(round => [
      '', `Rond ${round.number}`,
      line('Bord', 'Vit', 'Elo', 'Resultat', 'Elo', 'Svart'),
      ...round.games.map(game => line(game.board, game.white, game.whiteElo, game.result, game.blackElo, game.black))
    ])].join('\r\n') + '\r\n';
  };
  (async () => {
    try {
      const data = await Promise.all(Array.from(rounds.keys()).sort((a, b) => a - b).map(async number => {
        const url = new URL(base);
        url.searchParams.set('round', number);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Rond ${number}: HTTP ${response.status}`);
        return { number, games: parse(await response.text()) };
      }));
      const url = URL.createObjectURL(new Blob([render(data)], { type: 'text/plain;charset=utf-8' }));
      if (!window.open(url, '_blank')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `berger-table-${base.searchParams.get('id') || 'turnering'}.txt`;
        document.body.append(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      alert(`Kunde inte hämta alla ronder: ${error.message}`);
    }
  })();
})();
