import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from './vendor/chess.js';
import { parseProblems, nextIndex, mateDistance, defenseMove, drawClock, drawReason, drawOpponentMove, formatHistory } from './trainer.js';

const problems = [
  '8/8/8/8/4k3/8/1Q6/K7 w - - 0 1',
  '8/3Q4/8/k1K5/8/8/8/8 w - - 0 1'
];

test('move history numbers white and black as pairs and handles black to move', () => {
  const game = new Chess('8/8/8/8/4pk2/R7/7r/4K3 w - - 0 1');
  for (const move of ['Ra8', 'e3', 'Rf8+', 'Kg3']) game.move(move);
  assert.equal(formatHistory(game.history({verbose:true})), '1. Ra8 e3 2. Rf8+ Kg3');
  game.undo();
  assert.equal(formatHistory(game.history({verbose:true})), '1. Ra8 e3 2. Rf8+');
  const black = new Chess(game.history({verbose:true})[0].after);
  for (const move of ['e3', 'Rf8+', 'Kg3']) black.move(move);
  assert.equal(formatHistory(black.history({verbose:true})), '1... e3 2. Rf8+ Kg3');
  assert.equal(formatHistory([]), '');
});

test('fifty-move counter counts both sides, resets for pawn moves and captures, and supports undo', () => {
  const game = new Chess('8/8/8/8/4pk2/R7/7r/4K3 w - - 98 1');
  assert.equal(drawClock(game.fen()), '49 / 50');
  game.move('Rb3');
  assert.equal(drawClock(game.fen()), '49,5 / 50');
  game.move('e3');
  assert.equal(drawClock(game.fen()), '0 / 50');
  game.undo();
  assert.equal(drawClock(game.fen()), '49,5 / 50');
  game.move('Kg5');
  assert.equal(drawClock(game.fen()), '50 / 50');
  assert.equal(drawReason(game), '50-dragsregeln');
  const capture = new Chess('8/8/5k2/8/4p3/4R3/7r/4K3 w - - 98 1');
  capture.move('Rxe4');
  assert.equal(drawClock(capture.fen()), '0 / 50');
});

test('draw reason distinguishes repetition, stalemate, insufficient material and mate', () => {
  const game = new Chess('7k/8/8/8/8/8/R7/K7 w - - 0 1');
  for (let i = 0; i < 2; i++) for (const move of ['Ra3', 'Kh7', 'Ra2', 'Kh8']) game.move(move);
  assert.equal(drawReason(game), 'Trefaldig upprepning');
  assert.equal(drawReason(new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1')), 'Patt');
  assert.equal(drawReason(new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1')), 'Otillräckligt material');
  assert.equal(drawReason(new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 100 1')), null);
});

test('draw opponent avoids a repeated position when equally good alternatives exist', () => {
  const game = new Chess('7k/8/8/8/8/8/R7/K7 w - - 0 1');
  for (const move of ['Ra3', 'Kh7', 'Ra2']) game.move(move);
  const data = {category:'draw', moves:[{uci:'h7h8',category:'draw'}, {uci:'h7g6',category:'draw'}, {uci:'h7g7',category:'loss'}]};
  assert.equal(drawOpponentMove(game, data), 'h7g6');
});
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
