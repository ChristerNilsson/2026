import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from './vendor/chess.js';
import { ContinuationProgress, positionKey } from './progress.js';

test('learns played winning-side positions, not unplayed or opposing positions', () => {
  const game = new Chess('7k/8/5P2/4K3/8/8/P7/8 w - - 0 1');
  const start = game.fen();
  const progress = new ContinuationProgress();
  assert.equal(progress.knows(start), false);
  game.move('f7');
  const defense = game.fen();
  game.move('Kh7');
  const continuation = game.fen();
  game.move('f8=Q');
  progress.remember(game, 'w');
  assert.equal(progress.knows(start), true);
  assert.equal(progress.knows(continuation), true);
  assert.equal(progress.knows(defense), false);
  assert.equal(progress.knows(game.fen()), false);
  assert.equal(new ContinuationProgress().knows(start), false);
});

test('recognition ignores full-move numbers and preserves draw-clock and move rights', () => {
  const fen = '8/8/8/8/4k3/8/1Q6/K7 w - - 8 20';
  assert.equal(positionKey(fen), positionKey(fen.replace('8 20', '8 90')));
  assert.notEqual(positionKey(fen), positionKey(fen.replace('8 20', '99 20')));
  assert.notEqual(positionKey(fen), positionKey(fen.replace(' w ', ' b ')));
  assert.notEqual(positionKey(fen), positionKey(fen.replace(' - - ', ' - e6 ')));
});

test('a correct first move needs only the previous solved level, not an identical board', () => {
  const progress = new ContinuationProgress();
  assert.equal(progress.canSkip(4, true), false);
  progress.complete(3);
  assert.equal(progress.canSkip(4, true), true);
  assert.equal(progress.canSkip(4, false), false);
  assert.equal(progress.canSkip(5, true), false);
  assert.equal(progress.canSkip(1, true), false);
  assert.equal(new ContinuationProgress([...progress.levels]).canSkip(4, true), true);
});
