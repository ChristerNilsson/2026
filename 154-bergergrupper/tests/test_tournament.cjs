const assert=require('node:assert/strict');
const fs=require('node:fs');
const T=require('../tournament.js');
const players=T.parseText(fs.readFileSync('players.txt','utf8')).players;
assert.equal(T.groupName(1),'A');
assert.equal(T.groupName(26),'Z');
assert.equal(T.groupName(27),'AA');
assert.equal(T.groupName(52),'AZ');
assert.equal(players.length,54);
assert.equal(T.parseText('\uFEFF4\r\n2124\tMikael Näslund\r\n\tUtan Elo\r\n').players[1].elo,0);
assert.throws(()=>T.parseText('123 Namn'));
assert.throws(()=>T.parseText(''));
for(const size of [4,6,8,10,12])assert.equal(T.parseText(`${size}\n1000\tSpelare`).size,size);
for(const size of ['5','abc',''])assert.throws(()=>T.parseText(`${size}\n1000\tSpelare`));
assert.deepEqual(T.berger(4),[[[1,4],[2,3]],[[4,3],[1,2]],[[2,4],[3,1]]]);
for(const n of [4,6,8,10,12]){
 const pairs=new Set(),white=Array(n).fill(0);
 for(const round of T.berger(n)){
  assert.deepEqual(round.flat().sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i+1));
  for(const [w,b] of round){pairs.add([w,b].sort((a,b)=>a-b).join('-'));white[w-1]++;}
 }
 assert.equal(pairs.size,n*(n-1)/2);
 assert(white.every(x=>Math.abs(2*x-(n-1))===1));
 for(let count=1;count<=54;count++){
  const state=T.create(n,players.slice(0,count));
  assert.equal(state.groups.flatMap(g=>g.players).length,count);
  assert.deepEqual(state.groups.flatMap(g=>g.players.map(p=>p.player_number)),Array.from({length:count},(_,i)=>i+1));
  assert.equal(state.groups.at(-1).system,count%n?'swiss':'berger');
  assert.deepEqual(T.parseJson(JSON.stringify(state)),state);
 }
}
const state=T.create(4,players);
assert.equal(state.groups.length,13);
assert.equal(state.groups.at(-1).players.length,6);
assert.deepEqual(state.groups.at(-1).rounds,[]);
state.current_round=2;
state.groups[0].rounds[0].games[0].result='1-0';
state.groups[0].rounds[0].games[1].result='½-½';
T.update(state);
assert.deepEqual(state.groups[0].standings.map(p=>p.points),[1,.5,.5,0]);
const report=T.resultText(state);
assert.equal(Buffer.from(report,'utf8').toString('utf8'),report);
assert.match(report,/Näslund/);
assert.match(report,/Ålgars/);
assert.match(report,/Strömbäck/);
assert.equal(report.split('\r\n\r\n')[0],[
 'A   Namn                      Elo  1   2   3   poäng  SB',
 '1   FM Mikael Näslund         2124 4W1 2W- 3B- 1      0',
 '2   Ivan Franchuk             2071 3W= 1B- 4W- 0.5    0.25',
 '3   Nils Carlsson             2066 2B= 4B- 1W- 0.5    0.25',
 '4   Bo E Eriksson             2019 1B0 3W- 2B- 0      0'
].join('\r\n'));
const headings=report.split('\r\n\r\n').map(section=>section.split('\r\n')[0]);
assert.equal(new Set(headings.map(line=>line.indexOf('Elo')-line.indexOf('Namn'))).size,1);
assert(headings.every(line=>line.indexOf('Namn')===4));
assert(report.split('\r\n').filter(line=>/^\d/.test(line)).every(line=>/^\d{1,3} +[^ ]/.test(line)&&line[3]===' '));
assert.match(report,/\r\n\r\nB\s+Namn/);
assert.match(report,/\r\n\r\nM\s+Namn\s+Elo\s+poäng/);
const sbState=T.create(4,players.slice(0,4));
sbState.groups[0].rounds[0].games[0].result='1-0';
sbState.groups[0].rounds[0].games[1].result='½-½';
sbState.groups[0].rounds[1].games[0].result='1-0';
T.update(sbState);
let sbRows=sbState.groups[0].standings;
assert.equal(sbRows.find(p=>p.number===1).sb,1);
assert.equal(sbRows.find(p=>p.number===2).sb,.25);
assert.deepEqual(sbRows.filter(p=>p.points===1).map(p=>p.number),[1,4]);
sbState.groups[0].rounds[1].games[0].result=null;
T.update(sbState);
assert.equal(sbState.groups[0].standings.find(p=>p.number===1).sb,0);
assert.deepEqual(T.parseJson(JSON.stringify(state)),state);
assert.deepEqual(T.parseJson(fs.readFileSync('players.json','utf8')).groups,T.create(4,players).groups);
for(const mutate of [s=>s.current_round=100,s=>s.groups[0].players[1].id=s.groups[0].players[0].id,s=>s.groups[0].rounds[0].games[0].white=999,s=>s.groups[0].rounds[0].games[0].result='invalid',s=>s.groups[0].players[0].name='<script>']){
 const copy=structuredClone(state);mutate(copy);
 if(copy.groups[0].players[0].name==='<script>')assert.equal(T.parseJson(JSON.stringify(copy)).groups[0].players[0].name,'<script>');
 else assert.throws(()=>T.parseJson(JSON.stringify(copy)));
}
assert.throws(()=>T.parseJson('{}'));
assert.throws(()=>T.parseJson('invalid'));
const html=fs.readFileSync('index.html','utf8');
assert(!html.includes('fetch('));
const script=html.split('<script>')[1].split('</script>')[0];
new (require('node:vm').Script)(script);
console.log('OK: TXT/JSON, befintlig JSON, alla gruppstorlekar, Bergerpar, färger, restgrupper, poäng och ogiltiga filer.');
