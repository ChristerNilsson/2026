import { Chess, DEFAULT_POSITION } from './vendor/chess.js';
import { Engine, loss, uci } from './engine.js';

const el = id => document.getElementById(id);
const form = el('settings');
const board = el('board');
const names = { k: 'kung', q: 'dam', r: 'torn', b: 'löpare', n: 'springare', p: 'bonde' };
const resignationThreshold = 666;
const limits = {
  nodes: { label: 'Antal noder', min: 100, max: 10000000, value: 1000000, step: 1 },
  movetime: { label: 'Antal sekunder', min: 0.1, max: 30, value: 1, step: 0.1 },
  depth: { label: 'Antal nivåer', min: 1, max: 20, value: 20, step: 1 },
};
let game = { chess: new Chess(), player: 'w', phase: 'idle', clocks: { w: 900000, b: 900000 } };
let audio;

const other = color => color === 'w' ? 'b' : 'w';
const side = color => color === 'w' ? 'Vit' : 'Svart';
const status = text => { el('status').textContent = text; };

function playPieceSound() {
  if (audio?.state !== 'running') return;
  const now = audio.currentTime;
  const tap = audio.createOscillator();
  const volume = audio.createGain();
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(420, now);
  tap.frequency.exponentialRampToValueAtTime(150, now + 0.055);
  volume.gain.setValueAtTime(0.26, now);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
  tap.connect(volume).connect(audio.destination);
  tap.start(now);
  tap.stop(now + 0.08);
}

function remaining(color) {
  return Math.max(0, game.clocks[color] - (game.running === color ? performance.now() - game.started : 0));
}

function stopClock() {
  if (game.running) game.clocks[game.running] = remaining(game.running);
  game.running = null;
}

function renderClocks() {
  for (const [location, color] of [['top', other(game.player)], ['bottom', game.player]]) {
    const clock = el(location + '-clock');
    const seconds = Math.ceil(remaining(color) / 1000);
    clock.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    clock.parentElement.classList.toggle('active', game.running === color);
    el(location + '-name').textContent = (color === game.player ? 'Du' : 'Stockfish') + ' · ' + side(color);
  }
}

function renderBoard() {
  const focus = document.activeElement?.dataset.square;
  let rows = game.chess.board();
  if (game.player === 'b') rows = rows.reverse().map(row => row.reverse());
  const files = game.player === 'w' ? 'abcdefgh' : 'hgfedcba';
  const targets = new Set(game.selected ? game.chess.moves({ square: game.selected, verbose: true }).map(move => move.to) : []);
  const last = game.chess.history({ verbose: true }).at(-1);
  board.replaceChildren();
  rows.forEach((row, y) => row.forEach((piece, x) => {
    const rank = game.player === 'w' ? 8 - y : y + 1;
    const square = files[x] + rank;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.square = square;
    button.className = 'square';
    button.classList.toggle('dark', (x + y) % 2 === 1);
    button.classList.toggle('last', [last?.from, last?.to].includes(square));
    button.classList.toggle('selected', game.selected === square);
    button.classList.toggle('target', targets.has(square));
    button.classList.toggle('occupied', Boolean(piece));
    button.setAttribute('aria-label', piece ? square + ', ' + side(piece.color).toLowerCase() + ' ' + names[piece.type] : square);
    if (piece) {
      const icon = document.createElement('img');
      icon.className = 'piece';
      icon.src = './vendor/maestro/' + piece.color + piece.type.toUpperCase() + '.svg';
      icon.alt = '';
      icon.draggable = false;
      button.append(icon);
    }
    for (const [show, className, value] of [[x === 0, 'rank', rank], [y === 7, 'file', files[x]]]) {
      if (!show) continue;
      const coord = document.createElement('span');
      coord.className = 'coord ' + className;
      coord.textContent = value;
      button.append(coord);
    }
    board.append(button);
  }));
  if (focus) board.querySelector('[data-square="' + focus + '"]')?.focus();
}

function renderExport() {
  const active = game.phase !== 'idle';
  const pgn = el('pgn');
  pgn.value = active ? game.chess.pgn({ maxWidth: 78 }) : '';
  el('download').disabled = !active;
  const link = el('lichess');
  link.hidden = !active;
  el('lichess-hint').hidden = !active;
  link.href = 'https://lichess.org/analysis/standard/' + game.chess.fen().replaceAll(' ', '_') + '?color=' + (game.player === 'w' ? 'white' : 'black');
}

