const ALLOWED_N = [4, 6, 8, 10, 12, 14, 16];
const DEFAULT_N = 8;
const VIEWER_URL = 'https://christernilsson.github.io/2026/121-Lotta-Skriv/';

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRanking(ranking) {
  return String(ranking).padStart(4, '0');
}

function parsePlayers(value) {
  if (!value) return [];

  return value.split('|').map(token => {
    const parts = normalizeText(token).split(' ');
    const ranking = Number(parts.shift());
    return { ranking, name: parts.join(' ') };
  }).filter(player => Number.isFinite(player.ranking) && player.name);
}

function createGroups(players, n) {
  const groups = [];

  for (let index = 0; index < players.length; index += n) {
    groups.push({
      players: players.slice(index, index + n),
      type: 'Berger'
    });
  }

  const swiss = players.length % n;
  if (swiss > 0 && groups.length > 0) {
    const last = groups.pop();
    const previous = groups.pop();
    groups.push({
      players: previous ? previous.players.concat(last.players) : last.players,
      type: 'Schweizer'
    });
  }

  return { groups, swiss };
}

function renderGroups(players, n) {
  const output = document.getElementById('output');
  const status = document.getElementById('status');
  const { groups, swiss } = createGroups(players, n);

  status.textContent = `${players.length} deltagare, swiss = ${swiss}`;

  if (players.length === 0) {
    output.innerHTML = '<p>Inga deltagare hittades.</p>';
    return;
  }

  output.innerHTML = groups.map((group, index) => {
    const rows = group.players.map(player => `
      <tr>
        <td>${escapeHtml(player.name)}</td>
        <td class="ranking">${formatRanking(player.ranking)}</td>
      </tr>
    `).join('');

    return `
      <section>
        <h2>Grupp ${index + 1}: ${group.type}</h2>
        <table>
          <thead><tr><th>Namn</th><th class="ranking">Ranking</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join('');
}

function initViewer() {
  const params = new URLSearchParams(window.location.search);
  const players = parsePlayers(params.get('players'));
  const title = normalizeText(params.get('turnering')) || 'Gruppindelning';
  let n = ALLOWED_N.includes(Number(params.get('n'))) ? Number(params.get('n')) : DEFAULT_N;

  document.getElementById('title').textContent = title;

  function render() {
    document.getElementById('n').textContent = n;
    document.getElementById('decrease').disabled = n === ALLOWED_N[0];
    document.getElementById('increase').disabled = n === ALLOWED_N[ALLOWED_N.length - 1];
    renderGroups(players, n);
  }

  function changeN(step) {
    const index = ALLOWED_N.indexOf(n);
    const next = ALLOWED_N[index + step];
    if (next === undefined) return;
    n = next;
    render();
  }

  document.getElementById('decrease').addEventListener('click', () => changeN(-1));
  document.getElementById('increase').addEventListener('click', () => changeN(1));
  window.addEventListener('keydown', event => {
    if (event.key === '+') changeN(1);
    if (event.key === '-') changeN(-1);
  });

  render();
}

function parseTable(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return [];

  const headers = Array.from(rows[0].querySelectorAll('th, td'))
    .map(cell => normalizeText(cell.textContent).toUpperCase());
  const nameIndex = headers.findIndex(header => header.includes('NAMN'));
  const rankingIndex = headers.findIndex(header => header.includes('RANKING'));
  const paidIndex = headers.findIndex(header => header.includes('BETALT'));
  const checkedIndex = headers.findIndex(header => header.includes('AVPRICKAD'));

  if ([nameIndex, rankingIndex, paidIndex, checkedIndex].includes(-1)) return [];

  return rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return {
      name: normalizeText(cells[nameIndex]?.textContent),
      ranking: Number(normalizeText(cells[rankingIndex]?.textContent)),
      paid: normalizeText(cells[paidIndex]?.textContent),
      checked: normalizeText(cells[checkedIndex]?.textContent)
    };
  }).filter(player => player.name && Number.isFinite(player.ranking));
}

function runBookmarklet() {
  const players = Array.from(document.querySelectorAll('table'))
    .map(parseTable)
    .sort((a, b) => b.length - a.length)[0] || [];

  if (players.length === 0) {
    alert('Hittade inga deltagare på sidan.');
    return;
  }

  const params = new URLSearchParams({
    turnering: normalizeText(document.title),
    n: DEFAULT_N,
    players: players.map(player => `${formatRanking(player.ranking)} ${player.name}`).join('|')
  });

  window.location.href = `${VIEWER_URL}?${params}`;
}

if (window.location.hostname === 'member.schack.se') {
  runBookmarklet();
} else {
  window.addEventListener('DOMContentLoaded', initViewer);
}
