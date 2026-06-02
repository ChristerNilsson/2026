const ALLOWED_N = [4, 6, 8, 10, 12, 14, 16];
const DEFAULT_N = 8;
const DEFAULT_VIEWER = 'https://christernilsson.github.io/2026/119-BBS/';

function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function parseQuery(search) {
  return new URLSearchParams(search);
}

function parsePlayerToken(token) {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(' ');
  const first = parts.shift();
  const elo = Number(first);
  if (Number.isNaN(elo)) return null;
  const name = parts.join(' ').trim();
  return { name: name || 'Okänd spelare', elo };
}

function parsePlayersFromParam(value) {
  if (!value) return [];
  return value.split('|').map(parsePlayerToken).filter(Boolean);
}

function sortPlayers(players) {
  return players.slice().sort((a, b) => {
    if (a.elo !== b.elo) return b.elo - a.elo;
    return a.name.localeCompare(b.name, 'sv');
  });
}

function clampN(n) {
  const index = ALLOWED_N.indexOf(n);
  if (index !== -1) return n;
  return DEFAULT_N;
}

function getGroupLabel(index) {
  return String.fromCharCode(65 + index);
}

function buildGroups(players, n) {
  const d = players.length;
  const baseGroups = [];
  for (let offset = 0; offset < d; offset += n) {
    baseGroups.push(players.slice(offset, offset + n));
  }

  const swiss = d % n;
  if (swiss > 0 && baseGroups.length >= 2) {
    const last = baseGroups.pop();
    const secondLast = baseGroups.pop();
    const mergedPlayers = secondLast.concat(last);
    const groups = baseGroups.map((group, index) => ({
      label: getGroupLabel(index),
      players: group,
      type: 'Berger'
    }));
    groups.push({
      label: 'Schweizer',
      players: mergedPlayers,
      type: 'Schweizer'
    });
    return groups;
  }

  return baseGroups.map((group, index) => ({
    label: getGroupLabel(index),
    players: group,
    type: 'Berger'
  }));
}

