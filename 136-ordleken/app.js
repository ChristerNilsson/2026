"use strict";

const GAME_SECONDS = 10 * 60;
const dictionary = new Set();
let dictionaryReady = false;

const elements = {
  setup: document.querySelector("#setup"),
  game: document.querySelector("#game"),
  result: document.querySelector("#result"),
  sourceWord: document.querySelector("#source-word"),
  start: document.querySelector("#start-button"),
  setupMessage: document.querySelector("#setup-message"),
  timer: document.querySelector("#timer"),
  score: document.querySelector("#score"),
  letters: document.querySelector("#letters"),
  form: document.querySelector("#word-form"),
  wordInput: document.querySelector("#word-input"),
  deleteLetter: document.querySelector("#delete-letter-button"),
  clearWord: document.querySelector("#clear-word-button"),
  gameMessage: document.querySelector("#game-message"),
  list: document.querySelector("#word-list"),
  empty: document.querySelector("#empty-list"),
  count: document.querySelector("#word-count"),
  finalScore: document.querySelector("#final-score"),
  summary: document.querySelector("#result-summary"),
  resultWordList: document.querySelector("#result-word-list"),
  resultWordCount: document.querySelector("#result-word-count"),
  answerList: document.querySelector("#answer-list"),
  answerCount: document.querySelector("#answer-count"),
  answerScore: document.querySelector("#answer-score"),
  newGame: document.querySelector("#new-game-button")
};

let source = "";
let sourceCounts = new Map();
let entries = [];
let total = 0;
let endsAt = 0;
let timerId = null;
let selectedTiles = [];

function normalize(value) {
  return value.trim().toLocaleLowerCase("sv-SE");
}

function alphabetic(words) {
  return [...words].sort((a, b) => a.localeCompare(b, "sv-SE"));
}

function letterCounts(word) {
  const counts = new Map();
  for (const letter of word) counts.set(letter, (counts.get(letter) || 0) + 1);
  return counts;
}

function canBuild(word) {
  for (const [letter, amount] of letterCounts(word)) {
    if ((sourceCounts.get(letter) || 0) < amount) return false;
  }
  return true;
}

function showMessage(element, text, kind = "") {
  element.textContent = text;
  element.className = `message ${kind}`.trim();
}

async function loadDictionary() {
  elements.start.disabled = true;
  showMessage(elements.setupMessage, "Läser in SAOL…");

  try {
    const response = await fetch("./saol-ord.txt");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const words = (await response.text()).split(/\r?\n/);
    for (const word of words) {
      if (/^[a-zåäö]+$/.test(word)) dictionary.add(word);
    }
    if (dictionary.size === 0) throw new Error("Ordlistan är tom");

    dictionaryReady = true;
    elements.start.disabled = false;
    showMessage(elements.setupMessage, `${dictionary.size.toLocaleString("sv-SE")} godkända ord är klara.`, "success");
  } catch (error) {
    console.error("Kunde inte läsa saol-ord.txt:", error);
    showMessage(elements.setupMessage, "Kunde inte läsa saol-ord.txt. Ladda sidan via en webbserver.", "error");
  }
}

function resetBuiltWord() {
  selectedTiles = [];
  elements.wordInput.value = "";
  for (const tile of elements.letters.querySelectorAll(".letter")) tile.disabled = false;
}

function selectLetter(tile) {
  if (tile.disabled) return;
  tile.disabled = true;
  selectedTiles.push(tile);
  elements.wordInput.value += tile.dataset.letter;
  showMessage(elements.gameMessage, "");
}

function deleteLetter() {
  const tile = selectedTiles.pop();
  if (!tile) return;
  tile.disabled = false;
  elements.wordInput.value = elements.wordInput.value.slice(0, -1);
  showMessage(elements.gameMessage, "");
}

function selectLetterFromKeyboard(letter) {
  const normalizedLetter = letter.toLocaleLowerCase("sv-SE");
  const tile = [...elements.letters.querySelectorAll(".letter:not(:disabled)")]
    .find(candidate => candidate.dataset.letter === normalizedLetter);
  if (tile) selectLetter(tile);
}

function handleGameKeyboard(event) {
  if (elements.game.classList.contains("hidden") || event.target === elements.sourceWord) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (/^[a-zåäö]$/i.test(event.key)) {
    event.preventDefault();
    selectLetterFromKeyboard(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteLetter();
  } else if (event.key === "Escape") {
    event.preventDefault();
    resetBuiltWord();
    showMessage(elements.gameMessage, "");
  } else if (event.key === "Enter") {
    event.preventDefault();
    elements.form.requestSubmit();
  }
}

function startGame() {
  if (!dictionaryReady) {
    showMessage(elements.setupMessage, "Vänta tills ordlistan har lästs in.", "error");
    return;
  }

  source = normalize(elements.sourceWord.value);
  if (!/^[a-zåäö]+$/i.test(source) || source.length < 2) {
    showMessage(elements.setupMessage, "Skriv ett ord med minst två bokstäver.", "error");
    elements.sourceWord.focus();
    return;
  }

  sourceCounts = letterCounts(source);
  entries = [];
  total = 0;
  endsAt = Date.now() + GAME_SECONDS * 1000;
  renderWords();
  elements.letters.replaceChildren(
    ...[...source.toLocaleUpperCase("sv-SE")].map(letter => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "letter";
      tile.textContent = letter;
      tile.dataset.letter = letter.toLocaleLowerCase("sv-SE");
      tile.setAttribute("aria-label", `Lägg till ${letter}`);
      tile.addEventListener("click", () => selectLetter(tile));
      return tile;
    })
  );
  showMessage(elements.gameMessage, "");
  elements.setup.classList.add("hidden");
  elements.result.classList.add("hidden");
  elements.game.classList.remove("hidden");
  updateTimer();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 250);
  resetBuiltWord();
}

