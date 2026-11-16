import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from './vendor/chess.js';
import { cacheFilename, parseProblemCache, compactProblemCache, serializeProblemCache } from './problem-cache.js';
import { parseCatalog } from './catalog.js';
import { isPromotionProblem, isRookCaptureProblem, defenseMove, mateDistance, holdsDraw } from './trainer.js';
import { isPawnEndgame } from './milestones.js';
import { optimalMoves } from './generator.js';
async function readCache(entry) {
  try { return JSON.parse(await readFile(new URL('./problem-cache/'+cacheFilename(entry.name,entry.problemIndex,entry.goal), import.meta.url))); }
  catch(error) { if(error.code === 'ENOENT') return null; throw error; }
}

test('compacting every cache preserves accepted moves, replies, distances and metadata', async () => {
  const catalog = parseCatalog(JSON.parse(await readFile(new URL('./problems.json', import.meta.url))));
  const scored = (fen, data, winning) => {
    try { return optimalMoves(fen, data, winning); } catch (error) { return error.message; }
  };
  for (const entry of catalog.flatMap(group => group.fens.map((fen, problemIndex) => ({...group, fen, problemIndex})))) {
    const original = await readCache(entry);
    if (!original) continue;
    const compact = compactProblemCache(original);
    parseProblemCache(compact, entry);
    assert.deepEqual(compact.positions, original.positions);
    assert.equal(compact.requests, original.requests);
    assert.equal(compact.createdAt, original.createdAt);
    for (const [fen, data] of Object.entries(original.probes)) {
      const reduced = compact.probes[fen];
      assert.deepEqual(mateDistance(fen, reduced), mateDistance(fen, data));
      assert.deepEqual(scored(fen, reduced, true), scored(fen, data, true));
      assert.deepEqual(scored(fen, reduced, false), scored(fen, data, false));
      if (data.moves.length) assert.equal(defenseMove(reduced), defenseMove(data));
    }
    assert.equal(serializeProblemCache(compact), serializeProblemCache(original));
    assert.ok(serializeProblemCache(compact).length <= JSON.stringify(original).length + 1);
  }
});

test('compaction removes unused fields and slower moves without hiding missing distances', () => {
  const fen = '7k/5P2/5K2/8/8/8/P7/8 w - - 0 1';
  const data = {probes:{[fen]:{category:'win', dtm:null, dtz:1, dtw:null, stalemate:false, moves:[
    {uci:'f7f8q', san:'f8=Q+', category:'loss', dtm:-20, dtz:-2, zeroing:true, conversion:true},
    {uci:'f6e6', category:'loss', dtm:-30, dtz:-4, zeroing:false},
    {uci:'f7f8r', category:'loss', dtm:null, dtz:-2, zeroing:true}
  ]}}};
  const reduced = compactProblemCache(data).probes[fen];
  assert.deepEqual(reduced.moves.map(move=>move.uci), ['f7f8q', 'f7f8r']);
  assert.equal('san' in reduced.moves[0], false);
  assert.equal('dtm' in reduced, false);
  assert.deepEqual(optimalMoves(fen, reduced, true), optimalMoves(fen, data.probes[fen], true));
});

test('cache filenames cannot escape the cache directory', () => {
  assert.equal(cacheFilename('KRK'), 'krk.json');
  assert.equal(cacheFilename('KBBK', 1), 'kbbk-2.json');
  assert.throws(() => cacheFilename('KBBK', -1));
  for (const name of ['../krk', 'a/b', 'a\\b', '']) assert.throws(() => cacheFilename(name));
});

test('cache rejects stale seeds and missing winning analyses', async () => {
  const data = JSON.parse(await readFile(new URL('./problem-cache/krk.json', import.meta.url)));
  const entry = {name:data.name, fen:data.seed};
  assert.equal(parseProblemCache(data, entry).requests, data.requests);
  assert.throws(() => parseProblemCache(data, {...entry, fen:'different'}));
  assert.throws(() => parseProblemCache({...data, probes:{}}, entry));
});

test('pawn ending cache rejects the previous mate-only goal and promoted subproblems', async () => {
  const data = JSON.parse(await readFile(new URL('./problem-cache/kpppkpp.json', import.meta.url)));
  const entry = {name:data.name, fen:data.seed};
  assert.equal(parseProblemCache(data, entry).goal, 'promotion-or-mate');
  assert.throws(() => parseProblemCache({...data, goal:'mate'}, entry));
  assert.throws(() => parseProblemCache({...data, positions:[...data.positions, '7k/8/8/8/8/8/1Q6/K7 w - - 0 1']}, entry));
});

test('existing cache files match their catalog seed and goal', async () => {
  const catalog = parseCatalog(JSON.parse(await readFile(new URL('./problems.json', import.meta.url))));
  for (const entry of catalog.flatMap(group => group.fens.map((fen, problemIndex) => ({...group, fen, problemIndex})))) {
    const stored = await readCache(entry);
    if (!stored) continue;
    const data = parseProblemCache(stored, entry);
    assert.ok(data.requests >= Object.keys(data.probes).length);
    const game = new Chess(data.positions.at(-1));
    assert.ok(game.moves({verbose:true}).some(move => (entry.goal === 'draw' && data.probes[game.fen()].moves.some(move => holdsDraw(move.category))) || move.san.endsWith('#') || ((isPromotionProblem(entry.fen) || isPawnEndgame(entry.fen)) && move.promotion) || (isRookCaptureProblem(entry.fen) && move.captured === 'r')), `${entry.name}: easiest must reach the goal in one move`);
    for (const [fen, response] of Object.entries(data.probes)) {
      const board = new Chess(fen);
      const legal = new Set(board.moves({verbose:true}).map(move => move.from + move.to + (move.promotion ?? '')));
      for (const move of response.moves) assert.ok(legal.has(move.uci), `${entry.name}: illegal cached move ${move.uci}`);
    }
  }
});
