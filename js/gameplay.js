import { players, bf } from './state.js';
import { TYPES, RANK, BADGE_TRUMP_NAMES, BATTLE_TYPES } from './constants.js';
import { die, rpsThrow, rand } from './rng.js';

export function shuffleInPlace(arr){
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}
function rpsCompare(a,b){ if(a===b) return 0; if((a==='rock'&&b==='scissors')||(a==='scissors'&&b==='paper')||(a==='paper'&&b==='rock')) return 1; return -1; }
function hasTypeAdvantage(a,b){ if(!a||!b) return false; if(!BATTLE_TYPES.has(a.type)||!BATTLE_TYPES.has(b.type)) return false; return (RANK[a.type]||0)!==(RANK[b.type]||0); }
function baseCompare(a,b){
  if(a.type===TYPES.BADGE && (b.type===TYPES.FACTION || BADGE_TRUMP_NAMES.has(b.name))) return 1;
  if(b.type===TYPES.BADGE && (a.type===TYPES.FACTION || BADGE_TRUMP_NAMES.has(a.name))) return -1;
  const aRank=RANK[a.type]||0, bRank=RANK[b.type]||0;
  if(aRank!==bRank) return aRank>bRank?1:-1;
  const ap=a.power||0, bp=b.power||0; if(ap>bp) return 1; if(bp>ap) return -1; return 0;
}
export function compareWithRandomizers(a,b, mode, log){
  if(!BATTLE_TYPES.has(a.type)||!BATTLE_TYPES.has(b.type)) return baseCompare(a,b);
  if(hasTypeAdvantage(a,b)) return baseCompare(a,b);
  if(mode==='off') return baseCompare(a,b);

  if(mode.startsWith('die')){
    const ar=die(), br=die(); log && log(`Randomizer (Die): A=${ar}, B=${br}`);
    const always=mode.endsWith('always');
    if(always){ const as=(a.power||0)+ar, bs=(b.power||0)+br; if(as>bs) return 1; if(bs>as) return -1; return 0; }
    const base=baseCompare(a,b); if(base!==0) return base; if(ar>br) return 1; if(br>ar) return -1; return 0;
  }
  if(mode.startsWith('rps')){
    const at=rpsThrow(), bt=rpsThrow(); const res=rpsCompare(at,bt);
    log && log(`Randomizer (RPS): A=${at}, B=${bt}${res===0?' (tie)':res>0?' (A wins)':' (B wins)'}`);
    const always=mode.endsWith('always'); if(always) return res;
    const base=baseCompare(a,b); if(base!==0) return base; return res;
  }
  return baseCompare(a,b);
}

export const BANK_ACTIONS = [
  {key:'draw2', name:'Spend 5 → Draw 2 cards', cost:5,
   effect:(p, drawN)=>{ drawN(p,2); }},
  {key:'score1', name:'Spend 3 → +1 SCORE', cost:3,
   effect:(p, _drawN, players, updateScoreboard, checkPlayToEnd)=>{ players[p].score+=1; updateScoreboard(); checkPlayToEnd && checkPlayToEnd(); }}
];
