function berger(n) {
  if (!Number.isInteger(n) || n % 2 !== 0 || n < 4) {
    throw new RangeError('n must be an even integer >= 4');
  }

  const fixed = n;
  const m = n / 2;
  const mod = n - 1;

  function wrap(x) {
    return ((x - 1) % mod + mod) % mod + 1;
  }

  function boardOrder(m) {
    // For m=4 this returns: [3, 2, 4, 1]
    const order = [];

    for (let i = m - 1; i > 1; i -= 1) {
      order.push(i);
    }

    order.push(m, 1);
    return order;
  }

  const order = boardOrder(m);
  const rounds = [];

  for (let r = 1; r < n; r += 1) {
    let opp;
    const games = [];

    if (r % 2 === 1) {
      opp = (r + 1) / 2;
      games.push([opp, fixed]);
    } else {
      opp = m + r / 2;
      games.push([fixed, opp]);
    }

    for (let i = 1; i < m; i += 1) {
      const white = wrap(opp + i);
      const black = wrap(opp - i);
      games.push([white, black]);
    }

    rounds.push(order.map(i => games[i - 1]));
  }

  return rounds;
}

if (typeof module !== 'undefined') {
  module.exports = { berger };
}

if (typeof window !== 'undefined') {
  window.berger = berger;
}
