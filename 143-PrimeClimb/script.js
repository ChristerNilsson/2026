const VISIBLE_COUNT = 10;
const playersElement = document.querySelector('#players');
const levelDisplay = document.querySelector('#level-display');
const targetDisplay = document.querySelector('#target-display');
const showResultsButton = document.querySelector('#show-results');
const playerTabs = document.querySelector('#player-tabs');

let numberSequence = [];
let players = [];
let target = 0n;
let level = 3;
let activePlayerIndex = 0;
let roundStartedAt = Date.now();
let solutionTokens = [];

function randomNumber() { return Math.floor(Math.random() * 10) + 1; }
function sequenceNumber(index) {
  while (numberSequence.length <= index) numberSequence.push(randomNumber());
  return numberSequence[index];
}
function result(left, number, operation) {
  const right = BigInt(number);
  if (operation === '+') return left + right;
  if (operation === '−') return left - right;
  if (operation === '×') return left * right;
  if (operation === '÷') return right !== 0n && left % right === 0n ? left / right : null;
  return null;
}

function hasShorterRpnSolution(sequence, goal) {
  const queue = Array.from({ length: VISIBLE_COUNT }, (_, index) => index);
  const stack = [];
  let checked = 0;
  const arithmeticSteps = (level - 1) / 2;
  function search(enters, operations) {
    if (++checked > 100000) return true; // Reject a puzzle we cannot verify quickly.
    if (operations > 0 && stack.length === 1 && stack[0] === goal) return true;
    if (operations >= arithmeticSteps - 1) return false;
    if (stack.length >= 2) {
      const right = stack.pop();
      const left = stack.pop();
      for (const operation of ['+', '−', '×', '÷']) {
        const next = result(left, right, operation);
        if (next === null) continue;
        stack.push(next);
        if (search(enters, operations + 1)) { stack.pop(); stack.push(left, right); return true; }
        stack.pop();
      }
      stack.push(left, right);
    }
    if (enters >= arithmeticSteps) return false;
    for (const index of [8, 9]) {
      const number = sequence[queue[index]];
      const removed = queue.splice(index, 1)[0];
      queue.unshift(VISIBLE_COUNT + enters);
      stack.push(BigInt(number));
      if (search(enters + 1, operations)) {
        stack.pop(); queue.shift(); queue.splice(index, 0, removed);
        return true;
      }
      stack.pop(); queue.shift(); queue.splice(index, 0, removed);
    }
    return false;
  }
  return search(0, 0);
}
function randomPuzzle() {
  const arithmeticSteps = (level - 1) / 2;
  const sequence = Array.from({ length: VISIBLE_COUNT + arithmeticSteps + 1 }, randomNumber);
  const queue = Array.from({ length: VISIBLE_COUNT }, (_, index) => index);
  const firstIndex = Math.random() < 0.5 ? 8 : 9;
  let score = BigInt(sequence[queue[firstIndex]]);
  const tokens = [String(sequence[queue[firstIndex]])];
  queue.splice(firstIndex, 1);
  queue.unshift(VISIBLE_COUNT);
  for (let step = 0; step < arithmeticSteps; step++) {
    const choices = [];
    for (const index of [8, 9]) for (const operation of ['+', '−', '×', '÷']) {
      const next = result(score, sequence[queue[index]], operation);
      if (next !== null && next !== score) choices.push({ index, operation, next });
    }
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    if (!chosen) return null;
    tokens.push(String(sequence[queue[chosen.index]]), chosen.operation);
    score = chosen.next;
    queue.splice(chosen.index, 1);
    queue.unshift(VISIBLE_COUNT + step + 1);
  }
  if (hasShorterRpnSolution(sequence, score)) return null;
  return { sequence, target: score, tokens };
}
function guaranteedPuzzle() {
  const arithmeticSteps = (level - 1) / 2;
  const sequence = Array.from({ length: VISIBLE_COUNT + arithmeticSteps + 1 }, randomNumber);
  const queue = Array.from({ length: VISIBLE_COUNT }, (_, index) => index);
  const addAgain = arithmeticSteps >= 2 && Math.random() < 0.5;
  const extra = randomNumber();
  const firstIndex = sequence[queue[9]] === 10 ? 9 : 8;
  sequence[queue[firstIndex]] = 10;
  let score = 10n;
  const tokens = ['10'];
  queue.splice(firstIndex, 1);
  queue.unshift(VISIBLE_COUNT);
  for (let step = 0; step < arithmeticSteps; step++) {
    const operation = step === 1 && addAgain ? '+' : '×';
    const needed = step === 1 && addAgain ? extra : 10;
    const index = sequence[queue[9]] === needed ? 9 : 8;
    sequence[queue[index]] = needed;
    tokens.push(String(needed), operation);
    score = result(score, needed, operation);
    queue.splice(index, 1);
    queue.unshift(VISIBLE_COUNT + step + 1);
  }
  return { sequence, target: score, tokens };
}

