const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(`${__dirname}/index.html`, 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1].replace(/start\(\);\s*$/, '');
const people = ['Anna', 'Bo'].map(name => ({ name, image: `${name}.jpg` }));

async function app(saved, roster = people) {
  const elements = new Map();
  function element() {
    return {
      hidden: false, value: '', children: [], dataset: {},
      classList: { add() {}, contains() { return false; } },
      replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); },
      contains(child) { return this.children.includes(child); },
      addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}
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
    localStorage: { getItem: () => storage, setItem: (_, value) => { storage = value; } },
    fetch: async () => ({ ok: true, json: async () => roster })
  });
  const run = code => vm.runInContext(code, context);
  run(script);
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
