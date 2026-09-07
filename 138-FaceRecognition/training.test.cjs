const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(`${__dirname}/index.html`, 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1].replace(/start\(\);\s*$/, '');
const people = ['Anna', 'Bo'].map(name => ({ name, image: `${name}.jpg` }));
const largeRoster = Array.from({ length: 12 }, (_, i) => ({ name: `Person${i}`, image: `${i}.jpg` }));

async function app(saved, roster = people, random = () => 0) {
  const elements = new Map();
  function element() {
    return {
      hidden: false, value: '', children: [], dataset: {},
      classList: { add() {}, contains() { return false; } },
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); },
      contains(child) { return this.children.includes(child); },
      listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      click() { this.listeners.click?.(); },
      setAttribute() {}, focus() {}, scrollIntoView() {}
    };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element, addEventListener() {},
    querySelectorAll() { return this.getElementById('imageGrid').children; }
  };
  let storage = saved;
  const context = vm.createContext({ document,
    Math: Object.assign(Object.create(Math), { random }),
    localStorage: {
      getItem: () => storage,
      setItem: (_, value) => { storage = value; },
      removeItem(key) { assert.equal(key, 'nameTrainerMemory'); storage = null; }
    },
    fetch: async () => ({ ok: true, json: async () => roster })
  });
  const run = code => vm.runInContext(code, context);
  run(script);
  // Most tests keep shuffles stable; round tests exercise the real shuffle.
  if (random.stableShuffle !== false) run('shuffle = items => [...items]');
  await run('start()');
  run('startTraining()');
  return { run, document, saved: () => storage,
    correct() {
      run(`if (questionType === 'nameToImage') {
        chooseImage(currentPerson, document.getElementById('imageGrid').children.find(b => b.dataset.name === currentPerson.name));
      } else {
        document.getElementById('answer').value = currentPerson.name;
        checkAnswer();
      }`);
    }
  };
}

test('FIFO gives every person TB BT TB BT and finishes after eight answers', async () => {
  const a = await app();
  for (const type of ['nameToImage', 'imageToName', 'nameToImage', 'imageToName']) {
    for (const person of people) {
      assert.equal(a.run('currentPerson.name'), person.name);
      assert.equal(a.run('questionType'), type);
      a.correct();
    }
  }
  assert.equal(a.run('questionQueue.length'), 0);
  assert.equal(a.run('totalCorrect'), 8);
  assert.equal(a.run('trainingStarted'), false);
  assert.equal(a.document.getElementById('photo').hidden, true);
  a.run('checkAnswer(); showAnswer();');
  assert.equal(a.run('totalWrong'), 0);
  const resumed = await app(a.saved());
  assert.equal(resumed.run('currentPerson'), null);
});

test('wrong image, wrong text and reveal reset progress without duplicate queue entries', async () => {
  const a = await app(undefined, [people[0]]);
  a.correct();
  a.run(`document.getElementById('answer').value = 'wrong'; checkAnswer();`);
  assert.equal(a.run('memory.Anna.masteryStep'), 0);
  a.run('checkAnswer()');
  assert.equal(a.run('questionType'), 'nameToImage');
  a.run(`chooseImage({name: 'wrong'}, document.getElementById('imageGrid').children[0]);`);
  assert.equal(a.run('memory.Anna.masteryStep'), 0);
  a.run('checkAnswer()');
  a.correct();
  a.run('showAnswer(); showAnswer();');
  assert.equal(a.run('memory.Anna.masteryStep'), 0);
  assert.equal(a.run('totalWrong'), 3);
  assert.equal(a.run('questionQueue.length'), 1);
  a.run('checkAnswer()');
  for (let i = 0; i < 4; i++) a.correct();
  assert.equal(a.run('currentPerson'), null);
});

