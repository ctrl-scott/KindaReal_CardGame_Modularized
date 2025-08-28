Awesome — here’s a focused walkthrough of every function in your current file that uses **math** and/or **randomness**. For each one, I’ve isolated the code and annotated the key operations.

---

# RNG & Seeding

### `mulberry32(a)`

```js
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t>>>15, t|1);
    t ^= t + Math.imul(t ^ t>>>7,  t|61);
    return ((t ^ t>>>14)>>>0) / 4294967296;
  }
}
```

* `a += 0x6D2B79F5` — adds a big odd constant to scramble the 32-bit seed.
* `t ^ t>>>15` / `t ^ t>>>7` / `t ^ t>>>14` — XOR with right-shifted self (bit mixing).
* `Math.imul(...)` — 32-bit integer multiply for deterministic wraparound.
* `t|1` — forces the multiplicand odd (helps diffusion).
* `>>>0` — coercion to unsigned 32-bit.
* `/ 4294967296` — maps `[0, 2^32)` → `[0, 1)` as a float.

**Purpose:** compact, fast, deterministic PRNG from a 32-bit seed.

---

### `applySeed(seedStr)`

```js
function applySeed(seedStr){
  if(!seedStr){ rand = Math.random; log('Seed cleared...'); return; }
  let h = 2166136261>>>0;
  for(let i=0;i<seedStr.length;i++){
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h,16777619);
  }
  rand = mulberry32(h>>>0);
  log('Seed applied...');
}
```

* Initializes `h` with `2166136261` (FNV-1a offset basis).
* For each char:

  * `h ^= charCode` — XOR in the byte.
  * `h = imul(h, 16777619)` — multiply by FNV prime (32-bit wrap).
* `mulberry32(h)` — turns the hash into a PRNG.
* Falls back to `Math.random` if no seed.

**Purpose:** simple FNV-style hash → deterministic RNG.

---

### `die()`

```js
function die(){ return 1 + Math.floor(rand()*6); }
```

* `rand()*6` → uniform `[0,6)`.
* `Math.floor(...)` → integer `0..5`.
* `+1` → fair `1..6`.

**Purpose:** fair d6 roll off the current RNG.

---

### `rpsThrow()`

```js
const RPS=['rock','paper','scissors'];
function rpsThrow(){ return RPS[Math.floor(rand()*3)]; }
```

* `rand()*3` → `[0,3)`, `floor` → `0|1|2`.
* Index into `RPS`.

**Purpose:** random R/P/S choice.

---

# Shuffling

### `shuffleInPlace(arr)` (Fisher–Yates)

```js
function shuffleInPlace(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
```

* Loop `i` from end→1.
* Pick `j ∈ [0, i]` uniformly with `Math.floor(rand()*(i+1))`.
* Swap elements at `i` and `j`.

**Purpose:** unbiased in-place uniform shuffle.

---

# Comparison & Randomized Resolution

### `hasTypeAdvantage(a,b)`

```js
const BATTLE_TYPES = new Set([TYPES.ATTORNEY, TYPES.BADGE, TYPES.FACTION, TYPES.TICKET]);
function hasTypeAdvantage(a,b){
  if(!a || !b) return false;
  if(!BATTLE_TYPES.has(a.type) || !BATTLE_TYPES.has(b.type)) return false;
  return (RANK[a.type]||0) !== (RANK[b.type]||0);
}
```

* Checks both are “battle” types.
* Compares numeric ranks; any inequality = advantage.

**Math:** integer inequality on ranks.

---

### `baseCompare(a,b)`

```js
function baseCompare(a,b){
  if(a.type===TYPES.BADGE && (b.type===TYPES.FACTION || BADGE_TRUMP_NAMES.has(b.name))) return 1;
  if(b.type===TYPES.BADGE && (a.type===TYPES.FACTION || BADGE_TRUMP_NAMES.has(a.name))) return -1;

  const aRank = RANK[a.type] || 0;
  const bRank = RANK[b.type] || 0;
  if(aRank !== bRank) return aRank > bRank ? 1 : -1;

  const ap = a.power || 0;
  const bp = b.power || 0;
  if(ap>bp) return 1;
  if(bp>ap) return -1;
  return 0;
}
```

* Badge special-case (trumps certain things).
* Compare **ranks** numerically first.
* If ranks equal, compare **power** numerically.
* Returns `1|-1|0`.

**Math:** ordered comparisons on integers.

---

### `rpsCompare(a,b)` (for completeness)

```js
function rpsCompare(a,b){
  if(a===b) return 0;
  if((a==='rock'&&b==='scissors')||(a==='scissors'&&b==='paper')||(a==='paper'&&b==='rock')) return 1;
  return -1;
}
```

**Math:** boolean logic only; no random here, but used by the randomizer mode.

---

### `compareWithRandomizers(a,b)`

