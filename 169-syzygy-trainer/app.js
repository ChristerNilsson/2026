import { Chess } from './vendor/chess.js';
import { parseProblems, nextIndex, mateDistance, defenseMove, isPromotionProblem, isRookCaptureProblem } from './trainer.js';
import { generateProblems, optimalMoves } from './generator.js';
import { parseCatalog, problemLabel } from './catalog.js';
import { cacheFilename, parseProblemCache, createProblemCache } from './problem-cache.js';
import { Milestones, isPawnEndgame, formatTime } from './milestones.js';
import { ContinuationProgress } from './progress.js';
import { AnalysisBoard } from './analysis.js';

const $ = id => document.getElementById(id);
let problems = [], index = 0, game, player, selected = null, flipped = false;
let count = 0, minimum = null, busy = false, ready = false, generation = 0, last = null, controller;
let hint = null;
const cache = new Map();
const fullCache = new Map();
let promotionGoal = false;
let captureGoal = false;
let pawnStages = false, milestones = new Milestones();
let progress = new ContinuationProgress(), knownContinuation = false;
let progressStorageKey;
const promoted = () => promotionGoal && last?.promotion && last.color === player;
const rookCaptured = () => captureGoal && last?.captured === 'r' && last.color === player;
const finished = () => Boolean(knownContinuation || promoted() || rookCaptured() || game.isGameOver());
const turnMessage = () => pawnStages ? 'Din tur. Vinn bönder på vägen till promovering eller matt.' : promotionGoal ? 'Din tur. För bonden till promovering.' : captureGoal ? 'Din tur. Slå tornet eller sätt matt.' : 'Din tur. Hitta vägen till matt.';
let requests = 0, savedRequests = null;
function showRequests() {
  $('request-count').textContent = `Tablebase-anrop denna session: ${requests}${savedRequests === null ? '' : ` · Anrop när varianten skapades: ${savedRequests}`}.`;
}
const message = text => { $('status').textContent = text; };
let startedAt = null, elapsed = 0;
const elapsedTime = () => elapsed + (startedAt === null ? 0 : performance.now() - startedAt);
function updateTime() {
  $('elapsed').textContent = formatTime(elapsedTime());
}
function resetTime() { startedAt = null; elapsed = 0; updateTime(); }
setInterval(updateTime, 250);

function renderMilestones() {
  $('milestone-panel').hidden = !pawnStages;
  if (!pawnStages) return;
  const pieces = game.board().flat().filter(Boolean);
  const ownPawn = pieces.some(piece => piece.color === player && piece.type === 'p');
  const enemyPawn = pieces.some(piece => piece.color !== player && piece.type === 'p');
  $('next-milestone').textContent = finished() ? 'Problemet är avslutat.' : ownPawn && enemyPawn ? 'Delmål: vinn en bonde. Slutmål: promovera eller sätt matt.' : ownPawn ? 'Slutmål: promovera eller sätt matt.' : enemyPawn ? 'Nästa delmål: vinn en bonde eller sätt matt.' : 'Nästa delmål: sätt matt.';
  const latest = milestones.entries.at(-1);
  $('milestone-notice').hidden = !latest;
  $('milestone-notice').textContent = latest ? `${finished() ? 'Slutmål' : 'Delmål'} nått: ${latest.label}!${finished() ? '' : ' Spelet fortsätter och totaltiden löper vidare.'}` : '';
  $('milestone-list').replaceChildren(...milestones.entries.map(entry => {
    const item = document.createElement('li');
    item.textContent = `${entry.label} · Etapp: ${entry.moves} drag, ${formatTime(entry.elapsed)} · Totalt: ${entry.totalMoves} drag, ${formatTime(entry.totalElapsed)}`;
    return item;
  }));
}

function recordMilestones(category) {
  if (pawnStages) milestones.observe(game, player, category, elapsedTime(), count);
}

async function probe(fen, signal, full = false) {
  if (fullCache.has(fen)) return fullCache.get(fen);
  if (!full && cache.has(fen)) return cache.get(fen);
  requests++; showRequests();
  const response = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Tjänsten är upptagen. Vänta en stund och försök igen.' : `Tablebase kunde inte läsa positionen (HTTP ${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data.moves) || data.category === 'unknown') throw new Error('Positionen saknas i tablebase.');
  cache.set(fen, data);
  fullCache.set(fen, data);
  return data;
}

const analysis = new AnalysisBoard({probe:(fen, signal) => probe(fen, signal, true)});

