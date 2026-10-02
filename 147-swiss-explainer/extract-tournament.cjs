const fs=require('node:fs');
const html=fs.readFileSync('19069.html','utf8');
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const players=[...html.matchAll(/<tr class="memberrow[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>{
 const cells=[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]);
 return {id:Number(clean(cells[1])),name:clean(cells[3]),club:clean(cells[5]),rating:Number(clean(cells[7])),publishedScore:Number(clean(cells[22])),history:cells.slice(10,21).map(c=>{
  const opponent=clean((c.match(/<div\s+class=[^>]*>(.*?)<\/div>/)||[])[1]||'');
  const raw=clean((c.match(/class=rfrresult>(.*?)<\/div>/)||[])[1]||'');
  const color=c.includes('CP_White')?'W':c.includes('CP_Black')?'B':null;
  const numeric=/^\d+$/.test(opponent)?Number(opponent):null;
  const score=raw==='½'||raw==='b'?.5:raw==='1'||raw==='1w'?1:raw==='0'||raw==='0w'?0:null;
  const status=raw==='b'?'half-bye':/w$/.test(raw)?(numeric?'wo':'full-bye'):numeric?(raw?'completed':'pending'):opponent==='F'?'unscored-bye':'absent';
  return {opponent:numeric,color,score,played:status==='completed',status,raw};
 })};
});
if(players.length!==54)throw Error('Unexpected player count');
const byId=new Map(players.map(p=>[p.id,p]));
for(const p of players)for(let r=0;r<5;r++){const h=p.history[r];if(!h.opponent)continue;const other=byId.get(h.opponent)?.history[r];if(!other||other.opponent!==p.id||other.color===h.color)throw Error(`Non-reciprocal round ${r+1}: ${p.id}`);if(h.score!==null&&other.score!==null&&h.score+other.score!==1)throw Error('Scores do not agree');}
for(const p of players){const known=p.history.reduce((s,h)=>s+(h.score??0),0);if(known!==p.publishedScore)throw Error(`Score mismatch ${p.name}: ${known} / ${p.publishedScore}`);}
[...players].sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name,'sv')).forEach((p,i)=>p.estimatedTpn=i+1);
const data={name:'Stockholmsmästerskap Veteran 60+ 2026',source:'19069.html',round:5,tpnVerified:false,players};
fs.writeFileSync('public/tournament-19069.json',JSON.stringify(data,null,2));
console.log(`${players.length} players; reciprocal pairings and all published totals verified. Pending round-4 games: ${players.filter(p=>p.history[3].status==='pending').length/2}.`);
