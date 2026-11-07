'use strict';
const $ = id => document.getElementById(id);
let data, game, index = 0, lives = 10, active = false, waiting = false, selected = null, lastMove = '', pending = [];
let settings = {color:'white', profile:'', threshold:1};
let history = [];
const position = () => game?.positions[index];
const rows = () => position()?.analyses[settings.profile] || [];
function recordMove(p, move, lost = false) {
  const number=Number(p.fen.split(' ')[5]) || Math.floor(index/2)+1;
  const best=p.analyses[settings.profile][0];
  const showBest=best.uci!==move.uci;
  const showPgn=move.uci!==p.played_uci;
  const pgnMove=p.analyses[settings.profile].find(m=>m.uci===p.played_uci);
  history.push({number,color:p.turn,san:move.san,pgn:move.uci===p.played_uci?'':p.played_san,evaluation:score(move,p.turn),
    pgnEvaluation:showPgn?score(pgnMove,p.turn):'',best:showBest?best.san:'',bestEvaluation:showBest?score(best,p.turn):'',lost});
  renderProtocol();
}
function renderProtocol() {
  $('moves').replaceChildren();
  const turns=new Map();
  for(const entry of history) {
    if(!turns.has(entry.number)) turns.set(entry.number,{});
    turns.get(entry.number)[entry.color]=entry;
  }
  for(const [number,turn] of turns) {
    const tr=document.createElement('tr');
    const heading=document.createElement('th');heading.scope='row';heading.textContent=number+'.';tr.append(heading);
    for(const color of ['white','black']) {
      const entry=turn[color];
      for(const text of entry?[entry.san,entry.evaluation,entry.pgn,entry.pgnEvaluation,entry.best,entry.bestEvaluation]:['','','','','','']) {
        const td=document.createElement('td');td.textContent=text;td.setAttribute('data-color',color==='white'?'Vit':'Svart');tr.append(td);
      }
    }
    $('moves').append(tr);
  }
  $('protocol-empty').hidden=history.length>0;
  const scroll=$('protocol-scroll');
  scroll.scrollTop=scroll.scrollHeight;
}
function render(fen = position()?.fen || game?.final_fen || '8/8/8/8/8/8/8/8') {
  const cells = {};
  fen.split(' ')[0].split('/').forEach((rank,r) => {let f=0; for(const c of rank) {if(/\d/.test(c)) f+=Number(c); else cells['abcdefgh'[f++]+(8-r)]=c;}});
  const files = settings.color === 'white' ? 'abcdefgh' : 'hgfedcba';
  const ranks = settings.color === 'white' ? '87654321' : '12345678';
  $('board').replaceChildren();
  for(const r of ranks) for(const f of files) {
    const square=f+r, piece=cells[square], button=document.createElement('button');
    button.className='square'+((f.charCodeAt(0)+Number(r))%2 ? '' : ' dark');
    if(lastMove && [lastMove.slice(0,2),lastMove.slice(2,4)].includes(square)) button.classList.add('last');
    if(selected===square) button.classList.add('selected');
    if(selected && rows().some(m=>m.uci.startsWith(selected+square))) button.classList.add('target');
    if(piece) {
      const image=document.createElement('img');image.src=`assets/pieces/${piece===piece.toUpperCase()?'w':'b'}${piece.toUpperCase()}.svg`;
      image.alt='';image.draggable=false;button.append(image);
    }
    if(f===files[0]) {const coord=document.createElement('span');coord.className='coord rank';coord.textContent=r;button.append(coord);}
    if(r===ranks[7]) {const coord=document.createElement('span');coord.className='coord file';coord.textContent=f;button.append(coord);}
    button.setAttribute('aria-label', square+(piece ? ' '+piece : ''));
    button.onclick=()=>clickSquare(square);$('board').append(button);
  }
  $('lives').textContent='♥ '+lives;
  $('progress').textContent=game ? `${Math.min(index+1,game.positions.length)} / ${game.positions.length}` : '0 / 0';
}
function advance() {
  waiting=false;selected=null;$('next').hidden=true;$('promotion').hidden=true;
  while(position() && position().turn!==settings.color) {
    const p=position();recordMove(p,rows().find(m=>m.uci===p.played_uci));
    lastMove=p.played_uci;$('last').textContent='Senaste drag: '+p.played_san;index++;
  }
  if(!position()) {active=false;$('turn').textContent='Partiet är slut';$('message').textContent=`Övningen klar! Du har ${lives} liv kvar.`;render(game.final_fen);return;}
  $('turn').textContent=(settings.color==='white'?'Vit':'Svart')+' vid draget';
  $('message').textContent='Vilket är det starkaste draget? Välj pjäs och målruta.';render();
}
function clickSquare(square) {
  if(!active || waiting || pending.length) return;
  if(selected) {
    const options=rows().filter(m=>m.uci.startsWith(selected+square));
    if(options.length===1) return guess(options[0]);
    if(options.length>1) {pending=options;$('promotion').hidden=false;return;}
  }
  selected=rows().some(m=>m.uci.startsWith(square)) ? square : null;render();
}
function score(move, color) {
  const sign=color==='black'?-1:1;
  return move.mate!==null ? `matt ${sign*move.mate}` : (sign*move.cp/100).toFixed(2);
}
function guess(move) {
  const p=position(), all=rows();
  const same=move.uci===p.played_uci;
  const lost=!same && move.loss_cp>settings.threshold*100;
  if(lost) lives--;
  $('message').textContent=`Du valde ${move.san} (${score(move,p.turn)}). ${same?'Det är PGN-draget.':`I partiet spelades ${p.played_san}. Bäst: ${all[0].san}. Förlust: ${(move.loss_cp/100).toFixed(2)} bönder.`} ${lost?'Du förlorar ett liv.': 'Du behåller dina liv.'}`;
  recordMove(p,move,lost);
  selected=null;waiting=true;lastMove=p.played_uci;
  $('last').textContent='Senaste drag: '+p.played_san;render(p.after_fen);
  if(lives===0) {active=false;$('turn').textContent='Övningen är slut';$('message').textContent+=' Alla tio liv är förbrukade.';}
  else $('next').hidden=false;
}
function validate(value) {
  if(!value || value.schema_version!==1 || value.score_perspective!=='side_to_move' || !value.profiles?.length || !value.games?.length) throw Error(`Ogiltig analysfil (format ${value?.schema_version ?? 'saknas'}). Välj JSON-filen som skapats av analyze.py.`);
  if(value.profiles.length!==1) throw Error('Filen ska innehålla en enda analys. Skapa en ny fil med analyze.py.');
  for(const p of value.profiles) if(typeof p.id!=='string' || typeof p.label!=='string') throw Error('Ogiltig analysnivå.');
  for(const g of value.games) {
    if(!g.headers || !Array.isArray(g.positions) || typeof g.final_fen!=='string') throw Error('Ogiltigt parti.');
    for(const p of g.positions) {
      if(!['white','black'].includes(p.turn) || ![p.fen,p.after_fen,p.played_uci,p.played_san].every(x=>typeof x==='string')) throw Error('Ogiltig position.');
      for(const profile of value.profiles) {
        const moves=p.analyses?.[profile.id];
        if(!Array.isArray(moves) || !moves.length || !moves.some(m=>m.uci===p.played_uci) || !moves.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m.uci) && typeof m.san==='string' && Number.isFinite(m.loss_cp) && m.loss_cp>=0 && (Number.isFinite(m.cp)||Number.isInteger(m.mate)))) throw Error('Ofullständig draganalys.');
      }
    }
  }
}
function expandAnalysis(value) {
  if(!value || typeof value!=='object') throw Error('Filen innehåller ingen analys.');
  if(![1,2].includes(value.schema_version)) throw Error(`Analysformat ${value.schema_version ?? 'saknas'} stöds inte. Den här versionen läser format 1 och 2.`);
  if(value.schema_version!==2) return value;
  if(!Array.isArray(value.profiles) || !Array.isArray(value.games)) throw Error('Ogiltig analysfil.');
  return {...value,schema_version:1,score_perspective:'side_to_move',games:value.games.map(g=>({...g,
    positions:g.positions.map((p,i)=>{
      if(!Array.isArray(p.moves) || !p.moves.every(m=>Array.isArray(m) && m.length===2) || !p.moves[p.played] || !Array.isArray(p.analyses) || p.analyses.length!==value.profiles.length) throw Error('Ogiltig kompakt position.');
      const analyses={};
      value.profiles.forEach((profile,j)=>{
        const list=p.analyses[j].map(([index,score])=>{
          if(!Number.isInteger(index) || !p.moves[index] || !(Number.isFinite(score) || typeof score==='string' && /^#-?\d+$/.test(score))) throw Error('Ogiltig dragvärdering.');
          const mate=typeof score==='string'?Number(score.slice(1)):null;
          const sort_score=mate===null?score:mate>0?100000-mate:-100000-mate;
          return {uci:p.moves[index][0],san:p.moves[index][1],cp:mate===null?score:null,mate,sort_score};
        });
        if(!list.length) throw Error('Tom draganalys.');
        for(const m of list) m.loss_cp=list[0].sort_score-m.sort_score;
        analyses[profile.id]=list;
      });
      return {fen:p.fen,after_fen:g.positions[i+1]?.fen || g.final_fen,turn:p.fen.split(' ')[1]==='w'?'white':'black',played_uci:p.moves[p.played][0],played_san:p.moves[p.played][1],analyses};
    })
  }))};
}
$('file').onchange=async event=> {
  const file=event.target.files[0];if(!file)return;
  active=false;data=null;history=[];renderProtocol();$('start').disabled=true;$('next').hidden=true;$('promotion').hidden=true;
  try {
    const parsed=expandAnalysis(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));validate(parsed);data=parsed;
    $('game').replaceChildren();data.games.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${g.headers.White || 'Vit'} – ${g.headers.Black || 'Svart'} · ${g.headers.Event || 'Parti'}`;$('game').append(o);});
    $('game').disabled=$('start').disabled=false;
    $('message').textContent='Analysen är inläst. Välj inställningar och starta övningen.';
  } catch(error) {$('message').textContent='Kunde inte läsa filen: '+error.message;}
};
$('start').onclick=()=> {
  const threshold=Number($('threshold').value);
  if(!data || !Number.isFinite(threshold) || threshold<0 || $('threshold').value==='') {$('message').textContent='Ange en gräns som är noll eller större.';return;}
  settings={color:$('color').value,profile:data.profiles[0].id,threshold};
  game=data.games[Number($('game').value)];index=0;lives=10;active=true;lastMove='';pending=[];history=[];renderProtocol();
  $('setup').hidden=true;
  $('last').textContent='Senaste drag: —';advance();
};
$('next').onclick=()=>{if(active && waiting){index++;advance();}};
$('promote').onclick=()=>{const move=pending.find(m=>m.uci.endsWith($('piece').value));if(move){pending=[];$('promotion').hidden=true;guess(move);}};
$('settings').onclick=()=>{$('setup').hidden=false;};
render();
