function assertEvenPlayerCount(n) {
  if (!Number.isInteger(n) || n < 4 || n > 36 || n % 2 !== 0) {
    throw new RangeError('n must be an even integer from 4 to 36');
  }
}

function assertRound(n, rond) {
  if (!Number.isInteger(rond) || rond < 1 || rond > n - 1) {
    throw new RangeError(`rond must be an integer from 1 to ${n - 1}`);
  }
}

function wrap(player, maxPlayer) {
  return ((player - 1) % maxPlayer + maxPlayer) % maxPlayer + 1;
}

function boardOrder(boardCount) {
  const order = [];

  for (let board = 3; board < boardCount; board += 1) {
    order.push(board);
  }

  if (boardCount > 2) {
    order.push(2);
  }

  order.push(boardCount, 1);
  return order;
}

export function bergerRound(n, rond) {
  assertEvenPlayerCount(n);
  assertRound(n, rond);

  const fixedPlayer = n;
  const boardCount = n / 2;
  const rotatingPlayers = n - 1;
  const firstOpponent = rond % 2 === 1
    ? (rond + 1) / 2
    : boardCount + rond / 2;

  const games = rond % 2 === 1
    ? [[firstOpponent, fixedPlayer]]
    : [[fixedPlayer, firstOpponent]];

  for (let offset = 1; offset < boardCount; offset += 1) {
    games.push([
      wrap(firstOpponent + offset, rotatingPlayers),
      wrap(firstOpponent - offset, rotatingPlayers),
    ]);
  }

  return boardOrder(boardCount).map(board => games[board - 1]);
}

export function berger(n, rond) {
  assertEvenPlayerCount(n);

  if (rond === undefined) {
    return Array.from({ length: n - 1 }, (_, index) => bergerRound(n, index + 1));
  }

  return bergerRound(n, rond);
}

export function formatBoardList(boardList) {
  const playerSymbols = '123456789abcdefghijklmnopqrstuvwxyzå';

  function formatPlayer(player) {
    return playerSymbols[player - 1];
  }

  return boardList
    .map(([white, black]) => `${formatPlayer(white)}${formatPlayer(black)}`)
    .join(' ');
}

if (typeof window !== 'undefined') {
  window.berger = berger;
}

function isCliEntryPoint() {
  if (typeof process === 'undefined' || !process.argv?.[1]) {
    return false;
  }

  const modulePath = decodeURIComponent(new URL(import.meta.url).pathname)
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\\/g, '/');
  const entryPath = process.argv[1].replace(/\\/g, '/');

  return modulePath === entryPath;
}

if (isCliEntryPoint()) {
  if (process.argv[2] === undefined) {
    console.log('Usage: node berger.js <n 4..36> [rond]');
    process.exit(0);
  }

  const n = Number(process.argv[2]);
  const rond = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
  const result = berger(n, rond);
  const output = rond === undefined
    ? result.map(formatBoardList).join('\n')
    : formatBoardList(result);

  console.log(output);
}