function renderTable(group) {
  const rows = group.players.map((player, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>${player.name}</td>
      <td class="center">${player.elo}</td>
    </tr>
  `).join('');

  return `
    <div class="group-block">
      <div class="group-type"><strong>${group.type}:</strong> ${group.label} (${group.players.length} spelare)</div>
      <table>
        <thead>
          <tr>
            <th>Bord</th>
            <th>Namn</th>
            <th class="center">Elo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function updateViewer(turnering, n, players) {
  const output = document.getElementById('output');
  const status = document.getElementById('status');
  const nValue = document.getElementById('n-value');
  const instructions = document.getElementById('instructions');

  const sortedPlayers = sortPlayers(players);
  const d = sortedPlayers.length;
  const swiss = d % n;
  const groups = buildGroups(sortedPlayers, n);

  nValue.textContent = `Gruppstorlek n = ${n}`;

  let summary = `Turnering: ${turnering || 'Ingen turnering'} · Spelare: ${d} · swiss = ${swiss}`;
  if (d === 0) summary = 'Inga spelare hittades. Ange `players` som URL-parametrar.';
  status.textContent = summary;

  if (d === 0) {
    output.innerHTML = '';
    instructions.innerHTML = `
      <h2>Så här använder du sidan</h2>
      <p>Skriv URL med parametrar:</p>
      <ul>
        <li><code>?turnering=Växjöspelen</code></li>
        <li><code>&n=8</code> (tillåtet: ${ALLOWED_N.join(', ')})</li>
        <li><code>&players=1984 Adam Nilsson|1954 Bertil Svensson|...</code></li>
      </ul>
      <p class="small">Tryck <strong>+</strong> eller <strong>-</strong> för att justera gruppstorleken inom tillåtna värden.</p>
    `;
    return;
  }

  const groupSummary = groups.map(group => `${group.label} (${group.players.length})`).join(' + ');
  const typeSummary = groups.map(group => `${group.label}=${group.type}`).join(', ');

  output.innerHTML = `
    <section class="hero">
      <h2>${turnering || 'Turnering'}</h2>
      <div class="summary">
        <div class="card"><strong>Spelare</strong><div>${d}</div></div>
        <div class="card"><strong>Gruppstorlek</strong><div>${n}</div></div>
        <div class="card"><strong>Swiss</strong><div>${swiss}</div></div>
        <div class="card"><strong>Gruppfördelning</strong><div>${groupSummary}</div></div>
      </div>
      <p class="note">${typeSummary}</p>
    </section>
    ${groups.map(renderTable).join('')}
  `;

  instructions.innerHTML = `
    <div class="note">Använd + eller - för att justera <strong>n</strong>. Parametern uppdateras i adressfältet.</div>
    <a href="${DEFAULT_VIEWER}" class="link">Öppna tom vy</a>
  `;
}

function updateUrl(n) {
  const params = new URLSearchParams(window.location.search);
  params.set('n', n);
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function initViewer() {
  const params = parseQuery(window.location.search);
  const turnering = normalizeText(params.get('turnering') || '');
  let n = clampN(Number(params.get('n')) || DEFAULT_N);
  const players = parsePlayersFromParam(params.get('players') || '');

  const decrease = document.getElementById('decrease');
  const increase = document.getElementById('increase');

  const refresh = () => {
    updateViewer(turnering, n, players);
    updateUrl(n);
    decrease.disabled = n <= ALLOWED_N[0];
    increase.disabled = n >= ALLOWED_N[ALLOWED_N.length - 1];
  };

  decrease.addEventListener('click', () => {
    const index = ALLOWED_N.indexOf(n);
    if (index > 0) {
      n = ALLOWED_N[index - 1];
      refresh();
    }
  });
  increase.addEventListener('click', () => {
    const index = ALLOWED_N.indexOf(n);
    if (index < ALLOWED_N.length - 1) {
      n = ALLOWED_N[index + 1];
      refresh();
    }
  });

  window.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      increase.click();
    }
    if (event.key === '-') {
      event.preventDefault();
      decrease.click();
    }
  });

  refresh();
}

function parseTableRows(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return [];

  const headers = Array.from(rows[0].querySelectorAll('th,td')).map(cell => normalizeText(cell.textContent || '').toUpperCase());
  const indexOf = (needle) => headers.findIndex(header => header.includes(needle));

  const idxName = indexOf('NAMN');
  const idxElo = headers.findIndex(header => header.includes('RANKING') || header.includes('ELO'));
  const idxPay = indexOf('BETALT');
  const idxChecked = indexOf('AVPRICKAD');

  if (idxName === -1 || idxElo === -1) return [];

  return rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    const name = normalizeText((cells[idxName]?.textContent || ''));
    const eloText = (cells[idxElo]?.textContent || '').replace(/[^0-9]/g, '');
    const elo = Number(eloText);
    const pay = idxPay >= 0 ? normalizeText(cells[idxPay]?.textContent || '') : 'JA';
    const checked = idxChecked >= 0 ? normalizeText(cells[idxChecked]?.textContent || '') : 'JA';
    return { name, elo, pay, checked };
  }).filter(player => player.name && Number.isFinite(player.elo));
}

function findTournamentName() {
  const title = document.querySelector('title')?.textContent;
  if (title) return normalizeText(title);
  const h1 = document.querySelector('h1, h2, h3');
  if (h1) return normalizeText(h1.textContent || 'Turnering');
  return 'Turnering';
}

function runBookmarkletMode() {
  const tables = Array.from(document.querySelectorAll('table'));
  let players = [];
  for (const table of tables) {
    const parsed = parseTableRows(table);
    if (parsed.length > players.length) {
      players = parsed;
    }
  }
  if (players.length === 0) {
    alert('Hittade inga spelare på sidan. Kontrollera att du är på en turneringssida med tabell.');
    return;
  }

  players = players.filter(player => player.checked.toUpperCase() === 'JA' || player.checked.toUpperCase() === 'J').map(player => ({
    name: player.name,
    elo: player.elo
  }));

  if (players.length === 0) {
    alert('Inga avprickade spelare hittades. Ingen data för gruppberäkning.');
    return;
  }

  const turnering = findTournamentName();
  const tokenStrings = players.map(player => `${player.elo} ${player.name}`);
  const params = new URLSearchParams();
  params.set('turnering', turnering);
  params.set('n', DEFAULT_N);
  params.set('players', tokenStrings.join('|'));

  const target = new URL(DEFAULT_VIEWER);
  target.search = params.toString();
  window.location.href = target.toString();
}

function main() {
  const isMemberPage = window.location.hostname.includes('member.schack.se');
  const isViewerPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');

  if (isMemberPage) {
    runBookmarkletMode();
  } else if (isViewerPage) {
    window.addEventListener('DOMContentLoaded', initViewer);
  }
}

main();
