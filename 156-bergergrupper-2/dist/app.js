'use strict';
const LIVE = window.BERGER_LIVE === true;
let GROUPS = ['A', 'B', 'C', 'D', 'E'];
let IDS = Object.fromEntries(GROUPS.map((group, i) => [group, String(19095 + i)]));
let prefix = 'W2';
let availableGroups = GROUPS.map((group, i) => ({prefix, number:i + 1, id:IDS[group]}));
const $ = id => document.getElementById(id);
let games = [];
let round = Number(window.BERGER_ROUND) || 1;
if (!Number.isInteger(round) || round < 1 || round > 5) round = 1;
let busy = false;
let requestNumber = 0;
const failures = new Map();
function groupName(group) { return prefix + '-' + (GROUPS.indexOf(group) + 1); }
function discoverGroups(doc) {
  const found = new Map();
  for (const link of doc.querySelectorAll('[onclick], a[href]')) {
    const name = link.textContent.trim().match(/^(.+?)-(\d+)$/);
    const target = (link.getAttribute('onclick') || '') + ' ' + (link.getAttribute('href') || '');
    const id = target.match(/ShowTournamentServlet\?[^'"\s]*\bid=(\d+)/);
    if (!name || !id) continue;
    const value = {prefix:name[1].trim(), number:Number(name[2]), id:id[1]};
    found.set(value.prefix + ':' + value.number, value);
  }
  return Array.from(found.values()).sort((a, b) => a.prefix.localeCompare(b.prefix, 'sv', {numeric:true}) || a.number - b.number);
}
function configureGroups(value, count) {
  const selectedPrefix = value.trim().replace(/-+$/, '');
  if (!Number.isInteger(count) || count < 1 || count > 26) throw Error('Välj 1–26 grupper.');
  const definitions = Array.from({length:count}, (_, i) => availableGroups.find(g => g.prefix.toLocaleLowerCase() === selectedPrefix.toLocaleLowerCase() && g.number === i + 1));
  if (definitions.some(g => !g)) throw Error('Alla grupper 1–' + count + ' med prefix ' + selectedPrefix + ' finns inte på källsidan.');
  prefix = definitions[0].prefix;
  GROUPS = definitions.map((_, i) => String.fromCharCode(65 + i));
  IDS = Object.fromEntries(GROUPS.map((group, i) => [group, definitions[i].id]));
  games = []; failures.clear(); requestNumber++; busy = false;
  $('prefix').value = prefix; $('groupCount').value = String(count);
}
function populatePrefixes() {
  $('prefixes').replaceChildren();
  for (const value of new Set(availableGroups.map(g => g.prefix))) {
    const option = document.createElement('option'); option.value = value;
    option.label = value + ' (' + availableGroups.filter(g => g.prefix === value).length + ' grupper)';
    $('prefixes').append(option);
  }
}

function validateGames(rows) {
  if (!Array.isArray(rows)) throw Error('Ogiltig bordslista.');
  const seen = new Set();
  return rows.map(g => {
    if (!GROUPS.includes(g.group) || String(g.tournamentId) !== IDS[g.group] || !Number.isInteger(g.round) || g.round < 1 || g.round > 5 || !Number.isInteger(g.board) || g.board < 1 || g.board > 100 || typeof g.white !== 'string' || !g.white || typeof g.black !== 'string' || !g.black) throw Error('Ogiltig partirad.');
    const key = [g.group, g.round, g.board].join(':');
    if (seen.has(key)) throw Error('Dubblerat bord i källistan.');
    seen.add(key);
    const rating = n => n != null && /^\d{1,4}$/.test(String(n)) ? Number(n) : null;
    return {group:g.group, tournamentId:IDS[g.group], round:g.round, board:g.board, white:g.white, black:g.black, whiteElo:rating(g.whiteElo), blackElo:rating(g.blackElo)};
  });
}
function parseSource(doc, group, selectedRound) {
  const expected = groupName(group).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('(?:^|\\s)' + expected + '(?=\\s|$)').test(doc.title)) throw Error('Fel källgrupp: ' + doc.title);
  const selected = doc.querySelector('.selroundheader')?.textContent.match(/Rond\s+(\d+)/i);
  if (selected && Number(selected[1]) !== selectedRound) throw Error('Källan visar en annan rond.');
  const result = [];
  let indexes = null;
  for (const row of doc.querySelectorAll('tr')) {
    const cells = Array.from(row.children).filter(c => c.matches('td, th'));
    const text = cells.map(c => c.textContent.trim().replace(/\s+/g, ' '));
    if (text.includes('Bord') && text.includes('VIT') && text.includes('SVART')) {
      indexes = ['Bord', 'VIT', 'SVART'].map(label => text.indexOf(label));
      indexes.push(text.findIndex((label, i) => label === 'ELO' && i > indexes[1] && i < indexes[2]));
      indexes.push(text.findIndex((label, i) => label === 'ELO' && i > indexes[2]));
      continue;
    }
    if (!indexes || !/^\d+$/.test(text[indexes[0]] || '')) continue;
    const elo = i => /^\d+$/.test(text[i] || '') ? Number(text[i]) : null;
    result.push({group, tournamentId:IDS[group], round:selectedRound, board:Number(text[indexes[0]]), white:text[indexes[1]], black:text[indexes[2]], whiteElo:elo(indexes[3]), blackElo:elo(indexes[4])});
  }
  if (!result.length) throw Error('Ingen bordslista publicerad.');
  return validateGames(result);
}
async function fetchGroup(group, selectedRound) {
  const response = await fetch('https://member.schack.se/ShowTournamentServlet?id=' + IDS[group] + '&round=' + selectedRound, {cache:'no-store', signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('Källan svarade inte.');
  return parseSource(new DOMParser().parseFromString(await response.text(), 'text/html'), group, selectedRound);
}
function currentGames() { return games.filter(g => g.round === round).sort((a, b) => a.group.localeCompare(b.group) || a.board - b.board); }
function boardNumber(g) {
  return GROUPS.slice(0, GROUPS.indexOf(g.group)).reduce((offset, group) => offset + Math.max(3, ...games.filter(row => row.group === group).map(row => row.board)), g.board);
}
function render() {
  const rows = currentGames();
  document.documentElement.style.setProperty('--board-count', Math.max(1, rows.length));
  $('round').value = String(round);
  $('previous').disabled = round === 1;
  $('next').disabled = round === 5;
  $('refresh').disabled = busy;
  $('print').disabled = busy || !rows.length;
  $('roundLabel').textContent = ' / Rond ' + round;
  $('games').replaceChildren();
  let previousGroup = '';
  for (const g of rows) {
    const row = document.createElement('tr');
    if (g.group !== previousGroup) row.className = 'groupstart';
    previousGroup = g.group;
    const cell = text => { const td = document.createElement('td'); td.textContent = text; row.append(td); return td; };
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = g.group;
    const label = document.createElement('small'); label.textContent = groupName(g.group); badge.append(label); cell('').append(badge);
    cell(boardNumber(g)); cell(g.white); cell(g.whiteElo ?? '–').className = 'elo';
    cell(g.black); cell(g.blackElo ?? '–').className = 'elo'; cell('').className = 'paper-result';
    $('games').append(row);
  }
  if (!rows.length) { const row = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 7; td.className = 'empty'; td.textContent = busy ? 'Hämtar bordslistor…' : 'Ingen bordslista för denna rond.'; row.append(td); $('games').append(row); }
  $('groups').replaceChildren();
  GROUPS.forEach(group => { const count = rows.filter(g => g.group === group).length; const label = document.createElement('span'); label.textContent = `${group} / ${groupName(group)} · ${count ? count + ' bord' : 'saknas'}`; if (!count || failures.get(round)?.includes(group)) label.className = 'missing'; $('groups').append(label); });
  $('scope').textContent = prefix + '-1–' + GROUPS.length + ' · ' + rows.length + ' bord';
}
async function refresh() {
  if (!LIVE) { $('installation').showModal(); return; }
  const requestedRound = round, request = ++requestNumber;
  busy = true; render(); $('notice').className = ''; $('notice').textContent = 'Hämtar rond ' + requestedRound + ' från schack.se…';
  const responses = await Promise.allSettled(GROUPS.map(group => fetchGroup(group, requestedRound)));
  if (request !== requestNumber) return;
  const failed = [];
  responses.forEach((response, i) => {
    const group = GROUPS[i];
    if (response.status === 'fulfilled') games = games.filter(g => !(g.round === requestedRound && g.group === group)).concat(response.value);
    else failed.push(group);
  });
  failures.set(requestedRound, failed); busy = false; render();
  $('notice').className = failed.length ? 'warning' : '';
  $('notice').textContent = failed.length ? `Kunde inte uppdatera grupp ${failed.join(', ')}. Eventuella tidigare listor för dessa grupper behålls. Klicka på Uppdatera för att försöka igen.` : 'Hämtad från schack.se · ' + new Date().toLocaleTimeString('sv-SE');
}
function selectRound(value) { round = value; render(); if (LIVE) void refresh(); }
for (let n = 1; n <= 5; n++) $('round').add(new Option('Rond ' + n, String(n)));
$('round').onchange = () => selectRound(Number($('round').value));
$('previous').onclick = () => { if (round > 1) selectRound(round - 1); };
$('next').onclick = () => { if (round < 5) selectRound(round + 1); };
$('refresh').onclick = refresh;
$('displayMode').onclick = () => {
  const enabled = document.body.classList.toggle('display-mode');
  $('displayMode').setAttribute('aria-pressed', String(enabled));
  $('displayMode').textContent = enabled ? 'Avsluta visningsläge' : 'Visningsläge';
};
$('print').onclick = () => {
  const missing = GROUPS.filter(group => !currentGames().some(g => g.group === group));
  if ((missing.length || failures.get(round)?.length) && !confirm('Bordslistan är ofullständig eller kunde inte uppdateras helt. Skriv ut ändå?')) return;
  window.print();
};
$('installButton').onclick = () => $('installation').showModal();
if (typeof BOOKMARKLET_URL !== 'undefined') {
  for (const id of ['bookmarklet', 'dialogBookmarklet']) {
    $(id).href = BOOKMARKLET_URL;
    $(id).onclick = event => { event.preventDefault(); $('installation').showModal(); };
  }
  $('copyBookmarklet').onclick = async () => {
    try { await navigator.clipboard.writeText(BOOKMARKLET_URL); $('installStatus').textContent = 'Kopierat. Skapa ett bokmärke och klistra in adressen i URL-fältet.'; }
    catch { $('bookmarkCode').hidden = false; $('bookmarkCode').value = BOOKMARKLET_URL; $('bookmarkCode').focus(); $('bookmarkCode').select(); $('installStatus').textContent = 'Kopiera den markerade adressen och klistra in den i ett bokmärkes URL-fält.'; }
  };
}
$('applyGroups').onclick = () => {
  try { configureGroups($('prefix').value, Number($('groupCount').value)); render(); if (LIVE) void refresh(); }
  catch (error) { $('notice').className = 'warning'; $('notice').textContent = error.message; }
};
populatePrefixes(); render();
async function initializeLive() {
  document.body.classList.add('live-mode');
  $('notice').textContent = 'Läser turneringens grupper…';
  try {
    const sourceUrl = new URL(window.BERGER_SOURCE_URL || location.href);
    if (sourceUrl.origin !== 'https://member.schack.se') throw Error('Öppna bokmärket på member.schack.se.');
    const response = await fetch(sourceUrl.href, {cache:'no-store', signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('Kunde inte läsa turneringens grupplänkar.');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const discovered = discoverGroups(doc);
    if (!discovered.length) throw Error('Inga numrerade grupper hittades på källsidan.');
    availableGroups = discovered;
    const current = discovered.find(g => g.id === sourceUrl.searchParams.get('id'));
    const startPrefix = current?.prefix || discovered[0].prefix;
    const count = Math.min(5, discovered.filter(g => g.prefix === startPrefix).length);
    const title = current ? doc.title.split(' ' + current.prefix + '-' + current.number)[0] : doc.title;
    $('tournamentTitle').textContent = title;
    document.title = 'Bordslista · ' + title;
    populatePrefixes(); configureGroups(startPrefix, count); render(); await refresh();
  } catch (error) { $('notice').className = 'warning'; $('notice').textContent = error.message + ' Kör bokmärket igen från turneringens sida.'; }
}
if (LIVE) { void initializeLive(); }
else {
  $('refresh').textContent = 'Installera bokmärke';
  fetch('initial.json').then(response => { if (!response.ok) throw Error(); return response.json(); }).then(data => {
    games = validateGames(data.games); render();
    $('notice').textContent = 'Förhandsvisning från ' + new Date(data.fetchedAt).toLocaleString('sv-SE') + '. Använd bokmärket på schack.se för aktuella bordslistor.';
  }).catch(() => { $('notice').textContent = 'Installera bokmärket ovan och kör det på schack.se för att öppna bordslistan.'; });
}
