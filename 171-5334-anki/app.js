"use strict";

const storageKey = "5334-anki:1-4462:v3";
const newProblemCount = 10;
const maxVerifiedMateDepth = 4;
const minute = 60_000;
const day = 24 * 60 * minute;
const delays = [10 * minute, 60 * minute, day, 7 * day, 30 * day, null];
const repetitionTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});
const files = "abcdefgh";
const names = { k: "kung", q: "dam", r: "torn", b: "löpare", n: "springare", p: "bonde" };
const ui = Object.fromEntries(
  [
    "counts", "problem", "board", "status", "promotion", "promote-queen", "hint", "continue", "repeat", "auto",
    "moves", "lichess-analysis", "stockfish-status", "new-selection", "selection-form", "selection-count", "selection-depths",
    "selection-show-depth", "selection-status", "clear-training"
  ].map(id => [id, document.getElementById(id)])
);
let problems;
let lists;
let current;
let selected;
let promotionMove;
let nextReviewTimer;
const depthOptions = [];

function readStoredTime(value) {
  if (typeof value !== "string") return value;
  const asUtc = text => Date.parse(text.replace(" ", "T") + "Z");
  const wallTime = asUtc(value);
  // If the clock repeats an hour, use the later occurrence.
  for (const reference of [wallTime + day, wallTime - day]) {
    const offset = asUtc(repetitionTime.format(reference)) - reference;
    const time = wallTime - offset;
    if (repetitionTime.format(time) === value) return time;
  }
}

function save(next) {
  try {
    const B = next.B.map(({ Id, Intervall, Tid }) => [
      Id, Intervall, Tid === null ? null : repetitionTime.format(Tid)
    ]);
    localStorage.setItem(storageKey, JSON.stringify({ A: next.A, B, showMateDepth: next.showMateDepth }));
    lists = next;
    renderCounts();
    return true;
  } catch {
    ui.status.textContent = "Förloppet kunde inte sparas. Kontrollera att webbläsaren tillåter lokal lagring och försök igen.";
    return false;
  }
}

function sampleNewProblems(count, available) {
  const A = [];
  while (A.length < count && available.length) {
    const index = Math.floor(Math.random() * available.length);
    A.push(available[index]);
    available[index] = available.at(-1);
    available.pop();
  }
  return A;
}

function selectByMateDepth(count, available) {
  if (count === available.length) return available.map(problem => problem.id);

  const byDepth = new Map();
  for (const { id, mate_depth } of available) {
    if (!byDepth.has(mate_depth)) byDepth.set(mate_depth, []);
    byDepth.get(mate_depth).push(id);
  }
  let groups = [...byDepth.values()];
  for (const ids of groups) ids.sort((a, b) => b - a);

  const selected = [];
  while (selected.length < count && groups.length) {
    for (const ids of sampleNewProblems(groups.length, [...groups])) {
      selected.push(ids.pop());
      if (selected.length === count) break;
    }
    groups = groups.filter(ids => ids.length);
  }
  return selected;
}

function renderCounts() {
  const totals = [lists.A.length, ...delays.map(() => 0)];
  for (const card of lists.B) totals[card.Intervall + 1]++;
  totals.forEach((total, index) => {
    ui.counts.cells[index].textContent = total;
  });
}

function highlightInterval(interval) {
  const headers = ui.counts.closest("table").tHead.rows[0].cells;
  Array.from(ui.counts.cells).forEach((cell, index) => {
    const active = index > 0 && index - 1 === interval;
    headers[index].classList.toggle("current-interval", active);
    cell.classList.toggle("current-interval", active);
    if (active) cell.setAttribute("aria-current", "true");
    else cell.removeAttribute("aria-current");
  });
}

function updateNavigation() {
  ui.continue.hidden = ui.auto.checked && current?.result !== "failure";
  ui.continue.disabled = !current?.result;
  ui.repeat.disabled = current?.result !== "failure";
}