test('reload preserves pending question, queue order and per-person progress', async () => {
  const a = await app();
  a.correct();
  const b = await app(a.saved());
  assert.equal(b.run('currentPerson.name'), 'Bo');
  assert.equal(b.run('questionType'), 'nameToImage');
  b.correct();
  assert.equal(b.run('currentPerson.name'), 'Anna');
  assert.equal(b.run('questionType'), 'imageToName');
});

test('legacy totals survive but old streak does not establish mastery', async () => {
  for (const saved of [
    { Anna: { correct: 8, wrong: 2, streak: 8, score: 6 } },
    { version: 2, people: { Anna: { correct: 8, wrong: 2, streak: 8, score: 6 } }, totals: { correct: 8, wrong: 2 } }
  ]) {
    const a = await app(JSON.stringify(saved));
    assert.equal(a.run('totalCorrect'), 8);
    assert.equal(a.run('totalWrong'), 2);
    assert.equal(a.run('memory.Anna.masteryStep'), 0);
    assert.equal(a.run('questionType'), 'nameToImage');
  }
});

test('changed roster removes obsolete entries and appends new people', async () => {
  const a = await app();
  a.correct();
  const b = await app(a.saved(), [people[0], { name: 'Cia', image: 'Cia.jpg' }]);
  assert.equal(b.run('JSON.stringify(questionQueue)'), '["Anna","Cia"]');
  assert.equal(b.run('questionType'), 'imageToName');
});

test('ten active people stay in rotation until mastery admits one waiting person', async () => {
  const a = await app(undefined, largeRoster);
  assert.equal(a.run('questionQueue.length'), 10);
  assert.equal(a.run('JSON.stringify(waitingQueue)'), '["Person10","Person11"]');
  a.run('showAnswer(); checkAnswer();');
  assert.equal(a.run('questionQueue.length'), 10);
  assert.equal(a.run('waitingQueue.length'), 2);
  for (let i = 0; i < 30; i++) a.correct();
  assert.equal(a.run('waitingQueue.length'), 2);
  assert.equal(a.run('currentPerson.name'), 'Person1');
  a.correct();
  assert.equal(a.run('memory.Person1.masteryStep'), 4);
  assert.equal(a.run('questionQueue.length'), 9);
  assert.equal(a.run('waitingQueue.length'), 2);
  const b = await app(a.saved(), largeRoster);
  assert.equal(b.run('JSON.stringify(questionQueue)'), a.run('JSON.stringify(questionQueue)'));
  assert.equal(b.run('JSON.stringify(waitingQueue)'), a.run('JSON.stringify(waitingQueue)'));
  for (let i = 0; i < 30 && b.run('trainingStarted'); i++) b.correct();
  assert.equal(b.run('trainingStarted'), false);
  assert.equal(b.run('questionQueue.length + waitingQueue.length'), 0);
  assert.equal(b.run('Object.values(memory).every(data => data.masteryStep === 4)'), true);
});

test('existing long queue is split without losing order or progress', async () => {
  const a = await app(undefined, largeRoster);
  const saved = JSON.parse(a.saved());
  saved.queue = largeRoster.map(person => person.name).reverse();
  delete saved.waitingQueue;
  saved.people.Person11.masteryStep = 3;
  const b = await app(JSON.stringify(saved), largeRoster);
  assert.equal(b.run('questionQueue.length'), 10);
  assert.equal(b.run('currentPerson.name'), 'Person11');
  assert.equal(b.run('questionType'), 'imageToName');
  assert.equal(b.run('JSON.stringify(waitingQueue)'), '["Person1","Person0"]');
});

test('initial admission draws randomly without duplicates and reload preserves active order', async () => {
  const a = await app(undefined, largeRoster, () => 0.999);
  const active = JSON.parse(a.run('JSON.stringify(questionQueue)'));
  assert.deepEqual(active, largeRoster.slice(2).reverse().map(person => person.name));
  assert.equal(a.run('JSON.stringify(waitingQueue)'), '["Person0","Person1"]');
  const b = await app(a.saved(), largeRoster);
  assert.equal(b.run('JSON.stringify(questionQueue)'), JSON.stringify(active));
});

