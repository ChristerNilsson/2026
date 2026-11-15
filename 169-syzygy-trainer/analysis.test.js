import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from './vendor/chess.js';
import { AnalysisBoard, distanceForWhite, outcomeForWhite } from './analysis.js';

function harness(probe, prompt = () => 'q') {
  class Element {
    constructor() { this.children = []; this.events = {}; this.attributes = {}; const classes = new Set(); this.classList = {add:name=>classes.add(name), contains:name=>classes.has(name)}; }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(key, handler) { this.events[key] = handler; }
  }
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const document = {getElementById:$, createElement:()=>new Element()};
  return {analysis:new AnalysisBoard({probe, document, prompt}), $};
}

function response(fen) {
  const game = new Chess(fen);
  return {category:game.turn() === 'w' ? 'win' : 'loss', dtm:game.turn() === 'w' ? 13 : -12, precise_dtz:game.turn() === 'w' ? 5 : -4,
    moves:game.moves({verbose:true}).map(move=>({uci:move.from+move.to+(move.promotion ?? ''), category:game.turn() === 'w' ? 'loss' : 'win', dtm:game.turn() === 'w' ? -12 : 11, precise_dtz:game.turn() === 'w' ? -4 : 3}))};
}

test('distance signs and outcomes use a stable white perspective, missing DTM stays missing', () => {
  assert.equal(distanceForWhite(-12, 'b'), '+12');
  assert.equal(distanceForWhite(12, 'b'), '-12');
  assert.equal(distanceForWhite(null, 'w'), '—');
  assert.equal(distanceForWhite(undefined, 'w'), '—');
  assert.equal(distanceForWhite(0, 'b'), '0');
  assert.equal(distanceForWhite(17, 'w', true), '≈ +17');
  assert.equal(outcomeForWhite('loss', 'b'), 'Vit vinner');
  assert.equal(outcomeForWhite('win', 'b'), 'Svart vinner');
  assert.match(outcomeForWhite('cursed-win', 'w'), /Remi.*50/);
});

test('toggle, both-side exploration, all move rows, undo/redo, reset and promotion leave the training position untouched', async () => {
  const seed = '8/8/8/8/8/3k4/2R5/1K6 w - - 0 1';
  const calls = [];
  const {analysis, $} = harness(async fen=>{calls.push(fen); return response(fen);});
  analysis.updateTraining(seed, false);
  assert.equal(calls.length, 0);
  await analysis.toggle();
  assert.equal($('analysis-panel').hidden, false);
  assert.equal($('analysis-moves').children.length, new Chess(seed).moves().length);
  assert.equal($('analysis-dtz').textContent, '+5');
  assert.equal($('analysis-dtm').textContent, '+13');
  const initialRecommendation = $('analysis-recommendation').textContent;
  assert.match(initialRecommendation, /Rekommenderat:/);
  const move = analysis.data.moves[1].uci;
  // Any row, not only the recommendation, can be played.
  await $('analysis-moves').children[1].children[0].children[0].events.click();
  assert.equal(analysis.game.history().length, 1);
  assert.equal(analysis.game.turn(), 'b');
  assert.equal(analysis.trainingFen, seed);
  assert.equal($('analysis-dtm').textContent, '+12');
  assert.equal($('analysis-moves').children[0].children[3].textContent, '+11');
  await $('analysis-best').events.click();
  assert.equal(analysis.game.history().length, 2);
  assert.equal(analysis.game.turn(), 'w');
  await $('analysis-undo').events.click();
  assert.equal(analysis.game.history().length, 1);
  await $('analysis-redo').events.click();
  assert.equal(analysis.game.history().length, 2);
  await $('analysis-undo').events.click();
  await $('analysis-undo').events.click();
  assert.equal(analysis.game.fen(), seed);
  await analysis.squareClick(move.slice(0,2)); await analysis.squareClick(move.slice(2,4));
  assert.equal(analysis.game.history().length, 1);
  await $('analysis-reset').events.click();
  assert.equal(analysis.game.fen(), seed);
  await analysis.toggle();
  assert.equal($('analysis-panel').hidden, true);
  const before = calls.length;
  await analysis.updateTraining('7k/5P2/5K2/8/8/8/8/8 w - - 0 1', false);
  assert.equal(calls.length, before);
  await analysis.toggle();
  await analysis.squareClick('f7'); await analysis.squareClick('f8');
  assert.equal(analysis.game.get('f8').type, 'q');
  assert.equal(analysis.game.turn(), 'b'); // Analysis continues beyond training's promotion goal.
  assert.equal(analysis.game.isGameOver(), false);
});

test('stale responses and hidden requests cannot replace a newer analysis', async () => {
  const pending = [];
  const {analysis, $} = harness((fen, signal)=>new Promise(resolve=>pending.push({fen, signal, resolve})));
  analysis.updateTraining('8/8/8/8/8/3k4/2R5/1K6 w - - 0 1', false);
  const first = analysis.toggle();
  const uci = response(analysis.game.fen()).moves[0].uci;
  const second = analysis.playUci(uci);
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve(response(pending[1].fen)); await second;
  const expected = $('analysis-turn').textContent;
  pending[0].resolve(response(pending[0].fen)); await first;
  assert.equal($('analysis-turn').textContent, expected);
  assert.equal(analysis.game.fen(), pending[1].fen);
  const third = analysis.refresh();
  await analysis.toggle();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve(response(pending[2].fen)); await third;
  assert.equal($('analysis-panel').hidden, true);
});

test('errors can be retried, absent DTM is explicit, and mate needs no network call', async () => {
  let calls = 0;
  const {analysis, $} = harness(async fen=>{
    if (++calls === 1) throw new Error('Tjänsten är upptagen');
    return {...response(fen), dtm:null};
  });
  analysis.updateTraining('8/8/8/8/8/3k4/2R5/1K6 w - - 0 1', false);
  await analysis.toggle();
  assert.match($('analysis-status').textContent, /upptagen/);
  assert.equal($('analysis-retry').hidden, false);
  await $('analysis-retry').events.click();
  assert.equal($('analysis-retry').hidden, true);
  assert.equal($('analysis-dtm').textContent, '—');
  await analysis.updateTraining('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1', false);
  assert.equal(calls, 2);
  assert.equal($('analysis-status').textContent, 'Schackmatt.');
  assert.equal($('analysis-dtm').textContent, '0');
  assert.equal($('analysis-best').disabled, true);
});
