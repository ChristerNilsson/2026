import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProblems, randomOptimalMove, KRK_START } from './generator.js';
import { Chess } from './vendor/chess.js';

test('requested KRK seed is a valid winning-side position', () => {
  const game = new Chess(KRK_START);
  assert.equal(game.turn(), 'w');
  assert.equal(game.board().flat().filter(Boolean).length, 3);
});
test('random selection includes all equally optimal moves but no slower win', () => {
  const moves = [
    {uci:'a1a2',category:'loss',dtm:-4},
    {uci:'a1a3',category:'loss',dtm:-4},
    {uci:'a1a4',category:'loss',dtm:-6},
    {uci:'a1a5',category:'draw',dtm:0}
  ];
  assert.equal(randomOptimalMove(KRK_START, {moves}, true, () => 0), 'a1a2');
  assert.equal(randomOptimalMove(KRK_START, {moves}, true, () => .99), 'a1a3');
  assert.equal(randomOptimalMove(KRK_START, {moves:moves.slice(0,3).map(m=>({...m,category:'win'}))}, false), 'a1a4');
});
test('browser generator includes starting position, excludes mated position', async () => {
  const fen = '8/3R4/8/k1K5/8/8/8/8 w - - 0 1';
  const game = new Chess(fen);
  const mate = game.moves({verbose:true}).find(move=>move.san.endsWith('#'));
  assert.ok(mate);
  const results = await generateProblems(fen, async () => ({
    category:'win', dtm:1, moves:[{uci:mate.from+mate.to,category:'loss',checkmate:true,dtm:null}]
  }));
  assert.deepEqual(results, [game.fen()]);
});
test('unknown distances and cancellation stop generation without partial output', async () => {
  assert.throws(() => randomOptimalMove(KRK_START, {moves:[{uci:'b1a1', category:'loss',dtm:null}]}, true));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generateProblems(KRK_START, () => { throw new Error('should not run'); }, {signal:controller.signal}), {name:'AbortError'});
});