function setupSelection() {
  const depths = [...new Set([...problems.values()].map(problem => problem.mate_depth))].sort((a, b) => a - b);
  depthOptions.length = 0;
  const labels = depths.map(depth => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = depth;
    checkbox.checked = true;
    depthOptions.push(checkbox);
    label.append(checkbox, "#" + depth);
    return label;
  });
  ui["selection-depths"].replaceChildren(...labels);
  ui["selection-show-depth"].checked = lists.showMateDepth;
  ui["new-selection"].hidden = false;
}

ui["selection-form"].addEventListener("submit", event => {
  event.preventDefault();
  const quantity = ui["selection-count"].value;
  const depths = new Set(depthOptions.filter(checkbox => checkbox.checked).map(checkbox => Number(checkbox.value)));
  const assigned = new Set([...lists.A, ...lists.B.map(card => card.Id)]);
  const available = [...problems.values()]
    .filter(problem => !assigned.has(problem.id) && depths.has(problem.mate_depth));
  const count = quantity === "all" ? available.length : Number(quantity);
  const status = ui["selection-status"];
  status.hidden = false;
  if (!depths.size) {
    status.textContent = "Välj minst ett mattdjup.";
    return;
  }
  if (!available.length) {
    status.textContent = "Det finns inga fler uppgifter med valda mattdjup.";
    return;
  }
  if (available.length < count) {
    status.textContent = `Det finns ${available.length} nya uppgifter med valda mattdjup. Välj ett lägre antal eller fler mattdjup.`;
    return;
  }
  const showMateDepth = ui["selection-show-depth"].checked;
  const pending = [...lists.A, ...selectByMateDepth(count, available)];
  const A = sampleNewProblems(pending.length, pending);
  if (!save({ ...lists, A, showMateDepth })) {
    status.textContent = "Det nya urvalet kunde inte sparas.";
    return;
  }
  status.hidden = true;
  ui["new-selection"].open = false;
  if (current) renderProblemHeading();
  else nextProblem();
});

ui["clear-training"].addEventListener("click", () => {
  const status = ui["selection-status"];
  status.hidden = false;
  if (!save({ ...lists, A: [], B: [] })) {
    status.textContent = "Träningen kunde inte tas bort.";
    return;
  }
  status.textContent = "Pågående träning borttagen.";
  nextProblem();
});

ui.auto.addEventListener("change", updateNavigation);

function nextProblem() {
  clearTimeout(nextReviewTimer);
  const now = Date.now();
  let card = lists.B.filter(entry => entry.Tid !== null && entry.Tid < now)
    .sort((a, b) => a.Tid - b.Tid || a.Id - b.Id)[0];
  if (!card && lists.A.length) {
    const [Id, ...A] = lists.A;
    card = { Id, Intervall: 0, Tid: now - 1 };
    const B = [...lists.B, card];
    if (!save({ ...lists, A, B })) return;
  }
  showProblem(card);
}

function showProblem(card, practice = false) {
  const defenseRotations = practice ? current.defenseRotations : new Map();
  current?.analysis?.abort();
  current?.defense?.abort();
  current = null;
  selected = null;
  promotionMove = null;
  ui.promotion.hidden = true;
  ui.moves.replaceChildren();
  ui.moves.hidden = true;
  ui["stockfish-status"].hidden = true;
  ui.board.hidden = !card;
  ui["lichess-analysis"].hidden = !card;
  ui.hint.disabled = !card;
  highlightInterval(card?.Intervall);
  updateNavigation();
  if (!card) {
    ui.problem.textContent = "Inga uppgifter just nu";
    const nextTime = Math.min(...lists.B.filter(entry => entry.Tid !== null).map(entry => entry.Tid));
    ui.status.textContent = Number.isFinite(nextTime)
      ? `Nästa repetition ${repetitionTime.format(nextTime)}.`
      : (lists.B.length ? "Alla uppgifter är klara." : "Lägg till ett urval för att börja träna.");
    if (Number.isFinite(nextTime)) {
      nextReviewTimer = setTimeout(nextProblem, Math.min(2_147_483_647, Math.max(1, nextTime - Date.now() + 1)));
    }
    return;
  }

  const problem = problems.get(card.Id);
  ui["lichess-analysis"].href = "https://lichess.org/analysis/standard/" + problem.fen.replaceAll(" ", "_");
  const [placement, turn, rights, enPassant] = problem.fen.split(" ");
  const board = {};
  placement.split("/").forEach((rank, row) => {
    let column = 0;
    for (const piece of rank) {
      if (/^[1-8]$/.test(piece)) column += Number(piece);
      else board[files[column++] + (8 - row)] = piece;
    }
  });
  const remaining = problem.mate_depth;
  current = {
    card, board, rights, enPassant, turn, remaining, problem, practice,
    defenseRotations, history: [], result: null
  };
  renderProblemHeading();
  ui.status.textContent = practice ? "Övningsförsök. Välj en pjäs och sedan dess målruta."
    : "Välj en pjäs och sedan dess målruta.";
  renderBoard();
}