function render() {
  renderBoard();
  renderClocks();
  renderExport();
}

function finish(result, message) {
  stopClock();
  game.phase = 'over';
  game.engine?.close();
  game.selected = null;
  el('accept').disabled = true;
  el('undo').disabled = true;
  el('review-buttons').hidden = true;
  el('promotion').hidden = true;
  game.chess.setHeader('Result', result);
  status(message);
  render();
}

function checkTimeout() {
  const color = game.running;
  if (!color || remaining(color) > 0) return false;
  const opponent = other(color);
  const pieces = game.chess.board().flat().filter(Boolean);
  const onlyKing = pieces.filter(piece => piece.color === opponent).length === 1;
  const result = onlyKing || game.chess.isInsufficientMaterial() ? '1/2-1/2' : opponent === 'w' ? '1-0' : '0-1';
  finish(result, side(color) + 's tid tog slut.' + (result === '1/2-1/2' ? ' Remi.' : ' ' + side(opponent) + ' vann.'));
  return true;
}

setInterval(() => {
  if (game.running && !checkTimeout()) renderClocks();
}, 100);

function position(moves) {
  return 'position fen ' + game.startFen + (moves.length ? ' moves ' + moves.map(uci).join(' ') : '');
}

function showReview(move) {
  stopClock();
  game.clocks[move.color] += game.increment;
  game.phase = 'evaluating';
  game.playedScore = null;
  game.selected = null;
  el('promotion').hidden = true;
  el('review').hidden = false;
  el('move').textContent = move.san;
  el('undo').disabled = true;
  el('accept').disabled = true;
  el('review-buttons').hidden = false;
  el('remaining').textContent = 'Ångringar kvar: ' + game.undos;
  status('Ditt drag: ' + move.san);
  render();
  evaluateMove();
}

async function turn(playedScore) {
  const current = game;
  if (game.chess.isCheckmate()) {
    const winner = other(game.chess.turn());
    finish(winner === 'w' ? '1-0' : '0-1', side(winner) + ' vann med schackmatt.');
    return;
  }
  if (game.chess.isDraw()) {
    finish('1/2-1/2', game.chess.isStalemate() ? 'Patt. Remi.' : 'Partiet slutade remi.');
    return;
  }
  const color = game.chess.turn();
  if (color !== game.player && playedScore?.type === 'cp' && !playedScore.bound &&
      playedScore.value >= resignationThreshold) {
    finish(game.player === 'w' ? '1-0' : '0-1', 'Stockfish gav upp. Du vann.');
    return;
  }
  game.running = color;
  game.started = performance.now();
  if (color === game.player) {
    game.phase = 'player';
    status(game.chess.inCheck() ? 'Du är i schack.' : 'Ditt drag.');
    renderClocks();
    return;
  }

  game.phase = 'engine';
  status('Stockfish tänker …');
  renderClocks();
  try {
    const clockLimit = 'wtime ' + Math.floor(remaining('w')) + ' btime ' + Math.floor(remaining('b')) +
      ' winc ' + game.increment + ' binc ' + game.increment;
    const reply = await game.engine.search(position(game.chess.history({ verbose: true })), clockLimit, { elo: game.elo });
    if (current !== game || game.phase !== 'engine' || checkTimeout()) return;
    game.chess.move({
      from: reply.move.slice(0, 2),
      to: reply.move.slice(2, 4),
      promotion: reply.move[4],
    });
    stopClock();
    game.clocks[color] += game.increment;
    el('review').hidden = true;
    playPieceSound();
    render();
    turn();
  } catch (error) {
    if (current === game && game.phase === 'engine') finish('*', error.message);
  }
}

function play(move) {
  if (!checkTimeout()) showReview(game.chess.move(move));
}

