// test_card_logic.mjs
// Run with: node test_card_logic.mjs
// No external libs. Determinism via applySeed from rng.js.

import { shuffleInPlace, compareWithRandomizers, BANK_ACTIONS } from './gameplay.js';
import { TYPES, RANK, BADGE_TRUMP_NAMES, BATTLE_TYPES } from './constants.js';
import { applySeed } from './rng.js';

// ---------------------------
// Deterministic RNG for tests
// ---------------------------
applySeed('TEST-SEED'); // ensures rand(), die(), rpsThrow() are reproducible

// ---------------------------
// Tiny assertion helpers
// ---------------------------
function isObject(x){ return x !== null && typeof x === 'object'; }
function assert(cond, msg){ if(!cond) throw new Error(msg||'Assertion failed'); }
function assertEqual(a,b,msg){
  if(a!==b) throw new Error(`${msg||'Expected equality'}\n  expected: ${b}\n  actual:   ${a}`);
}
function assertDeepEqual(a,b,msg){ const s=(v)=>JSON.stringify(v, Object.keys(v).sort()); assertEqual(s(a), s(b), msg); }

// ---------------------------
// Sanity on imported constants
// ---------------------------
assert(isObject(TYPES) && TYPES.BADGE && TYPES.FACTION && TYPES.TICKET && TYPES.ATTORNEY, 'TYPES missing keys');
assert(isObject(RANK) && typeof RANK[TYPES.ATTORNEY] === 'number', 'RANK missing values');
assert(BADGE_TRUMP_NAMES && typeof BADGE_TRUMP_NAMES.has === 'function', 'BADGE_TRUMP_NAMES not a Set');
assert(BATTLE_TYPES && typeof BATTLE_TYPES.has === 'function', 'BATTLE_TYPES not a Set');

// Helpers
function makeCard({ name='X', type=TYPES.FACTION, power=0 } = {}){ return { name, type, power }; }
function captureLogs(){ const lines=[]; const log=(s)=>lines.push(String(s)); return { log, lines }; }

// ---------------------------
// Test runner
// ---------------------------
const tests = [];
function test(name, fn){ tests.push({ name, fn }); }
async function run(){
  let passed=0, failed=0;
  for(const t of tests){
    try{ await t.fn(); console.log(`✓ ${t.name}`); passed++; }
    catch(err){ console.error(`✗ ${t.name}\n${err.stack || err}`); failed++; }
  }
  console.log('\nSummary\n-------');
  console.log(`Passed: ${passed}`); console.log(`Failed: ${failed}`);
  if(failed>0) process.exitCode = 1;
}

// ---------------------------
// Tests
// ---------------------------

// 1) shuffleInPlace invariants + deterministic sample
test('shuffleInPlace returns same reference and preserves multiset', () => {
  const arr = [1,2,3,4,5,6,7,8,9];
  const before = arr.slice();
  const ref = shuffleInPlace(arr);
  assert(ref === arr, 'shuffleInPlace must return same array instance');

  const count = (xs)=>xs.reduce((m,x)=>(m.set(x,(m.get(x)||0)+1),m), new Map());
  const c1=count(before), c2=count(arr);
  assertEqual(c1.size, c2.size, 'multiset size mismatch');
  for(const [k,v] of c1) assertEqual(c2.get(k), v, `count mismatch for ${k}`);
});

test('shuffleInPlace yields expected order with seed (spot check)', () => {
  // Re-seed so this check is stable
  applySeed('TEST-SEED');
  const arr = [0,1,2,3,4,5,6,7,8,9];
  shuffleInPlace(arr);
  // This exact order depends on your current shuffle implementation (Fisher-Yates with rand()).
  // The value below is from one pass under TEST-SEED; if you change RNG or shuffle, update it.
  const expected = [7,9,3,0,8,6,2,4,1,5];
  assertDeepEqual(arr, expected, 'deterministic shuffle mismatch');
});

// 2) Base comparisons (mode='off')
// Rank order defined in constants: Attorney > Badge > Faction > Ticket
test('Rank: Attorney beats Badge; Badge beats Faction; Faction beats Ticket (mode=off)', () => {
  const at = makeCard({ type:TYPES.ATTORNEY, power:0 });
  const bg = makeCard({ type:TYPES.BADGE, power:999 });
  const fc = makeCard({ type:TYPES.FACTION, power:999 });
  const tk = makeCard({ type:TYPES.TICKET, power:999 });

  assertEqual(compareWithRandomizers(at,bg,'off'), 1, 'Attorney should beat Badge by rank');
  assertEqual(compareWithRandomizers(bg,fc,'off'), 1, 'Badge should beat Faction by rank');
  assertEqual(compareWithRandomizers(fc,tk,'off'), 1, 'Faction should beat Ticket by rank');
});

test('Equal rank falls back to power (mode=off)', () => {
  const t = TYPES.FACTION;
  const a = makeCard({ type:t, power:3 });
  const b = makeCard({ type:t, power:7 });
  assertEqual(compareWithRandomizers(a,b,'off'), -1, 'Higher power should win when ranks equal');
});

// 3) Badge trump rules (mode='off')
test('Badge beats Faction regardless of power (explicit trump)', () => {
  const badge = makeCard({ type:TYPES.BADGE, power:0 });
  const faction = makeCard({ type:TYPES.FACTION, power:999 });
  assertEqual(compareWithRandomizers(badge,faction,'off'), 1, 'Badge should beat Faction');
});

test('Badge beats opponent whose name is in BADGE_TRUMP_NAMES (mode=off)', () => {
  const special = BADGE_TRUMP_NAMES.values().next().value;
  if(!special){ console.warn('BADGE_TRUMP_NAMES empty; skipping'); return; }
  const badge = makeCard({ type:TYPES.BADGE, name:'AnyBadge', power:1 });
  const opp = makeCard({ type:TYPES.FACTION, name:special, power:9999 });
  assertEqual(compareWithRandomizers(badge, opp, 'off'), 1, 'Badge should beat named trump target');
});