function renderProblemHeading() {
  const { card, problem, turn } = current;
  const count = problem.mate_depth;
  const depth = ["", "ett", "två", "tre", "fyra"][count] ?? count;
  const side = turn === "w" ? "Vit" : "Svart";
  const goal = lists.showMateDepth ? `${side} gör matt i ${depth} drag` : `${side} gör matt`;
  ui.problem.textContent = `Uppgift ${card.Id} · ${goal}`;
}

ui.repeat.addEventListener("click", () => {
  if (current?.result === "failure") showProblem(current.card, true);
});

function renderBoard() {
  const { board, turn } = current;
  const squares = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    const file = files[turn === "b" ? 7 - column : column];
    const rank = turn === "b" ? row + 1 : 8 - row;
    const square = file + rank;
    const piece = board[square];
    const kind = piece?.toLowerCase();
    const white = piece && piece !== kind;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `square ${(row + column) % 2 ? "dark" : "light"}`;
    button.setAttribute("aria-label", piece ? `${square}, ${white ? "vit" : "svart"} ${names[kind]}` : square);
    button.setAttribute("aria-pressed", String(square === selected));
    if (piece) {
      const image = document.createElement("img");
      image.className = "piece";
      image.alt = "";
      image.draggable = false;
      image.src = `assets/maestro/${white ? "w" : "b"}${piece.toUpperCase()}.svg`;
      button.append(image);
    }
    if (column === 0) addCoordinate(button, "rank", rank);
    if (row === 7) addCoordinate(button, "file", file);
    button.addEventListener("click", () => {
      chooseSquare(square);
      if (ui.promotion.hidden) ui.board.children[index]?.focus();
    });
    return button;
  });
  ui.board.replaceChildren(...squares);
  if (!ui.promotion.hidden) ui["promote-queen"].focus();
}

function addCoordinate(button, type, label) {
  const coordinate = document.createElement("span");
  coordinate.className = `coordinate ${type}`;
  coordinate.setAttribute("aria-hidden", "true");
  coordinate.textContent = label;
  button.append(coordinate);
}

function chooseSquare(square) {
  if (current.result || current.defense || promotionMove) return;
  const piece = current.board[square];
  const own = piece && (piece === piece.toUpperCase()) === (current.turn === "w");
  if (own) {
    selected = selected === square ? null : square;
    renderBoard();
  } else if (selected) {
    const move = selected + square;
    const pawn = current.board[selected].toLowerCase() === "p";
    if (pawn && square[1] === (current.turn === "w" ? "8" : "1")) {
      promotionMove = move;
      ui.promotion.hidden = false;
      ui["promote-queen"].focus();
    } else {
      submitMove(move);
    }
  }
}

function showMove(move) {
  const notation = shortNotation(current, move);
  const whiteMove = pieceSide(current.board[move.uci.slice(0, 2)]) === "w";
  const previous = ui.moves.lastElementChild;
  if (whiteMove || !previous) {
    const item = document.createElement("li");
    item.textContent = whiteMove ? notation : `… ${notation}`;
    ui.moves.append(item);
  } else {
    previous.textContent += " " + notation;
  }
  Object.assign(current, { board: move.board, rights: move.rights, enPassant: move.enPassant });
  current.history.push(move.uci);
  ui.moves.hidden = false;
}

