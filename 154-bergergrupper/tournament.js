const Tournament = (() => {
 const sizes=[4,6,8,10,12];
 const scores={'1-0':[1,0],'0-1':[0,1],'½-½':[.5,.5]};
 function groupName(number){
  let name='';
  while(number>0){number--;name=String.fromCharCode(65+number%26)+name;number=Math.floor(number/26);}
  return name;
 }
 function parseText(text){
  const players=[];
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  const size=Number(lines.shift().trim());
  if(!sizes.includes(size))throw Error('Första raden måste ange gruppstorlek 4, 6, 8, 10 eller 12.');
  lines.forEach((line,i)=>{
   if(!line.trim())return;
   const match=line.match(/^(\d*)\t(.+)$/);
   if(!match || !match[2].trim())throw Error(`Rad ${i+2}: förväntar Elo och namn åtskilda av tabb.`);
   const elo=Number(match[1]);
   if(!Number.isSafeInteger(elo))throw Error(`Rad ${i+2}: ogiltigt Elo.`);
   players.push({id:i+1,name:match[2].trim(),elo});
  });
  if(!players.length)throw Error('Textfilen innehåller inga spelare.');
  return {size,players:players.sort((a,b)=>b.elo-a.elo||a.id-b.id)};
 }
 function berger(n){
  const wrap=x=>(x-1+n-1)%(n-1)+1;
  return Array.from({length:n-1},(_,i)=>{
   const r=i+1,start=r%2?(r+1)/2:n/2+r/2;
   return [r%2?[start,n]:[n,start],...Array.from({length:n/2-1},(_,j)=>[wrap(start+j+1),wrap(start-j-1)])];
  });
 }
 function update(state){
  let playerNumber=0;
  state.groups.forEach(group=>{
   group.name=groupName(group.number);
   group.players.forEach(player=>{player.player_number=++playerNumber;});
   const rows=new Map(group.players.map(p=>[p.id,{...p,points:0,played:0,sb:0}]));
   group.rounds.forEach(r=>r.games.forEach(game=>{
    if(game.result!==null)['white','black'].forEach((color,i)=>{
     const row=rows.get(game[color]);row.points+=scores[game.result][i];row.played++;
    });
   }));
   group.rounds.forEach(r=>r.games.forEach(game=>{
    if(game.result!==null){
     const [whiteScore,blackScore]=scores[game.result];
     rows.get(game.white).sb+=whiteScore*rows.get(game.black).points;
     rows.get(game.black).sb+=blackScore*rows.get(game.white).points;
    }
   }));
   group.standings=[...rows.values()].sort((a,b)=>b.points-a.points||b.sb-a.sb||a.number-b.number);
  });
  return state;
 }
 function create(size,players){
  if(!sizes.includes(size))throw Error('Välj gruppstorlek 4, 6, 8, 10 eller 12.');
  if(!players.length)throw Error('Inga spelare.');
  players=[...players].sort((a,b)=>b.elo-a.elo||a.id-b.id);
  const chunks=[];
  for(let i=0;i<players.length;i+=size)chunks.push(players.slice(i,i+size));
  const remainder=chunks.at(-1).length<size;
  if(remainder&&chunks.length>1){const last=chunks.pop();chunks.at(-1).push(...last);}
  let offset=0;
  const groups=chunks.map((chunk,i)=>{
   const swiss=remainder&&i===chunks.length-1;
   const members=chunk.map((p,j)=>({id:p.id,name:p.name,elo:p.elo,number:j+1}));
   const rounds=swiss?[]:berger(size).map((pairs,r)=>({number:r+1,games:pairs.map(([w,b],j)=>({board:offset+j+1,white:members[w-1].id,black:members[b-1].id,result:null}))}));
   if(!swiss)offset+=size/2;
   return {number:i+1,system:swiss?'swiss':'berger',players:members,rounds};
  });
  return update({group_size:size,current_round:1,groups});
 }
 function parseJson(text){
  let state;
  try{state=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Filen innehåller inte giltig JSON.');}
  const fail=()=>{throw Error('JSON-filen måste innehålla en giltig turnering exporterad från Bergergrupper.');};
  const positive=x=>Number.isSafeInteger(x)&&x>0;
  if(!state||!sizes.includes(state.group_size)||!positive(state.current_round)||!Array.isArray(state.groups)||!state.groups.length)fail();
  const allIds=new Set();let boardOffset=0;
  state.groups.forEach((g,i)=>{
   if(!g||g.number!==i+1||!['berger','swiss'].includes(g.system)||!Array.isArray(g.players)||!g.players.length||!Array.isArray(g.rounds))fail();
   const ids=new Set();
   g.players.forEach((p,j)=>{
    if(!p||!positive(p.id)||allIds.has(p.id)||p.number!==j+1||typeof p.name!=='string'||!p.name.trim()||!Number.isSafeInteger(p.elo)||p.elo<0)fail();
    ids.add(p.id);allIds.add(p.id);
   });
   if(g.system==='swiss'){
    if(i!==state.groups.length-1||g.rounds.length)fail();return;
   }
   if(g.players.length!==state.group_size||g.rounds.length!==state.group_size-1)fail();
   const expected=berger(state.group_size);
   g.rounds.forEach((r,j)=>{
    if(!r||r.number!==j+1||!Array.isArray(r.games)||r.games.length!==state.group_size/2)fail();
    r.games.forEach((game,k)=>{
     const [w,b]=expected[j][k];
     if(!game||game.board!==boardOffset+k+1||game.white!==g.players[w-1].id||game.black!==g.players[b-1].id||(game.result!==null&&!Object.hasOwn(scores,game.result)))fail();
    });
   });
   boardOffset+=state.group_size/2;
  });
  const max=Math.max(1,...state.groups.map(g=>g.rounds.length));
  if(state.current_round>max)fail();
  return update(state);
 }
 function meetings(group,player){
  const players=new Map(group.players.map(p=>[p.id,p]));
  return group.rounds.map(round=>{
   const game=round.games.find(g=>g.white===player.id||g.black===player.id);
   if(!game)return '';
   const white=game.white===player.id;
   const opponent=players.get(white?game.black:game.white);
   const score=game.result===null?'-':game.result==='½-½'?'=':scores[game.result][white?0:1]===1?'1':'0';
   return `${opponent.player_number}${white?'W':'B'}${score}`;
  });
 }
 function resultText(state){
  const nameWidth=Math.max('Namn'.length,...state.groups.flatMap(group=>group.players.map(player=>player.name.length)));
  const sections=[...state.groups].sort((a,b)=>a.number-b.number).map(group=>{
   const rows=[...group.players].sort((a,b)=>a.player_number-b.player_number).map(player=>{
    const standing=group.standings.find(p=>p.id===player.id);
    return [String(player.player_number),player.name,String(player.elo),...meetings(group,player),String(standing.points),String(standing.sb)];
   });
   const heading=[group.name,'Namn','Elo',...group.rounds.map(r=>String(r.number)),'poäng','SB'];
   const widths=heading.map((value,i)=>Math.max(value.length,...rows.map(row=>row[i].length)));
   widths[0]=3;
   widths[1]=nameWidth;
   const format=row=>row.slice(0,-1).map((value,i)=>value.padEnd(widths[i])).join(' ')+'  '+row.at(-1);
   return [format(heading),...rows.map(format)].join('\r\n');
  });
  return sections.join('\r\n\r\n')+'\r\n';
 }
 return {parseText,parseJson,create,berger,update,groupName,resultText,meetings};
})();
if(typeof module!=='undefined')module.exports=Tournament;