function render() {
  analysis.updateTraining(game.fen(), flipped);
  renderMilestones();
  const complete = finished();
  $('game-result').hidden = !complete;
  $('board').classList.toggle('finished', complete);
  if (complete) {
    $('result-title').textContent = knownContinuation ? 'Rätt drag – fortsättningen är redan avklarad!' : rookCaptured() ? 'Tornet slaget – problemet är löst!' : promoted() ? 'Promovering – problemet är löst!' : game.isCheckmate() ? (game.turn() !== player ? 'Schack-Matt du vann' : 'Schackmatt – du förlorade') : game.isStalemate() ? 'Remi - Patt' : 'Remi – partiet är slut';
    $('result-detail').textContent = `${count} egna drag · Använd tid ${$('elapsed').textContent}. Välj Next för nästa utmaning eller Repeat för att försöka igen.`;
  }
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
    if (hint?.from === square) button.classList.add('hint-from');
    if (hint?.to === square) button.classList.add('hint-to');
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
  const solved = knownContinuation || promoted() || rookCaptured() || (game.isCheckmate() && game.turn() !== player);
  const remaining = problems.length ? knownContinuation ? 0 : (minimum?.moves ?? problems.length - index) - count : '—';
  $('remaining').textContent = $('show-count').checked ? remaining : '••';
  $('position-label').textContent = problems.length ? `Delproblem ${problems.length - index} av ${problems.length}` : 'Skapar delproblem…';
  $('turn').textContent = complete ? 'Problemet är avslutat' : busy ? 'Tablebase analyserar…' : `${game.turn() === 'w' ? 'Vit' : 'Svart'} vid draget${game.isCheck() ? ' · schack' : ''}`;
  $('easier').disabled = !problems.length || index === problems.length - 1;
  const nextSet = index === 0 && complete && catalog.length > 1;
  $('harder').disabled = !problems.length || (index === 0 && !nextSet);
  $('harder').title = nextSet ? `Nästa problem: ${catalog[(Number($('problem-set').value) + 1) % catalog.length].name}` : 'Nästa delproblem';
  $('harder').classList.toggle('next-ready', complete && !$('harder').disabled);
  $('same').disabled = !problems.length;
  $('syzygy').disabled = false;
  $('syzygy-external').href = `https://syzygy-tables.info/?fen=${encodeURIComponent(game.fen())}`;
  $('hint').disabled = busy || !ready || complete || game.turn() !== player;
  $('hint').setAttribute('aria-pressed', String(hint !== null));
  const history = game.history();
  $('history').textContent = history.length ? history.map((san, i) => `${i + 1}. ${san}`).join('  ') : 'Dina drag visas här.';
}

function ended() {
  if (!finished()) return false;
  if (knownContinuation || promoted() || rookCaptured() || (game.isCheckmate() && game.turn() !== player)) {
    progress.remember(game, player);
    progress.complete(problems.length - index);
    try { localStorage.setItem(progressStorageKey, JSON.stringify({positions:problems, levels:[...progress.levels]})); } catch {}
  }
  if (promoted() || (game.isCheckmate() && game.turn() !== player)) recordMilestones('win');
  if (startedAt !== null) { elapsed += performance.now() - startedAt; startedAt = null; updateTime(); }
  if (knownContinuation) { message('Rätt! Du har redan klarat fortsättningen. Välj Next för nästa delproblem.'); return true; }
  if (promoted()) { message(`Promovering! Problemet är löst på ${count} drag.`); return true; }
  if (rookCaptured()) { message(`Tornet är slaget! Problemet är löst på ${count} drag.`); return true; }
  if (game.isCheckmate()) {
    const success = game.turn() !== player;
    message(success ? `Schackmatt! Du använde ${count} drag.` : 'Du blev schackmatt. Välj Repeat för att försöka igen.');
  } else message(`Remi${game.isStalemate() ? ' genom patt' : ''}. Du använde ${count} drag. Välj Repeat för att försöka igen.`);
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
      minimum = promotionGoal || captureGoal ? null : mateDistance(game.fen(), data);
      ready = true;
      if (startedAt === null) startedAt = performance.now();
      $('metric-note').textContent = pawnStages ? 'Bondevinst med bibehållen vinst är ett delmål som bekräftas efter datorns svar. Promovering eller matt löser problemet direkt.' : captureGoal ? 'Målet är att slå tornet eller sätta matt. Då är problemet löst.' : promotionGoal ? 'Målet är att promovera bonden. Då är problemet löst.' : minimum ? `Egna drag från start · ${minimum.source}.` : 'Exakt mattavstånd saknas. DTZ visas inte som mattavstånd.';
    }
    if (game.turn() !== player) {
      const uci = defenseMove(data);
      last = game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] });
      const category = data.moves.find(move => move.uci === uci)?.category;
      if (!game.isGameOver()) {
        recordMilestones(category);
        knownContinuation = !$('repeat-continuation').checked && category === 'win' && count > 0 && progress.knows(game.fen());
      }
      if (!ended()) message(turnMessage());
    } else message(turnMessage());
  } catch (error) {
    if (token !== generation) return;
    message(`${error.message} Klicka på ”Försök ansluta igen”.`);
    $('retry').hidden = false;
  } finally {
    if (token === generation) { busy = false; render(); }
  }
}

