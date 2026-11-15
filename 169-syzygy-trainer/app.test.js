import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from './vendor/chess.js';
import { isPromotionProblem, isRookCaptureProblem } from './trainer.js';
import { createProblemCache } from './problem-cache.js';
import { isPawnEndgame } from './milestones.js';

test('all file caches start offline and a mate lights Next without tablebase calls', async () => {
  class Element {
    constructor() {
      this.children = []; this.events = {}; this.attributes = {}; this.textContent = ''; this.value = '0'; this.checked = true;
      const classes = new Set();
      this.classList = {add:name=>classes.add(name), toggle:(name,on)=>on ? classes.add(name) : classes.delete(name), contains:name=>classes.has(name)};
    }
    replaceChildren(...children) { this.children = children; }
    append(child) { this.children.push(child); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(key, callback) { this.events[key] = callback; }
  }
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const originals = {document:globalThis.document, Option:globalThis.Option, fetch:globalThis.fetch, localStorage:globalThis.localStorage, setInterval:globalThis.setInterval, window:globalThis.window, performance:globalThis.performance};
  let now = 0, tick;
  globalThis.performance = {now:()=>now};
  const stageSeed = '7k/8/5P2/4K3/8/8/P7/8 w - - 0 1';
  const stageGame = new Chess(stageSeed), stageProbes = new Map(), stagePositions = [];
  for (const [index, uci] of ['f6f7', 'h8h7', 'f7f8q'].entries()) {
    const fen = stageGame.fen();
    if (stageGame.turn() === 'w') stagePositions.push(fen);
    stageGame.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]});
    stageProbes.set(fen, {category:index % 2 ? 'loss' : 'win', dtz:index % 2 ? -2 : 1,
      moves:[{uci, category:index % 2 ? 'win' : 'loss', dtz:index % 2 ? 1 : -2, checkmate:stageGame.isCheckmate()}]});
  }
  const slowStage = new Chess(stageSeed);
  for (const [index, uci] of ['e5d5', 'h8h7', 'd5e5', 'h7h8', 'f6f7', 'h8h7', 'f7f8q'].entries()) {
    const fen = slowStage.fen();
    slowStage.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]});
    if (!stageProbes.has(fen)) stageProbes.set(fen, {category:index % 2 ? 'loss' : 'win', dtz:index % 2 ? -2 : 1,
      moves:[{uci, category:index % 2 ? 'win' : 'loss', dtz:index % 2 ? 1 : -2}]});
  }
  const stageCache = createProblemCache({name:'PAWNSTAGES', fen:stageSeed}, stagePositions, stageProbes, stageProbes.size);
  const progressSeed = '7k/5p2/8/8/8/P7/1P6/2K5 w - - 0 1';
  const progressGame = new Chess(progressSeed), progressProbes = new Map(), progressPositions = [];
  const progressLine = ['a3a4', 'h8h7', 'a4a5', 'h7h8', 'a5a6', 'h8h7', 'a6a7', 'h7h8', 'a7a8q'];
  for (const [index, uci] of progressLine.entries()) {
    const fen = progressGame.fen();
    if (progressGame.turn() === 'w') progressPositions.push(fen);
    progressGame.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]});
    progressProbes.set(fen, {category:index % 2 ? 'loss' : 'win', dtz:index % 2 ? -2 : 1,
      moves:[{uci, category:index % 2 ? 'win' : 'loss', dtz:index % 2 ? 1 : -2}]});
  }
  // A second equally good move reaches a different board than the stored
  // continuation and has no cached reply. It must still be accepted.
  progressProbes.get(progressPositions[1]).moves.push({uci:'b2b3',category:'loss',dtz:-2});
  const progressCache = createProblemCache({name:'PROGRESS', fen:progressSeed}, progressPositions, progressProbes, 9);
  let networkCalls = 0, allowAnalysis = false;
  globalThis.document = {getElementById:element, createElement:()=>new Element()};
  globalThis.Option = class extends Element { constructor(text, value) { super(); this.textContent = text; this.value = value; } };
  const storage = new Map();
  globalThis.localStorage = {getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,value)};
  globalThis.setInterval = callback => { tick = callback; return 0; };
  globalThis.window = {prompt:()=>'n'};
  globalThis.fetch = async url => {
    if (url.startsWith('https:')) {
      networkCalls++;
      if (allowAnalysis) return Response.json(progressProbes.get(new URL(url).searchParams.get('fen')));
      throw new Error('Offline');
    }
    if (url === './problem-cache/pawnstages.json') return Response.json(stageCache);
    if (url === './problem-cache/progress.json') return Response.json(progressCache);
    if (url === './problems.json') {
      const catalog = JSON.parse(await readFile(new URL(url, import.meta.url)));
      return Response.json({...catalog, PAWNSTAGES:stageSeed, PROGRESS:progressSeed});
    }
    return new Response(await readFile(new URL(url, import.meta.url)));
  };
  try {
    await import('./app.js');
    const catalog = JSON.parse(await readFile(new URL('./problems.json', import.meta.url)));
    for (const [index, name] of Object.keys(catalog).entries()) {
      element('problem-set').value = index;
      await element('problem-set').events.change();
      assert.match(element('generation-status').textContent, /cachade delproblem/);
      assert.match(element('position-label').textContent, /^Delproblem 1 av/);
      assert.match(element('request-count').textContent, /denna session: 0/);
      assert.equal(element('elapsed').textContent, '0:00');
      assert.ok(!element('harder').classList.contains('next-ready'));
      assert.equal(element('hint').disabled, false);
      await element('hint').events.click();
      assert.match(element('status').textContent, /^Hint: .+\(.+ → .+\)/);
      assert.equal(element('remaining').textContent, 1);
      assert.equal(element('game-result').hidden, true);
      assert.equal(element('board').children.filter(child=>child.classList.contains('hint-from')).length, 1);
      assert.equal(element('board').children.filter(child=>child.classList.contains('hint-to')).length, 1);
      assert.equal(element('hint').attributes['aria-pressed'], 'true');
      await element('hint').events.click();
      assert.equal(element('hint').attributes['aria-pressed'], 'false');
      assert.doesNotMatch(element('status').textContent, /^Hint:/);
      assert.equal(element('board').children.some(child=>child.classList.contains('hint-from') || child.classList.contains('hint-to')), false);
      assert.equal(element('remaining').textContent, 1);
      await element('hint').events.click();
      assert.match(element('status').textContent, /^Hint:/);
      const stored = JSON.parse(await readFile(new URL(`./problem-cache/${name.toLowerCase()}.json`, import.meta.url)));
      const game = new Chess(stored.positions.at(-1));
      assert.equal(new URL(element('syzygy-external').href).hostname, 'syzygy-tables.info');
      assert.equal(new URL(element('syzygy-external').href).searchParams.get('fen'), game.fen());
      assert.equal(element('syzygy').attributes['aria-expanded'], 'false');
      const promotion = isPromotionProblem(stored.seed) || isPawnEndgame(stored.seed);
      const capture = isRookCaptureProblem(stored.seed);
      const mate = game.moves({verbose:true}).find(move=>promotion ? move.promotion === 'n' : capture ? move.captured === 'r' || move.san.endsWith('#') : move.san.endsWith('#'));
      const square = name => element('board').children.find(child=>child.attributes['aria-label'].startsWith(name));
      await square(mate.from).events.click();
      await square(mate.to).events.click();
      game.move(mate);
      assert.equal(new URL(element('syzygy-external').href).searchParams.get('fen'), game.fen());
      assert.equal(element('game-result').hidden, false);
      assert.equal(element('hint').disabled, true);
      assert.equal(element('board').children.some(child=>child.classList.contains('hint-from') || child.classList.contains('hint-to')), false);
      assert.match(element('result-title').textContent, capture && mate.captured === 'r' ? /Tornet slaget.*löst/ : promotion ? /Promovering.*löst/ : /du vann/);
      assert.ok(element('harder').classList.contains('next-ready'));
    }
    // Quiet pawn moves continue the game; promotion ends it before any
    // reply or request for a position containing the new queen.
    element('problem-set').value = Object.keys(catalog).length;
    await element('problem-set').events.change();
    element('problem').value = 0;
    element('problem').events.change({target:{value:'0'}});
    await Promise.resolve();
    const click = async name => element('board').children.find(child=>child.attributes['aria-label'].startsWith(name)).events.click();
    globalThis.window.prompt = ()=>'q';
    now = 5000; tick();
    await click('f6'); await click('f7');
    assert.equal(element('game-result').hidden, true);
    assert.equal(element('milestone-list').children.length, 0);
    now = 12000; tick();
    await click('f7'); await click('f8');
    assert.equal(element('game-result').hidden, false);
    assert.equal(element('milestone-panel').hidden, false);
    assert.match(element('milestone-notice').textContent, /Slutmål nått: Promovering/);
    assert.equal(element('milestone-list').children.length, 1);
    assert.match(element('milestone-list').children[0].textContent, /Etapp: 2 drag, 0:12/);
    assert.equal(element('harder').classList.contains('next-ready'), true);
    now = 15000; tick();
    assert.equal(element('elapsed').textContent, '0:12');
    now = 20000; tick();
    await click('f8'); await click('e8');
    assert.equal(element('game-result').hidden, false);
    assert.match(element('result-title').textContent, /Promovering.*löst/);
    assert.equal(element('milestone-list').children.length, 1);
    assert.equal(element('remaining').textContent, 0);
    now = 30000; tick();
    assert.equal(element('elapsed').textContent, '0:12');
    element('repeat-continuation').checked = true;
    element('repeat-continuation').events.change();
    element('same').events.click(); await Promise.resolve();
    for (const [index, [from, to]] of [['e5','d5'], ['d5','e5'], ['f6','f7'], ['f7','f8']].entries()) {
      await click(from); await click(to);
      assert.equal(element('remaining').textContent, 1 - index);
    }
    assert.equal(element('remaining').textContent, -2);
    assert.equal(element('game-result').hidden, false);
    element('repeat-continuation').checked = false;
    element('repeat-continuation').events.change();
    element('same').events.click();
    await Promise.resolve();
    assert.equal(element('milestone-list').children.length, 0);
    assert.equal(element('elapsed').textContent, '0:00');
    // Solve one move to promotion, then add one learned move at a time.
    element('problem-set').value = Object.keys(catalog).length + 1;
    await element('problem-set').events.change();
    for (let level = 1; level <= 5; level++) {
      assert.equal(element('game-result').hidden, true);
      const start = new Chess(progressPositions[5 - level]);
      const uci = level === 4 ? 'b2b3' : progressProbes.get(start.fen()).moves[0].uci;
      now += 2000; tick();
      await click(uci.slice(0,2)); await click(uci.slice(2,4));
      assert.equal(element('remaining').textContent, 0);
      assert.equal(element('game-result').hidden, false);
      assert.match(element('result-title').textContent, level === 1 ? /Promovering/ : /fortsättningen är redan avklarad/);
      assert.equal(element('harder').classList.contains('next-ready'), true);
      assert.equal(element('harder').disabled, false);
      now += 1000; tick();
      assert.equal(element('elapsed').textContent, '0:02');
      if (level < 5) { element('harder').events.click(); await Promise.resolve(); }
    }
    // Repeat keeps the learned suffix but never auto-completes at start.
    element('same').events.click(); await Promise.resolve();
    assert.equal(element('game-result').hidden, true);
    await click('a3'); await click('a4');
    assert.match(element('result-title').textContent, /fortsättningen är redan avklarad/);
    // Next stays lit on the final solved level and wraps to the first set.
    assert.match(element('harder').title, /KQK/);
    await element('harder').events.click();
    assert.equal(Number(element('problem-set').value), 0);
    assert.match(element('source').textContent, /^KQK/);
    assert.match(element('position-label').textContent, /^Delproblem 1 av/);
    assert.equal(element('game-result').hidden, true);
    element('problem-set').value = Object.keys(catalog).length + 1;
    // Reloading the same variant restores completed levels.
    await element('problem-set').events.change();
    element('problem').events.change({target:{value:'1'}}); await Promise.resolve();
    await click('a4'); await click('a5');
    assert.equal(element('game-result').hidden, false);
    assert.match(element('result-title').textContent, /fortsättningen är redan avklarad/);
    // Repetition disables both the first-move shortcut and recognition
    // of an already learned board later in the continuation.
    element('repeat-continuation').checked = true;
    element('repeat-continuation').events.change(); await Promise.resolve();
    assert.equal(storage.get('syzygy:repeat-continuation'), 'true');
    assert.equal(element('game-result').hidden, true);
    assert.equal(element('remaining').textContent, 4);
    for (let rank = 4; rank <= 7; rank++) {
      await click(`a${rank}`); await click(`a${rank + 1}`);
      assert.equal(element('remaining').textContent, 7 - rank);
      assert.equal(element('game-result').hidden, rank < 7);
    }
    assert.equal(element('remaining').textContent, 0);
    assert.match(element('result-title').textContent, /Promovering/);
    element('problem').events.change({target:{value:'0'}}); await Promise.resolve();
    assert.equal(element('remaining').textContent, 5);
    for (let rank = 3; rank <= 7; rank++) {
      await click(`a${rank}`); await click(`a${rank + 1}`);
      assert.equal(element('remaining').textContent, 7 - rank);
    }
    element('problem').events.change({target:{value:'1'}}); await Promise.resolve();
    element('repeat-continuation').checked = false;
    element('repeat-continuation').events.change();
    assert.equal(storage.get('syzygy:repeat-continuation'), 'false');
    element('same').events.click(); await Promise.resolve();
    await click('a4'); await click('a5');
    assert.equal(element('remaining').textContent, 0);
    assert.match(element('result-title').textContent, /fortsättningen är redan avklarad/);
    // Without a saved solved level, jumping ahead does not grant credit.
    storage.delete('syzygy-progress:PROGRESS');
    await element('problem-set').events.change();
    element('problem').events.change({target:{value:'1'}}); await Promise.resolve();
    await click('a4'); await click('a5');
    assert.equal(element('game-result').hidden, true);
    assert.equal(element('harder').classList.contains('next-ready'), false);
    assert.equal(networkCalls, 0);
    allowAnalysis = true;
    const played = element('remaining').textContent;
    const history = element('history').textContent;
    await element('syzygy').events.click();
    assert.equal(element('analysis-panel').hidden, false);
    assert.equal(element('syzygy').attributes['aria-expanded'], 'true');
    assert.equal(networkCalls, 1); // Full analysis is fetched despite compact cached training data.
    assert.equal(element('remaining').textContent, played);
    assert.equal(element('history').textContent, history);
    await element('syzygy').events.click();
    assert.equal(element('analysis-panel').hidden, true);
    await element('syzygy').events.click();
    assert.equal(networkCalls, 1); // Reopening reuses the full response.
    await element('syzygy').events.click();
    // The regeneration button bypasses stored variants, generates from the
    // seed, saves the result locally and starts with the easiest problem.
    element('problem-set').value = Object.keys(catalog).length;
    await element('problem-set').events.change();
    await element('regenerate').events.click();
    assert.equal(element('regenerate').disabled, false);
    assert.match(element('generation-status').textContent, /2 delproblem klara/);
    assert.match(element('position-label').textContent, /^Delproblem 1 av 2/);
    const regenerated = JSON.parse(storage.get('syzygy:PAWNSTAGES'));
    assert.equal(regenerated.seed, stageSeed);
    assert.deepEqual(regenerated.positions, stagePositions);
    assert.equal(regenerated.requests, 0);
    assert.equal(networkCalls, 1);
  } finally { Object.assign(globalThis, originals); }
});