async function checkWithStockfish() {
  const attempt = current;
  attempt.analysis?.abort();
  const controller = new AbortController();
  attempt.analysis = controller;
  const moves = [...attempt.history];
  const { board, rights, enPassant } = attempt;
  const position = { board, rights, enPassant };
  const output = ui["stockfish-status"];
  output.hidden = false;
  output.textContent = "Stockfish analyserar …";
  try {
    const { move, evaluation } = await analyzeWithStockfish(attempt.problem.fen, moves, controller.signal);
    if (controller.signal.aborted) return;
    const depth = evaluation?.type === "mate" ? evaluation.value : null;
    const result = depth > 0 ? `rapporterar matt i ${depth} drag`
      : depth < 0 ? `rapporterar att den som är vid draget blir matt i ${-depth} drag`
        : "rapporterar ingen matt inom söktiden";
    const side = moves.length % 2 ? otherSide(attempt.turn) : attempt.turn;
    const best = move ? [...movesFrom(position, side)].find(candidate => candidate.uci === move) : null;
    const notation = best ? shortNotation(position, best) : null;
    output.textContent = `Stockfish ${result}${notation ? ` (föreslår ${notation})` : ""}.`;
  } catch {
    if (controller.signal.aborted) return;
    output.textContent = "Stockfish-analysen kunde inte slutföras.";
  }
}

function finish(result) {
  const success = result === "success";
  if (!current.practice) {
    const interval = success ? Math.min(5, current.card.Intervall + 1) : 0;
    const updated = { ...current.card, Intervall: interval, Tid: interval === 5 ? null : Date.now() + delays[interval] };
    const B = lists.B.map(card => card.Id === updated.Id ? updated : card);
    if (!save({ ...lists, B })) return false;
    current.card = updated;
    highlightInterval(interval);
  }
  current.result = result;
  updateNavigation();
  ui.hint.disabled = success;
  ui.status.textContent = success
    ? (current.card.Intervall === 5 ? "Korrekt. Uppgiften är färdigtränad." : "Korrekt.")
    : "Misstag. Du kan använda Ledtråd för att se lösningen steg för steg.";
  return true;
}

function gradeAnalysis(event) {
  if (!current || current.result === "failure") return;
  const alreadySolved = current.result === "success";
  if (!finish("failure")) {
    event.preventDefault();
    return;
  }
  ui.hint.disabled = alreadySolved || Boolean(current.defense);
  ui.status.textContent = "Misstag. Ställningen öppnades för analys på Lichess.";
  selected = null;
  promotionMove = null;
  ui.promotion.hidden = true;
  renderBoard();
}

ui["lichess-analysis"].addEventListener("click", gradeAnalysis);
ui["lichess-analysis"].addEventListener("auxclick", event => {
  if (event.button === 1) gradeAnalysis(event);
});

async function defenseOptions(attempt) {
  const defenses = [...movesFrom(attempt, otherSide(attempt.turn))];
  if (defenses.length > 1) {
    const controller = new AbortController();
    attempt.defense = controller;
    ui.hint.disabled = true;
    ui.status.textContent = "Stockfish väljer ett motdrag …";
    renderBoard();
    let ranked = [];
    try {
      const { bestMoves } = await analyzeWithStockfish(attempt.problem.fen, attempt.history, controller.signal,
        { moveTime: 350, timeout: 1500, multiPV: defenses.length });
      ranked = defenses.filter(candidate => bestMoves.includes(candidate.uci));
    } catch {
      // The local search has verified all legal defenses.
    }
    if (controller.signal.aborted) return;
    attempt.defense = null;
    ui.hint.disabled = false;
    if (ranked.length) return ranked;
  }
  return defenses;
}

async function pickDefense(attempt) {
  const key = attempt.history.join(" ");
  let rotation = attempt.defenseRotations.get(key);
  if (!rotation) {
    const options = await defenseOptions(attempt);
    if (current !== attempt || !options) return;
    rotation = { options, used: new Set(), last: null };
    attempt.defenseRotations.set(key, rotation);
  }
  const { options, used } = rotation;
  if (used.size === options.length) used.clear();
  const unused = options.filter(move => !used.has(move.uci));
  const candidates = unused.length > 1 ? unused.filter(move => move.uci !== rotation.last) : unused;
  const reply = candidates[Math.floor(Math.random() * candidates.length)];
  used.add(reply.uci);
  rotation.last = reply.uci;
  return reply;
}

