import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateProblems, randomOptimalMove, optimalMoves, KRK_START } from './generator.js';
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

test('correct first moves include tied alternatives but exclude slower wins and draws', () => {
  assert.deepEqual(optimalMoves(KRK_START, {moves:[
    {uci:'b1a1',category:'loss',dtm:-6},
    {uci:'b1a2',category:'loss',dtm:-6},
    {uci:'c2c3',category:'loss',dtm:-8},
    {uci:'c2c4',category:'draw',dtm:0}
  ]}, true), ['b1a1', 'b1a2']);
  const fen = '7k/5P2/5K2/8/8/8/P7/8 w - - 0 1';
  assert.deepEqual(optimalMoves(fen, {moves:[
    {uci:'f7f8q',category:'loss',dtz:-2,zeroing:true},
    {uci:'f7f8r',category:'loss',dtz:-2,zeroing:true},
    {uci:'f6e6',category:'loss',dtz:-2,zeroing:false},
    {uci:'f6e5',category:'loss',dtz:-4,zeroing:false},
    {uci:'f7f8n',category:'draw',dtz:0,zeroing:true}
  ]}, true), ['f7f8q', 'f7f8r']);
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

test('DTZ generation follows mixed material to mate without requiring decreasing DTZ', async () => {
  const fen = '7k/5Q2/5K2/8/8/8/P7/8 w - - 0 1';
  const game = new Chess(fen);
  const replies = new Map(), expected = [];
  const line = ['f7f8', 'h8h7', 'f8g7'];
  for (const [i, uci] of line.entries()) {
    const current = game.fen();
    if (game.turn() === 'w') expected.push(current);
    game.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]});
    replies.set(current, {category:i % 2 ? 'loss' : 'win', dtz:i === 0 ? 1 : i === 1 ? -2 : 1,
      moves:[{uci, category:i % 2 ? 'win' : 'loss', dtz:i === 0 ? -20 : 1, checkmate:game.isCheckmate()}]});
  }
  assert.ok(game.isCheckmate());
  const progress = [];
  assert.deepEqual(await generateProblems(fen, async current => replies.get(current), {onProgress:p=>progress.push(p)}), expected);
  assert.equal(progress[0].remaining, null);
  // A losing side to move must also follow DTZ before saving positions.
  const defenderFen = [...replies.keys()][1];
  assert.deepEqual(await generateProblems(defenderFen, async current => replies.get(current)), [expected[1]]);
});

test('single and multiple pawn endings stop at promotion for either color without probing promoted material', async () => {
  for (const fen of ['7k/5P2/5K2/8/8/8/8/8 w - - 0 1', '8/8/8/8/8/5k2/5p2/7K b - - 0 1', '7k/5P2/5K2/8/8/8/P7/8 w - - 0 1', '8/p7/8/8/8/5k2/5p2/7K b - - 0 1']) {
    const game = new Chess(fen);
    const move = game.moves({verbose:true}).find(move=>move.promotion === 'q');
    let calls = 0;
    const positions = await generateProblems(fen, async () => {
      assert.equal(++calls, 1);
      return {category:'win', dtz:1, moves:[{uci:move.from+move.to+'q',category:'loss',dtz:-10}]};
    });
    assert.deepEqual(positions, [game.fen()]);
  }
});

test('KQKR ends at rook capture for either color without probing the resulting KQK', async () => {
  for (const fen of ['7k/1r6/8/8/8/8/1Q6/K7 w - - 0 1', 'k7/1q6/8/8/8/8/1R6/7K b - - 0 1']) {
    const game = new Chess(fen);
    const capture = game.moves({verbose:true}).find(move=>move.captured === 'r');
    assert.ok(capture);
    let calls = 0;
    const positions = await generateProblems(fen, async () => {
      assert.equal(++calls, 1);
      return {category:'win', dtm:9, moves:[{uci:capture.from+capture.to,category:'loss',dtm:-8}]};
    });
    assert.deepEqual(positions, [game.fen()]);
  }
});

test('KQKR can finish with checkmate while the rook is still on the board', async () => {
  const fen = '7k/8/5KQ1/8/8/8/8/r7 w - - 0 1';
  const game = new Chess(fen);
  const mate = game.moves({verbose:true}).find(move=>move.san.endsWith('#') && !move.captured);
  assert.ok(mate);
  let calls = 0;
  assert.deepEqual(await generateProblems(fen, async () => {
    assert.equal(++calls, 1);
    return {category:'win', dtm:1, moves:[{uci:mate.from+mate.to,category:'loss',dtm:0,checkmate:true}]};
  }), [game.fen()]);
});

test('DTZ fallback preserves API ordering and excludes drawing moves', () => {
  const fen = '7k/5P2/5K2/8/8/8/8/8 w - - 0 1';
  const moves = [
    {uci:'f7f8q', category:'loss', dtz:-20, zeroing:true},
    {uci:'f6e6', category:'loss', dtz:-2},
    {uci:'f7f8n', category:'draw', dtz:0}
  ];
  assert.equal(randomOptimalMove(fen, {moves}, true, () => .99), 'f7f8q');
  assert.equal(randomOptimalMove(fen, {moves:moves.map(m=>({...m,category:m.category === 'loss' ? 'win' : 'draw'}))}, false), 'f7f8q');
});

test('a losing side to move is defended before saving winning-side problems', async () => {
  const fen = '8/3R4/k7/2K5/8/8/8/8 b - - 0 1';
  const game = new Chess(fen);
  game.move('Ka5');
  const winningFen = game.fen();
  const mate = game.moves({ verbose: true }).find(move => move.san.endsWith('#'));
  assert.ok(mate);
  const results = await generateProblems(fen, async current => current === winningFen ? {
    category: 'win', precise_dtz: 1,
    moves: [{ uci: mate.from + mate.to, category: 'loss', checkmate: true }]
  } : {
    category: 'loss', precise_dtz: -2,
    moves: [{ uci: 'a6a5', category: 'win', precise_dtz: 1 }]
  });
  assert.deepEqual(results, [winningFen]);
});
