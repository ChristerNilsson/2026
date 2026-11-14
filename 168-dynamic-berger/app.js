'use strict';
const T = Tournament;
const $ = id => document.getElementById(id);
const STORAGE = 'dynamic-berger-utkast-v1';
let data = null, current = 1, unsaved = false;
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function draft() {
  unsaved = true;
  try { localStorage.setItem(STORAGE, JSON.stringify({data, current})); }
  catch { message('Det lokala utkastet kunde inte sparas. Spara JSON för att behålla ändringarna.', true); }
}
function download() {
  const blob = new Blob([T.serialize(data)], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `turnering-rond-${String(data.app.lottadeRonder.length).padStart(2, '0')}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  unsaved = false;
}
function accept(input, label, selected = null) {
  const next = T.load(input);
  if (unsaved && !confirm('Öppna en annan fil? Ändringarna i den nuvarande turneringen är inte exporterade.')) return;
  data = next;
  current = selected || data.app.lottadeRonder.at(-1) || 1;
  if (!data.ronder[current - 1]) current = 1;
  unsaved = false;
  render();
  message(`${label} är inläst. ${data.app.lottadeRonder.length ? 'Fortsätt med resultaten eller lotta nästa rond.' : 'Klicka på Lotta rond 1 för att börja.'}`);
}
function player(id) { return data.spelare.find(p => p.id === id); }
function description(id) {
  const p = player(id);
  return `${id} ${p.signatur} (${p.elo})`;
}
function cell(tr, text, className = '') {
  const td = document.createElement('td'); td.textContent = text; td.className = className; tr.append(td); return td;
}
function focusBoard(index) {
  const buttons = [...document.querySelectorAll('.result')];
  if (!buttons.length) return;
  const button = buttons[Math.max(0, Math.min(index, buttons.length - 1))];
  button.focus(); button.scrollIntoView({block: 'nearest'});
}
function enter(index, value, advance = true) {
  try {
    T.setResult(data, current, index, value);
    draft(); renderTable(); updateProgress();
    focusBoard(index + (advance ? 1 : 0));
  } catch (error) { message(error.message, true); }
}
function chooseResult(button, index) {
  document.querySelectorAll('.result-menu').forEach(el => el.remove());
  const menu = document.createElement('div'); menu.className = 'result-menu';
  for (const [value, label] of [['1','1–0'], ['r','½–½'], ['0','0–1'], [' ','Ospelat']]) {
    const option = document.createElement('button'); option.textContent = label;
    option.onclick = () => enter(index, value);
    menu.append(option);
  }
  button.parentElement.append(menu);
}
function renderTable() {
  $('boards').replaceChildren();
  const drawn = data.app.lottadeRonder.includes(current);
  if (!drawn) {
    const tr = document.createElement('tr');
    const td = cell(tr, 'Lotta ronden för att visa bordslistan.'); td.colSpan = 8;
    $('boards').append(tr); return;
  }
  T.rows(data, current).forEach((match, index) => {
    const w = player(match.white), b = player(match.black);
    const tr = document.createElement('tr');
    cell(tr, index + 1); cell(tr, w.id, 'id'); cell(tr, w.signatur, 'player'); cell(tr, w.elo, 'elo');
    const td = cell(tr, '');
    const button = document.createElement('button');
    button.className = 'result' + (match.result !== ' ' ? ' filled' : '');
    button.textContent = ({'1': '1 – 0', '0': '0 – 1', 'r': '½ – ½', ' ': '–'})[match.result];
    button.setAttribute('aria-label', `Bord ${index + 1}: ${w.signatur} mot ${b.signatur}, ${match.result === ' ' ? 'ospelat' : button.textContent}. Ange 1, r, 0 eller mellanslag.`);
    button.onclick = () => chooseResult(button, index);
    button.onkeydown = event => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (['0','1','r',' '].includes(key)) { event.preventDefault(); enter(index, key); }
      else if (['ArrowDown','ArrowUp','Enter'].includes(event.key)) {
        event.preventDefault(); focusBoard(index + (event.key === 'ArrowUp' ? -1 : 1));
      } else if (event.key === 'Escape') document.querySelectorAll('.result-menu').forEach(el => el.remove());
    };
    td.append(button);
    cell(tr, b.elo, 'elo'); cell(tr, b.signatur, 'player'); cell(tr, b.id, 'id');
    $('boards').append(tr);
  });
  const waiting = T.pending(data, current);
  const start = T.rows(data, current).length;
  for (let i = 0; i < Math.floor(waiting.length / 2); i++) {
    const tr = document.createElement('tr');
    cell(tr, start + i + 1);
    const td = cell(tr, 'Inväntar Schweizerlottning', 'elo'); td.colSpan = 7;
    $('boards').append(tr);
  }
  if (waiting.length % 2) {
    const tr = document.createElement('tr');
    const td = cell(tr, 'Udda antal i Schweizergruppen: frirond utses vid lottningen.', 'elo'); td.colSpan = 8;
    $('boards').append(tr);
  }
}
function updateProgress() {
  const drawn = data.app.lottadeRonder.includes(current);
  const matches = drawn ? T.rows(data, current) : [];
  $('progress').textContent = `${matches.filter(p => p.result !== ' ').length} / ${matches.length}`;
  const next = data.app.lottadeRonder.length + 1;
  const completed = next > data.ronder.length;
  const incomplete = next > 1 && T.rows(data, next - 1).some(p => p.result === ' ');
  const remaining = data.spelare.filter(p => !(data.avhopp || []).some(a => a.spelare === p.id && a.rond <= next)).length;
  const ended = remaining < data.ronder.length;
  $('draw').textContent = ended ? 'Turneringen avslutad' : completed ? 'Alla ronder är lottade' : `Lotta rond ${next}`;
  $('draw').disabled = completed || incomplete || ended;
  $('draw').title = incomplete ? 'Fyll i resultaten i senast lottade rond först.' : 'Lotta och ladda ner en ny JSON-fil';
  const latestComplete = data.app.lottadeRonder.length === data.ronder.length && !T.rows(data, data.ronder.length).some(p => p.result === ' ');
  $('phase').textContent = !drawn ? 'Ej lottad' : latestComplete && current === data.ronder.length ? 'Sista ronden färdig' : matches.every(p => p.result !== ' ') ? 'Alla lottade partier rapporterade' : 'Resultatinmatning pågår';
}
function render() {
  $('workspace').hidden = false;
  $('save').disabled = false; $('print').disabled = false;
  $('title').textContent = `Rond ${current} av ${data.ronder.length}`;
  $('subtitle').textContent = 'En bordslista. Alla spelare. Ett resultat i taget.';
  $('roundLabel').textContent = ` / rond ${current}`;
  $('rounds').replaceChildren();
  for (const rd of data.ronder) {
    const button = document.createElement('button');
    button.textContent = rd.rond;
    button.setAttribute('aria-label', `Visa rond ${rd.rond}`);
    button.className = (current === rd.rond ? 'current ' : '') + (data.app.lottadeRonder.includes(rd.rond) ? 'done' : '');
    if (current === rd.rond) button.setAttribute('aria-current', 'step');
    button.disabled = rd.rond > data.app.lottadeRonder.length + 1;
    button.onclick = () => { current = rd.rond; render(); };
    $('rounds').append(button);
  }
  const rd = data.ronder[current - 1];
  const waiting = T.pending(data, current);
  $('active').textContent = Object.values(rd.grupper).flat().length;
  $('pendingCount').textContent = waiting.length;
  $('pending').hidden = !waiting.length;
  $('pendingPlayers').replaceChildren();
  for (const id of waiting) {
    const span = document.createElement('span'); span.className = 'chip'; span.textContent = description(id); $('pendingPlayers').append(span);
  }
  const dropped = (data.avhopp || []).filter(a => a.rond <= current).map(a => a.spelare);
  const byes = (data['personliga-frironder'] || []).filter(a => a.ronder.includes(current) && !dropped.includes(a.spelare)).map(a => a.spelare);
  $('withdrawn').textContent = dropped.map(description).join(' · ') || 'Inga';
  $('byes').textContent = byes.map(description).join(' · ') || 'Inga';
  renderTable(); updateProgress();
}
$('file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { accept(JSON.parse(await file.text()), file.name); }
  catch (error) { message(`Kunde inte läsa filen: ${error.message}`, true); }
  event.target.value = '';
};
$('draw').onclick = () => {
  try {
    current = T.draw(data); draft(); render(); download();
    message(`Rond ${current} är lottad. En ny JSON-fil har skickats till webbläsarens nedladdningar. Schweizerlottningen återstår.`);
    focusBoard(0);
  } catch (error) { message(error.message, true); }
};
$('save').onclick = () => { download(); message('JSON-filen med aktuella resultat har skickats till nedladdningar.'); };
$('print').onclick = () => window.print();
$('restore').onclick = () => {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE)); accept(saved.data, 'Lokalt utkast', saved.current); }
  catch (error) { message(`Utkastet kunde inte läsas: ${error.message}`, true); }
};
window.addEventListener('beforeunload', event => { if (unsaved) { event.preventDefault(); event.returnValue = ''; } });
try { $('restore').hidden = !localStorage.getItem(STORAGE); } catch { /* File import and export remain available. */ }
if (location.protocol !== 'file:') {
  fetch('turnering.json').then(response => {
    if (!response.ok) throw Error('Ingen standardfil');
    return response.json();
  }).then(value => { if (!data) accept(value, 'turnering.json'); }).catch(() => {
    if (!data) message('Välj turneringsfilen med Öppna JSON.');
  });
}
