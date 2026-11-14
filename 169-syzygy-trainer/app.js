import { Chess } from './vendor/chess.js';
import { parseProblems, nextIndex, mateDistance, defenseMove } from './trainer.js';
import { generateProblems } from './generator.js';
import { parseCatalog, problemLabel } from './catalog.js';

const $ = id => document.getElementById(id);
let problems = [], index = 0, game, player, selected = null, flipped = false;
let count = 0, minimum = null, busy = false, ready = false, generation = 0, last = null, controller;
const cache = new Map();
const message = text => { $('status').textContent = text; };

async function probe(fen, signal) {
  if (cache.has(fen)) return cache.get(fen);
  const response = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Tjänsten är upptagen. Vänta en stund och försök igen.' : `Tablebase kunde inte läsa positionen (HTTP ${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data.moves) || data.category === 'unknown') throw new Error('Positionen saknas i tablebase.');
  cache.set(fen, data);
  return data;
}

function render() {
  $('board').replaceChildren();
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  const targets = selected && !busy ? game.moves({ square: selected, verbose: true }).map(m => m.to) : [];
  for (const rank of ranks) for (const file of files) {
    const square = file + rank, piece = game.get(square);
    const button = document.createElement('button');
    button.className = 'square' + ((file.charCodeAt(0) + Number(rank)) % 2 ? '' : ' dark');
    if (selected === square) button.classList.add('selected');
    if (targets.includes(square)) button.classList.add('target');
    if (last && [last.from, last.to].includes(square)) button.classList.add('last');
    if (piece) {
      const image = document.createElement('img');
      image.src = `./assets/pieces/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`;
      image.alt = '';
      image.draggable = false;
      image.className = 'piece';
      button.append(image);
    }
    button.setAttribute('aria-label', `${square}${piece ? ` ${piece.color === 'w' ? 'vit' : 'svart'} ${ {k:'kung',q:'dam',r:'torn',b:'löpare',n:'springare',p:'bonde'}[piece.type]}` : ', tom'}`);
    button.setAttribute('aria-pressed', String(selected === square));
    const coord = document.createElement('small');
    coord.textContent = (file === files[0] ? rank : '') + (rank === ranks[7] ? file : '');
    button.append(coord);
    button.addEventListener('click', () => play(square));
    $('board').append(button);
  }
  $('played').textContent = count;
  $('minimum').textContent = $('show-count').checked ? minimum?.moves ?? '—' : '••';
  $('position-label').textContent = problems.length ? `Delproblem ${index + 1} av ${problems.length}` : 'Skapar delproblem…';
  $('turn').textContent = game.isGameOver() ? 'Partiet är slut' : busy ? 'Tablebase analyserar…' : `${game.turn() === 'w' ? 'Vit' : 'Svart'} vid draget${game.isCheck() ? ' · schack' : ''}`;
  $('easier').disabled = !problems.length || index === problems.length - 1;
  $('harder').disabled = !problems.length || index === 0;
  $('same').disabled = !problems.length;
  const history = game.history();
  $('history').textContent = history.length ? history.map((san, i) => `${i + 1}. ${san}`).join('  ') : 'Dina drag visas här.';
}

function ended() {
  if (!game.isGameOver()) return false;
  if (game.isCheckmate()) {
    const success = game.turn() !== player;
    message(success ? `Schackmatt! Du använde ${count} drag.${minimum ? ` Minsta antal: ${minimum.moves}.` : ''}` : 'Du blev schackmatt. Välj Same för att försöka igen.');
  } else message(`Remi${game.isStalemate() ? ' genom patt' : ''}. Du använde ${count} drag. Välj Same för att försöka igen.`);
  return true;
}

async function sync(token) {
  busy = true; $('retry').hidden = true; render();
  try {
    if (ended()) return;
    const data = await probe(game.fen(), controller.signal);
    if (token !== generation) return;
    if (!game.history().length) {
      if (data.category !== 'win') throw new Error('Startpositionen måste vara vunnen för sidan vid draget.');
      minimum = mateDistance(game.fen(), data);
      ready = true;
      $('metric-note').textContent = minimum ? `Egna drag från start · ${minimum.source}.` : 'Exakt mattavstånd saknas. DTZ visas inte som mattavstånd.';
    }
    if (game.turn() !== player) {
      const uci = defenseMove(data);
      last = game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] });
      if (!ended()) message('Din tur. Hitta vägen till matt.');
    } else message('Din tur. Hitta vägen till matt.');
  } catch (error) {
    if (token !== generation) return;
    message(`${error.message} Klicka på ”Försök ansluta igen”.`);
    $('retry').hidden = false;
  } finally {
    if (token === generation) { busy = false; render(); }
  }
}

