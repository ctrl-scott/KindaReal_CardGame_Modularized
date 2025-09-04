// __tests__/rng.spec.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { applySeed, rand, die, rpsThrow } from '../js/rng.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional: load exact baseline sequences if they exist
async function loadBaselines() {
  try {
    const p = path.resolve(__dirname, './fixtures/rng_sequences.json');
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

describe('rng.js', () => {
  test('same seed → same first N numbers', () => {
    applySeed('jest-seed');
    const a = Array.from({ length: 8 }, () => rand());
    applySeed('jest-seed');
    const b = Array.from({ length: 8 }, () => rand());
    expect(b).toEqual(a);
  });

  test('different seeds produce different sequences early', () => {
    applySeed('alpha');
    const a = Array.from({ length: 6 }, () => rand());
    applySeed('beta');
    const b = Array.from({ length: 6 }, () => rand());
    expect(b).not.toEqual(a);
  });

  test('die() always in 1..6, deterministic under seed', () => {
    applySeed('dice-seed');
    const rolls = Array.from({ length: 30 }, () => die());
    expect(rolls.every(x => x >= 1 && x <= 6)).toBe(true);

    applySeed('dice-seed');
    const rolls2 = Array.from({ length: 30 }, () => die());
    expect(rolls2).toEqual(rolls);
  });

  test('rpsThrow() values are valid and deterministic under seed', () => {
    const valid = new Set(['rock', 'paper', 'scissors']);

    applySeed('rps-seed');
    const seq1 = Array.from({ length: 20 }, () => rpsThrow());
    expect(seq1.every(v => valid.has(v))).toBe(true);

    applySeed('rps-seed');
    const seq2 = Array.from({ length: 20 }, () => rpsThrow());
    expect(seq2).toEqual(seq1);
  });

  test('clearing seed returns to non-deterministic (basic sanity)', () => {
    applySeed('');
    const x = rand();
    const y = rand();
    expect(typeof x).toBe('number');
    expect(typeof y).toBe('number');
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(1);
  });

  test('optional exact baselines if fixture exists', async () => {
    const baselines = await loadBaselines();
    if (!baselines) {
      console.warn('⚠️ rng_sequences.json not found; skipping baseline test.');
      return;
    }
    for (const { seed, firstRand, dieSeq, rpsSeq } of baselines) {
      applySeed(seed);
      const r = Array.from({ length: firstRand.length }, () => Number(rand().toFixed(10)));
      expect(r).toEqual(firstRand);

      applySeed(seed);
      const d = Array.from({ length: dieSeq.length }, () => die());
      expect(d).toEqual(dieSeq);

      applySeed(seed);
      const p = Array.from({ length: rpsSeq.length }, () => rpsThrow());
      expect(p).toEqual(rpsSeq);
    }
  });
});

