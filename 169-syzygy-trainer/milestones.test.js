import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from './vendor/chess.js';
import { Milestones, isPawnEndgame, formatTime } from './milestones.js';

test('multi-pawn stages exclude KPK and other material', () => {
  assert.equal(isPawnEndgame('8/8/3k4/5p2/2p2P2/6P1/1P6/K7 w - - 0 1'), true);
  assert.equal(isPawnEndgame('8/6k1/8/8/7K/1P6/8/8 w - - 0 1'), false);
  assert.equal(isPawnEndgame('7k/8/8/8/8/8/1Q6/K7 w - - 0 1'), false);
  assert.equal(formatTime(125999), '2:05');
});

test('ordinary pawn moves and equal pawn trades are not milestones', () => {
  const tracker = new Milestones();
  const game = new Chess('7k/8/2p5/3p4/4P3/8/8/K7 w - - 0 1');
  game.move('exd5'); game.move('cxd5');
  assert.equal(tracker.observe(game, 'w', 'win', 5000, 1), undefined);
  assert.deepEqual(tracker.entries, []);
  const quiet = new Chess('7k/8/8/3p4/8/4P3/8/K7 w - - 0 1');
  quiet.move('e4'); quiet.move('Kh7');
  assert.equal(new Milestones().observe(quiet, 'w', 'win', 5000, 1), undefined);
});

test('a net pawn gain requires a preserved win, for either player color', () => {
  for (const [fen, player, moves] of [
    ['7k/8/8/3p4/4P3/8/8/K7 w - - 0 1', 'w', ['exd5', 'Kh7']],
    ['k7/8/8/4p3/3P4/8/8/7K b - - 0 1', 'b', ['exd4', 'Kh2']]
  ]) {
    const game = new Chess(fen);
    moves.forEach(move=>game.move(move));
    const tracker = new Milestones();
    const entry = tracker.observe(game, player, 'win', 12000, 1);
    assert.equal(entry.label, 'Bonde vunnen');
    assert.equal(entry.elapsed, 12000);
    assert.equal(tracker.observe(game, player, 'win', 13000, 1), undefined);
    assert.equal(tracker.entries.length, 1);
    for (const category of ['draw', 'loss', 'unknown']) {
      assert.equal(new Milestones().observe(game, player, category, 12000, 1), undefined);
    }
  }
});

test('pawn gain continues the game and final promotion records separate stage totals', () => {
  const game = new Chess('7k/6p1/5P2/4K3/8/8/P7/8 w - - 0 1');
  const tracker = new Milestones();
  game.move('fxg7+'); game.move('Kh7');
  assert.equal(game.isGameOver(), false);
  assert.equal(tracker.observe(game, 'w', 'win', 12000, 1).label, 'Bonde vunnen');
  game.move('g8=Q+');
  assert.deepEqual(tracker.observe(game, 'w', 'win', 20000, 2), {
    label:'Promovering', moves:1, elapsed:8000, totalMoves:2, totalElapsed:20000
  });
  assert.equal(tracker.entries.length, 2);
});

test('final promotion is recorded once without a reply', () => {
  const game = new Chess('7k/5P2/5K2/8/8/8/P7/8 w - - 0 1');
  const tracker = new Milestones();
  game.move('f8=N');
  assert.equal(tracker.observe(game, 'w', 'win', 1000, 1).label, 'Promovering');
  assert.equal(tracker.observe(game, 'w', 'win', 2000, 1), undefined);
  assert.equal(tracker.entries.length, 1);
});
