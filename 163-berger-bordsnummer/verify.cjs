const assert = require('node:assert/strict');
const { createRounds } = require('./app.js');
for (let n = 4; n <= 20; n += 2) {
  const rounds = createRounds(n);
  assert.equal(rounds.length, n - 1);
  const pairs = new Set();
  let roundIndex = 0;
  for (const boards of rounds) {
    const seats = new Array(n);
    for (const b of boards) {
      assert.equal(b.leftSeat + b.rightSeat, n - 1);
      assert.notEqual(b.leftSeat % 2, b.rightSeat % 2);
      seats[b.leftSeat] = b.left;
      seats[b.rightSeat] = b.right;
      const pair = [b.left, b.right].sort((a, b) => a - b).join('-');
      assert(!pairs.has(pair), `Upprepat möte: ${n}, ${pair}`);
      pairs.add(pair);
    }
    assert.equal(new Set(seats).size, n);
    assert.equal(seats[roundIndex % 2 ? n - 1 : 0], 1);
    roundIndex++;
  }
  assert.equal(pairs.size, n * (n - 1) / 2);
}
assert.deepEqual(createRounds(10)[0].map(b => [b.leftSeat, b.rightSeat]), [[4,5],[3,6],[2,7],[1,8],[0,9]]);
assert.throws(() => createRounds(22), RangeError);
assert.throws(() => createRounds(24), RangeError);
console.log('Godkänt: alla 9 deltagarantal, unika möten, rotation, fasta platser och färger.');

assert.equal(createRounds(10)[0].at(-1).right, 10);
assert.equal(createRounds(10)[1].at(-1).left, 9);
assert.equal(createRounds(10)[1].at(-1).right, 1);