board.addEventListener('click', event => {
  const square = event.target.closest('.square')?.dataset.square;
  if (game.phase !== 'player' || !square || checkTimeout()) return;
  const moves = game.selected ? game.chess.moves({ square: game.selected, verbose: true }).filter(move => move.to === square) : [];
  const promotion = el('promotion');
  promotion.hidden = true;
  if (moves.length === 1) {
    play(moves[0]);
  } else if (moves.length > 1) {
    promotion.replaceChildren();
    for (const move of moves) {
      const button = document.createElement('button');
      button.textContent = names[move.promotion];
      button.addEventListener('click', () => {
        if (game.phase === 'player') play(move);
      });
      promotion.append(button);
    }
    promotion.hidden = false;
    promotion.firstChild.focus();
  } else {
    game.selected = game.chess.get(square)?.color === game.player && game.selected !== square ? square : null;
    renderBoard();
  }
});

async function evaluateMove() {
  const current = game;
  const output = el('evaluation');
  output.className = '';
  output.textContent = 'Beräknar CPL …';
  const history = game.chess.history({ verbose: true });
  const move = uci(history.pop());
  const root = position(history);
  try {
    const best = await game.engine.search(root, game.limit);
    const played = best.move === move ? best : await game.engine.search(root, game.limit, { move });
    if (current !== game) return;
    game.playedScore = played.score;
    const value = loss(best.score, played.score);
    output.textContent = value === null ? '' : value + ' CPL';
    if (value !== null) output.className = value < 30 ? 'good' : value < 100 ? 'medium' : 'bad';
  } catch (error) {
    if (current !== game) return;
    output.textContent = error.message;
  } finally {
    if (current === game) {
      game.phase = 'review';
      el('undo').disabled = game.undos === 0;
      el('accept').disabled = false;
    }
  }
}

el('undo').addEventListener('click', () => {
  if (game.phase !== 'review' || !game.undos) return;
  const move = game.chess.undo();
  game.clocks[move.color] -= game.increment;
  game.undos--;
  el('review').hidden = true;
  render();
  turn();
});

el('accept').addEventListener('click', () => {
  if (game.phase !== 'review') return;
  el('accept').disabled = true;
  el('undo').disabled = true;
  el('review-buttons').hidden = true;
  turn(game.playedScore);
});

form.elements.limit.addEventListener('change', () => {
  const { label, ...constraints } = limits[form.elements.limit.value];
  el('limit-label').firstElementChild.textContent = label;
  Object.assign(form.elements.amount, constraints);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(form);
  let chess;
  try {
    const fen = values.get('fen').trim();
    chess = new Chess(fen || undefined);
    if (chess.isGameOver()) throw new Error();
  } catch {
    status('Ange en giltig FEN för en position där partiet kan fortsätta.');
    return;
  }

  const [minutes, seconds] = values.get('time').split('+').map(Number);
  if (!minutes && !seconds) {
    status('Ange en betänketid större än 0+0.');
    return;
  }
  if (window.AudioContext) {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  }
  const time = (minutes * 60 || seconds) * 1000;
  const kind = values.get('limit');
  const amount = Number(values.get('amount'));
  game.engine?.close();
  const current = {
    chess,
    startFen: chess.fen(),
    player: values.get('color'),
    elo: Number(values.get('elo')),
    undos: Number(values.get('undos')),
    clocks: { w: time, b: time },
    increment: seconds * 1000,
    limit: kind + ' ' + (kind === 'movetime' ? Math.round(amount * 1000) : amount),
    phase: 'loading',
  };
  game = current;
  chess.setHeader('Event', 'Schack med draganalys');
  chess.setHeader('White', game.player === 'w' ? 'Spelare' : 'Stockfish');
  chess.setHeader('Black', game.player === 'b' ? 'Spelare' : 'Stockfish');
  chess.setHeader('TimeControl', minutes * 60 + '+' + seconds);
  if (game.startFen !== DEFAULT_POSITION) {
    chess.setHeader('SetUp', '1');
    chess.setHeader('FEN', game.startFen);
  }
  el('review').hidden = true;
  el('promotion').hidden = true;
  el('start').textContent = 'Starta nytt parti';
  el('settings-panel').open = false;
  status('Laddar Stockfish …');
  render();
  try {
    game.engine = new Engine();
    await game.engine.init();
    if (current === game) turn();
  } catch (error) {
    if (current === game) finish('*', error.message);
  }
});

el('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([el('pgn').value], { type: 'application/x-chess-pgn' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'parti.pgn';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();
