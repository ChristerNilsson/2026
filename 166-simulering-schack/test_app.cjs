// State-machine tests with a minimal DOM; run with node test_app.cjs.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = {};
const element = () => ({value:'',textContent:'',hidden:false,disabled:false,scrollTop:0,scrollHeight:1000,children:[],classList:{add(){}},append(x){this.children.push(x);},replaceChildren(){this.children=[];},setAttribute(){}});
const context = vm.createContext({document:{getElementById(id){return elements[id] ||= element();},createElement:element},console});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
function run(code){return vm.runInContext(code,context);}
assert.equal(run("score({cp:35,mate:null},'white')"),'0.35');
assert.equal(run("score({cp:35,mate:null},'black')"),'-0.35');
assert.equal(run("score({cp:-35,mate:null},'black')"),'0.35');
assert.equal(run("score({cp:null,mate:3},'black')"),'matt -3');
assert.equal(run("score({cp:null,mate:-3},'black')"),'matt 3');
const fen = '8/8/8/8/8/8/8/8 w - - 0 1';
const make = (uci,loss) => ({uci,san:uci,cp:-loss,mate:null,loss_cp:loss});
const positions = Array.from({length:24},(_,i)=>({fen,after_fen:fen,turn:i%2?'black':'white',played_uci:'e2e4',played_san:'e4',analyses:{p:[make('e2e4',0),make('d2d4',100),make('a2a3',101)]}}));
context.fixture = {schema_version:1,score_perspective:'side_to_move',profiles:[{id:'p',label:'100 noder'}],games:[{headers:{},positions,final_fen:fen}]};
run(`validate(fixture);data=fixture;game=data.games[0];settings={color:'white',profile:'p',threshold:1};active=true;advance();guess(rows()[1]);`);
assert.equal(run('lives'),10,'Loss equal to threshold keeps a life');
run(`index++;advance();guess(rows()[2]);`);
assert.equal(run('lives'),9,'Loss exceeding threshold loses a life');
run(`index++;advance();position().analyses.p[0].loss_cp=1000;guess(rows()[0]);`);
assert.equal(run('lives'),9,'PGN move never loses a life');
run(`index++;advance();lives=1;guess(rows()[2]);`);
assert.equal(run('active'),false,'Zero lives ends exercise');
assert.equal(elements.next.hidden,true);
run(`index=23;lives=10;active=true;advance();`);
assert.equal(run('active'),false,'End of PGN ends exercise');
assert.match(elements.message.textContent,/klar/);
assert.equal(elements.board.children.length,64);
// Compact files must retain exactly the same scores, ordering and penalties.
const packed = JSON.parse(fs.readFileSync('analysis.json','utf8'));
context.packed=packed;
run('const expanded=expandAnalysis(packed);validate(expanded);');
const expanded=run('expanded');
if(fs.existsSync('roundtrip.tmp.json')) {
  const original=JSON.parse(fs.readFileSync('roundtrip.tmp.json','utf8'));
  for(let g=0;g<original.games.length;g++) for(let i=0;i<original.games[g].positions.length;i++) {
    const before=original.games[g].positions[i],after=expanded.games[g].positions[i];
    for(const key of ['fen','after_fen','turn','played_uci','played_san']) assert.equal(after[key],before[key]);
    for(const profile of original.profiles) for(let j=0;j<before.analyses[profile.id].length;j++) {
      const a=before.analyses[profile.id][j],b=after.analyses[profile.id][j];
      for(const key of ['uci','san','cp','mate','sort_score','loss_cp']) assert.equal(b[key],a[key]);
    }
  }
}
run(`game=expanded.games[0];index=0;settings.profile=expanded.profiles[0].id;active=true;waiting=false;lives=10;advance();guess(rows()[0]);`);
assert.equal(elements.moves.children.length,run('new Set(history.map(h=>h.number)).size'));
assert.equal(elements.moves.children[0].children.length,13);
for(const color of ['white','black']) {
  run(`settings.color='${color}';render();`);
  const coords=elements.board.children.flatMap(square=>square.children.filter(c=>c.className?.startsWith('coord')));
  assert.equal(coords.length,16);
  assert.equal(coords.map(c=>c.textContent).filter(c=>/[a-h]/.test(c)).length,8);
  const images=elements.board.children.flatMap(square=>square.children.filter(c=>c.src));
  assert.equal(images.length,32);
  for(const img of images) assert.ok(fs.existsSync(img.src));
}
async function testFileInput() {
  for(const value of [packed, expanded]) {
    await elements.file.onchange({target:{files:[{text:async()=>JSON.stringify(value)}]}});
    assert.equal(elements.start.disabled,false,'Actual file handler accepts both supported formats');
    assert.equal(run('data.games[0].positions.length'),36);
  }
  await elements.file.onchange({target:{files:[{text:async()=>'\uFEFF'+JSON.stringify(packed)}]}});
  assert.equal(elements.start.disabled,false,'UTF-8 BOM is accepted');
  run("$('game').value='0';$('color').value='white';$('threshold').value='1';");
  elements.start.onclick();
  assert.equal(elements.setup.hidden,true,'Setup disappears after starting');
  elements.settings.onclick();
  assert.equal(elements.setup.hidden,false,'Setup can be reopened');
  assert.equal(run('active'),true,'Loaded file can start an exercise');
  assert.equal(elements.board.children.length,64);
  assert.equal(elements.moves.children.length,0,'No moves are revealed before the first guess');
  run('guess(rows()[0]);');
  assert.equal(elements['protocol-scroll'].scrollTop,elements['protocol-scroll'].scrollHeight,'Protocol scrolls to its last row');
  assert.equal(elements.moves.children.length,1);
  assert.equal(elements.moves.children[0].children[1].textContent,run('history[0].san'));
  assert.equal(elements.moves.children[0].children[3].textContent,run("history[0].san==='e4'?'':'e4'"));
  assert.equal(elements.moves.children[0].children[5].textContent,'','Best move hidden when chosen');
  assert.equal(elements.moves.children[0].children[6].textContent,'','Best evaluation hidden when chosen');
  for(const cell of elements.moves.children[0].children.slice(7)) assert.equal(cell.textContent,'','Future Black move stays blank');
  elements.next.onclick();
  assert.equal(run('history.length'),2,'Opponent move is recorded only after continuing');
  assert.equal(elements.moves.children.length,1,'White and Black share a move-number row');
  assert.equal(elements.moves.children[0].children[9].textContent,'','PGN hidden for the automatic opponent move');
  assert.equal(elements.moves.children[0].children[10].textContent,'','PGN evaluation also hidden for the same move');
  assert.equal(elements.moves.children[0].children[11].textContent,run('history[1].best'));
  assert.equal(elements.moves.children[0].children[12].textContent,run('history[1].bestEvaluation'));
  assert.equal(run('index'),2);
  elements.start.onclick();
  assert.equal(elements.moves.children.length,0,'Restart clears the protocol');
  run('guess(rows()[1]);');
  assert.equal(elements.moves.children[0].children[5].textContent,run('rows()[0].san'),'Different best move shown');
  assert.equal(elements.moves.children[0].children[6].textContent,run("score(rows()[0],'white')"));
  assert.equal(elements.moves.children[0].children[3].textContent,run("rows()[1].uci===position().played_uci?'':position().played_san"));
  assert.equal(elements.moves.children[0].children[4].textContent,run("history[0].pgnEvaluation"));
  assert.equal(elements.moves.children[0].children[2].textContent,run("score(rows()[1],'white')"));
  run("$('color').value='black';");elements.start.onclick();
  assert.equal(run('history.length'),1,'Playing Black reveals only the first automatic White move');
  for(const cell of elements.moves.children[0].children.slice(7)) assert.equal(cell.textContent,'');
  await elements.file.onchange({target:{files:[{text:async()=>'{}'}]}});
  assert.equal(elements.start.disabled,true,'Unsupported file cannot start an exercise');
  assert.match(elements.message.textContent,/format/i);
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/src="app\.js\?v=11"/,'HTML requests the current script version');
  console.log('App state and file input tests passed');
}
testFileInput().catch(error=>{console.error(error);process.exitCode=1;});
