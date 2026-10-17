'use strict';
const LIVE = window.BERGER_LIVE === true;
let GROUPS = ['A', 'B', 'C', 'D', 'E'];
let IDS = Object.fromEntries(GROUPS.map((group, i) => [group, String(19095 + i)]));
let prefix = 'W2-';
let availableGroups = GROUPS.map((group, i) => ({prefix, number:i + 1, id:IDS[group]}));
let groupNumbers = Object.fromEntries(GROUPS.map((group, i) => [group, i + 1]));
let groupNames = Object.fromEntries(GROUPS.map(group => [group, 'W2-' + groupNumbers[group]]));
let detectionNumber = 0;
let boardsPerGroup = 3;
let maxRounds = 5;
const $ = id => document.getElementById(id);
let games = [];
let round = Number(window.BERGER_ROUND) || 1;
if (!Number.isInteger(round) || round < 1 || round > 100) round = 1;
let busy = false;
let requestNumber = 0;
const failures = new Map();
function groupName(group) { return groupNames[group]; }
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
function definitionName(group) { return group.name || (group.prefix ? group.prefix + group.number : ALPHABET[group.number - 1]); }
function normalizePrefix(value) {
  const normalized = value.trim();
  if (normalized && !/[-_]$/.test(normalized)) throw Error('Prefix måste avslutas med - eller _. Lämna tomt för grupperna A, B, C osv.');
  return normalized;
}
function setRoundsFromSource(doc) {
  const rounds = Array.from(doc.querySelectorAll('[onclick], a[href]')).map(link => {
    const target = (link.getAttribute('onclick') || '') + ' ' + (link.getAttribute('href') || '');
    return Number(target.match(/[?&]round=(\d+)/)?.[1]) || 0;
  }).filter(n => n >= 1 && n <= 100);
  maxRounds = rounds.length ? Math.max(...rounds) : 5;
  round = Math.min(round, maxRounds);
  $('round').replaceChildren();
  for (let n = 1; n <= maxRounds; n++) $('round').add(new Option('Rond ' + n, String(n)));
}
function parseGroupName(value) {
  const name = value.trim().replace(/\s+/g, ' ');
  const match = name.match(/^([\p{L}][\p{L}\d]*[-_])([1-9]\d*)$/u);
  if (match) return {prefix:match[1], number:Number(match[2]), name};
  const letter = name.toLocaleUpperCase('sv-SE');
  const index = ALPHABET.indexOf(letter);
  return name.length === 1 && index >= 0 ? {prefix:'', number:index + 1, name} : null;
}
function participantCount(doc, tournamentId) {
  const ids = new Set();
  const pairedIds = new Set();
  for (const element of doc.querySelectorAll('[onclick], a[href]')) {
    const target = (element.getAttribute('onclick') || '') + ' ' + (element.getAttribute('href') || '');
    const call = target.match(/postshowindtournamentresultform\(\s*['"](\d+)['"]\s*,\s*['"](\d+)['"]/i);
    if (call && call[1] === String(tournamentId)) ids.add(call[2]);
    const link = target.match(/ShowTournamentParticipantResultServlet\?([^'"\s]+)/i);
    if (link) {
      const query = new URLSearchParams(link[1]);
      const id = query.get('partid');
      if (query.get('id') === String(tournamentId) && /^\d+$/.test(id || '')) pairedIds.add(id);
    }
  }
  // Standings can retain replaced players. Pairings reflect the current group size.
  if (pairedIds.size) return pairedIds.size;
  if (!ids.size) throw Error('Kunde inte läsa deltagarantalet för turnerings-ID ' + tournamentId + '.');
  return ids.size;
}
function selectBergerGroups(definitions, counts) {
  const firstCount = counts[0];
  if (!definitions.length || counts.length !== definitions.length || counts.some(n => !Number.isInteger(n) || n < 1)) throw Error('Deltagarantal saknas.');
  const last = definitions.length - 1;
  for (let i = 1; i < last; i++) {
    if (counts[i] !== firstCount) throw Error(definitionName(definitions[i]) + ' har ' + counts[i] + ' deltagare, men första gruppen har ' + firstCount + '. Kontrollera grupperna.');
  }
  const ignored = last > 0 && counts[last] !== firstCount ? definitions[last] : null;
  return {definitions:ignored ? definitions.slice(0, -1) : definitions, participantCount:firstCount, ignored, ignoredCount:ignored ? counts[last] : null};
}
function discoverGroups(doc) {
  const found = new Map();
  for (const link of doc.querySelectorAll('[onclick], a[href]')) {
    const name = parseGroupName(link.textContent);
    const target = (link.getAttribute('onclick') || '') + ' ' + (link.getAttribute('href') || '');
    const id = target.match(/ShowTournamentServlet\?[^'"\s]*\bid=(\d+)/);
    if (!name || !id || /[?&]round=\d+/i.test(target)) continue;
    const value = {...name, id:id[1]};
    found.set(value.prefix + ':' + value.number, value);
  }
  return Array.from(found.values()).sort((a, b) => a.prefix.localeCompare(b.prefix, 'sv', {numeric:true}) || a.number - b.number);
}
function configureGroups(value, count) {
  const selectedPrefix = normalizePrefix(value);
  if (!Number.isInteger(count) || count < 1 || count > 26) throw Error('Välj 1–26 grupper.');
  const definitions = availableGroups.filter(g => g.prefix.toLocaleLowerCase() === selectedPrefix.toLocaleLowerCase()).sort((a, b) => a.number - b.number).slice(0, count);
  if (definitions.length !== count) throw Error('Alla ' + count + ' grupper med prefix ' + selectedPrefix + ' finns inte på källsidan.');
  prefix = definitions[0].prefix;
  GROUPS = definitions.map((_, i) => String.fromCharCode(65 + i));
  IDS = Object.fromEntries(GROUPS.map((group, i) => [group, definitions[i].id]));
  groupNumbers = Object.fromEntries(GROUPS.map((group, i) => [group, definitions[i].number]));
  groupNames = Object.fromEntries(GROUPS.map((group, i) => [group, definitionName(definitions[i])]));
  boardsPerGroup = 3;
  games = []; failures.clear(); requestNumber++; busy = false;
  $('prefix').value = prefix;
  $('detectedGroups').textContent = count + ' grupper';
}
async function loadGroupDocument(definition) {
  const response = await fetch('https://member.schack.se/ShowTournamentServlet?id=' + definition.id, {cache:'no-store', signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('Kunde inte läsa ' + definitionName(definition) + '.');
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  assertSourceGroup(doc, definition.id, definitionName(definition));
  return doc;
}
function assertSourceGroup(doc, tournamentId, name) {
  // Source forms sit directly inside a table. HTML5 parsing moves their inputs
  // outside the form, so descendant selectors alone miss W1's tournament ID.
  const pageIds = Array.from(new Set(Array.from(doc.querySelectorAll('input[name="id"]')).map(input => input.value).filter(value => /^\d+$/.test(value || ''))));
  const declaredId = doc.querySelector('#showIndTournamentResult input[name="id"]')?.value || doc.querySelector('#showTournamentTeamResult input[name="id"]')?.value || (pageIds.length === 1 ? pageIds[0] : null);
  if (declaredId) {
    if (String(declaredId) === String(tournamentId)) return;
    throw Error('Fel turnerings-ID i källsidan: ' + declaredId + '.');
  }
  const expected = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('(?:^|\\s)' + expected + '(?=\\s|$)').test(doc.title)) throw Error('Fel källgrupp: ' + doc.title);
}
async function detectGroups(value, sourceDoc = null, sourceId = null) {
  const selectedPrefix = normalizePrefix(value).toLocaleLowerCase();
  const definitions = availableGroups.filter(g => g.prefix.toLocaleLowerCase() === selectedPrefix).sort((a, b) => a.number - b.number);
  if (!definitions.length) throw Error('Inga grupper med prefix ' + value + ' hittades på källsidan.');
  const request = ++detectionNumber;
  let configured = false;
  requestNumber++; busy = true; render();
  $('notice').className = '';
  $('notice').textContent = 'Jämför gruppernas deltagarantal…';
  try {
    const docs = await Promise.all(definitions.map(definition => sourceDoc && definition.id === sourceId ? sourceDoc : loadGroupDocument(definition)));
    const counts = docs.map((doc, i) => participantCount(doc, definitions[i].id));
    if (request !== detectionNumber) return;
    const selection = selectBergerGroups(definitions, counts);
    configureGroups(selection.definitions[0].prefix, selection.definitions.length);
    setRoundsFromSource(docs[0]);
    boardsPerGroup = Math.ceil(selection.participantCount / 2);
    configured = true;
    const ignored = selection.ignored;
    $('detectedGroups').textContent = selection.definitions.length + ' grupper med ' + selection.participantCount + ' deltagare vardera.' + (ignored ? ' ' + definitionName(ignored) + ' (' + selection.ignoredCount + ' deltagare) ignoreras.' : ' Sista gruppen ingår.');
    render(); await refresh();
  } finally {
    if (request === detectionNumber) { if (!configured) busy = false; render(); }
  }
}

function validateGames(rows) {
  if (!Array.isArray(rows)) throw Error('Ogiltig bordslista.');
  const seen = new Set();
  return rows.map(g => {
    if (!GROUPS.includes(g.group) || String(g.tournamentId) !== IDS[g.group] || !Number.isInteger(g.round) || g.round < 1 || g.round > maxRounds || !Number.isInteger(g.board) || g.board < 1 || g.board > 100 || typeof g.white !== 'string' || !g.white || typeof g.black !== 'string' || !g.black) throw Error('Ogiltig partirad.');
    const key = [g.group, g.round, g.board].join(':');
    if (seen.has(key)) throw Error('Dubblerat bord i källistan.');
    seen.add(key);
    const rating = n => n != null && /^\d{1,4}$/.test(String(n)) ? Number(n) : null;
    return {group:g.group, tournamentId:IDS[g.group], round:g.round, board:g.board, white:g.white, black:g.black, whiteElo:rating(g.whiteElo), blackElo:rating(g.blackElo)};
  });
}
function parseSource(doc, group, selectedRound) {
  assertSourceGroup(doc, IDS[group], groupName(group));
  const roundHeader = doc.querySelector('.selroundheader');
  const roundText = roundHeader?.innerHTML?.replace(/<[^>]*>/g, ' ') || roundHeader?.textContent || '';
  const selected = roundText.match(/Rond\s+(\d+)/i);
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
  return GROUPS.slice(0, GROUPS.indexOf(g.group)).reduce((offset, group) => offset + Math.max(boardsPerGroup, ...games.filter(row => row.group === group).map(row => row.board)), g.board);
}
function render() {
  const rows = currentGames();
  document.documentElement.style.setProperty('--board-count', Math.max(1, rows.length));
  $('round').value = String(round);
  $('previous').disabled = round === 1;
  $('next').disabled = round === maxRounds;
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
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = groupName(g.group); cell('').append(badge);
    cell(boardNumber(g)); cell(g.white); cell(g.whiteElo ?? '–').className = 'elo';
    cell(g.black); cell(g.blackElo ?? '–').className = 'elo'; cell('').className = 'paper-result';
    $('games').append(row);
  }
  if (!rows.length) { const row = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 7; td.className = 'empty'; td.textContent = busy ? 'Hämtar bordslistor…' : 'Ingen bordslista för denna rond.'; row.append(td); $('games').append(row); }
  $('groups').replaceChildren();
  GROUPS.forEach(group => { const count = rows.filter(g => g.group === group).length; const label = document.createElement('span'); label.textContent = `${group} / ${groupName(group)} · ${count ? count + ' bord' : 'saknas'}`; if (!count || failures.get(round)?.includes(group)) label.className = 'missing'; $('groups').append(label); });
  $('scope').textContent = groupName(GROUPS[0]) + '–' + groupName(GROUPS.at(-1)) + ' · ' + rows.length + ' bord';
}
async function refresh() {
  if (!LIVE) { $('installation').showModal(); return; }
  const requestedRound = round, request = ++requestNumber;
  busy = true; render(); $('notice').className = ''; $('notice').textContent = 'Hämtar rond ' + requestedRound + ' från schack.se…';
  const responses = await Promise.allSettled(GROUPS.map(group => fetchGroup(group, requestedRound)));
  if (request !== requestNumber) return;
  const failed = [];
  const failureDetails = [];
  responses.forEach((response, i) => {
    const group = GROUPS[i];
    if (response.status === 'fulfilled') games = games.filter(g => !(g.round === requestedRound && g.group === group)).concat(response.value);
    else { failed.push(group); failureDetails.push(groupName(group) + ': ' + (response.reason?.message || 'Hämtningen misslyckades')); }
  });
  failures.set(requestedRound, failed); busy = false; render();
  $('notice').className = failed.length ? 'warning' : '';
  $('notice').textContent = failed.length ? `Kunde inte uppdatera grupp ${failed.join(', ')}. ${failureDetails.join('; ')}. Eventuella tidigare listor behålls. Klicka på Uppdatera för att försöka igen.` : 'Hämtad från schack.se · ' + new Date().toLocaleTimeString('sv-SE');
}
function selectRound(value) { round = value; render(); if (LIVE) void refresh(); }
for (let n = 1; n <= maxRounds; n++) $('round').add(new Option('Rond ' + n, String(n)));
$('round').onchange = () => selectRound(Number($('round').value));
$('previous').onclick = () => { if (round > 1) selectRound(round - 1); };
$('next').onclick = () => { if (round < maxRounds) selectRound(round + 1); };
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
render();
$('prefixForm').onsubmit = async event => {
  event.preventDefault();
  if (!LIVE) { $('installation').showModal(); return; }
  try { await detectGroups($('prefix').value); }
  catch (error) { $('notice').className = 'warning'; $('notice').textContent = error.message; }
};
async function initializeLive() {
  document.body.classList.add('live-mode');
  $('prefix').disabled = true;
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
    if (!current) throw Error('Gruppen i URL:en kunde inte identifieras. Öppna första gruppens sida.');
    const startPrefix = current.prefix;
    $('prefix').value = startPrefix;
    const title = doc.title.split(' ' + definitionName(current))[0];
    $('tournamentTitle').textContent = title;
    document.title = 'Bordslista · ' + title;
    await detectGroups(startPrefix, doc, sourceUrl.searchParams.get('id'));
  } catch (error) { $('notice').className = 'warning'; $('notice').textContent = error.message + ' Ange prefixet i textrutan, eller kör bokmärket igen från turneringens sida.'; }
  finally { $('prefix').disabled = false; }
}
if (LIVE) { void initializeLive(); }
else {
  $('refresh').textContent = 'Installera bokmärke';
  fetch('initial.json').then(response => { if (!response.ok) throw Error(); return response.json(); }).then(data => {
    games = validateGames(data.games); render();
    $('notice').textContent = 'Förhandsvisning från ' + new Date(data.fetchedAt).toLocaleString('sv-SE') + '. Använd bokmärket på schack.se för aktuella bordslistor.';
  }).catch(() => { $('notice').textContent = 'Installera bokmärket ovan och kör det på schack.se för att öppna bordslistan.'; });
}
