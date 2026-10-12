const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Tournament = require('../tournament.js');
const html = fs.readFileSync('index.html', 'utf8');
const elements = new Map([...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)].map(([tag, id]) => [id, {
  value: id === 'size' ? '4' : '', disabled: /\bdisabled\b/.test(tag), textContent: '', innerHTML: '', files: []
}]));
let resultInputs=[], focused=null, markup='';
Object.defineProperty(elements.get('groups'), 'innerHTML', {
  get: () => markup,
  set: value => {
    markup=value;
    resultInputs=[...value.matchAll(/<select data-group="(\d+)" data-board="(\d+)"/g)].map(([,group,board])=>({
      dataset:{group,board}, focus(){focused=this;}
    }));
  }
});
elements.get('groups').querySelectorAll=()=>resultInputs;
const downloads=[];
const documentHandlers={};
const context = vm.createContext({
  Tournament, Blob, URL, setTimeout: callback=>callback(), document: {
    getElementById: id => elements.get(id) || null,
    addEventListener:(event,handler)=>{documentHandlers[event]=handler;},
    body:{append(){}},
    createElement:()=>({click(){downloads.push(this.download);},remove(){}})
  },
  confirm: () => true
});
vm.runInContext(html.split('<script>')[1].split('</script>')[0], context);
async function load(name, text) {
  vm.runInContext('state=null;busy=false;',context);
  elements.get('file').disabled=false;
  elements.get('file').files = [{name, text: async () => text}];
  await elements.get('file').onchange();
}
(async () => {
  assert.equal(elements.get('download').disabled, true);
  await load('players.txt', fs.readFileSync('players.txt', 'utf8'));
  assert.equal(focused.dataset.board,'1');
  assert.match(elements.get('summary').textContent, /48 spelare/);
  assert.match(elements.get('groups').innerHTML, /Bordslista/);
  function checkTables() {
    const markup = elements.get('groups').innerHTML;
    assert.equal((markup.match(/<table\b/g) || []).length, 2);
    assert.equal((markup.match(/<h2>Ställning/g) || []).length, 1);
    assert.equal((markup.match(/<h2>Bordslista/g) || []).length, 1);
    assert.match(markup, /<th>Grupp<\/th>/);
    assert.match(markup, /title="Sonneborn-Berger">SB<\/abbr>/);
    assert(html.includes('.columns{display:block}'));
    assert(markup.indexOf('id="boards"') < markup.indexOf('id="standings"'));
    assert.match(markup, /<th>vit<\/th><th>elo<\/th><th>resultat<\/th><th>elo<\/th><th>svart<\/th>/);
    const tables = [...markup.matchAll(/<tbody>(.*?)<\/tbody>/gs)].map(m => m[1]);
    assert(!markup.includes('<th>Spelade</th>'));
    assert.match(markup, /<th scope="col">1<\/th><th scope="col">2<\/th><th scope="col">3<\/th>/);
    assert.match(tables[1], /<td>2W-<\/td><td>3B-<\/td>/);
    const groups = [...tables[1].matchAll(/<tr[^>]*><td>([A-Z]+)(?: \*)?<\/td>/g)].map(m => m[1]);
    const numbers = [...tables[1].matchAll(/<tr[^>]*><td>[A-Z]+(?: \*)?<\/td><td>(\d+)<\/td>/g)].map(m => Number(m[1]));
    assert.deepEqual([...numbers].sort((a,b)=>a-b), Array.from({length:48}, (_,i)=>i+1));
    assert.deepEqual(groups, Array.from({length: 48}, (_, i) => String.fromCharCode(65 + Math.min(12, Math.floor(i / 4)))));
    const boards = [...tables[0].matchAll(/<tr[^>]*><td>(\d+)<\/td><td>([A-Z]+)<\/td>/g)];
    assert.deepEqual(boards.map(m => Number(m[1])), Array.from({length: 24}, (_, i) => i + 1));
    assert.deepEqual(boards.map(m => m[2]), Array.from({length: 24}, (_, i) => String.fromCharCode(65 + Math.floor(i / 2))));
    if(elements.get('round').textContent === 'Rond 1 av 3') {
      assert.match(tables[0], /<td>FM Mikael Näslund<\/td><td>2124<\/td><td><select[^>]*>[\s\S]*?<\/select><\/td><td>2019<\/td><td>Bo E Eriksson<\/td>/);
    }
  }
  checkTables();
  assert.equal(elements.get('download').disabled, true);
  assert.match(elements.get('status').textContent, /Inläst/);
  elements.get('groups').onchange({target: {dataset: {group: '1', board: '1'}, value: '0-1'}});
  const firstRow = elements.get('groups').innerHTML.match(/id="standings"[\s\S]*?<tbody>(<tr[^>]*>.*?<\/tr>)/)[1];
  assert.match(firstRow, /<td>A<\/td><td>4<\/td>/);
  assert.match(firstRow, /<strong>1<\/strong>/);
  assert.match(firstRow, /<td>1B1<\/td><td>3W-<\/td><td>2B-<\/td>/);
  assert.equal(elements.get('download').disabled, false);
  assert.equal(elements.get('file').disabled, true);
  assert.equal(elements.get('previous').disabled, true);
  elements.get('next').onclick();
  assert.equal(elements.get('round').textContent, 'Rond 2 av 3');
  checkTables();
  await load('players.json', fs.readFileSync('players.json', 'utf8'));
  assert.equal(focused.dataset.board,'1');
  assert.equal(elements.get('round').textContent, 'Rond 1 av 3');
  checkTables();
  assert.equal(elements.get('download').disabled, true);
  elements.get('next').onclick();
  assert.equal(elements.get('download').disabled, true);
  elements.get('previous').onclick();
  elements.get('groups').onchange({target:{dataset:{group:'1',board:'1'},value:'1-0'}});
  assert.equal(elements.get('download').disabled, false);
  assert.equal(elements.get('status').textContent, '');
  elements.get('groups').onchange({target:{dataset:{group:'1',board:'1'},value:'0-1'}});
  assert.equal(vm.runInContext('state.groups[0].rounds[0].games[0].result',context),'1-0');
  press('Delete',0);
  assert.equal(elements.get('download').disabled, true);
  let prevented=false;
  documentHandlers.keydown({key:'ArrowLeft',target:elements.get('download'),preventDefault(){prevented=true;}});
  assert(prevented);
  assert.equal(elements.get('round').textContent,'Rond 3 av 3');
  documentHandlers.keydown({key:'ArrowRight',target:focused,preventDefault(){}});
  assert.equal(elements.get('round').textContent,'Rond 1 av 3');
  documentHandlers.keydown({key:'ArrowRight',target:resultInputs[4],preventDefault(){}});
  assert.equal(elements.get('round').textContent,'Rond 2 av 3');
  assert.equal(focused.dataset.board,'5');
  documentHandlers.keydown({key:'ArrowLeft',target:focused,preventDefault(){}});
  assert.equal(elements.get('round').textContent,'Rond 1 av 3');
  assert.equal(focused.dataset.board,'5');
  assert.equal(elements.get('download').disabled,true);
  function press(key,index){
    let prevented=false;
    elements.get('groups').onkeydown({key,target:resultInputs[index],preventDefault(){prevented=true;}});
    assert(prevented);
  }
  const getResult=board=>vm.runInContext(`state.groups.flatMap(g=>g.rounds.find(r=>r.number===state.current_round)?.games||[]).find(g=>g.board===${board}).result`,context);
  press('1',0);assert.equal(getResult(1),'1-0');assert.equal(focused.dataset.board,'2');
  press('0',0);assert.equal(getResult(1),'1-0');assert.equal(focused.dataset.board,'2');
  press(' ',1);assert.equal(getResult(2),'½-½');assert.equal(focused.dataset.board,'3');
  press('1',1);assert.equal(getResult(2),'½-½');assert.equal(focused.dataset.board,'3');
  press('Delete',1);assert.equal(getResult(2),null);
  press('=',1);assert.equal(getResult(2),'½-½');assert.equal(focused.dataset.board,'3');
  for(const key of ['PageUp','PageDown','Home','End',' ','Enter','2','a','Backspace','Escape']){
    const before=getResult(2);
    press(key,1);
    assert.equal(getResult(2),before);
  }
  press('0',2);assert.equal(getResult(3),'0-1');assert.equal(focused.dataset.board,'4');
  press('ArrowUp',3);assert.equal(focused.dataset.board,'3');assert.equal(getResult(3),'0-1');
  press('ArrowDown',2);assert.equal(focused.dataset.board,'4');
  press('Delete',2);assert.equal(getResult(3),null);assert.equal(focused.dataset.board,'4');
  press('Delete',2);assert.equal(getResult(3),null);assert.equal(focused.dataset.board,'4');
  press('ArrowUp',0);assert.equal(focused.dataset.board,'24');
  press('ArrowDown',23);assert.equal(focused.dataset.board,'1');
  press('1',23);assert.equal(getResult(24),'1-0');assert.equal(focused.dataset.board,'1');
  elements.get('download').onclick();
  assert.deepEqual(downloads,['players.json','resultat.txt']);
  assert.equal(elements.get('download').disabled,true);
  press('ArrowUp',0);assert.equal(focused.dataset.board,'24');
  press('1',23);assert.equal(getResult(24),'1-0');assert.equal(focused.dataset.board,'1');
  assert.equal(elements.get('download').disabled,true);
  press('ArrowDown',0);assert.equal(focused.dataset.board,'2');
  press('1',0);assert.equal(getResult(1),'1-0');assert.equal(focused.dataset.board,'2');
  assert.equal(elements.get('download').disabled,true);
  press('0',0);assert.equal(getResult(1),'1-0');assert.equal(focused.dataset.board,'2');
  press(' ',1);assert.equal(getResult(2),'½-½');assert.equal(focused.dataset.board,'3');
  assert.equal(elements.get('download').disabled,true);
  press('Delete',23);assert.equal(getResult(24),null);assert.equal(focused.dataset.board,'1');
  await load('players.json', fs.readFileSync('players.json', 'utf8'));
  await load('broken.json', '{}');
  assert.match(elements.get('status').textContent, /Kunde inte läsa filen/);
  assert.equal(elements.get('file').disabled, false);
  assert.equal(elements.has('size'), false);
  assert.equal(elements.get('round').textContent, 'Rond 1 av 3');
  console.log('OK: sidans start, TXT/JSON-inläsning, rondbyte och felhantering.');
})().catch(error => {console.error(error); process.exitCode = 1;});