test('refill randomly selects from an existing alphabetical waiting list', async () => {
  const a = await app(undefined, largeRoster);
  const saved = JSON.parse(a.saved());
  saved.people.Person0.masteryStep = 3;
  const b = await app(JSON.stringify(saved), largeRoster, () => 0.999);
  b.correct();
  assert.equal(b.run('questionQueue.length'), 9);
  assert.equal(b.run('waitingQueue.length'), 2);
  for (let i = 0; i < 9; i++) b.correct();
  assert.equal(b.run('questionQueue.length'), 10);
  assert.equal(b.run('questionQueue[9]'), 'Person11');
  assert.equal(b.run('JSON.stringify(waitingQueue)'), '["Person10"]');
  assert.equal(b.run('new Set([...questionQueue, ...waitingQueue]).size'), 11);
});

test('completion button clears progress and starts a fresh ten-person round', async () => {
  const a = await app(undefined, largeRoster);
  assert.equal(a.document.getElementById('restartButton').hidden, true);
  a.run('showAnswer(); checkAnswer();');
  while (a.run('trainingStarted')) a.correct();
  const b = await app(a.saved(), largeRoster);
  const restart = b.document.getElementById('restartButton');
  assert.equal(restart.hidden, false);
  restart.click();
  assert.equal(restart.hidden, true);
  assert.equal(b.run('trainingStarted'), true);
  assert.equal(b.run('totalCorrect + totalWrong'), 0);
  assert.equal(b.run('Object.values(memory).every(data => data.masteryStep === 0 && data.correct === 0 && data.wrong === 0)'), true);
  assert.equal(b.run('questionQueue.length'), 10);
  assert.equal(b.run('waitingQueue.length'), 2);
  assert.equal(b.run('roundRemaining'), 10);
  assert.equal(b.run('questionType'), 'nameToImage');
  const c = await app(b.saved(), largeRoster);
  assert.equal(c.run('trainingStarted'), true);
  assert.equal(c.run('totalCorrect + totalWrong'), 0);
});

test('round finishes before refill and shuffle, including across reload', async () => {
  const a = await app(undefined, largeRoster);
  const saved = JSON.parse(a.saved());
  saved.people.Person0.masteryStep = 3;
  const random = Object.assign(() => 0, { stableShuffle: false });
  const b = await app(JSON.stringify(saved), largeRoster, random);
  b.correct();
  assert.equal(b.run('questionQueue.length'), 9);
  assert.equal(b.run('roundRemaining'), 9);
  const c = await app(b.saved(), largeRoster, random);
  assert.equal(c.run('questionQueue.length'), 9);
  assert.equal(c.run('roundRemaining'), 9);
  for (let i = 1; i < 10; i++) {
    assert.equal(c.run('currentPerson.name'), `Person${i}`);
    assert.equal(c.run('waitingQueue.length'), 2);
    c.correct();
  }
  assert.equal(c.run('roundRemaining'), 10);
  assert.equal(c.run('waitingQueue.length'), 1);
  assert.deepEqual(JSON.parse(c.run('JSON.stringify(questionQueue)')),
    [...largeRoster.slice(2, 11).map(person => person.name), 'Person1']);
});

test('round also shuffles when nobody is mastered without admitting new people', async () => {
  const a = await app(undefined, largeRoster);
  const random = Object.assign(() => 0, { stableShuffle: false });
  const b = await app(a.saved(), largeRoster, random);
  for (let i = 0; i < 10; i++) {
    assert.equal(b.run('currentPerson.name'), `Person${i}`);
    b.correct();
  }
  assert.equal(b.run('waitingQueue.length'), 2);
  assert.equal(b.run('roundRemaining'), 10);
  assert.deepEqual(JSON.parse(b.run('JSON.stringify(questionQueue)')),
    [...largeRoster.slice(1, 10).map(person => person.name), 'Person0']);
});
