import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCatalog, problemLabel } from './catalog.js';

test('user catalog exposes KQK and KRK with the original starting positions', async () => {
  const source = JSON.parse(await readFile(new URL('./problems.json', import.meta.url)));
  const catalog = parseCatalog(source);
  assert.deepEqual(catalog.map(entry => entry.name), Object.keys(source));
  assert.equal(catalog[1].fen, '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1');
  assert.match(problemLabel(catalog[0].name), /dam/);
  assert.match(problemLabel(catalog[1].name), /torn/);
  assert.equal(problemLabel('Annat'), 'Annat');
});

test('catalog rejects empty data, arrays and invalid FEN with the problem name', () => {
  for (const value of [null, [], {}, 'KQK']) assert.throws(() => parseCatalog(value));
  assert.throws(() => parseCatalog({ KRK: 'invalid' }), /KRK:/);
});
