const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor(tag = '') { this.tag = tag; this.children = []; this.value = ''; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  add(option) { this.children.push(option); }
  setAttribute() {}
}
function context(live = false) {
  const elements = new Map();
  const result = vm.createContext({
    document: {
      getElementById: id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
      createElement: tag => new Element(tag), body:{classList:{add(){}}}, documentElement:{style:{setProperty(){}}},
    },
    window:{BERGER_LIVE:live, print(){}},
    Option:function(text, value){ this.text = text; this.value = value; },
    fetch:() => Promise.reject(Error('Offline')),
    AbortSignal, confirm:() => true, console, assert,
  });
  vm.runInContext(readFileSync('dist/app.js', 'utf8'), result);
  return result;
}
function sourceDoc(title = 'Festival W2-1', selectedRound = 1) {
  const row = text => ({children:text.map(textContent => ({textContent,matches:() => true}))});
  return {
    title,
    querySelector:() => ({textContent:'Rond ' + selectedRound}),
    querySelectorAll:() => [row(['Bord','VIT','','ELO','SVART','','ELO']), row(['1','Åsa & Bo','','2136','Carl','','2159']), row(['2','Dora','','','Erik','','-'])],
  };
}
async function main() {
  const ctx = context();
  ctx.sourceDoc = sourceDoc();
  vm.runInContext(`
    const rows = parseSource(sourceDoc, 'A', 1);
    assert.equal(rows[0].whiteElo, 2136);
    assert.equal(rows[0].blackElo, 2159);
    assert.equal(rows[1].whiteElo, null);
    assert.equal(rows[1].blackElo, null);
    assert.throws(() => parseSource(sourceDoc,'B',1), /Fel källgrupp/);
    assert.throws(() => parseSource(sourceDoc,'A',2), /annan rond/);
    assert.throws(() => validateGames([rows[0],rows[0]]), /Dubblerat/);
    assert.equal(boardNumber({...rows[0],group:'B'}), 4);
    assert.equal(boardNumber({...rows[0],group:'E',board:3}), 15);
    games = [rows[1],rows[0]]; round = 1; render();
    assert.equal($('games').children.length, 2);
    const first = $('games').children[0].children;
    assert.equal(first[1].textContent, 1);
    assert.equal(first[3].textContent, 2136);
    assert.equal(first[5].textContent, 2159);
    assert.equal(first[6].className, 'paper-result');
    assert.equal(first[6].textContent, '');
    assert.equal(first[6].children.length, 0);
  `, ctx);
  ctx.discoveryDoc = {querySelectorAll:() => [
    {textContent:'W1-1',getAttribute:name => name === 'onclick' ? "location.href='./ShowTournamentServlet?id=19022'" : null},
    {textContent:'W1-2',getAttribute:name => name === 'href' ? './ShowTournamentServlet?id=19888' : null},
    {textContent:'W2-1',getAttribute:name => name === 'onclick' ? "location.href='./ShowTournamentServlet?id=19095'" : null},
    {textContent:'W2-10',getAttribute:name => name === 'href' ? './ShowTournamentServlet?id=19999' : null},
    {textContent:'Other tournament',getAttribute:() => './ShowTournamentServlet?id=1'},
  ]};
  vm.runInContext(`
    availableGroups = discoverGroups(discoveryDoc);
    assert.equal(availableGroups.length, 4);
    configureGroups('w1',2);
    assert.equal(prefix,'W1');
    assert.equal(IDS.B,'19888','Use actual links, not consecutive IDs');
    assert.equal(groupName('B'),'W1-2');
    assert.equal(games.length,0,'Never mix previous prefix data');
    assert.throws(() => configureGroups('W1',3), /finns inte/);
    assert.throws(() => configureGroups('W2',0), /1–26/);
    assert.throws(() => parseSource(sourceDoc,'A',1), /Fel källgrupp/);
  `, ctx);

  // Start two round requests; the old response must never overwrite the new one.
  const live = context(true);
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext(`
    const pending = [];
    fetchGroup = (group, round) => new Promise((resolve, reject) => pending.push({group,round,resolve,reject}));
    round = 1; const older = refresh();
    round = 2; const newer = refresh();
    function answer(job) { return [{group:job.group,tournamentId:IDS[job.group],round:job.round,board:1,white:'White',black:'Black',whiteElo:2000,blackElo:1900}]; }
    pending.filter(job => job.round === 2).forEach(job => job.resolve(answer(job)));
  `, live);
  await vm.runInContext('newer', live);
  vm.runInContext(`
    pending.filter(job => job.round === 1).forEach(job => job.resolve(answer(job)));
  `, live);
  await vm.runInContext('older', live);
  vm.runInContext(`
    assert.equal(games.length, 5);
    assert.ok(games.every(g => g.round === 2));
    assert.equal(busy, false);
    assert.equal($('roundLabel').textContent, ' / Rond 2');
    const retry = refresh();
    const requests = pending.slice(-5);
    requests[0].reject(Error('Unavailable'));
    requests.slice(1).forEach(job => job.resolve(answer(job)));
  `, live);
  await vm.runInContext('retry', live);
  vm.runInContext(`
    assert.equal(games.length, 5, 'Failed groups retain the same round cached list');
    assert.equal(failures.get(2)[0], 'A');
    assert.match($('notice').textContent, /grupp A/);
  `, live);
  console.log('Passed: source parsing, Elo, group/round validation, board numbering, blank print cells, round request races and partial failures.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
