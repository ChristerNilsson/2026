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

  return value.split('_').map(token => {
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
  if (swiss > 0 && groups.length >= 2) {
    const last = groups.pop();
    const previous = groups.pop();
    groups.push({
      players: previous ? previous.players.concat(last.players) : last.players,
      type: 'Schweizer'
    });
  }

  return { groups, swiss };
}

function selectBergerPlayers(players, n) {
  const { groups } = createGroups(players, n);
  const swissGroup = groups.at(-1);
  const swissSize = swissGroup?.type === 'Schweizer' ? swissGroup.players.length : 0;
  return swissSize === 0 ? players : players.slice(0, -swissSize);
}

function createViewerUrl(players, n, title) {
  const bergerPlayers = selectBergerPlayers(players, n);
  const params = new URLSearchParams({
    turnering: normalizeText(title),
    n,
    players: bergerPlayers.map(player => `${formatRanking(player.ranking)} ${player.name}`).join('_')
  });

  return `${VIEWER_URL}?${params}`;
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

  let n = DEFAULT_N;
  const existing = document.getElementById('bbs-bookmarklet-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'bbs-bookmarklet-panel';
  panel.style.cssText = 'position:fixed;inset:1rem;z-index:2147483647;overflow:auto;padding:1.5rem;background:white;border:2px solid #222;box-shadow:0 4px 20px #0004;font:16px system-ui,sans-serif;color:#111';
  panel.innerHTML = `
    <h1 style="margin-top:0">Bergergrupper</h1>
    <p id="bbs-bookmarklet-status"></p>
    <p><a id="bbs-bookmarklet-link"></a></p>
    <button id="bbs-bookmarklet-close" type="button">Stäng</button>
  `;
  document.body.appendChild(panel);

  const status = document.getElementById('bbs-bookmarklet-status');
  const link = document.getElementById('bbs-bookmarklet-link');

  function render() {
    const bergerPlayers = selectBergerPlayers(players, n);
    const groupSizes = createGroups(players, n).groups.map(group => group.players.length).join(' + ');
    const url = createViewerUrl(players, n, document.title);
    status.innerHTML = `Valt n: <strong>${n}</strong>.<br>Tryck <strong>+</strong> för att öka n med 2 och <strong>-</strong> för att minska n med 2.<br>Gruppstorlekar: ${groupSizes}.<br>Deltagare: ${players.length}. Berger-spelare i länken: ${bergerPlayers.length}.`;
    link.href = url;
    link.textContent = url;
  }

  function onKeydown(event) {
    const step = event.key === '+' ? 1 : event.key === '-' ? -1 : 0;
    if (step === 0) return;
    const next = ALLOWED_N[ALLOWED_N.indexOf(n) + step];
    if (next === undefined) return;
    event.preventDefault();
    n = next;
    render();
  }

  document.getElementById('bbs-bookmarklet-close').addEventListener('click', () => {
    window.removeEventListener('keydown', onKeydown);
    panel.remove();
  });
  window.addEventListener('keydown', onKeydown);
  render();
}

// if (window.location.hostname === 'halvarsson.no-ip.com') {
//   runBookmarklet();
// } else {
//   window.addEventListener('DOMContentLoaded', initViewer);
// }

if (window.location.hostname === 'member.schack.se') {
  runBookmarklet();
} else {
  window.addEventListener('DOMContentLoaded', initViewer);
}
