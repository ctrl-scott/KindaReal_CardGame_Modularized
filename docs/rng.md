# RNG Module Guide

File: `js/rng.js`  
Exports:
- `rand: () => number` — mutable live binding; defaults to `Math.random`.
- `applySeed(seedStr: string, log?: (msg:string)=>void): void` — switch to seeded PRNG or clear to system randomness.
- `die(): number` — fair d6 in `[1..6]`.
- `rpsThrow(): 'rock' | 'paper' | 'scissors'` — uniform throw based on current PRNG.

> ⚠️ Not cryptographically secure. For gameplay/UX only.

---

## 1) Design & Internals

### Live binding
`rand` is exported as `let rand = Math.random`. Calling `applySeed(...)` **reassigns** this live binding; importers see the new function automatically (unless they cached it earlier with `const r = rand`).

### Seeded PRNG
`applySeed` hashes the `seedStr` using **FNV-1a** (32-bit), then builds a very small PRNG via **mulberry32(seed)**:

- **Weyl sequence** increment (`a += 0x6D2B79F5`).
- A few XOR/shift and `Math.imul` mixes.
- Normalize final 32-bit word to `[0,1)` by dividing by `2^32`.

This gives a fast, deterministic generator that’s great for game logic and UI effects.

---

## 2) API Details

### `rand(): number`
- Returns `x ∈ [0,1)`.
- Initially `Math.random`. After `applySeed('abc')`, it becomes deterministic until cleared.
- **Do not** permanently cache the function if you reseed mid-game.

### `applySeed(seedStr, log?)`
- **Falsy seed** (`''`, `undefined`, `null`): resets to `Math.random`. Logs “Seed cleared…” if `log` provided.
- **Truthy seed**: sets `rand` to a seeded PRNG (deterministic). Logs “Seed applied…” if `log` provided.

**Determinism guarantees**
- Same seed ⇒ identical sequence across a run & engine version.
- Different seeds should diverge quickly.

```js
import { applySeed, rand } from './rng.js';

applySeed('demo', console.log);
console.log(rand(), rand()); // repeatable
applySeed('');               // back to non-deterministic

