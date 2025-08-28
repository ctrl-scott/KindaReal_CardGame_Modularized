import { players, deck, discard, bf, drewThisTurn, discardMode } from './state.js';

export function log(msg){
  const el=document.getElementById('log'); el.textContent+=msg+"\n"; el.scrollTop=el.scrollHeight;
  const live=document.getElementById('liveAnnouncer'); live.textContent=''; live.textContent=msg;
}
export function updateScoreboard(){
  document.getElementById('scoreA').textContent=players[0].score;
  document.getElementById('bankA').textContent=players[0].bank;
  document.getElementById('scoreB').textContent=players[1].score;
  document.getElementById('bankB').textContent=players[1].bank;
}
export function cardHTML(card){
  const powerPart=(card.power||0)?` • Power ${card.power}`:'';
  const extra=(card.scoreMod!==undefined)?` • Mod ${card.scoreMod}`:(card.bankMod!==undefined)?` • Bank ${card.target==='opponent'?'-':''}+${card.bankMod}`:'';
  const targetChip=card.target?`<span class="badgechip">${card.target==='self'?'→ Self':'→ Opponent'}</span>`:'';
  return `<div class="art">${targetChip}${card.art}</div><div class="meta"><div class="name">${card.name}</div><div class="tags">${card.type}${powerPart}${extra}</div></div>`;
}
export function renderStack(id,cards){
  const c=document.getElementById(id); if(!c) return; c.innerHTML='';
  cards.forEach(card=>{const el=document.createElement('div'); el.className='card'; el.innerHTML=cardHTML(card); c.appendChild(el);});
}
export function renderHand(idx){
  const id=idx===0?'hand1':'hand2'; const c=document.getElementById(id); c.innerHTML='';
  players[idx].hand.forEach((card,i)=>{
    const canAct=(window.__turn===idx)&&(bf[idx]===null);
    const el=document.createElement('div');
    el.className='card'+(canAct?' clickable':''); el.tabIndex=canAct?0:-1; el.setAttribute('role','button');
    el.setAttribute('aria-label', (window.__discardMode?.[idx]?'Discard ':'Play ')+card.name);
    el.innerHTML=cardHTML(card);
    if(canAct){
      el.addEventListener('click',()=>{ window.__handlers[window.__discardMode?.[idx]?'discardCard':'playCard'](idx,i); });
      el.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '||((window.__discardMode?.[idx])&&e.key.toLowerCase()==='d')){ e.preventDefault(); window.__handlers[window.__discardMode?.[idx]?'discardCard':'playCard'](idx,i);} });
    }
    c.appendChild(el);
  });
}
export function renderAll(){ renderStack('deck',deck); renderStack('discard',discard); renderHand(0); renderHand(1); updateScoreboard(); }
export function updateTurnControls(){
  const drawA=document.getElementById('drawA'), drawB=document.getElementById('drawB');
  const discA=document.getElementById('toggleDiscardA'), discB=document.getElementById('toggleDiscardB');
  const spend=document.getElementById('spendBank');
  drawA.disabled=!(window.__turn===0 && deck.length>0 && !drewThisTurn[0]);
  drawB.disabled=!(window.__turn===1 && deck.length>0 && !drewThisTurn[1]);
  discA.disabled=!(window.__turn===0 && bf[0]===null && players[0].hand.length>0);
  discB.disabled=!(window.__turn===1 && bf[1]===null && players[1].hand.length>0);
  discA.classList.toggle('btn-toggled', (window.__discardMode?.[0]) && !discA.disabled);
  discB.classList.toggle('btn-toggled', (window.__discardMode?.[1]) && !discB.disabled);
  spend.disabled=(window.__turn===null); spend.setAttribute('aria-disabled', String(spend.disabled));
}
export function setTurnText(){
  const t=document.getElementById('turnIndicator');
  const target=window.__getPlayTo();
  const targetTxt=target===null?'No target':`Target: ${target}`;
  if(window.__turn===null) t.textContent=`Not dealt. ${targetTxt}.`;
  else t.textContent=`${window.__turn===0?'Player A':'Player B'} turn. ${targetTxt}.`;
  updateTurnControls();
}
export function showRoundAlert(msg){ const m=document.getElementById('roundModal'); document.getElementById('roundModalBody').textContent=msg; m.classList.add('show'); document.getElementById('closeRoundModal').focus(); }
export function closeRoundAlert(){ document.getElementById('roundModal').classList.remove('show'); }