function createPlayer(name, color) {
  return { name, color, stack: [], queue: numberSequence.slice(0, VISIBLE_COUNT),
    tokens: [], history: [], operationsUsed: 0, entersUsed: 0, presses: 0, finishedSeconds: null, finishedElapsedSeconds: null, surrendered: false, surrenderedElapsedSeconds: null };
}
function newGame() {
  level = Math.min(51, Math.max(3, Math.trunc(Number(level)) || 3));
  if (level % 2 === 0) level = Math.min(51, level + 1);
  levelDisplay.textContent = String(level);
  let puzzle = null;
  if (level <= 15) for (let attempt = 0; attempt < 40 && !puzzle; attempt++) puzzle = randomPuzzle();
  puzzle ??= guaranteedPuzzle();
  numberSequence = puzzle.sequence;
  target = puzzle.target;
  solutionTokens = puzzle.tokens;
  activePlayerIndex = 0;
  roundStartedAt = Date.now();
  players = [createPlayer('Spelare 1', 'orange'), createPlayer('Spelare 2', 'teal')];
  render();
}

function elapsedSeconds() { return Math.floor((Date.now() - roundStartedAt) / 1000); }
function finished(player) { return player.finishedSeconds !== null; }
function roundFinished() { return players.every(player => player.surrendered || finished(player)); }
function nextLevel() {
  const optimal = players.some(player => finished(player) && player.tokens.length === level);
  return optimal ? Math.min(51, level + 2) : Math.max(3, level - 2);
}
function saveState(player) {
  player.history.push({ stack: [...player.stack], queue: [...player.queue], tokens: [...player.tokens], operationsUsed: player.operationsUsed, entersUsed: player.entersUsed });
}
function checkGoal(player) {
  if (player.stack.length === 1 && player.stack[0] === target && player.operationsUsed > 0) {
    player.finishedElapsedSeconds = elapsedSeconds();
    player.finishedSeconds = player.finishedElapsedSeconds + 10 * player.presses;
  }
}
function enter(playerIndex, queueIndex) {
  const player = players[playerIndex];
  if (roundFinished() || player.surrendered || finished(player) || ![8, 9].includes(queueIndex)) return;
  saveState(player);
  player.tokens.push(String(player.queue[queueIndex]));
  player.stack.push(BigInt(player.queue[queueIndex]));
  player.queue.splice(queueIndex, 1);
  player.queue.unshift(sequenceNumber(VISIBLE_COUNT + player.entersUsed));
  player.entersUsed++;
  player.presses++;
  render();
}
function operate(playerIndex, operation) {
  const player = players[playerIndex];
  if (roundFinished() || player.surrendered || finished(player) || player.stack.length < 2) return;
  const next = result(player.stack.at(-2), player.stack.at(-1), operation);
  if (next === null) return;
  saveState(player);
  player.tokens.push(operation);
  player.stack.splice(-2, 2, next);
  player.operationsUsed++;
  player.presses++;
  checkGoal(player);
  render();
}
function undo(playerIndex) {
  const player = players[playerIndex];
  const previous = player.history.pop();
  if (!previous) return;
  player.stack = previous.stack;
  player.queue = previous.queue;
  player.tokens = previous.tokens;
  player.operationsUsed = previous.operationsUsed;
  player.entersUsed = previous.entersUsed;
  player.finishedSeconds = null;
  player.finishedElapsedSeconds = null;
  render();
}
function surrender(playerIndex) {
  const player = players[playerIndex];
  if (finished(player)) return;
  player.surrendered = !player.surrendered;
  player.surrenderedElapsedSeconds = player.surrendered ? elapsedSeconds() : null;
  render();
}