```js
function compareWithRandomizers(a,b){
  if(!BATTLE_TYPES.has(a.type)||!BATTLE_TYPES.has(b.type)) return baseCompare(a,b);
  if(hasTypeAdvantage(a,b)) return baseCompare(a,b);

  const mode = rngMode();
  if(mode==='off') return baseCompare(a,b);

  if(mode.startsWith('die')){
    const ar=die(), br=die();
    log(`Randomizer (Die): A=${ar}, B=${br}`);
    const always = mode.endsWith('always');
    if(always){
      const as=(a.power||0)+ar, bs=(b.power||0)+br;
      if(as>bs) return 1; if(bs>as) return -1; return 0;
    }
    const base = baseCompare(a,b);
    if(base!==0) return base;
    if(ar>br) return 1; if(br>ar) return -1; return 0;
  }

  if(mode.startsWith('rps')){
    const at=rpsThrow(), bt=rpsThrow();
    const res=rpsCompare(at,bt);
    log(`Randomizer (RPS): A=${at}, B=${bt}${res===0?' (tie)':res>0?' (A wins)':' (B wins)'}`);
    const always = mode.endsWith('always');
    if(always) return res;
    const base = baseCompare(a,b);
    if(base!==0) return base;
    return res;
  }

  return baseCompare(a,b);
}
```

* If either not a battle type, or ranks differ → **no randomness** (use `baseCompare`).
* **Die modes**:

  * Roll `ar, br` with `die()`.
  * In `die-always`: compare `(power + die)` for each side.
  * In `die-tie`: only use die as **tiebreaker** after `baseCompare` tie.
* **RPS modes**:

  * Random throws for both; in `rps-always` use result directly; otherwise only as tiebreaker.

**Math/Random:** d6 rolls; integer sums; random RPS; integer comparisons.

---

# Play-to Target (Score Conditions)

### `getPlayTo()`

```js
function getPlayTo(){
  const v = document.getElementById('playTo')?.value || 'none';
  if(v === 'none') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
```

* Parses selected target to an integer (e.g., `8`, `-10`) or `null`.

**Math:** `parseInt`, numeric validity check.

---

### `reachedTarget(score, target)`

```js
function reachedTarget(score, target){
  if(target === null) return false;
  if(target > 0) return score >= target;   // positive race
  return score <= target;                  // negative descent
}
```

* For positive targets use `>=`.
* For negative targets use `<=`.

**Math:** integer comparisons.

---

# Bank & Score Arithmetic (Inner Helpers)

### `applySeed` already covered bank? No. The bank helper is nested inside `playCard`:

#### `applyBank(targetIdx, delta)` (inner function inside `playCard`)

```js
const applyBank=(targetIdx,delta)=>{
  if(delta>0){
    const before=players[targetIdx].bank;
    players[targetIdx].bank = Math.max(0, before - delta);
    const red = before - players[targetIdx].bank;
    log(`Bank impact on Player ${...}: -${red} BANK.`);
  } else if(delta<0){
    players[targetIdx].bank += (-delta);
    log(`Bank boost for Player ${...}: +${-delta} BANK.`);
  }
};
```

* `delta > 0` means a **reduction** (cost/penalty):

  * Computes `before - delta` then clamps to **not below 0** with `Math.max(0, ...)`.
  * Logs the actual reduced amount `red`.
* `delta < 0` means a **boost** (gain):

  * Adds `(-delta)` to bank (so `delta = -3` → `+3`).

**Math:** addition/subtraction; lower bound clamp with `Math.max`.

---

# Score Increments from Clash (within `playCard` resolution)

```js
if(cmp>0){ players[0].score+=1; ... }
else if(cmp<0){ players[1].score+=1; ... }
```

* Adds `+1` to the winner’s score after `compareWithRandomizers`.

**Math:** integer increments.

---

# Draw Counts (Turn-Limited Draw)

### `drawOneIfMyTurn(p)`

```js
function drawOneIfMyTurn(p){
  if(turn!==p || drewThisTurn[p] || deck.length===0) { ...; return; }
  drawN(p,1); 
  drewThisTurn[p]=true;
}
```

* Not heavy math; uses booleans; but enforces **once-per-turn** draw via a flag.

---

# Why these choices

* **Uniformity:** `Math.floor(rand()*(i+1))` is the canonical uniform index for Fisher–Yates; no modulo bias.
* **Determinism:** `mulberry32` + `FNV` hashing gives a simple, reproducible stream for a text seed.
* **Ordering first, randomness second:** The ranked matrix (Attorney > Badge > Faction > Ticket) ensures most outcomes are deterministic; randomizers only engage for **ties** unless explicitly set to “always”.

If you’d like, I can inline **JSDoc** above each of these functions in your source so future contributors see the math rationale right where it’s used.

[https://chatgpt.com/share/68aeff40-0270-800c-ac85-44a8b5d3d190](https://chatgpt.com/share/68aeff40-0270-800c-ac85-44a8b5d3d190)
