const startInput = document.getElementById("start");
const introInput = document.getElementById("intro");
const roundsInput = document.getElementById("rounds");
const beforeLunchInput = document.getElementById("beforeLunch");
const clockInput = document.getElementById("clock");
const pairingInput = document.getElementById("pairing");
const lunchInput = document.getElementById("lunch");
const result = document.getElementById("result");

const inputs = [
  startInput,
  introInput,
  roundsInput,
  beforeLunchInput,
  clockInput,
  pairingInput,
  lunchInput
];

const defaults = {
  A: "10:00",
  G: "10",
  D: "7",
  E: "4",
  B: "15",
  F: "5",
  C: "30"
};

const fields = [
  { key: "A", input: startInput, validate: normalizeTime },
  { key: "G", input: introInput, validate: normalizeWholeNumber },
  { key: "D", input: roundsInput, validate: normalizePositiveWholeNumber },
  { key: "E", input: beforeLunchInput, validate: normalizeWholeNumber },
  { key: "B", input: clockInput, validate: normalizeWholeNumber },
  { key: "F", input: pairingInput, validate: normalizeWholeNumber },
  { key: "C", input: lunchInput, validate: normalizeWholeNumber }
];

function normalizeTime(value) {
  if (!/^\d{1,2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function normalizeWholeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.max(0, Math.floor(number)).toString();
}

function normalizePositiveWholeNumber(value) {
  const normalized = normalizeWholeNumber(value);
  return Math.max(1, Number(normalized)).toString();
}

function parseTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const day = 24 * 60;
  const normalized = ((totalMinutes % day) + day) % day;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function readMinutes(input) {
  return Math.max(0, Math.floor(Number(input.value) || 0));
}

function loadValues() {
  const params = new URLSearchParams(window.location.search);

  for (const field of fields) {
    const value = params.get(field.key) ?? defaults[field.key];
    field.input.value = field.validate(value) ?? defaults[field.key];
  }
}

function updateUrl() {
  const params = new URLSearchParams();

  for (const field of fields) {
    params.set(field.key, field.input.value);
  }

  const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}

function render() {
  const start = parseTime(startInput.value || "00:00");
  const clock = readMinutes(clockInput);
  const lunch = readMinutes(lunchInput);
  const rounds = Math.max(1, readMinutes(roundsInput));
  const beforeLunch = Math.min(rounds, readMinutes(beforeLunchInput));
  const pairing = readMinutes(pairingInput);
  const intro = readMinutes(introInput);

  const roundStep = clock * 2 + pairing;
  const introStart = start;
  let time = introStart + intro;
  let prizeTime = time;
  const lines = [`Intro:  ${formatTime(introStart)}`];

  for (let round = 1; round <= rounds; round += 1) {
    lines.push(`Rond ${round}: ${formatTime(time)}`);
    prizeTime = time + clock + intro;
    time += roundStep;

    if (round === beforeLunch && round < rounds) {
      lines.push(`Lunch:  ${lunch} min`);
      time += lunch;
    }
  }

  lines.push(`Prisutdelning: ${formatTime(prizeTime)}`);
  result.textContent = lines.join("\n");
  updateUrl();
}

for (const input of inputs) {
  input.addEventListener("input", render);
}

loadValues();
render();
