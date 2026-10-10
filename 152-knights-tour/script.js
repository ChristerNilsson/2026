const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const rows = [1, 2, 3, 4, 5, 6, 7, 8];

const boardLayout = [
  [50, 45, 54, 41, 56, 39, 62, 35],
  [53, 42, 51, 48, 61, 36, 57, 38],
  [46, 49, 44, 55, 40, 59, 34, 63],
  [43, 52, 47, 60, 33, 64, 37, 58],
  [26, 5, 32, 1, 28, 15, 20, 11],
  [31, 2, 27, 8, 23, 12, 17, 14],
  [6, 25, 4, 29, 16, 19, 10, 21],
  [3, 30, 7, 24, 9, 22, 13, 18]
];

const valueToSquare = {};
for (let row = 0; row < boardLayout.length; row += 1) {
  for (let col = 0; col < boardLayout[row].length; col += 1) {
    const value = boardLayout[row][col];
    const rank = 8 - row;
    valueToSquare[value] = `${columns[col]}${rank}`;
  }
}

const baseRoute = Array.from({ length: 64 }, (_, index) => valueToSquare[index + 1]);

const allSquares = [];
for (let rank = 8; rank >= 1; rank -= 1) {
  for (let col = 0; col < columns.length; col += 1) {
    allSquares.push(`${columns[col]}${rank}`);
  }
}

const routeLookup = Object.fromEntries(baseRoute.map((square, index) => [square, index + 1]));

const state = {
  selectedStart: 'd4',
  direction: 'forward',
  showSolution: true,
  blindMode: false,
  sequence: [],
  pathVisited: [],
  currentIndex: 0,
  running: false,
  solved: false,
  failed: false,
  timerStart: null,
  timerHandle: null,
  elapsedMs: 0
};

const boardEl = document.getElementById('board');
const startSquareEl = document.getElementById('startSquare');
const directionEl = document.getElementById('direction');
const showSolutionEl = document.getElementById('showSolution');
const blindModeEl = document.getElementById('blindMode');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');

function squareToCoord(square) {
  const file = square[0];
  const rank = Number(square[1]);
  return {
    col: columns.indexOf(file),
    row: rows.indexOf(rank)
  };
}

function buildSequence(startSquare, direction) {
  const cycleRoute = [...baseRoute];
  const d4Index = cycleRoute.indexOf('d4');
  if (d4Index !== -1) {
    const rotated = cycleRoute.slice(d4Index).concat(cycleRoute.slice(0, d4Index));
    cycleRoute.length = 0;
    rotated.forEach((square) => cycleRoute.push(square));
  }

  const cycle = [...cycleRoute];
  const startIndex = cycle.indexOf(startSquare);
  const forwardSequence = startIndex === -1 ? cycle : cycle.slice(startIndex).concat(cycle.slice(0, startIndex));
  return direction === 'forward' ? forwardSequence : [...forwardSequence].reverse();
}

function formatTimer(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function updateTimer() {
  if (!state.timerStart) {
    timerEl.textContent = '00:00.0';
    return;
  }

  state.elapsedMs = Date.now() - state.timerStart;
  timerEl.textContent = formatTimer(state.elapsedMs);
}

function startTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
  }

  state.timerStart = Date.now();
  state.timerHandle = setInterval(updateTimer, 100);
}

function stopTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
  if (state.timerStart) {
    state.elapsedMs = Date.now() - state.timerStart;
  }
  updateTimer();
}

function resetTimer() {
  if (state.timerHandle) clearInterval(state.timerHandle);
  state.timerHandle = null;
  state.timerStart = null;
  state.elapsedMs = 0;
  timerEl.textContent = '00:00.0';
}

function renderStartOptions() {
  const options = allSquares.map((square) => `<option value="${square}">${square}</option>`).join('');
  startSquareEl.innerHTML = options;
  startSquareEl.value = state.selectedStart;
}

