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
}

for (const input of inputs) {
  input.addEventListener("input", render);
}

render();
