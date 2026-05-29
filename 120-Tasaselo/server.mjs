import http from "node:http";

const SOURCE_URL = "https://www.shakki.net/tasaselo/ty550629.txt";
const FAIRPAIR_BASE =
  "https://christernilsson.github.io/2025/035-FairPair/?TITLE=&CITY=&FED=SWE&ARB=&GAMES=1&currSort=%23&currRound=0&ONE=1&A=1&B=1&C=1&SPEED=0";
const MEMBER_ID = "1786911";
const ROUND_CHARS = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PORT = Number(process.env.PORT || 5173);

function parseTournament(source) {
  const rounds = Number(source.match(/Kierros:\s*(\d+)/)?.[1] || 0);
  const players = [];
  const pairings = new Map();
  let inResults = false;

  for (const line of source.split(/\r?\n/)) {
    if (/^\s*TASASELOTURNAUS\./.test(line)) break;
    if (/^\s*[A-Z]-ryhm/.test(line)) {
      inResults = true;
      continue;
    }
    if (!inResults || !/^\s*\d+\s+/.test(line)) continue;

    const row = parsePlayerLine(line, rounds);
    if (!row) continue;
    players.push(row.player);

    for (const game of row.games) {
      const a = Math.min(row.player.number, game.opponent);
      const b = Math.max(row.player.number, game.opponent);
      pairings.set(`${a}:${b}`, game.round);
    }
  }

  if (players.length === 0) {
    throw new Error("Kunde inte hitta nagra spelarrader i kallfilen.");
  }

  return { rounds, players, pairings };
}

function parsePlayerLine(line, rounds) {
  const match = line.match(
    /^\s*(\d+)\s+(.+?)\s{2,}(\S+)\s+([U]?\d+)\s+(.+?)\s+(\d+,\d)\s+(\d+)\s*$/
  );
  if (!match) return null;

  const [, numberText, name, club, initialEloText, gamesText, points, finalEloText] = match;
  const number = Number(numberText);
  const games = [];
  const gamePattern = /[mv][+\-=]\s*(\d+)/g;
  let gameMatch;

  while ((gameMatch = gamePattern.exec(gamesText))) {
    games.push({
      round: games.length + 1,
      opponent: Number(gameMatch[1])
    });
  }

  if (rounds && games.length !== rounds) {
    throw new Error(`Rad for ${name.trim()} har ${games.length} ronder, vantade ${rounds}.`);
  }

  return {
    player: {
      number,
      name: name.trim(),
      club,
      initialElo: Number(initialEloText.replace(/^U/, "")),
      elo: Number(finalEloText),
      points
    },
    games
  };
}

function buildMatrix({ rounds, players, pairings }) {
  const sorted = [...players].sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"));
  const indexByNumber = new Map(sorted.map((player, index) => [player.number, index]));
  const cells = Array.from({ length: sorted.length }, () => Array(sorted.length).fill("."));

  for (let i = 0; i < sorted.length; i += 1) {
    cells[i][i] = "\u2022";
  }

  for (const [key, round] of pairings) {
    const [a, b] = key.split(":").map(Number);
    const row = indexByNumber.get(a);
    const col = indexByNumber.get(b);
    if (row === undefined || col === undefined) continue;

    const marker = ROUND_CHARS[round - 1] || "?";
    cells[row][col] = marker;
    cells[col][row] = marker;
  }

  return { rounds, players: sorted, cells };
}

function buildFairPairUrl(rounds, players) {
  const head = FAIRPAIR_BASE.replace("?TITLE=", `?TITLE=`).replace("&currSort", `&ROUNDS=${rounds}&currSort`);
  const params = players
    .map((player) => `p=${player.elo}|${encodeName(player.name)}|${MEMBER_ID}`)
    .join("&");
  return `${head}&${params}`;
}

function encodeName(name) {
  return encodeURIComponent(name).replace(/%20/g, "+");
}

function render({ rounds, players, cells }) {
  const numberWidth = String(players.length).length;
  const eloWidth = Math.max(4, ...players.map((player) => String(player.elo).length));
  const headerPrefix = " ".repeat(numberWidth + 1 + eloWidth + 2);
  const header = `${headerPrefix}${players.map((_, index) => String((index + 1) % 10)).join(" ")}`;
  const lines = [header];

  for (let row = 0; row < players.length; row += 1) {
    const player = players[row];
    const rowNo = String(row + 1).padStart(numberWidth);
    const elo = String(player.elo).padStart(eloWidth);
    lines.push(`${rowNo} ${elo}  ${cells[row].join(" ")}  ${player.name}`);
  }

  const fairPairUrl = buildFairPairUrl(rounds, players);

  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tasaselo matris</title>
    <style>
      html {
        color-scheme: light;
      }
      body {
        margin: 0;
        padding: 16px;
        background: white;
        color: black;
        font-family: Consolas, "Courier New", monospace;
      }
      pre {
        margin: 0 0 16px;
        font: inherit;
        line-height: 1.35;
        white-space: pre;
      }
      a {
        color: black;
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(lines.join("\n"))}</pre>
    <a href="${escapeHtml(fairPairUrl)}">${escapeHtml(fairPairUrl)}</a>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadPage() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Kunde inte hamta ${SOURCE_URL}: HTTP ${response.status}`);
  }
  const source = new TextDecoder("windows-1252").decode(await response.arrayBuffer());
  return render(buildMatrix(parseTournament(source)));
}

const server = http.createServer(async (_request, response) => {
  try {
    const page = await loadPage();
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
