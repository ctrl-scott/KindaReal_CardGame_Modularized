//https://chatgpt.com/share/68b9b69e-4014-800c-8fe0-00614280d480
// test_rng.mjs
import { applySeed, die, rpsThrow } from '../js/rng.js';

function log(msg) {
  console.log("[LOG]", msg);
}

// ---- Test 1: die() produces values in [1..6] ----
console.log("Running Test 1: die()");
let valid = true;
for (let i = 0; i < 100; i++) {
  const v = die();
  if (v < 1 || v > 6) {
    console.error("die() produced invalid value:", v);
    valid = false;
  }
}
console.log(valid ? "PASS: die() within 1..6" : "FAIL: die() out of bounds");

// ---- Test 2: rpsThrow() produces only rock/paper/scissors ----
console.log("\nRunning Test 2: rpsThrow()");
const validThrows = new Set(["rock", "paper", "scissors"]);
valid = true;
for (let i = 0; i < 100; i++) {
  const t = rpsThrow();
  if (!validThrows.has(t)) {
    console.error("Invalid RPS throw:", t);
    valid = false;
  }
}
console.log(valid ? "PASS: rpsThrow() values valid" : "FAIL: rpsThrow() values invalid");

// ---- Test 3: applySeed() reproducibility ----
console.log("\nRunning Test 3: applySeed()");
applySeed("seed123", log);
const seq1 = [die(), die(), die()];

applySeed("seed123", log);
const seq2 = [die(), die(), die()];

if (JSON.stringify(seq1) === JSON.stringify(seq2)) {
  console.log("PASS: applySeed reproducible:", seq1);
} else {
  console.error("FAIL: applySeed produced different results");
  console.error("Seq1:", seq1);
  console.error("Seq2:", seq2);
}

console.log("\nAll tests complete.");

