const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const T = require('./tournament.js');
const fixture = () => T.load(JSON.parse(fs.readFileSync('turnering.json', 'utf8')));
test('läser exempelfilen och normaliserar resultatnyckeln utan att ändra lottningen', () => {
  const data = fixture();
  assert.equal(data.ronder[0].resultat.A, '1r01r0');
  assert.equal(data.ronder[0].resultat.B, '      ');
  assert.equal(data.ronder[0]['resultat:'], undefined);
  assert.deepEqual(T.rows(data, 1)[0], {group:'A', index:0, white:1, black:12, result:'1'});
  assert.equal(T.pending(data, 1).length, 14);
});
test('lottar sekventiellt, bevarar alla möten och spärrar nästa rond vid ospelat', () => {
  const data = fixture();
  const original = JSON.stringify(data.ronder.map(r => r.lottning));
  assert.equal(T.draw(data), 1);
  assert.throws(() => T.draw(data), /resultat/);
  for (let round = 1; round <= 11; round++) {
    T.rows(data, round).forEach((_, index) => T.setResult(data, round, index, ['0','r','1'][index % 3]));
    if (round < 11) assert.equal(T.draw(data), round + 1);
  }
  assert.throws(() => T.draw(data), /Alla ronder/);
  assert.equal(JSON.stringify(data.ronder.map(r => r.lottning)), original);
  const reloaded = T.load(JSON.parse(T.serialize(data)));
  assert.deepEqual(reloaded, data);
});
test('mellanslag rensar ett resultat och export bevarar slutmellanslag', () => {
  const data = fixture(); T.draw(data);
  T.setResult(data, 1, 0, ' ');
  assert.equal(data.ronder[0].resultat.A, ' r01r0');
  assert.equal(JSON.parse(T.serialize(data)).ronder[0].resultat.B, '      ');
  assert.throws(() => T.setResult(data, 1, 0, '2'), /Ogiltigt/);
  assert.throws(() => T.setResult(data, 2, 0, '1'), /först/);
});
test('avslut räknar avhopp men inte personliga frironder', () => {
  const data = fixture();
  data['personliga-frironder'] = data.spelare.map(p => ({spelare:p.id, ronder:[1]}));
  assert.equal(T.draw(data), 1);
  const other = fixture();
  other.avhopp = other.spelare.slice(10).map(p => ({spelare:p.id, rond:1}));
  assert.throws(() => T.draw(other), /avslutad/);
});
test('avvisar okända eller dubblerade spelare och felaktiga resultat', () => {
  const raw = () => JSON.parse(fs.readFileSync('turnering.json', 'utf8'));
  let data = raw(); data.ronder[0].lottning.A[0][0] = 999;
  assert.throws(() => T.load(data), /spelare/);
  data = raw(); data.ronder[0]['resultat:'].A = '123456';
  assert.throws(() => T.load(data), /Resultat/);
});
