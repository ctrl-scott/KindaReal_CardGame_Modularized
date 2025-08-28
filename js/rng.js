export let rand = Math.random;
function mulberry32(a){return function(){let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296;};}
export function applySeed(seedStr, log){
  if(!seedStr){ rand=Math.random; log && log('Seed cleared. Using default randomness.'); return; }
  let h=2166136261>>>0;
  for(let i=0;i<seedStr.length;i++){ h^=seedStr.charCodeAt(i); h=Math.imul(h,16777619); }
  rand = mulberry32(h>>>0);
  log && log('Seed applied. Randomness is now reproducible for this session.');
}
export function die(){return 1+Math.floor(rand()*6);}
const RPS=['rock','paper','scissors'];
export function rpsThrow(){return RPS[Math.floor(rand()*3)];}
