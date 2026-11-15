import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from './vendor/chess.js';
import { parseProblems, nextIndex, mateDistance, defenseMove } from './trainer.js';

const problems = [
  '8/8/8/8/4k3/8/1Q6/K7 w - - 0 1',
  '8/3Q4/8/k1K5/8/8/8/8 w - - 0 1'
];
test('positions load and the easiest has mate in one', () => {
  assert.equal(parseProblems(problems).length, 2);
  const game = new Chess(problems.at(-1));
  assert.ok(game.moves().some(san => san.endsWith('#')));
});
test('difficulty honors descending file order and clamps at both ends', () => {
  assert.equal(nextIndex(3, -1, 8), 4);
  assert.equal(nextIndex(3, 1, 8), 2);
  assert.equal(nextIndex(3, 0, 8), 3);
  assert.equal(nextIndex(0, 1, 8), 0);
  assert.equal(nextIndex(7, -1, 8), 7);
});
test('distance uses plies, never mistakes general DTZ for mate', () => {
  assert.equal(mateDistance(problems[0], { category:'win', dtm: 13 }).moves, 7);
  assert.equal(mateDistance(problems[0], { category:'win', precise_dtz: 1 }).moves, 1);
  assert.equal(mateDistance(problems[0], { category:'win', dtz: 13 }), null);
  assert.equal(mateDistance('8/8/8/8/4k3/8/1P6/K7 w - - 0 1', {category:'win',precise_dtz: 1}), null);
  assert.equal(mateDistance(problems[0], {category:'draw',dtm:0}), null);
  for (const fen of [
    '8/4B3/8/8/8/8/4B3/K1k5 b - - 0 1',
    '8/8/8/6B1/8/8/4k3/1K5N w - - 0 1'
  ]) {
    assert.equal(mateDistance(fen, {category:'win', precise_dtz: 13}).moves, 7);
    assert.equal(mateDistance(fen, {category:'loss', precise_dtz: -14}).moves, 7);
    assert.equal(mateDistance(fen, {category:'win', dtz: 13}), null);
  }
});
test('computer prolongs mate but takes a draw when available', () => {
  const a = {uci:'e4e5', category:'win', dtm:3};
  const b = {uci:'e4f5', category:'win', dtm:9};
  assert.equal(defenseMove({moves:[a,b]}), 'e4f5');
  assert.equal(defenseMove({moves:[{uci:'e4d5', category:'draw'},a,b]}), 'e4d5');
});
test('invalid files are rejected before replacing active problems', () => {
  for (const input of [[], {}, ['invalid'], [42]]) assert.throws(() => parseProblems(input));
});
