"use strict";

const MIN_VALUE = 1;
const START_MAX_VALUE = 20;
const MAX_VALUE_STEP = 5;
const INTERMEDIATE_MAX_VALUE = 999999;
const PLAYERS = [
  {
    name: "Player 1",
    giveUpKey: "Escape",
    commands: {
      a: "half",
      s: "add2",
      d: "double",
      w: "undo"
    }
  },
  {
    name: "Player 2",
    giveUpKey: "Backspace",
    commands: {
      ArrowLeft: "half",
      ArrowDown: "add2",
      ArrowRight: "double",
      ArrowUp: "undo"
    }
  }
];

const state = {
  level: 1,
  round: 1,
  start: 12,
  target: 13,
  roundStartedAt: performance.now(),
  roundFinished: false,
  nextReady: [false, false],
  distanceCache: new Map(),
  players: [],
  optimal: null
};

const els = {
  level: document.querySelector("#level"),
  maxValue: document.querySelector("#maxValue"),
  round: document.querySelector("#round"),
  targetValue: document.querySelector("#targetValue"),
  players: document.querySelector("#players"),
  gamePage: document.querySelector("#gamePage"),
  resultPage: document.querySelector("#resultPage"),
  resultTitle: document.querySelector("#resultTitle"),
  resultGrid: document.querySelector("#resultGrid"),
  nextControls: document.querySelector("#nextControls"),
  live: document.querySelector("#live")
};

function makePlayer(index) {
  return {
    name: PLAYERS[index].name,
    path: [state.start],
    elapsed: 0,
    score: null,
    solved: false,
    gaveUp: false
  };
}

function resetPlayers() {
  state.players = PLAYERS.map((_, index) => makePlayer(index));
  state.roundStartedAt = performance.now();
  state.roundFinished = false;
  state.nextReady = [false, false];
  state.distanceCache = new Map();
}

function commandOptions(value) {
  const options = [
    { name: "Double", value: value * 2 },
    { name: "Add 2", value: value + 2 }
  ];

  if (value % 2 === 0) {
    options.push({ name: "Half", value: value / 2 });
  }

  return options.filter((option) => option.value >= MIN_VALUE && option.value <= INTERMEDIATE_MAX_VALUE);
}

function currentMaxValue() {
  return START_MAX_VALUE + (Math.max(1, state.level) - 1) * MAX_VALUE_STEP;
}

function shortestPath(start, target) {
  if (start === target) {
    return [start];
  }

  const queue = [[start]];
  const seen = new Set([start]);

  while (queue.length) {
    const path = queue.shift();
    const value = path[path.length - 1];

    for (const option of commandOptions(value)) {
      if (seen.has(option.value)) {
        continue;
      }

      const nextPath = [...path, option.value];
      if (option.value === target) {
        return nextPath;
      }

      seen.add(option.value);
      queue.push(nextPath);
    }
  }

  return null;
}