async function play(square) {
  if (busy || !ready || finished() || game.turn() !== player) return;
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
  const uci = selected + square + (promotion ?? '');
  let correctFirstMove = false;
  if (!$('repeat-continuation').checked && count === 0 && progress.canSkip(problems.length - index, true)) {
    try { correctFirstMove = optimalMoves(game.fen(), cache.get(game.fen()), true).includes(uci); } catch {}
  }
  last = game.move({from:selected, to:square, promotion});
  hint = null;
  if (correctFirstMove && !finished()) knownContinuation = true;
  selected = null; count++; render();
  await sync(generation);
}

function start(newIndex) {
  resetTime();
  hint = null;
  knownContinuation = false;
  milestones = new Milestones();
  controller?.abort(); controller = new AbortController(); generation++;
  index = newIndex; game = new Chess(problems[index]); player = game.turn();
  promotionGoal = pawnStages || isPromotionProblem(problems[index]);
  captureGoal = !pawnStages && isRookCaptureProblem(problems[index]);
  flipped = player === 'b'; selected = null; last = null; count = 0; minimum = null; ready = false;
  $('problem').value = index;
  $('metric-note').textContent = 'Hämtar mattavstånd…';
  message('Hämtar tablebase…'); sync(generation);
}

function load(data, name) {
  const parsed = parseProblems(data);
  progress = new ContinuationProgress();
  progressStorageKey = `syzygy-progress:${name}`;
  try {
    const saved = JSON.parse(localStorage.getItem(progressStorageKey));
    if (JSON.stringify(saved?.positions) === JSON.stringify(parsed) && Array.isArray(saved.levels)) {
      progress = new ContinuationProgress(saved.levels.filter(level => level <= parsed.length));
    }
  } catch {}
  problems = parsed;
  const exact = problems.every(fen => mateDistance(fen, cache.get(fen) ?? {}));
  $('problem').replaceChildren(...problems.map((fen, i) => {
    const distance = mateDistance(fen, cache.get(fen) ?? {});
    return new Option(`Delproblem ${problems.length - i} · ${pawnStages ? `${problems.length - i} drag till promovering eller matt i varianten` : isRookCaptureProblem(fen) ? `${problems.length - i} drag till tornslag eller matt i varianten` : isPromotionProblem(fen) ? `${problems.length - i} drag till promovering i varianten` : distance ? `Matt i ${distance.moves} drag` : `${problems.length - i} drag till matt i varianten`}`, i);
  }).reverse());
  $('problem').disabled = false;
  $('source').textContent = pawnStages ? `${name} · ${problems.length} delproblem · närmast promovering eller matt först` : isRookCaptureProblem(problems[0]) ? `${name} · ${problems.length} delproblem · närmast tornslag eller matt först` : isPromotionProblem(problems[0]) ? `${name} · ${problems.length} delproblem · närmast promovering först` : exact ? `${name} · ${problems.length} delproblem · lättast först` : `${name} · ${problems.length} delproblem längs en DTZ-variant · närmast matt först`;
  start(problems.length - 1);
}
$('problem').addEventListener('change', e => start(Number(e.target.value)));
for (const [id, difficulty] of [['easier',-1],['same',0]]) $(id).addEventListener('click', () => { if (problems.length) start(nextIndex(index,difficulty,problems.length)); });
$('harder').addEventListener('click', () => {
  if (!problems.length) return;
  if (index > 0) return start(index - 1);
  if (finished() && catalog.length > 1) {
    $('problem-set').value = (Number($('problem-set').value) + 1) % catalog.length;
    return selectProblemSet();
  }
});
$('flip').addEventListener('click', () => { if (game) { flipped = !flipped; render(); } });
$('show-count').addEventListener('change', () => { if (game) render(); });
$('hint').addEventListener('click', async () => {
  if (busy || !ready || finished() || game.turn() !== player) return;
  if (hint) { hint = null; message(turnMessage()); render(); return; }
  const token = generation;
  busy = true; render();
  try {
    const data = await probe(game.fen(), controller.signal);
    if (token !== generation) return;
    const uci = data.category === 'win' ? optimalMoves(game.fen(), data, true)[0] : data.moves[0]?.uci;
    if (!uci) throw new Error('Inget drag hittades.');
    hint = {from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]};
    const preview = new Chess(game.fen()).move(hint);
    message(`Hint: ${preview.san} (${hint.from} → ${hint.to}).`);
  } catch (error) {
    if (token === generation) message(`${error.message} Klicka på Hint för att försöka igen.`);
  } finally {
    if (token === generation) { busy = false; render(); }
  }
});
try { $('repeat-continuation').checked = localStorage.getItem('syzygy:repeat-continuation') === 'true'; } catch {}
$('repeat-continuation').addEventListener('change', () => {
  try { localStorage.setItem('syzygy:repeat-continuation', String($('repeat-continuation').checked)); } catch {}
  if (knownContinuation && $('repeat-continuation').checked && problems.length) start(index);
});
$('retry').addEventListener('click', () => sync(generation));
let catalog = [], generationController;

