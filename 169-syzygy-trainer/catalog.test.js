import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCatalog, problemLabel, chooseProblem } from './catalog.js';

test('user catalog exposes KQK and KRK with the original starting positions', async () => {
  const source = JSON.parse(await readFile(new URL('./problems.json', import.meta.url)));
  const catalog = parseCatalog(source);
  const names = source.winning || source.drawing ? [...Object.keys(source.winning ?? {}), ...Object.keys(source.drawing ?? {})] : Object.keys(source);
  assert.deepEqual(catalog.map(entry => entry.name), names);
  assert.equal(catalog[0].goal, 'win');
  assert.equal(catalog[1].fen, '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1');
  assert.match(problemLabel(catalog[0].name), /dam/);
  assert.match(problemLabel(catalog[1].name), /torn/);
  assert.equal(problemLabel('Annat'), 'Annat');
});

test('grouped catalogs preserve goals even when material names overlap', () => {
  const fen = '8/8/8/8/4k3/8/1Q6/K7 w - - 0 1';
  const entries = parseCatalog({winning:{Same:[fen]}, drawing:{Same:[fen]}});
  assert.deepEqual(entries.map(entry=>entry.goal), ['win', 'draw']);
  for (const value of [{winning:[]}, {drawing:null}, {winning:{}, drawing:{}}, {winning:{}, invalid:{}}]) assert.throws(()=>parseCatalog(value));
});

test('multiple starting positions are validated and randomly selectable', () => {
  const fens = ['8/8/8/8/4k3/8/1Q6/K7 w - - 0 1', '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1'];
  const [entry] = parseCatalog({Mixed:fens});
  assert.deepEqual(entry.fens, fens);
  assert.equal(chooseProblem(entry, () => 0).fen, fens[0]);
  assert.equal(chooseProblem(entry, () => .999).fen, fens[1]);
  assert.equal(chooseProblem(entry, () => .999).problemIndex, 1);
  for (const values of [[], [fens[0], 'invalid'], [null], [42]]) assert.throws(() => parseCatalog({Mixed:values}), /Mixed:/);
  assert.deepEqual(parseCatalog({Old:fens[0]})[0].fens, [fens[0]]);
});

test('catalog rejects empty data, arrays and invalid FEN with the problem name', () => {
  for (const value of [null, [], {}, 'KQK']) assert.throws(() => parseCatalog(value));
  assert.throws(() => parseCatalog({ KRK: 'invalid' }), /KRK:/);
});
