const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
function element(id){if(!nodes.has(id))nodes.set(id,{value:'5',innerHTML:'',textContent:'',open:false,handlers:{},addEventListener(type,handler){(this.handlers[type]??=[]).push(handler)},showModal(){this.open=true},close(){this.open=false}});return nodes.get(id);}
const context={document:{getElementById:element},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(fs.readFileSync('public/tournament-19069.json','utf8')))}),URL,location:{href:'http://localhost:3000/'}};
vm.createContext(context);
for(const file of ['public/app.js','public/candidates.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
setImmediate(()=>{
 vm.runInContext(`
  const berg=players.find(p=>p.id===2),eriksson=players.find(p=>p.id===10),naslund=players.find(p=>p.id===9);
  if(candidateComparison(berg,naslund,eriksson).criterion!=='C17')throw Error('Expected C17 for Naslund');
  if(candidateComparison(berg,eriksson,eriksson).label!=='Vald i publicerad lottning')throw Error('Selected candidate');
  if(candidateComparison(berg,players.find(p=>p.id===5),eriksson).criterion)throw Error('Invented rejection for equally rated local candidate');
  if(candidateComparison(berg,players.find(p=>p.id===11),eriksson).criterion!=='C12')throw Error('Mild colour preference cost');
  const absoluteBlack={id:999,name:'Test',history:[{played:true,color:'W',score:1},{played:true,color:'W',score:1}]};
  if(candidateCheck(berg,absoluteBlack).blocked!=='C3')throw Error('Absolute colour collision');
  if(candidateCheck(berg,players.find(p=>p.id===12)).blocked!=='C1')throw Error('Repeated encounter');
  const remaining=remainingThreePointGroup();
  if(remaining.s1.map(p=>p.rating).join(',')!=='2124,1975,1937')throw Error('Remainder S1');
  if(remaining.s2.map(p=>p.rating).join(',')!=='1879,1795,1771')throw Error('Remainder S2');
  if(remaining.attempts.length!==6||remaining.attempts.filter(a=>a.valid).length!==1)throw Error('Remainder permutations');
  if(remaining.attempts.find(a=>a.valid).order.map(p=>p.rating).join(',')!=='1795,1771,1879')throw Error('Remainder solution');
  if(candidateCheck(players.find(p=>p.id===9),players.find(p=>p.id===8)).blocked)throw Error('Naslund-Evertsson is locally allowed');
  if(!remaining.attempts[0].pairs.some(pair=>pair.check.blocked==='C1'&&pair.check.prior.some(x=>x.r===2)))throw Error('Wedin-Sterner prior encounter');
  step=5;render();showCandidates(10,2);
 `,context);
 assert(element('content').innerHTML.includes('C17 · analys'));
 assert(element('content').innerHTML.includes('class="pairing-row" data-pair-first="10" data-pair-second="2"'));
 assert.equal(element('candidate-dialog').open,true);
 assert(element('candidate-detail').innerHTML.includes('7 kandidater'));
 assert(element('candidate-detail').innerHTML.includes('Näslund'));
 assert(element('candidate-detail').innerHTML.includes('C17'));
 const pairButton={dataset:{pairFirst:'10',pairSecond:'2'}};
 for(const handler of element('content').handlers.click)handler({target:{closest:selector=>selector==='[data-pair-first]'?pairButton:null}});
 assert(element('candidate-detail').innerHTML.includes('Susanna Berg Laachiri'));
 vm.runInContext(`
  for(round=2;round<=5;round++){
   step=5;render();
   for(const p of players){const id=p.history[round-1]?.opponent;if(id&&p.id<id){showCandidates(p.id,id);showCandidates(p.id,id,id);}}
  }
 `,context);
 element('close-candidates').onclick();assert.equal(element('candidate-dialog').open,false);
 console.log('Passed: C17, C3, C1, no invented rejection, all seven Berg candidates, click event, both sides of every published pairing in rounds 2–5, dialog close.');
});