async function selectProblemSet(force = false) {
  resetTime();
  hint = null;
  generationController?.abort();
  const task = new AbortController();
  generationController = task;
  controller?.abort(); generation++;
  const entry = catalog[Number($('problem-set').value)];
  if (!entry) return;
  knownContinuation = false;
  progress = new ContinuationProgress();
  pawnStages = isPawnEndgame(entry.fen);
  milestones = new Milestones();
  savedRequests = null; showRequests();
  problems = []; index = 0; ready = false; busy = true;
  game = new Chess(entry.fen); player = game.turn(); flipped = player === 'b';
  promotionGoal = pawnStages || isPromotionProblem(entry.fen);
  captureGoal = isRookCaptureProblem(entry.fen);
  count = 0; minimum = null; selected = null; last = null;
  $('problem').replaceChildren(); $('problem').disabled = true;
  $('retry').hidden = true; $('regenerate').disabled = true;
  $('source').textContent = `${entry.name} · skapar delproblem…`;
  $('metric-note').textContent = 'Förbereder delproblem utifrån tillgängliga tablebase-värden.';
  $('generation-status').textContent = `Skapar ${entry.name}…`;
  message('Förbereder träningen…'); render();
  try {
    if (!force) {
      let stored;
      try { stored = parseProblemCache(JSON.parse(localStorage.getItem(`syzygy:${entry.name}`)), entry); } catch {}
      if (!stored) {
        const response = await fetch(`./problem-cache/${cacheFilename(entry.name)}`, {signal:task.signal});
        if (response.ok) {
          try { stored = parseProblemCache(await response.json(), entry); } catch {}
        } else if (response.status !== 404) throw new Error(`Kunde inte läsa problemcachen (HTTP ${response.status}).`);
      }
      if (generationController !== task || task.signal.aborted) return;
      if (stored) {
        for (const [fen, data] of Object.entries(stored.probes)) cache.set(fen, data);
        savedRequests = stored.requests; showRequests();
        load(stored.positions, entry.name);
        $('generation-status').textContent = `${entry.name}: ${stored.positions.length} cachade delproblem laddade utan tablebase-anrop.`;
        return;
      }
    }
    const before = requests;
    const probes = new Map();
    const generationProbe = async (fen, signal) => {
      const data = await probe(fen, signal);
      probes.set(fen, data);
      return data;
    };
    const generated = await generateProblems(entry.fen, generationProbe, {
      signal: task.signal,
      onProgress: ({count, remaining}) => {
        if (generationController !== task) return;
        $('generation-status').textContent = captureGoal ? `${entry.name}: ${count} delproblem skapade · följer varianten till tornslag eller matt…` : promotionGoal ? `${entry.name}: ${count} delproblem skapade · följer varianten till promovering…` : remaining == null ? `${entry.name}: ${count} delproblem skapade · följer DTZ-varianten till matt…` : `${entry.name}: ${count} delproblem skapade · matt i ${remaining} drag återstår…`;
      }
    });
    if (generationController !== task || task.signal.aborted) return;
    savedRequests = requests - before; showRequests();
    try { localStorage.setItem(`syzygy:${entry.name}`, JSON.stringify(createProblemCache(entry, generated, probes, savedRequests))); } catch {}
    load(generated, entry.name);
    const exact = generated.every(fen => mateDistance(fen, cache.get(fen) ?? {}));
    $('generation-status').textContent = pawnStages ? `${entry.name}: ${generated.length} delproblem klara. Målet är promovering eller matt.` : captureGoal ? `${entry.name}: ${generated.length} delproblem klara. Målet är tornslag eller matt.` : promotionGoal ? `${entry.name}: ${generated.length} delproblem klara. Målet är promovering.` : exact ? `${entry.name}: ${generated.length} delproblem klara, matt i 1–${generated.length} drag.` : `${entry.name}: ${generated.length} delproblem klara. Dragantalet i DTZ-varianten är inte garanterat kortaste vägen till matt.`;
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

$('problem-set').addEventListener('change', () => selectProblemSet());
$('regenerate').addEventListener('click', () => selectProblemSet(true));
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