function remainingCommands(value) {
  if (value === state.target) {
    return 0;
  }

  if (state.distanceCache.has(value)) {
    return state.distanceCache.get(value);
  }

  const queue = [{ value, distance: 0 }];
  const seen = new Set([value]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    for (const option of commandOptions(current.value)) {
      if (seen.has(option.value)) {
        continue;
      }

      const distance = current.distance + 1;
      if (option.value === state.target) {
        state.distanceCache.set(value, distance);
        return distance;
      }

      seen.add(option.value);
      queue.push({ value: option.value, distance });
    }
  }

  state.distanceCache.set(value, null);
  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateChallenge(level) {
  const desiredSteps = Math.max(1, level);

  for (let attempt = 0; attempt < 900; attempt += 1) {
    const maxValue = currentMaxValue();
    let value = randomInt(3, Math.max(3, maxValue));
    const start = value;

    for (let step = 0; step < desiredSteps; step += 1) {
      const options = commandOptions(value).filter((option) => option.value !== value);
      if (!options.length) {
        break;
      }
      value = options[randomInt(0, options.length - 1)].value;
    }

    if (value === start || value > maxValue) {
      continue;
    }

    const optimal = shortestPath(start, value);
    if (optimal && optimal.length - 1 === desiredSteps) {
      return { start, target: value, optimal };
    }
  }

  const target = desiredSteps <= 1 ? 14 : 13;
  return { start: 12, target, optimal: shortestPath(12, target) };
}

function currentValue(player) {
  return player.path[player.path.length - 1];
}

function moveCount(player) {
  return Math.max(0, player.path.length - 1);
}

function elapsedSeconds() {
  return (performance.now() - state.roundStartedAt) / 1000;
}

function calculateScore(player) {
  return Math.round((player.elapsed + moveCount(player) * 10) * 10) / 10;
}

function runCommand(playerIndex, command) {
  const player = state.players[playerIndex];
  if (!player || player.solved || player.gaveUp || state.roundFinished) {
    return;
  }

  const value = currentValue(player);
  let next = value;

  if (command === "double") {
    next = value * 2;
  } else if (command === "half") {
    if (value % 2 !== 0) {
      announce(`${player.name}: Half only works on even numbers.`);
      return;
    }
    next = value / 2;
  } else if (command === "add2") {
    next = value + 2;
  } else if (command === "undo") {
    if (player.path.length > 1) {
      player.path.pop();
      render();
    }
    return;
  }

  if (next < MIN_VALUE || next > INTERMEDIATE_MAX_VALUE) {
    announce(`${player.name}: intermediate results may have at most six digits.`);
    return;
  }

  player.path.push(next);

  if (next === state.target) {
    player.solved = true;
    player.elapsed = elapsedSeconds();
    player.score = calculateScore(player);
    announce(`${player.name} reached the target.`);
  }

  render();
  maybeFinishRound();
}

function giveUp(playerIndex) {
  const player = state.players[playerIndex];
  if (!player || player.solved || player.gaveUp || state.roundFinished) {
    return;
  }

  player.gaveUp = true;
  player.elapsed = elapsedSeconds();
  render();
  maybeFinishRound();
}

function maybeFinishRound() {
  if (!state.players.every((player) => player.solved || player.gaveUp)) {
    return;
  }

  finishRound();
}

function finishRound() {
  const solvedCount = state.players.filter((player) => player.solved).length;
  state.roundFinished = true;

  if (solvedCount === state.players.length) {
    state.level += 1;
  } else if (solvedCount === 0) {
    state.level = Math.max(1, state.level - 1);
  }

  render();
  showResults(solvedCount);
}

function showResults(solvedCount) {
  els.resultTitle.textContent = solvedCount === state.players.length
    ? "Both players solved it"
    : solvedCount === 0
      ? "No player solved it"
      : "Round complete";

  els.resultGrid.innerHTML = "";

  const optimal = state.optimal
    ? state.optimal
    : [];

  els.resultGrid.innerHTML = resultGridHtml([
    resultData(state.players[0]),
    { score: "", path: optimal },
    resultData(state.players[1])
  ]);

  els.gamePage.classList.add("hidden");
  els.resultPage.classList.remove("hidden");
  renderNextControls();
}

function resultData(player) {
  return {
    score: player.solved ? player.score.toFixed(1) : "Gave up",
    path: player.path
  };
}

function resultGridHtml(columns) {
  const maxRows = Math.max(...columns.map((column) => column.path.length));
  const scoreRow = columns
    .map((column) => `<div class="resultCell resultScore">${column.score || "&nbsp;"}</div>`)
    .join("");
  const valueRows = [];

  for (let row = 0; row < maxRows; row += 1) {
    for (const column of columns) {
      const value = column.path[row];
      const content = value === undefined ? "&nbsp;" : value;
      const emptyClass = value === undefined ? " resultEmpty" : "";
      valueRows.push(`<div class="resultCell resultValue${emptyClass}">${content}</div>`);
    }
  }

  return scoreRow + valueRows.join("");
}

function nextRound() {
  els.resultPage.classList.add("hidden");
  els.gamePage.classList.remove("hidden");
  state.round += 1;
  const challenge = generateChallenge(state.level);
  state.start = challenge.start;
  state.target = challenge.target;
  state.optimal = challenge.optimal;
  resetPlayers();
  render();
}

function markNextReady(playerIndex) {
  state.nextReady[playerIndex] = true;
  renderNextControls();

  if (state.nextReady.every(Boolean)) {
    nextRound();
  }
}

function renderNextControls() {
  for (const button of els.nextControls.querySelectorAll("[data-next-player]")) {
    const playerIndex = Number.parseInt(button.dataset.nextPlayer, 10);
    button.classList.toggle("ready", state.nextReady[playerIndex]);
  }
}

function buttonText(index, command) {
  const labels = {
    half: ["Half", "Half"],
    add2: ["Add 2", "Add 2"],
    double: ["Double", "Double"],
    undo: ["Undo", "Undo"],
    giveup: ["Give up [Esc]", "Give up [Backspace]"]
  };

  return labels[command][index];
}

function keyMapHtml(index) {
  const keys = index === 0
    ? ["W", "A", "S", "D"]
    : ["↑", "←", "↓", "→"];

  return `
    <div class="keyMap" aria-hidden="true">
      <span class="top">${keys[0]}</span>
      <span>${keys[1]}</span>
      <span>${keys[2]}</span>
      <span>${keys[3]}</span>
    </div>
  `;
}

function renderPlayer(player, index) {
  const value = currentValue(player);
  const inactive = player.solved || player.gaveUp;
  const statusClass = player.solved ? "solved" : player.gaveUp ? "gaveup" : "";
  const disabled = inactive ? "disabled" : "";
  const remaining = player.gaveUp ? "–" : remainingCommands(value);
  const remainingText = remaining === null ? "–" : remaining;

  return `
    <article class="player ${statusClass}" data-player="${index}">
      <div class="current"><strong>${value}</strong></div>
      <div class="commands" aria-label="Commands for ${player.name}">
        ${keyMapHtml(index)}
        <button type="button" data-player="${index}" data-command="undo" ${disabled}>${buttonText(index, "undo")}</button>
        <div class="remainingCounter" aria-label="Commands remaining">${remainingText}</div>
        <button type="button" data-player="${index}" data-command="half" ${value % 2 || inactive ? "disabled" : ""}>${buttonText(index, "half")}</button>
        <button type="button" data-player="${index}" data-command="add2" ${disabled}>${buttonText(index, "add2")}</button>
        <button type="button" data-player="${index}" data-command="double" ${disabled}>${buttonText(index, "double")}</button>
      </div>
      <button class="danger" type="button" data-player="${index}" data-command="giveup" ${disabled}>${buttonText(index, "giveup")}</button>
    </article>
  `;
}

function render() {
  const maxValue = currentMaxValue();
  els.level.textContent = state.level;
  els.maxValue.textContent = maxValue;
  els.round.textContent = state.round;
  els.targetValue.textContent = state.target;
  els.players.innerHTML = state.players.map(renderPlayer).join("");
}

function announce(message) {
  els.live.textContent = message;
}

els.players.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-player][data-command]");
  if (!button) {
    return;
  }

  const playerIndex = Number.parseInt(button.dataset.player, 10);
  if (button.dataset.command === "giveup") {
    giveUp(playerIndex);
  } else {
    runCommand(playerIndex, button.dataset.command);
  }
});

els.nextControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-next-player]");
  if (!button) {
    return;
  }

  markNextReady(Number.parseInt(button.dataset.nextPlayer, 10));
});

document.addEventListener("keydown", (event) => {
  if (els.resultPage.classList.contains("hidden") === false) {
    if (event.key === "Tab") {
      event.preventDefault();
      markNextReady(0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      markNextReady(1);
    }
    return;
  }

  const playerOneCommand = PLAYERS[0].commands[event.key.toLowerCase()];
  const playerTwoCommand = PLAYERS[1].commands[event.key];

  if (event.key === PLAYERS[0].giveUpKey) {
    event.preventDefault();
    giveUp(0);
  } else if (event.key === PLAYERS[1].giveUpKey) {
    event.preventDefault();
    giveUp(1);
  } else if (playerOneCommand) {
    event.preventDefault();
    runCommand(0, playerOneCommand);
  } else if (playerTwoCommand) {
    event.preventDefault();
    runCommand(1, playerTwoCommand);
  }
});

const firstChallenge = generateChallenge(state.level);
state.start = firstChallenge.start;
state.target = firstChallenge.target;
state.optimal = firstChallenge.optimal;
resetPlayers();
render();
