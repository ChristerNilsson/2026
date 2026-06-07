function assertEvenPlayerCount(n) {
  if (!Number.isInteger(n) || n < 4 || n % 2 !== 0) {
    throw new RangeError('n must be an even integer >= 4');
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

function bergerRound(n, rond) {
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

  if (rond % 2 === 0) {
    for (const game of games) {
      game.reverse();
    }
  }

  return boardOrder(boardCount).map(board => games[board - 1]);
}

function berger(n, rond) {
  assertEvenPlayerCount(n);

  if (rond === undefined) {
    return Array.from({ length: n - 1 }, (_, index) => bergerRound(n, index + 1));
  }

  return bergerRound(n, rond);
}

function formatBoardList(boardList) {
  return boardList.map(([white, black]) => `${white}-${black}`).join('\n');
}

if (typeof module !== 'undefined') {
  module.exports = { berger, bergerRound, formatBoardList };
}

if (typeof window !== 'undefined') {
  window.berger = berger;
}

if (typeof require !== 'undefined' && require.main === module) {
  const n = Number(process.argv[2]);
  const rond = Number(process.argv[3]);
  console.log(formatBoardList(berger(n, rond)));
}
