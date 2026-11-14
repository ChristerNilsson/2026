const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise event wiring without a browser; visual/layout checks remain separate.
function harness() {
  const elements = new Map(), downloads = [], storage = new Map();
  let focused;
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.hidden = false; this.disabled = false; this.className = ''; this.textContent = ''; }
    append(...items) { for (const item of items) { item.parentElement = this; this.children.push(item); } }
    replaceChildren(...items) { this.children = []; this.append(...items); }
    setAttribute() {}
    get classList() { return {toggle: (name, enabled) => { this.className = enabled ? name : ''; }}; }
    focus() { focused = this; }
    scrollIntoView() {}
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); }
    click() { if (this.tag === 'a') downloads.push(this.download); else this.onclick?.(); }
  }
  const body = new Element('body');
  const document = {
    body,
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement(tag) { return new Element(tag); },
    querySelectorAll(selector) {
      const output = [];
      function visit(node) {
        if (node.className.split(' ').includes(selector.slice(1))) output.push(node);
        node.children.forEach(visit);
      }
      elements.forEach(visit); return output;
    }
  };
  const context = vm.createContext({
    document, location: {protocol:'file:'}, Blob,
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    setTimeout: callback => callback(), confirm: () => true,
    localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)},
    window: {addEventListener() {}, print() {}}
  });
  vm.runInContext(fs.readFileSync('tournament.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
  return {document, elements, downloads, storage, focused: () => focused};
}
test('öppna fil, lotta, tangentbordsinmatning, nästa rond och export', async () => {
  const app = harness();
  const get = id => app.document.getElementById(id);
  await get('file').onchange({target: {files:[{name:'turnering.json', text:async () => fs.readFileSync('turnering.json','utf8')}], value:'file'}});
  assert.equal(get('title').textContent, 'Rond 1 av 11');
  get('draw').click();
  assert.equal(app.downloads.length, 1);
  assert.equal(get('boards').children.length, 31);
  assert.equal(get('draw').disabled, true);
  let prevented = false;
  app.focused().onkeydown({key:' ', preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(get('progress').textContent, '5 / 24');
  let buttons = app.document.querySelectorAll('.result');
  buttons[0].onkeydown({key:'1', preventDefault() {}});
  for (let i=6; i<24; i++) {
    buttons = app.document.querySelectorAll('.result');
    buttons[i].onkeydown({key:i%2 ? 'R' : '0', preventDefault() {}});
  }
  assert.equal(get('progress').textContent, '24 / 24');
  assert.equal(get('draw').disabled, false);
  get('draw').click();
  assert.equal(get('title').textContent, 'Rond 2 av 11');
  assert.equal(app.downloads.at(-1), 'turnering-rond-02.json');
  const draft = JSON.parse([...app.storage.values()][0]);
  assert.deepEqual(draft.data.app.lottadeRonder, [1,2]);
  assert.match(draft.data.ronder[0].resultat.B, /^[0r]{6}$/);
});
