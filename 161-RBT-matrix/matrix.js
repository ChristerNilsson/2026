'use strict';

function normalizeTournament(file) {
  const data = file.data ?? file;
  return {
    ...data,
    rounds: data.rounds.map((round, index) => ({
      ...round,
      roundNumber: round.roundNumber ?? round.number ?? index + 1,
      pairings: (round.pairings ?? round.games).map(game => ({
        ...game,
        whiteId: game.whiteId ?? game.white ?? game.w,
        blackId: game.blackId ?? game.black ?? game.b
      }))
    }))
  };
}

function buildMeetings(data) {
  const meetings = new Map();
  const ids = new Set(data.players.map(player => player.id));
  for (const round of data.rounds) {
    for (const game of round.pairings) {
      const white = game.whiteId ?? game.white;
      const black = game.blackId ?? game.black;
      if ((game.kind && game.kind !== 'game') || !ids.has(white) || !ids.has(black)) continue;
      for (const [a, b] of [[white, black], [black, white]]) {
        const key = `${a}|${b}`;
        const numbers = meetings.get(key) || [];
        if (!numbers.includes((round.roundNumber ?? round.number))) numbers.push((round.roundNumber ?? round.number));
        meetings.set(key, numbers);
      }
    }
  }
  return meetings;
}

function averageDistances(data) {
  const players = new Map(data.players.map(player => [player.id, player]));
  let games = 0, cardinalSum = 0, eloSum = 0, eloGames = 0;
  for (const round of data.rounds) {
    for (const game of round.pairings) {
      const white = players.get(game.whiteId ?? game.white);
      const black = players.get(game.blackId ?? game.black);
      if ((game.kind && game.kind !== 'game') || !white || !black) continue;
      games++;
      cardinalSum += Math.abs(white.tpn - black.tpn);
      if (Number.isFinite(white.rating) && Number.isFinite(black.rating)) {
        eloSum += Math.abs(white.rating - black.rating);
        eloGames++;
      }
    }
  }
  return { games, cardinal: games ? cardinalSum / games : null,
    elo: eloGames ? eloSum / eloGames : null, eloGames };
}

if (typeof module !== 'undefined') module.exports = { normalizeTournament, buildMeetings, averageDistances };
async function startMatrix() {
//  const response = await fetch('./Berger-Swiss_Championship_final.json', { cache: 'no-store' });
  const response = await fetch('./Sample_RBT_Tournament.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = normalizeTournament(await response.json());
  const players = [...data.players].sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity) || a.tpn - b.tpn);
  const meetings = buildMeetings(data);
  const distances = averageDistances(data);
  const format = (value, decimals) => value == null ? '–' : value.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  });
  document.getElementById('distances').textContent =
    `Medelavstånd för alla ${distances.games} partier: kardinaltal (startnummer) ${format(distances.cardinal, 1)} · Elo ${format(distances.elo, 0)}${distances.eloGames !== distances.games ? ` (${distances.eloGames} partier med Elo)` : ''}.`;
  const search = document.getElementById('search');
  const roundSelect = document.getElementById('round');
  document.getElementById('title').textContent = data.name;
  document.title = `Mötesmatris · ${data.name}`;
  for (const number of [...new Set(data.rounds.map(r => r.roundNumber ?? r.number))].sort((a, b) => a - b)) {
    roundSelect.add(new Option(`Rond ${number}`, number));
  }
  function roundsFor(a, b) {
    return (meetings.get(`${a.id}|${b.id}`) || []).filter(n => !roundSelect.value || n === Number(roundSelect.value));
  }
  function visiblePlayers() {
    const query = search.value.trim().toLocaleLowerCase('sv');
    return players.filter(p => !query || p.name.toLocaleLowerCase('sv').includes(query) || String(p.tpn) === query);
  }
  function render() {
    const table = document.getElementById('matrix');
    table.replaceChildren();
    const header = table.createTHead().insertRow();
    const corner = document.createElement('th');
    corner.className = 'corner'; corner.scope = 'col'; corner.textContent = 'Spelare / startnummer'; header.append(corner);
    for (const p of players) {
      const cell = document.createElement('th');
      cell.scope = 'col'; cell.textContent = p.tpn; cell.title = `${p.tpn}. ${p.name}`;
      cell.setAttribute('aria-label', `${p.tpn}. ${p.name}`); header.append(cell);
    }
    const body = table.createTBody();
    for (const p of visiblePlayers()) {
      const row = body.insertRow();
      const name = document.createElement('th'); name.scope = 'row';
      const number = document.createElement('span'); number.className = 'number'; number.textContent = p.tpn;
      name.append(number, document.createTextNode(p.name));
      const rating = document.createElement('span');
      rating.className = 'rating';
      rating.textContent = p.rating == null ? '–' : p.rating;
      rating.setAttribute('aria-label', `Elo ${p.rating ?? 'saknas'}`);
      name.append(rating); row.append(name);
      for (const opponent of players) {
        const cell = row.insertCell();
        const numbers = roundsFor(p, opponent);
        cell.textContent = p.id === opponent.id ? '–' : numbers.join(', ');
        cell.className = p.id === opponent.id ? 'self' : numbers.length ? 'met' : '';
        cell.title = `${p.name} / ${opponent.name}: ${p.id === opponent.id ? 'samma spelare' : numbers.length ? `rond ${numbers.join(', ')}` : 'inget möte i urvalet'}`;
      }
    }
    document.getElementById('summary').textContent = `${visiblePlayers().length} av ${players.length} spelare · ${data.rounds.length} ronder`;
  }
  search.addEventListener('input', render);
  roundSelect.addEventListener('change', render);
  document.getElementById('export').addEventListener('click', () => {
    const quote = value => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [['Spelare', ...players.map(p => `${p.tpn}. ${p.name}`)], ...visiblePlayers().map(p => [`${p.tpn}. ${p.name}`, ...players.map(o => p.id === o.id ? '–' : roundsFor(p, o).join(', '))])];
    const blob = new Blob(['\ufeff' + rows.map(row => row.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'motesmatris.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
}

if (typeof document !== 'undefined') {
  const controls = ['search', 'round', 'export'].map(id => document.getElementById(id));
  controls.forEach(control => { control.disabled = true; });
  startMatrix().then(() => {
    controls.forEach(control => { control.disabled = false; });
  }).catch(error => {
    document.getElementById('summary').textContent =
      'Kunde inte ladda JSON-filen. Kontrollera att filen finns och att sidan visas via en webbserver (t.ex. GitHub Pages eller localhost).';
    console.error('Kunde inte ladda turneringen:', error);
  });
}