async function play(square) {
  if (busy || !ready || game.isGameOver() || game.turn() !== player) return;
  const piece = game.get(square);
  if (piece?.color === player) { selected = selected === square ? null : square; render(); return; }
  if (!selected) return;
  const legal = game.moves({square: selected, verbose:true}).filter(m => m.to === square);
  if (!legal.length) return;
  let promotion;
  if (legal.some(m => m.promotion)) {
    promotion = window.prompt('Promovera till q (dam), r (torn), b (löpare) eller n (springare)', 'q')?.trim().toLowerCase();
    if (!['q','r','b','n'].includes(promotion)) return;
  }
  last = game.move({from:selected, to:square, promotion});
  selected = null; count++; render();
  await sync(generation);
}

function start(newIndex) {
  controller?.abort(); controller = new AbortController(); generation++;
  index = newIndex; game = new Chess(problems[index]); player = game.turn();
  flipped = player === 'b'; selected = null; last = null; count = 0; minimum = null; ready = false;
  $('problem').value = index;
  $('metric-note').textContent = 'Hämtar mattavstånd…';
  message('Hämtar tablebase…'); sync(generation);
}

function load(data, name) {
  const parsed = parseProblems(data);
  problems = parsed;
  $('problem').replaceChildren(...problems.map((_, i) => new Option(`Matt i ${problems.length - i} drag${i === 0 ? ' · svårast' : i === problems.length - 1 ? ' · lättast' : ''}`, i)));
  $('problem').disabled = false;
  $('source').textContent = `${name} · ${problems.length} delproblem · svårast först`;
  start(problems.length - 1);
}
$('problem').addEventListener('change', e => start(Number(e.target.value)));
for (const [id, difficulty] of [['easier',-1],['same',0],['harder',1]]) $(id).addEventListener('click', () => { if (problems.length) start(nextIndex(index,difficulty,problems.length)); });
$('flip').addEventListener('click', () => { if (game) { flipped = !flipped; render(); } });
$('show-count').addEventListener('change', () => { if (game) render(); });
$('retry').addEventListener('click', () => sync(generation));
let catalog = [], generationController;

async function selectProblemSet() {
  generationController?.abort();
  const task = new AbortController();
  generationController = task;
  controller?.abort(); generation++;
  const entry = catalog[Number($('problem-set').value)];
  if (!entry) return;
  problems = []; index = 0; ready = false; busy = true;
  game = new Chess(entry.fen); player = game.turn(); flipped = player === 'b';
  count = 0; minimum = null; selected = null; last = null;
  $('problem').replaceChildren(); $('problem').disabled = true;
  $('retry').hidden = true; $('regenerate').disabled = true;
  $('source').textContent = `${entry.name} · skapar delproblem…`;
  $('metric-note').textContent = 'Träningen börjar med matt i ett drag när genereringen är klar.';
  $('generation-status').textContent = `Skapar ${entry.name}…`;
  message('Förbereder träningen…'); render();
  try {
    const generated = await generateProblems(entry.fen, probe, {
      signal: task.signal,
      onProgress: ({count, remaining}) => {
        if (generationController !== task) return;
        $('generation-status').textContent = `${entry.name}: ${count} delproblem skapade · matt i ${remaining} drag återstår…`;
      }
    });
    if (generationController !== task || task.signal.aborted) return;
    load(generated, entry.name);
    $('generation-status').textContent = `${entry.name}: ${generated.length} delproblem klara, matt i 1–${generated.length} drag.`;
  } catch (error) {
    if (generationController !== task || task.signal.aborted) return;
    busy = false;
    $('generation-status').textContent = `Kunde inte skapa ${entry.name}: ${error.message}`;
    message('Välj ett annat problem eller klicka på ”Skapa en ny variant” för att försöka igen.');
    render();
    $('turn').textContent = 'Träningen kunde inte förberedas';
  } finally {
    if (generationController === task) {
      generationController = null;
      $('regenerate').disabled = false;
    }
  }
}

$('problem-set').addEventListener('change', selectProblemSet);
$('regenerate').addEventListener('click', selectProblemSet);
try {
  const response = await fetch('./problems.json');
  if (!response.ok) throw new Error(`Kunde inte läsa problems.json (HTTP ${response.status}).`);
  catalog = parseCatalog(await response.json());
  $('problem-set').replaceChildren(...catalog.map((entry, i) => new Option(problemLabel(entry.name), i)));
  $('problem-set').disabled = false;
  $('available-problems').textContent = `Tillgängliga problem: ${catalog.map(entry => entry.name).join(', ')}.`;
  await selectProblemSet();
} catch (error) {
  $('problem-set').replaceChildren(new Option('Kunde inte läsa problem', ''));
  $('generation-status').textContent = error.message;
  message('Kontrollera problems.json och ladda om sidan. Starta programmet via npm start.');
}