function renderBoard() {
  const boardSquares = [];
  const visibleNumbers = state.blindMode ? new Set(state.pathVisited) : new Set();

  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const squareName = `${columns[col]}${rows[row]}`;
      const isLight = (row + col) % 2 === 0;
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `square ${isLight ? 'light' : 'dark'}`;
      square.dataset.square = squareName;
      square.setAttribute('aria-label', `Ruta ${squareName}`);

      const sequenceIndex = state.sequence.indexOf(squareName);
      const inSolution = sequenceIndex !== -1;

      if (state.showSolution && !state.blindMode && inSolution) {
        square.classList.add('path');

        if (state.running) {
          if (sequenceIndex === state.currentIndex) {
            square.textContent = '';
          } else if (sequenceIndex < state.currentIndex) {
            square.textContent = sequenceIndex + 1;
            square.classList.add('dimmed');
          } else {
            square.textContent = sequenceIndex + 1;
            square.classList.add('future');
          }
        } else {
          square.textContent = sequenceIndex + 1;
        }
      }

      if (state.running && squareName === state.sequence[state.currentIndex]) {
        square.classList.add('current');
      }

      if (squareName === 'd4') {
        square.classList.add('goal');
      }

      if (squareName === state.selectedStart) {
        square.classList.add('start');
      }

      if (state.blindMode && visibleNumbers.has(squareName)) {
        if (sequenceIndex !== -1) {
          square.textContent = sequenceIndex + 1;
        }
      }

      if (state.blindMode && !visibleNumbers.has(squareName)) {
        square.textContent = '';
      }

      square.addEventListener('click', () => handleSquareClick(squareName));
      boardSquares.push(square);
    }
  }

  boardEl.innerHTML = '';
  boardEl.append(...boardSquares);
}

function showMessage(text) {
  if (messageEl) {
    messageEl.textContent = text;
  }
}

function handleSquareClick(squareName) {
  if (!state.running) {
    if (squareName === state.sequence[0]) {
      state.selectedStart = squareName;
      prepareRun();
    }
    return;
  }

  const expectedSquare = state.sequence[state.currentIndex + 1];

  if (squareName === expectedSquare) {
    state.currentIndex += 1;
    state.pathVisited = state.sequence.slice(0, state.currentIndex + 1);

    if (state.currentIndex >= state.sequence.length - 1) {
      state.running = false;
      state.solved = true;
      stopTimer();
      showMessage(`Full lösning klar! Du gick igenom alla ${state.sequence.length} rutor på ${formatTimer(state.elapsedMs)}.`);
      renderBoard();
      return;
    }

    showMessage(`Rätt drag – fortsätt från ${squareName}.`);
    renderBoard();
    return;
  }

  state.running = false;
  state.failed = true;
  state.pathVisited = state.sequence.slice(0, state.currentIndex + 1).concat(squareName);
  stopTimer();
  showMessage(`Första felet! Klockan stannade på ${formatTimer(state.elapsedMs)}. Rätt nästa drag var ${expectedSquare}.`);
  renderBoard();
}

function prepareRun() {
  state.sequence = buildSequence(state.selectedStart, state.direction);
  state.pathVisited = [state.sequence[0]];
  state.currentIndex = 0;
  state.running = true;
  state.solved = false;
  state.failed = false;
  state.elapsedMs = 0;

  const startSquare = state.sequence[0];
  showMessage(`Träning startar på ${startSquare}. Välj nästa drag och håll koll på tiden. Första fel stoppar klockan.`);
  resetTimer();
  startTimer();
  renderBoard();
}

function resetAttempt() {
  state.running = false;
  state.failed = false;
  state.solved = false;
  state.sequence = buildSequence(state.selectedStart, state.direction);
  state.pathVisited = [state.sequence[0]];
  state.currentIndex = 0;
  resetTimer();
  showMessage('En fast lösning visas först. Starta på valfri ruta och välj riktning. Första fel stoppar klockan.');
  renderBoard();
}

startSquareEl.addEventListener('change', (event) => {
  state.selectedStart = event.target.value;
  if (!state.running) {
    state.sequence = buildSequence(state.selectedStart, state.direction);
    renderBoard();
  }
});

directionEl.addEventListener('change', (event) => {
  state.direction = event.target.value;
  if (!state.running) {
    state.sequence = buildSequence(state.selectedStart, state.direction);
    renderBoard();
  }
});

showSolutionEl.addEventListener('change', (event) => {
  state.showSolution = event.target.checked;
  renderBoard();
});

blindModeEl.addEventListener('change', (event) => {
  state.blindMode = event.target.checked;
  renderBoard();
});

document.getElementById('startBtn').addEventListener('click', prepareRun);

renderStartOptions();
state.sequence = buildSequence(state.selectedStart, state.direction);
renderBoard();
showMessage('En fast lösning visas först. Starta på valfri ruta och välj riktning. Första fel stoppar klockan.');
