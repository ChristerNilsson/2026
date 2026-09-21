const VISIBLE_COUNT = 10;
const MAX_LEVEL = 5;
const MAX_TARGET = 100n;
const playersElement = document.querySelector('#players');
const levelDisplay = document.querySelector('#level-display');
const targetDisplay = document.querySelector('#target-display');
const showResultsButton = document.querySelector('#show-results');
const playerTabs = document.querySelector('#player-tabs');

let numberSequence = [];
let players = [];
let target = 0n;
let level = 1;
let activePlayerIndex = 0;
let roundStartedAt = Date.now();
let solutionTokens = [];
const keyboardControls = [
  {
    numbers: { KeyQ: 8, KeyZ: 9 },
    operations: { KeyA: '+', KeyS: '−', KeyD: '×', KeyF: '÷' },
    numberLabels: ['Q', 'Z'], operationLabels: ['A', 'S', 'D', 'F'],
    undo: 'KeyR', surrender: 'KeyE'
  },
  {
    numbers: { KeyY: 8, KeyN: 9 },
    operations: { KeyH: '+', KeyJ: '−', KeyK: '×', KeyL: '÷' },
    numberLabels: ['Y', 'N'], operationLabels: ['H', 'J', 'K', 'L'],
    undo: 'KeyO', surrender: 'KeyI'
  }
];

function randomNumber() { return Math.floor(Math.random() * 10) + 1; }
function sequenceNumber(index) {
  while (numberSequence.length <= index) numberSequence.push(randomNumber());
  return numberSequence[index];
}
function replaceChosenNumber(queue, choiceIndex, incoming) {
  queue[choiceIndex] = queue[7];
  for (let index = 7; index > 0; index--) queue[index] = queue[index - 1];
  queue[0] = incoming;
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
  function search(enters, operations) {
    if (++checked > 100000) return true; // Reject a puzzle we cannot verify quickly.
    if (operations > 0 && stack.length === 1 && stack[0] === goal) return true;
    if (operations >= level - 1) return false;
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
    if (enters >= level) return false;
    for (const index of [8, 9]) {
      const number = sequence[queue[index]];
      const previousQueue = [...queue];
      replaceChosenNumber(queue, index, VISIBLE_COUNT + enters);
      stack.push(BigInt(number));
      if (search(enters + 1, operations)) {
        stack.pop(); queue.splice(0, queue.length, ...previousQueue);
        return true;
      }
      stack.pop(); queue.splice(0, queue.length, ...previousQueue);
    }
    return false;
  }
  return search(0, 0);
}
function randomPuzzle() {
  const sequence = Array.from({ length: VISIBLE_COUNT + level + 1 }, randomNumber);
  const queue = Array.from({ length: VISIBLE_COUNT }, (_, index) => index);
  const firstIndex = Math.random() < 0.5 ? 8 : 9;
  let score = BigInt(sequence[queue[firstIndex]]);
  const intermediateValues = [score];
  const tokens = [String(sequence[queue[firstIndex]])];
  replaceChosenNumber(queue, firstIndex, VISIBLE_COUNT);
  for (let step = 0; step < level; step++) {
    const choices = [];
    for (const index of [8, 9]) for (const operation of ['+', '−', '×', '÷']) {
      const next = result(score, sequence[queue[index]], operation);
      if (next !== null && next > 0n && next <= MAX_TARGET && next !== score) choices.push({ index, operation, next });
    }
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    if (!chosen) return null;
    tokens.push(String(sequence[queue[chosen.index]]), chosen.operation);
    score = chosen.next;
    intermediateValues.push(score);
    replaceChosenNumber(queue, chosen.index, VISIBLE_COUNT + step + 1);
  }
  if (score <= 10n || score > MAX_TARGET) return null;
  if (intermediateValues.some(value => value > score)) return null;
  if (hasShorterRpnSolution(sequence, score)) return null;
  return { sequence, target: score, tokens };
}
function guaranteedPuzzle() {
  const sequence = Array.from({ length: VISIBLE_COUNT + level + 1 }, randomNumber);
  const queue = Array.from({ length: VISIBLE_COUNT }, (_, index) => index);
  const addAgain = level >= 2 && Math.random() < 0.5;
  const extra = randomNumber();
  const firstIndex = sequence[queue[9]] === 10 ? 9 : 8;
  sequence[queue[firstIndex]] = 10;
  let score = 10n;
  const tokens = ['10'];
  replaceChosenNumber(queue, firstIndex, VISIBLE_COUNT);
  for (let step = 0; step < level; step++) {
    const operation = step === 1 && addAgain ? '+' : '×';
    const needed = step === 1 && addAgain ? extra : 10;
    const index = sequence[queue[9]] === needed ? 9 : 8;
    sequence[queue[index]] = needed;
    tokens.push(String(needed), operation);
    score = result(score, needed, operation);
    replaceChosenNumber(queue, index, VISIBLE_COUNT + step + 1);
  }
  return { sequence, target: score, tokens };
}