async function playReply() {
  const attempt = current;
  const reply = await pickDefense(attempt);
  if (current !== attempt || !reply) return;
  showMove(reply);
  attempt.remaining--;
  if (!attempt.result) {
    ui.status.textContent = lists.showMateDepth && attempt.remaining === 1
      ? "Rätt drag. Motståndaren har svarat. Gör matt."
      : "Rätt drag. Motståndaren har svarat. Spela vidare.";
  }
  renderBoard();
}

function submitMove(uci) {
  if (current.defense) return;
  selected = null;
  const { turn, remaining } = current;
  const move = [...movesFrom(current, turn)].find(candidate => candidate.uci === uci);
  if (!move) {
    ui.status.textContent = "Ogiltigt drag. Försök igen.";
  } else {
    const line = mateLine(move, turn, remaining);
    if (!line) {
      finish("failure");
    } else if (line.length === 1) {
      if (finish("success")) {
        showMove(move);
        if (ui.auto.checked) {
          nextProblem();
          return;
        }
      }
    } else {
      showMove(move);
      return playReply();
    }
  }
  renderBoard();
}

ui.promotion.addEventListener("submit", event => {
  event.preventDefault();
  const choice = event.submitter?.value;
  if (current?.result || !promotionMove || !choice) return;
  const move = promotionMove + choice;
  promotionMove = null;
  ui.promotion.hidden = true;
  submitMove(move);
});

ui.hint.addEventListener("click", async () => {
  if (!current || ui.hint.disabled || current.defense) return;
  if (!current.result && !finish("failure")) return;
  selected = null;
  promotionMove = null;
  ui.promotion.hidden = true;
  const attempt = current;
  const { turn, remaining, history } = attempt;
  let complete = false;
  if (history.length % 2) {
    const reply = await pickDefense(attempt);
    if (current !== attempt || !reply) return;
    showMove(reply);
    attempt.remaining--;
  } else {
    const preferred = history.length ? undefined : attempt.problem.mate_move;
    const line = findMateLine(attempt, turn, remaining, preferred);
    if (!line) {
      ui.hint.disabled = true;
      ui.status.textContent = "Ingen mattlösning hittades.";
      checkWithStockfish();
      renderBoard();
      return;
    }
    showMove(line[0]);
    complete = line.length === 1;
  }
  ui.status.textContent = complete ? "Misstag. Lösningen är visad." : "Misstag. Tryck på Ledtråd för nästa drag.";
  ui.hint.disabled = complete;
  renderBoard();
});
ui.continue.addEventListener("click", nextProblem);

async function start() {
  try {
    const response = await fetch("./5334.json");
    if (!response.ok) throw new Error("Dataset unavailable");
    const { problems: dataset, summary } = await response.json();
    const excluded = new Set(summary.review_ids);
    const sorted = dataset.sort((a, b) => a.id - b.id).slice(0, 4462)
      .filter(problem => !excluded.has(problem.id) && Number.isInteger(problem.mate_depth)
        && problem.mate_depth > 0 && problem.mate_depth <= maxVerifiedMateDepth);
    problems = new Map(sorted.map(problem => [problem.id, problem]));
    const saved = JSON.parse(localStorage.getItem(storageKey))
      ?? { A: sampleNewProblems(newProblemCount, [...problems.keys()]).sort((a, b) => a - b), B: [] };
    const B = saved.B.filter(([id]) => problems.has(id))
      .map(([Id, Intervall, Tid]) => ({ Id, Intervall, Tid: readStoredTime(Tid) }));
    const started = new Set(B.map(card => card.Id));
    const A = saved.A.filter(id => problems.has(id) && !started.has(id));
    if (!save({ A, B, showMateDepth: saved.showMateDepth ?? true })) {
      ui.problem.textContent = "Kunde inte starta träningen";
      return;
    }
    setupSelection();
    nextProblem();
  } catch (error) {
    ui.problem.textContent = "Kunde inte starta träningen";
    ui.status.textContent = "Öppna appen via en lokal webbserver och kontrollera att 5334.json och lokal lagring är tillgängliga.";
    console.error(error);
  }
}

start();