function render() {
  const done = roundFinished();
  targetDisplay.textContent = String(target);
  showResultsButton.disabled = !done;
  playerTabs.querySelectorAll('[data-tab]').forEach((button, index) => {
    button.classList.toggle('active', index === activePlayerIndex);
    button.setAttribute('aria-pressed', String(index === activePlayerIndex));
  });
  const playerCards = players.map((player, playerIndex) => {
    const inactive = done || player.surrendered || finished(player);
    const queueRows = player.queue.map((number, queueIndex) => queueIndex >= 8
      ? `<button class="queue-number" type="button" data-enter="${playerIndex}" data-index="${queueIndex}" aria-label="Lägg ${number} på stacken" ${inactive ? 'disabled' : ''}>${number}</button>`
      : `<div class="queue-number">${number}</div>`).join('');
    const operatorButtons = ['+', '−', '×', '÷'].map(operation => {
      const valid = player.stack.length >= 2 && result(player.stack.at(-2), player.stack.at(-1), operation) !== null;
      return `<button class="op" type="button" data-operation="${operation}" data-player="${playerIndex}" aria-label="${player.name}: ${operation}" ${inactive || !valid ? 'disabled' : ''}>${operation}</button>`;
    }).join('');
    const stackItems = player.stack.length
      ? player.stack.map(value => `<span class="stack-item">${value}</span>`).join('')
      : '<span class="stack-empty">Tom stack</span>';
    const status = player.surrendered ? 'Försöket avslutat'
      : finished(player) ? (player.tokens.length === level ? 'Bästa vägen' : 'Målet nått')
      : `${player.tokens.length}/${level} drag`;
    return `<section class="player ${player.color} ${playerIndex === activePlayerIndex ? 'active' : ''}" aria-label="${player.name}">
      <div class="player-header"><div class="player-name"><span class="player-icon">${playerIndex === 0 ? '◆' : '●'}</span>${player.name}</div></div>
      <div class="play-area">
        <div class="queue-column"><div class="queue-list" aria-label="Tio tal, uppifrån och ner">${queueRows}</div></div>
        <div class="rpn-side"><div class="stack-values">${stackItems}</div><div class="stack-actions">${operatorButtons}</div></div>
      </div>
      <div class="player-bottom"><span class="message" aria-live="polite">${status}</span><div class="player-actions"><button class="undo" type="button" data-surrender="${playerIndex}" ${finished(player) ? 'disabled' : ''}>${player.surrendered ? 'Fortsätt' : 'Ge upp'}</button><button class="undo" type="button" data-undo="${playerIndex}" ${player.history.length && !player.surrendered ? '' : 'disabled'}>↶ Ångra</button></div></div>
    </section>`;
  });
  playersElement.innerHTML = playerCards.join('');
  document.querySelectorAll('.stack-values').forEach(stack => { stack.scrollTop = stack.scrollHeight; });
}

playersElement.addEventListener('click', event => {
  const enterButton = event.target.closest('[data-enter]');
  if (enterButton) return enter(Number(enterButton.dataset.enter), Number(enterButton.dataset.index));
  const operationButton = event.target.closest('[data-operation]');
  if (operationButton) return operate(Number(operationButton.dataset.player), operationButton.dataset.operation);
  const undoButton = event.target.closest('[data-undo]');
  if (undoButton) return undo(Number(undoButton.dataset.undo));
  const surrenderButton = event.target.closest('[data-surrender]');
  if (surrenderButton) surrender(Number(surrenderButton.dataset.surrender));
});
showResultsButton.addEventListener('click', () => {
  if (!roundFinished()) return;
  const report = {
    level, nextLevel: nextLevel(), target: String(target),
    players: players.map(player => ({
      name: player.name, tokens: player.tokens,
      elapsedSeconds: player.finishedElapsedSeconds ?? player.surrenderedElapsedSeconds,
      presses: player.presses,
      totalSeconds: player.finishedSeconds,
      completed: finished(player)
    })),
    solution: solutionTokens
  };
  const url = `results.html#${encodeURIComponent(JSON.stringify(report))}`;
  window.open(url, '_blank');
});
playerTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  activePlayerIndex = Number(button.dataset.tab);
  render();
});
const levelMatch = (window.location?.search || '').match(/[?&]level=(\d+)/);
if (levelMatch) level = Number(levelMatch[1]);
newGame();