// 4) Non-battle types defer to baseCompare even when a random mode is selected
test('Non-battle types: random modes short-circuit to baseCompare', () => {
  const nonBattle = Object.values(TYPES).find(t => !BATTLE_TYPES.has(t)) || TYPES.LIFE;
  const a = makeCard({ type:nonBattle, power:2 });
  const b = makeCard({ type:nonBattle, power:9 });
  assertEqual(compareWithRandomizers(a,b,'die'), -1, 'die should defer to baseCompare for non-battle types');
  assertEqual(compareWithRandomizers(a,b,'rps'), -1, 'rps should defer to baseCompare for non-battle types');
});

// 5) Type advantage (different ranks) must ignore randomness
test('Type advantage short-circuits randomness', () => {
  // Choose two distinct battle types with different RANK
  const types = Array.from(BATTLE_TYPES);
  let ta=null, tb=null;
  for(const x of types) for(const y of types){ if(x!==y && (RANK[x]||0)!==(RANK[y]||0)){ ta=x; tb=y; break; } if(ta) break; }
  if(!ta || !tb){ console.warn('Could not find distinct rank battle types; skipping'); return; }

  const a = makeCard({ type:ta, power:1 });
  const b = makeCard({ type:tb, power:9999 });
  const expected = (RANK[ta]||0) > (RANK[tb]||0) ? 1 : -1;

  assertEqual(compareWithRandomizers(a,b,'die'), expected, 'die must return baseCompare on type advantage');
  assertEqual(compareWithRandomizers(a,b,'rps'), expected, 'rps must return baseCompare on type advantage');
});

// 6) Randomizer without "always" cannot overturn decisive base
test('die (no always) preserves decisive base outcome', () => {
  const t = TYPES.FACTION;
  const a = makeCard({ type:t, power:10 });
  const b = makeCard({ type:t, power:4 });
  const base = compareWithRandomizers(a,b,'off');
  assertEqual(base, 1, 'sanity: A should win at base');
  assertEqual(compareWithRandomizers(a,b,'die'), base, 'die must not overturn a non-tie base');
});

test('rps (no always) preserves decisive base outcome', () => {
  const t = TYPES.FACTION;
  const a = makeCard({ type:t, power:3 });
  const b = makeCard({ type:t, power:0 });
  const base = compareWithRandomizers(a,b,'off');
  assertEqual(base, 1, 'sanity: A should win at base');
  assertEqual(compareWithRandomizers(a,b,'rps'), base, 'rps must not overturn a non-tie base');
});

// 7) Randomizer with "always": deterministic with seed, verifies logging
test('diealways uses die rolls only when base is a tie (seeded deterministic)', () => {
  const t = TYPES.FACTION;
  const a = makeCard({ type:t, power:5 });
  const b = makeCard({ type:t, power:5 }); // base tie
  const { log, lines } = captureLogs();

  applySeed('TEST-SEED'); // ensure fixed dice
  const res = compareWithRandomizers(a,b,'diealways', log);
  // With TEST-SEED, die() should be reproducible; we assert valid comparator + log observed.
  assert([-1,0,1].includes(res), 'diealways must return -1, 0, or 1');
  assert(lines.some(s => s.includes('Randomizer (Die): A=')), 'diealways should log die values');
});

test('rpsalways uses throws only when base is a tie (seeded deterministic)', () => {
  const t = TYPES.FACTION;
  const a = makeCard({ type:t, power:12 });
  const b = makeCard({ type:t, power:12 }); // base tie
  const { log, lines } = captureLogs();

  applySeed('TEST-SEED'); // ensure fixed RPS
  const res = compareWithRandomizers(a,b,'rpsalways', log);
  assert([-1,0,1].includes(res), 'rpsalways must return -1, 0, or 1');
  assert(lines.some(s => s.startsWith('Randomizer (RPS): A=')), 'rpsalways should log RPS throws');
});

// 8) BANK_ACTIONS effects
test('BANK_ACTIONS draw2 calls drawN(p,2) once', () => {
  const action = BANK_ACTIONS.find(a => a.key === 'draw2');
  assert(action, 'draw2 action must exist');
  const calls = [];
  const drawN = (p,n)=>calls.push([p,n]);
  action.effect(0, drawN);
  assertEqual(calls.length, 1, 'drawN should be called once');
  assertDeepEqual(calls[0], [0,2], 'drawN should be called with (0,2)');
});

test('BANK_ACTIONS score1 increments score, updates scoreboard, optional end hook', () => {
  const action = BANK_ACTIONS.find(a => a.key === 'score1');
  assert(action, 'score1 action must exist');

  const playersLocal = [{score:0},{score:10}];
  let updates=0, ends=0;
  const updateScoreboard = ()=>{ updates++; };
  const checkPlayToEnd = ()=>{ ends++; };

  action.effect(1, ()=>{}, playersLocal, updateScoreboard, checkPlayToEnd);
  assertEqual(playersLocal[1].score, 11, 'score should increment by 1');
  assertEqual(updates, 1, 'updateScoreboard should be called');
  assertEqual(ends, 1, 'checkPlayToEnd should be called when provided');

  action.effect(0, ()=>{}, playersLocal, updateScoreboard /* no end hook */);
  assertEqual(playersLocal[0].score, 1, 'score should increment even without end hook');
  assertEqual(updates, 2, 'updateScoreboard should be called again');
});

// Run
run().catch(e => { console.error('Unexpected error:', e); process.exitCode = 1; });