function createPlayer(name, color) {
  return { name, color, stack: [], queue: numberSequence.slice(0, VISIBLE_COUNT),
    tokens: [], history: [], operationsUsed: 0, entersUsed: 0, presses: 0, finishedSeconds: null, finishedElapsedSeconds: null, surrendered: false, surrenderedElapsedSeconds: null };
}
function newGame() {
  level = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(level)) || 1));
  levelDisplay.textContent = String(level);
  const generationStartedAt = performance.now();
  let puzzle = null;
  for (let attempt = 0; attempt < 2000 && !puzzle; attempt++) puzzle = randomPuzzle();
  if (!puzzle) {
    level = Math.max(1, level - 1);
    levelDisplay.textContent = String(level);
    while (!puzzle) puzzle = randomPuzzle();
  }
  console.log(`Problemgenerator: Level ${level}, betänketid ${(performance.now() - generationStartedAt).toFixed(1)} ms`);
  numberSequence = puzzle.sequence;
  target = puzzle.target;
  solutionTokens = puzzle.tokens;
  activePlayerIndex = 0;
  roundStartedAt = Date.now();
  players = [createPlayer('Vänster', 'orange'), createPlayer('Höger', 'teal')];
  render();
}

function elapsedSeconds() { return Math.floor((Date.now() - roundStartedAt) / 1000); }
function finished(player) { return player.finishedSeconds !== null; }
function roundFinished() { return players.every(player => player.surrendered || finished(player)); }
function nextLevel() {
  const optimal = players.some(player => finished(player) && player.operationsUsed === level);
  return optimal ? Math.min(MAX_LEVEL, level + 1) : Math.max(1, level - 1);
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
  replaceChosenNumber(player.queue, queueIndex, sequenceNumber(VISIBLE_COUNT + player.entersUsed));
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
  const completedTimes = players.filter(finished).map(player => player.finishedSeconds);
  const bestTime = completedTimes.length ? Math.min(...completedTimes) : null;
  targetDisplay.textContent = String(target);
  showResultsButton.disabled = !done;
  playerTabs.querySelectorAll('[data-tab]').forEach((button, index) => {
    button.classList.toggle('active', index === activePlayerIndex);
    button.setAttribute('aria-pressed', String(index === activePlayerIndex));
  });
  const playerCards = players.map((player, playerIndex) => {
    const inactive = done || player.surrendered || finished(player);
    const controls = keyboardControls[playerIndex];
    const queueRows = player.queue.slice(0, 8).map(number => `<div class="queue-number">${number}</div>`).join('');
    const utilityButtons = `<div class="control-cell">
      <button class="control-button utility-control surrender-control" type="button" data-surrender="${playerIndex}" ${finished(player) ? 'disabled' : ''}>${player.surrendered ? 'Fortsätt' : 'Ge upp'}</button>
      <kbd>${playerIndex === 0 ? 'E' : 'I'}</kbd>
    </div><div class="control-cell">
      <button class="control-button utility-control" type="button" data-undo="${playerIndex}" ${player.history.length && !player.surrendered ? '' : 'disabled'}>↶ Ångra</button>
      <kbd>${playerIndex === 0 ? 'R' : 'O'}</kbd>
    </div>`;
    const numberButtons = [8, 9].map((queueIndex, index) => `<div class="control-cell">
      <button class="control-button number-control" type="button" data-enter="${playerIndex}" data-index="${queueIndex}" aria-label="Lägg ${player.queue[queueIndex]} på stacken" ${inactive ? 'disabled' : ''}>${player.queue[queueIndex]}</button>
      <kbd>${controls.numberLabels[index]}</kbd>
    </div>`).join('');
    const operatorButtons = ['+', '−', '×', '÷'].map((operation, index) => {
      const valid = player.stack.length >= 2 && result(player.stack.at(-2), player.stack.at(-1), operation) !== null;
      return `<div class="control-cell"><button class="control-button op" type="button" data-operation="${operation}" data-player="${playerIndex}" aria-label="${player.name}: ${operation}" ${inactive || !valid ? 'disabled' : ''}>${operation}</button><kbd>${controls.operationLabels[index]}</kbd></div>`;
    }).join('');
    const stackItems = player.stack.length
      ? player.stack.map(value => `<span class="stack-item">${value}</span>`).join('')
      : '';
    const lostOnTime = done && finished(player) && player.finishedSeconds > bestTime;
    const status = player.surrendered ? 'Försöket avslutat'
      : lostOnTime ? 'Längre totaltid'
      : finished(player) ? (player.operationsUsed === level ? 'Bästa vägen' : 'Målet nått')
      : '';
    const outcomeClass = done
      ? (finished(player) && player.finishedSeconds === bestTime ? 'success' : 'failure')
      : finished(player) ? 'success' : player.surrendered ? 'failure' : '';
    return `<section class="player ${player.color} ${outcomeClass} ${playerIndex === activePlayerIndex ? 'active' : ''}" aria-label="${player.name}">
      <div class="play-area">
        <div class="utility-column">${utilityButtons}</div>
        <div class="queue-column"><div class="queue-list" aria-label="Kommande tal, uppifrån och ner">${queueRows}</div></div>
        <div class="rpn-side"><div class="stack-values">${stackItems}</div></div>
        <div class="control-grid">${numberButtons}${operatorButtons}</div>
      </div>
      ${status ? `<div class="player-bottom"><span class="message ${outcomeClass}" aria-live="polite">${status}</span></div>` : ''}
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
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code === 'Enter' && roundFinished()) {
    event.preventDefault();
    openResults();
    return;
  }
  for (let playerIndex = 0; playerIndex < keyboardControls.length; playerIndex++) {
    const controls = keyboardControls[playerIndex];
    if (Object.hasOwn(controls.numbers, event.code)) {
      event.preventDefault();
      enter(playerIndex, controls.numbers[event.code]);
      return;
    }
    if (Object.hasOwn(controls.operations, event.code)) {
      event.preventDefault();
      operate(playerIndex, controls.operations[event.code]);
      return;
    }
    if (event.code === controls.undo) {
      event.preventDefault();
      undo(playerIndex);
      return;
    }
    if (event.code === controls.surrender) {
      event.preventDefault();
      surrender(playerIndex);
      return;
    }
  }
});
function openResults() {
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
  window.location.href = url;
}
showResultsButton.addEventListener('click', openResults);
playerTabs.addEventListener('click', event => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  activePlayerIndex = Number(button.dataset.tab);
  render();
});
try {
  const storedLevel = sessionStorage.getItem('rpn-next-level');
  sessionStorage.removeItem('rpn-next-level');
  if (storedLevel !== null) level = Number(storedLevel);
} catch {}
newGame();