function updateTimer() {
  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  elements.timer.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
  if (remaining === 0) finishGame();
}

function addWord(event) {
  event.preventDefault();
  const word = normalize(elements.wordInput.value);
  const letterLength = word.length;
  if (letterLength < 2) {
    showMessage(elements.gameMessage, "Ordet måste ha minst två bokstäver.", "error");
    return;
  }
  if (!/^[a-zåäö]+$/i.test(word)) {
    showMessage(elements.gameMessage, "Använd bara bokstäver.", "error");
    return;
  }
  if (!canBuild(word)) {
    showMessage(elements.gameMessage, "De bokstäverna finns inte i startordet.", "error");
    return;
  }
  if (entries.some(entry => entry.word === word)) {
    showMessage(elements.gameMessage, "Det ordet har du redan skrivit.", "error");
    return;
  }

  const valid = dictionary.has(word);
  const points = (valid ? 1 : -1) * letterLength ** 2;
  entries.unshift({ word, valid, points });
  total += points;
  resetBuiltWord();
  showMessage(
    elements.gameMessage,
    valid ? `Godkänt! +${points} poäng.` : `Inte i ordlistan. ${points} poäng.`,
    valid ? "success" : "error"
  );
  renderWords();
}

function renderWords() {
  elements.score.textContent = total;
  elements.count.textContent = `${entries.length} ${entries.length === 1 ? "ord" : "ord"}`;
  elements.empty.classList.toggle("hidden", entries.length > 0);
  const sortedEntries = [...entries].sort((a, b) => a.word.localeCompare(b.word, "sv-SE"));
  elements.list.replaceChildren(...sortedEntries.map(entry => {
    const item = document.createElement("li");
    const word = document.createElement("span");
    const points = document.createElement("span");
    word.textContent = entry.word;
    points.className = `points ${entry.valid ? "good" : "bad"}`;
    points.textContent = entry.points > 0 ? `+${entry.points}` : String(entry.points);
    item.append(word, points);
    return item;
  }));
}

function findAllAnswers() {
  return alphabetic([...dictionary].filter(word =>
    word.length >= 2 &&
    canBuild(word)
  ));
}

function makeResultItem(word, points, className = "") {
  const item = document.createElement("li");
  const name = document.createElement("span");
  const score = document.createElement("span");
  name.className = `result-name ${className}`.trim();
  name.textContent = word;
  score.className = "points good";
  score.textContent = `+${points}`;
  item.append(name, score);
  return item;
}

function finishGame() {
  clearInterval(timerId);
  timerId = null;
  elements.game.classList.add("hidden");
  elements.result.classList.remove("hidden");
  elements.finalScore.textContent = total;
  const validCount = entries.filter(entry => entry.valid).length;
  elements.summary.textContent = `${validCount} godkända av ${entries.length} skrivna ord med ${source.toLocaleUpperCase("sv-SE")}.`;
  elements.resultWordCount.textContent = `${entries.length} ord`;
  const byWord = new Map(entries.map(entry => [entry.word, entry]));
  elements.resultWordList.replaceChildren(...alphabetic(entries.map(entry => entry.word)).map(word => {
    const entry = byWord.get(word);
    const item = makeResultItem(word, Math.abs(entry.points));
    const points = item.querySelector(".points");
    points.className = `points ${entry.valid ? "good" : "bad"}`;
    points.textContent = entry.points > 0 ? `+${entry.points}` : String(entry.points);
    return item;
  }));

  const answers = findAllAnswers();
  const found = new Set(entries.filter(entry => entry.valid).map(entry => entry.word));
  elements.answerCount.textContent = `${answers.length} ord`;
  elements.answerScore.textContent = answers.reduce((sum, word) => sum + word.length ** 2, 0);
  elements.answerList.replaceChildren(...answers.map(word =>
    makeResultItem(word, word.length ** 2, found.has(word) ? "found-word" : "")
  ));
}

function resetGame() {
  elements.result.classList.add("hidden");
  elements.setup.classList.remove("hidden");
  showMessage(elements.setupMessage, "");
  elements.sourceWord.select();
  elements.sourceWord.focus();
}

elements.start.addEventListener("click", startGame);
elements.sourceWord.addEventListener("keydown", event => {
  if (event.key === "Enter") startGame();
});
elements.form.addEventListener("submit", addWord);
elements.deleteLetter.addEventListener("click", deleteLetter);
elements.clearWord.addEventListener("click", resetBuiltWord);
elements.newGame.addEventListener("click", resetGame);
document.addEventListener("keydown", handleGameKeyboard);
loadDictionary();
