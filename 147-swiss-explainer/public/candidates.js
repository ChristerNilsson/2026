// Local candidate checks explain evidence, not the pairing engine's search log.
const criterionNames={C1:'Tidigare möte',C3:'Absolut färgkonflikt',C12:'Färgönskemål',C13:'Starkt färgönskemål',C15:'Uppflyt i föregående rond',C17:'Uppflyt två ronder tidigare'};
function remainingThreePointGroup(){
 if(!realTournament||round!==5||players.find(p=>p.id===2)?.history[4]?.opponent!==10)return null;
 const group=sorted().filter(p=>active(p)&&score(p)===3&&p.id!==10);
 if(group.length!==6||group.map(p=>p.rating).join(',')!=='2124,1975,1937,1879,1795,1771')return null;
 const s1=group.slice(0,3),s2=group.slice(3);
 function permutations(list){return list.length?list.flatMap((p,i)=>permutations(list.filter((_,j)=>i!==j)).map(rest=>[p,...rest])):[[]];}
 const attempts=permutations(s2).map(order=>{const pairs=s1.map((p,i)=>({a:p,b:order[i],check:candidateCheck(p,order[i])}));return {order,pairs,valid:pairs.every(pair=>!pair.check.blocked)};});
 return {s1,s2,attempts};
}
function remainingGroupExplanation(){
 const group=remainingThreePointGroup();if(!group)return '';
 const playerLine=p=>`${esc(p.name)} (${p.rating})`;
 return `<section class="choice-explanation"><h3>Efter Eriksson–Berg: de sex kvarvarande spelarna</h3><p>Den återstående 3-poängsgruppen delas i S1 och S2 enligt den uppskattade startordningen:</p><div class="groups"><div class="group"><h3>S1</h3><p>${group.s1.map(playerLine).join('<br>')}</p></div><div class="group"><h3>S2</h3><p>${group.s2.map(playerLine).join('<br>')}</p></div></div><p><b>Varför inte Näslund (2124)–Evertsson (1879)?</b> Det mötet är tillåtet i sig. Men då måste Wedin möta antingen Sterner (redan mött i rond 2) eller Löwgren (redan mött i rond 3). Ingen av de två återstående parningarna mellan dessa S1 och S2 blir därför komplett utan ett upprepat möte.</p><p><b>C1: tidigare möten förbjuds.</b> Först prövas omordningar i S2 (transpositioner). Den fjärde ordningen nedan är den första och enda som klarar C1 med dessa fasta delgrupper. Ett utbyte mellan S1 och S2 är ett senare steg om omordningarna inte räcker.</p><div class="table-wrap"><table class="candidate-table"><thead><tr><th>S2-ORDNING</th><th>TRE KANDIDATMÖTEN</th><th>KONTROLL</th></tr></thead><tbody>${group.attempts.map(attempt=>`<tr class="${attempt.valid?'selected-candidate':''}"><td>${attempt.order.map(p=>p.rating).join(' · ')}</td><td>${attempt.pairs.map(({a,b})=>`${a.rating}–${b.rating}`).join('<br>')}</td><td>${attempt.valid?'<b>Klarar C1 · publicerade möten</b>':attempt.pairs.filter(pair=>pair.check.blocked).map(({a,b,check})=>`${esc(a.name)}–${esc(b.name)}: ${check.blocked}${check.blocked==='C1'?' · redan mötts i rond '+check.prior.filter(x=>x.h.played).map(x=>x.r).join(', '):''}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div><p><a href="https://handbook.fide.com/chapter/C0403202602" target="_blank" rel="noreferrer">FIDE Dutch: C1 och artikel 3.6.1 om transpositioner och utbyten ↗</a></p><p class="intro">Detta prövar alla sex omordningar med de angivna S1/S2. Det är en konkret kontroll av denna delgrupp, inte en fullständig lottningslogg för hela turneringen.</p></section>`;
}
function upfloatIn(p,r){if(r<1)return null;const h=p.history[r-1],other=players.find(x=>x.id===h?.opponent);if(!other||!h.played)return null;const ownScore=scoreBefore(p,r),otherScore=scoreBefore(other,r);return {round:r,opponent:other,ownScore,otherScore,up:ownScore<otherScore};}
function colourCost(a,b){const pa=preference(a),pb=preference(b);return [['Vit','Svart'],['Svart','Vit']].map(([ca,cb])=>{const wishes=[[pa,ca],[pb,cb]];return {absolute:wishes.filter(([p,c])=>p.level==='Absolut'&&p.color!==c).length,mild:wishes.filter(([p,c])=>p.level!=='Ingen'&&p.color!==c).length,strong:wishes.filter(([p,c])=>p.level==='Stark'&&p.color!==c).length};}).sort((x,y)=>x.absolute-y.absolute||x.mild-y.mild||x.strong-y.strong)[0];}
function candidateCheck(focal,candidate){
 const prior=history(focal).map((h,i)=>({h,r:i+1})).filter(({h})=>h.opponent===candidate.id);
 const pa=preference(focal),pb=preference(candidate),conflict=pa.level==='Absolut'&&pb.level==='Absolut'&&pa.color===pb.color;
 const finalRound=round===tournamentData?.players?.[0]?.history.length;
 const topscorer=p=>finalRound&&score(p)>(round-1)/2;
 const blocked=prior.some(x=>x.h.played)?'C1':conflict&&!topscorer(focal)&&!topscorer(candidate)?'C3':null;
 const cost=colourCost(focal,candidate),isMdp=score(focal)>score(candidate);
 const last=upfloatIn(candidate,round-1),earlier=upfloatIn(candidate,round-2);
 return {blocked,prior,cost,last,earlier,isMdp,vector:[cost.mild,cost.strong,isMdp&&last?.up?1:0,isMdp&&earlier?.up?1:0]};
}
function candidateComparison(focal,candidate,selected){
 const check=candidateCheck(focal,candidate),baseline=candidateCheck(focal,selected);
 if(candidate.id===selected.id)return {label:'Vald i publicerad lottning',criterion:null,check};
 if(check.blocked)return {label:'Otillåtet möte',criterion:check.blocked,check};
 const criteria=['C12','C13','C15','C17'];
 const index=check.vector.findIndex((n,i)=>n!==baseline.vector[i]);
 if(index>=0)return {label:check.vector[index]>baseline.vector[index]?'Sämre i lokal jämförelse':'Bättre i lokal jämförelse; helheten återstår',criterion:criteria[index],check};
 return {label:'Lokalt möjlig · inte vald',criterion:null,check};
}
function pairingCriterion(a,b){
 const focal=score(a)>=score(b)?a:b,selected=focal===a?b:a;
 if(score(focal)===score(selected))return null;
 const candidates=sorted().filter(p=>active(p)&&p.id!==focal.id&&score(p)===score(selected));
 const evidence=candidates.map(p=>candidateComparison(focal,p,selected)).find(result=>result.label==='Sämre i lokal jämförelse'&&result.criterion==='C17');
 return evidence?'C17':null;
}
function candidateEvidence(focal,candidate,result){
 const {check}=result,items=[];
 if(check.prior.length)items.push(...check.prior.map(({h,r})=>`Rond ${r}: ${h.played?'tidigare spelat möte':'tidigare uppskjutet/ospelat möte; status behöver kontrolleras'}.`));
 else items.push('Inget tidigare möte i underlaget.');
 const a=preference(focal),b=preference(candidate);items.push(`Färgönskemål: ${focal.name} ${a.color.toLowerCase()} (${a.level.toLowerCase()}), ${candidate.name} ${b.color.toLowerCase()} (${b.level.toLowerCase()}).`);
 if(!check.blocked)items.push(`Bästa lokala färgval: ${check.cost.mild} ej uppfyllda önskemål (C12), varav ${check.cost.strong} starka (C13).`);
 for(const [info,code] of [[check.last,'C15'],[check.earlier,'C17']])if(check.isMdp){if(info)items.push(`Rond ${info.round}: ${candidate.name} hade ${fmt(info.ownScore)} poäng mot ${info.opponent.name} med ${fmt(info.otherScore)}. ${info.up?'Uppflyt':'Inget uppflyt'} (${code}).`);else items.push(`${code}: inget verifierat spelat möte i den historikronden.`);}
 if(!check.blocked&&candidate.id!==focal.history[round-1]?.opponent)items.push('Varför hela lottningen valde bort kandidaten är inte verifierat; återstående parningar och kriterier med högre prioritet måste också jämföras.');
 return `<ul class="candidate-evidence">${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
}
function showCandidates(firstId,secondId,focalId){
 const first=players.find(p=>p.id===firstId),second=players.find(p=>p.id===secondId);if(!first||!second)return;
 const focal=focalId?players.find(p=>p.id===focalId):score(first)>=score(second)?first:second;
 if(!focal||![first.id,second.id].includes(focal.id))return;
 const selected=focal.id===first.id?second:first,targetScore=score(selected);
 const candidates=sorted().filter(p=>p.id!==focal.id&&active(p)&&score(p)===targetScore);
 const outside=sorted().filter(p=>p.id!==focal.id&&(!active(p)||score(p)!==targetScore));
 $('candidate-detail').innerHTML=`<span class="tiny-label">KANDIDATANALYS · ROND ${round}</span><h2>${esc(first.name)} – ${esc(second.name)}</h2><p>Motståndarkandidater för <b>${esc(focal.name)}</b> i ${fmt(targetScore)}-poängsgruppen. ${candidates.length} kandidater, i uppskattad startordning.</p><button class="secondary" data-focus="${selected.id}" data-first="${first.id}" data-second="${second.id}">Visa kandidater för ${esc(selected.name)} ↔</button>${note('<b>Analys av underlaget, inte programmets beslutslogg.</b> C1 och C3 kan utesluta möten. C12, C13, C15 och C17 jämförs lokalt med det publicerade valet. En sämre lokal jämförelse är inte bevis för att kriteriet avgjorde hela lottningen. C4 och C6–C8 samt återstående grupper är inte beräknade här.')}<div class="table-wrap"><table class="candidate-table"><thead><tr><th>KANDIDAT</th><th>POÄNG</th><th>BEDÖMNING / KRITERIUM</th></tr></thead><tbody>${candidates.map(p=>{const result=candidateComparison(focal,p,selected);return `<tr class="${p.id===selected.id?'selected-candidate':''}"><td>${esc(p.name)}</td><td>${fmt(score(p))}</td><td><strong>${esc(result.label)}</strong>${result.criterion?` <a class="criterion-link" href="https://handbook.fide.com/chapter/C0403202602" target="_blank" rel="noreferrer">${result.criterion} ↗</a>`:''}<details><summary>Visa underlag${result.criterion?' · '+criterionNames[result.criterion]:''}</summary>${candidateEvidence(focal,p,result)}</details></td></tr>`}).join('')}</tbody></table></div><details class="outside-candidates"><summary>Övriga ${outside.length} spelare utanför denna kandidatgrupp</summary><ul class="candidate-evidence">${outside.map(p=>`<li>${esc(p.name)} · ${fmt(score(p))} poäng · ${active(p)?'annan poänggrupp; skulle kräva annan grupphantering':'saknar motståndare i vald rond'}</li>`).join('')}</ul></details>`;
 const remaining=remainingThreePointGroup();
 if(remaining&&remaining.s1.concat(remaining.s2).some(p=>p.id===focal.id))$('candidate-detail').innerHTML+=remainingGroupExplanation();
 if(!$('candidate-dialog').open)$('candidate-dialog').showModal();
}
function publishedPairings(){
 const pairs=players.filter(p=>p.history[round-1]?.opponent&&p.id<p.history[round-1].opponent);
 return `<div class="table-head">Publicerade möten · rond ${round}<span>Klicka på ett möte för att granska kandidaterna</span></div><div class="table-wrap"><table><thead><tr><th>VIT</th><th>SVART</th><th>POÄNG FÖRE RONDEN</th><th>KONTROLL</th><th>KRITERIUM / KANDIDATER</th></tr></thead><tbody>${pairs.map(p=>{const h=p.history[round-1],q=players.find(x=>x.id===h.opponent),w=h.color==='W'?p:q,b=w===p?q:p,criterion=pairingCriterion(w,b),repeat=history(p).some(x=>x.opponent===q.id&&x.played),pending=[p,q].some(x=>history(x).some(h=>h.status==='pending'));return `<tr class="pairing-row" data-pair-first="${w.id}" data-pair-second="${b.id}"><td><button class="player" data-player="${w.id}">${esc(w.name)}</button></td><td><button class="player" data-player="${b.id}">${esc(b.name)}</button></td><td>${fmt(score(w))} – ${fmt(score(b))}${floatExplanation(w,b)}</td><td>${repeat?'Tidigare spelat möte!':pending?'Uppskjutet parti · ½ p inräknad':'Se kandidatkontroller'}</td><td><button class="candidate-button" data-pair-first="${w.id}" data-pair-second="${b.id}">${criterion?criterion+' · analys':'Kandidater'} ↗</button>${criterion?'<small class="criterion-hint">Underbyggd jämförelse</small>':''}</td></tr>`}).join('')}</tbody></table></div>`+note('Kriteriereferensen anger en förklaring som stöds av underlaget. Den är inte en verifierad uppgift om vilket kriterium lottningsprogrammet tillämpade. Öppna mötet för alla kandidater i målgruppen och deras kontroller.');
}
$('content').addEventListener('click',e=>{if(e.target.closest('[data-player]'))return;const button=e.target.closest('[data-pair-first]');if(button)showCandidates(Number(button.dataset.pairFirst),Number(button.dataset.pairSecond));});
$('candidate-detail').addEventListener('click',e=>{const button=e.target.closest('[data-focus]');if(button)showCandidates(Number(button.dataset.first),Number(button.dataset.second),Number(button.dataset.focus));});
$('close-candidates').onclick=()=>$('candidate-dialog').close();
