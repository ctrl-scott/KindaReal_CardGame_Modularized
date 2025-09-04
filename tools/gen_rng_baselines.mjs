// tools/gen_rng_baselines.mjs
// Usage: node tools/gen_rng_baselines.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySeed, rand, die, rpsThrow } from '../js/rng.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seeds = ['alpha', 'beta', 'gamma', 'delta'];
const N_RAND = 8;
const N_DIE = 12;
const N_RPS = 12;

const out = [];

for (const seed of seeds) {
  applySeed(seed);
  const firstRand = Array.from({ length: N_RAND }, () => Number(rand().toFixed(10)));
  applySeed(seed);
  const dieSeq = Array.from({ length: N_DIE }, () => die());
  applySeed(seed);
  const rpsSeq = Array.from({ length: N_RPS }, () => rpsThrow());
  out.push({ seed, firstRand, dieSeq, rpsSeq });
}

const dest = path.resolve(__dirname, '../__tests__/fixtures/rng_sequences.json');
await fs.mkdir(path.dirname(dest), { recursive: true });
await fs.writeFile(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('✅ Wrote baseline fixtures to', dest);

