// js/main.js

// -------------------- Imports (must be first) --------------------
import { players, deck, discard, bf, drewThisTurn, discardMode, resetAll } from './state.js';
import { buildDeck } from './loader.js';
import { artForCard, makeArtContext, resolveArt } from './art.js';
import { shuffleInPlace, compareWithRandomizers, BANK_ACTIONS } from './gameplay.js';
import {
  log,
  renderAll,
  renderHand,
  renderStack,
  updateScoreboard,
  setTurnText,
  updateTurnControls,
  showRoundAlert,
  closeRoundAlert,
  cardHTML
} from './ui.js';
//import { applySeed } from './rng.js';
import { loadSettings, saveSettings, readSettingsFromDOM, writeSettingsToDOM } from './settings.js';

// -------------------- Globals (UI helpers) --------------------
window.cardHTML = cardHTML;          // expose for battlefield renderers
window.__turn = null;
window.__discardMode = discardMode;
window.__handlers = {};
window.__getPlayTo = () => {
  const v = document.getElementById('playTo')?.value || 'none';
  if (v === 'none') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

// -------------------- Play-to Target Helpers --------------------
function reachedTarget(score, target) {
  if (target === null) return false;
  return target > 0 ? score >= target : score <= target;
}
function endRoundByTarget(winnerIdx, target) {
  window.__turn = null;
  setTurnText();
  document.getElementById('nextRound').disabled = false;
  document.getElementById('resetScores').disabled = false;
  document.getElementById('spendBank').disabled = true;
  const who = winnerIdx === 0 ? 'Player A' : 'Player B';
  const msg = `Target reached (${target}). ${who} wins the round. BANK persists.`;
  log(msg);
  showRoundAlert(msg);
}
function checkPlayToEnd() {
  const target = window.__getPlayTo();
  if (target === null) return false;
  const a = players[0].score, b = players[1].score;
  if (reachedTarget(a, target) && reachedTarget(b, target)) { endRoundByTarget(a >= b ? 0 : 1, target); return true; }
  if (reachedTarget(a, target)) { endRoundByTarget(0, target); return true; }
  if (reachedTarget(b, target)) { endRoundByTarget(1, target); return true; }
  return false;
}

// -------------------- Draw / Discard --------------------
function drawN(p, n) {
  for (let k = 0; k < n; k++) {
    if (deck.length === 0) { log('Deck is empty.'); return; }
    players[p].hand.push(deck.shift());
  }
  renderHand(p); renderStack('deck', deck);
}
function drawOneIfMyTurn(p) {
  if (window.__turn !== p) { log('It is not your turn.'); return; }
  if (drewThisTurn[p]) { log(`Player ${p === 0 ? 'A' : 'B'} already drew this turn.`); return; }
  if (deck.length === 0) { log('Deck is empty.'); return; }
  drawN(p, 1); drewThisTurn[p] = true; log(`Player ${p === 0 ? 'A' : 'B'} drew 1 card.`); updateTurnControls();
}
function toggleDiscardMode(p) {
  if (window.__turn !== p) { log('It is not your turn.'); return; }
  if (bf[p] !== null) { log('You have already played to the battlefield.'); return; }
  if (players[p].hand.length === 0) { log('Hand is empty.'); return; }
  discardMode[p] = !discardMode[p];
  log(`Discard mode ${discardMode[p] ? 'ON' : 'OFF'} for Player ${p === 0 ? 'A' : 'B'}.`);
  updateTurnControls(); renderHand(p);
}

// -------------------- Round Summary --------------------
function summarizeRoundAndEnd() {
  const a = players[0].score, b = players[1].score;
  const msg = (a > b)
    ? `Round finished. Player A wins the round ${a} to ${b}. BANK persists.`
    : (b > a)
      ? `Round finished. Player B wins the round ${b} to ${a}. BANK persists.`
      : `Round finished in a tie ${a} to ${b}. BANK persists.`;
  log(msg);
  window.__turn = null;
  setTurnText();
  return msg;
}

// -------------------- Core Play --------------------
function playCard(playerIdx, handIndex) {
  const card = players[playerIdx].hand.splice(handIndex, 1)[0];
  const opponent = 1 - playerIdx;
  const bfId = playerIdx === 0 ? 'bf1' : 'bf2';

  const applyBank = (targetIdx, delta) => {
    if (delta > 0) {
      const before = players[targetIdx].bank;
      players[targetIdx].bank = Math.max(0, before - delta);
      const red = before - players[targetIdx].bank;
      log(`Bank impact on Player ${targetIdx === 0 ? 'A' : 'B'}: -${red} BANK.`);
    } else if (delta < 0) {
      players[targetIdx].bank += (-delta);
      log(`Bank boost for Player ${targetIdx === 0 ? 'A' : 'B'}: +${-delta} BANK.`);
    }
  };
  const pvpToggle = () => document.getElementById('pvpEffects').checked;

  if (card.type === 'LifeEvent') {
    if (card.target === 'self') {
      const d = card.scoreMod || 0; players[playerIdx].score += d;
      log(`Self-help: ${card.name} → Player ${playerIdx === 0 ? 'A' : 'B'} SCORE ${d >= 0 ? '+' : ''}${d}.`);
      if (card.bankMod) applyBank(playerIdx, -card.bankMod);
      discard.push(card);
      if (checkPlayToEnd()) { renderAll(); return; }
    } else if (card.target === 'opponent') {
      const d = card.scoreMod || 0; players[opponent].score += d;
      log(`Negative event: ${card.name} → Player ${opponent === 0 ? 'A' : 'B'} SCORE ${d}.`);
      if (card.bankMod) applyBank(opponent, card.bankMod);
      discard.push(card);
      if (checkPlayToEnd()) { renderAll(); return; }
    } else {
      let d = card.scoreMod || 0;
      if (pvpToggle()) {
        if (d > 0) d = -d; players[opponent].score += d;
        log(`PvP Life: ${card.name} → Player ${opponent === 0 ? 'A' : 'B'} SCORE ${d}.`);
      } else {
        players[playerIdx].score += d;
        log(`Life: ${card.name} → Player ${playerIdx === 0 ? 'A' : 'B'} SCORE ${d >= 0 ? '+' : ''}${d}.`);
      }
      discard.push(card);
      if (checkPlayToEnd()) { renderAll(); return; }
    }
  } else if (card.type === 'Economy') {
    if (card.target === 'opponent') {
      applyBank(opponent, card.bankMod || 0);
      log(`Opponent economy: ${card.name} hits Player ${opponent === 0 ? 'A' : 'B'}.`);
      discard.push(card);
    } else if (card.target === 'self') {
      applyBank(playerIdx, -(card.bankMod || 0));
      log(`Self economy: ${card.name} boosts Player ${playerIdx === 0 ? 'A' : 'B'}.`);
      discard.push(card);
    } else {
      const d = card.bankMod || 0;
      if (pvpToggle()) {
        applyBank(opponent, d);
        log(`PvP Economy: ${card.name} reduces Player ${opponent === 0 ? 'A' : 'B'} BANK by ${d}.`);
      } else {
        players[playerIdx].bank += d;
        log(`Economy: ${card.name} increases Player ${playerIdx === 0 ? 'A' : 'B'} BANK by ${d}.`);
      }
      discard.push(card);
    }
  } else {
    // Battlefield-type card
    bf[playerIdx] = card;
    const el = document.createElement('div'); el.className = 'card'; el.innerHTML = cardHTML(card);
    document.getElementById(bfId).innerHTML = ''; document.getElementById(bfId).appendChild(el);
  }

  // Advance turn
  window.__turn = 1 - playerIdx; drewThisTurn[window.__turn] = false; setTurnText();

  // Resolve clash if both sides have a card
  if (bf[0] && bf[1]) {
    const a = bf[0], bCard = bf[1];
    const mode = document.getElementById('rngMode').value;
    const cmp = compareWithRandomizers(a, bCard, mode, log);
    if (cmp > 0) { players[0].score += 1; log(`Clash: Player A wins (${a.name} vs ${bCard.name}).`); }
    else if (cmp < 0) { players[1].score += 1; log(`Clash: Player B wins (${bCard.name} vs ${a.name}).`); }
    else { log('Clash: tie.'); }

    if (checkPlayToEnd()) {
      discard.push(a, bCard); bf[0] = bf[1] = null;
      document.getElementById('bf1').innerHTML = ''; document.getElementById('bf2').innerHTML = '';
      renderAll(); return;
    }
    discard.push(a, bCard); bf[0] = bf[1] = null;
    document.getElementById('bf1').innerHTML = ''; document.getElementById('bf2').innerHTML = '';
  }

  // End of round check
  if (players[0].hand.length === 0 && players[1].hand.length === 0) {
    const msg = summarizeRoundAndEnd(); showRoundAlert(msg);
  }

  updateScoreboard(); renderHand(0); renderHand(1); renderStack('discard', discard);
}

// -------------------- Expose handlers for UI --------------------
window.__handlers.playCard = playCard;
window.__handlers.discardCard = function (playerIdx, handIndex) {
  const card = players[playerIdx].hand.splice(handIndex, 1)[0];
  discard.push(card);
  log(`Discard: Player ${playerIdx === 0 ? 'A' : 'B'} discarded ${card.name}.`);
  discardMode[playerIdx] = false;
  renderHand(playerIdx);
  renderStack('discard', discard);
  updateTurnControls();
  window.__turn = 1 - playerIdx; drewThisTurn[window.__turn] = false; setTurnText();
  if (players[0].hand.length === 0 && players[1].hand.length === 0) {
    const msg = summarizeRoundAndEnd(); showRoundAlert(msg);
  }
};

// -------------------- Bank Actions & Dealing --------------------
function populateBankActions(actions) {
  const sel = document.getElementById('bankAction'); if (!sel) return;
  sel.innerHTML = '';
  actions.forEach(a => {
    const o = document.createElement('option');
    o.value = a.key;
    o.textContent = a.name;
    sel.appendChild(o);
  });
}
function dealEightEach() {
  if (deck.length < 16) { log('Not enough cards to deal.'); return; }
  players[0].hand = []; players[1].hand = [];
  for (let i = 0; i < 16; i++) {
    const card = deck.shift();
    players[i % 2].hand.push(card);
  }
  bf[0] = bf[1] = null;
  window.__turn = 0;
  drewThisTurn[0] = drewThisTurn[1] = false;
  discardMode[0] = discardMode[1] = false;
  setTurnText();
  document.getElementById('nextRound').disabled = false;
  document.getElementById('resetScores').disabled = false;
  document.getElementById('spendBank').disabled = false;
  renderAll();
}
function resetScores() { players[0].score = 0; players[1].score = 0; log('Scores reset.'); updateScoreboard(); }
function nextRound() {
  const auto = document.getElementById('autoReset').checked;
  if (auto) { players[0].score = 0; players[1].score = 0; log('Auto reset scores.'); }
  if (deck.length < 16) { log('Not enough cards for new round.'); return; }
  dealEightEach(); log('New round started. Player A begins.');
}
function enable(el, on) { el.disabled = !on; el.setAttribute('aria-disabled', String(!on)); }

// -------------------- Controls & Event Wiring --------------------
const makeBtn = document.getElementById('makeDeck');
const shuffleBtn = document.getElementById('shuffle');
const dealBtn = document.getElementById('deal');
const nextRoundBtn = document.getElementById('nextRound');
const resetScoresBtn = document.getElementById('resetScores');
const spendBtn = document.getElementById('spendBank');
const seedBtn = document.getElementById('applySeed');
const drawA = document.getElementById('drawA'), drawB = document.getElementById('drawB');
const discA = document.getElementById('toggleDiscardA'), discB = document.getElementById('toggleDiscardB');
const closeModalBtn = document.getElementById('closeRoundModal');

// NEW: art apply & reskin-in-place buttons
const applyArtBtn = document.getElementById('applyArt');   // destructive → rebuild
const reskinBtn   = document.getElementById('reskinArt');  // non-destructive → update art in place

// Build Deck (also used for "Apply Art (Rebuild)")
async function buildWithCurrentSettings() {
  const s = readSettingsFromDOM();
  saveSettings(s);

  resetAll();
  const built = await buildDeck({ svgTheme: s.svgTheme, imagePack: s.imagePack, preferImages: s.preferImages });
  built.forEach(c => deck.push(c));

  // Clear battlefield DOM mounts
  const bf1 = document.getElementById('bf1'), bf2 = document.getElementById('bf2');
  if (bf1) bf1.innerHTML = '';
  if (bf2) bf2.innerHTML = '';

  renderAll();
  log(`Built a deck of ${deck.length} cards (svgTheme=${s.svgTheme}, imagePack=${s.imagePack}, preferImages=${s.preferImages}).`);
  // Enable relevant controls just like the original flow
  enable(shuffleBtn, true);
  enable(dealBtn, false);
  enable(nextRoundBtn, false);
  enable(resetScoresBtn, false);
  enable(spendBtn, false);
}

// Non-destructive re-skin
function reskinArtInPlace() {
  const s = readSettingsFromDOM();
  saveSettings(s);
  const ctx = makeArtContext(s);

  const retag = (card) => {
    if (!card) return;
    const { html, meta } = resolveArt(card, ctx, card.id);
    card.art = html;
    card.__artMeta = meta;
  };

  deck.forEach(retag);
  discard.forEach(retag);
  players[0].hand.forEach(retag);
  players[1].hand.forEach(retag);
  if (bf[0]) retag(bf[0]);
  if (bf[1]) retag(bf[1]);

  renderAll();

  const bf1 = document.getElementById('bf1'), bf2 = document.getElementById('bf2');
  if (bf1 && bf[0]) { bf1.innerHTML = ''; const el = document.createElement('div'); el.className = 'card'; el.innerHTML = cardHTML(bf[0]); bf1.appendChild(el); }
  if (bf2 && bf[1]) { bf2.innerHTML = ''; const el = document.createElement('div'); el.className = 'card'; el.innerHTML = cardHTML(bf[1]); bf2.appendChild(el); }

  log(`Re-skinned in place (svgTheme=${s.svgTheme}, imagePack=${s.imagePack}, preferImages=${s.preferImages}). State preserved.`);
}

// -------------------- Event listeners --------------------
makeBtn?.addEventListener('click', async () => {
  try { await buildWithCurrentSettings(); }
  catch (e) { log(String(e)); }
});
applyArtBtn?.addEventListener('click', async () => {
  try { await buildWithCurrentSettings(); log('Applied art via rebuild.'); }
  catch (e) { log(String(e)); }
});
reskinBtn?.addEventListener('click', () => { reskinArtInPlace(); });

shuffleBtn?.addEventListener('click', () => { shuffleInPlace(deck); renderAll(); log('Deck shuffled.'); enable(dealBtn, true); });
dealBtn?.addEventListener('click', () => {
  if (window.__turn !== null) { log('A hand is already active.'); return; }
  dealEightEach();
  log(`Dealt 8 each. Player A has ${players[0].hand.length}. Player B has ${players[1].hand.length}. Player A starts.`);
});
nextRoundBtn?.addEventListener('click', () => { nextRound(); });
resetScoresBtn?.addEventListener('click', () => { resetScores(); });
spendBtn?.addEventListener('click', () => {
  if (window.__turn === null) { log('No active turn.'); return; }
  const key = document.getElementById('bankAction').value;
  const action = BANK_ACTIONS.find(a => a.key === key);
  const p = window.__turn;
  if (!action) { log('No action selected.'); return; }
  if (players[p].bank < action.cost) { log(`Player ${p === 0 ? 'A' : 'B'} lacks BANK.`); return; }
  players[p].bank -= action.cost;
  action.effect(p, drawN, players, updateScoreboard, checkPlayToEnd);
  log(`Player ${p === 0 ? 'A' : 'B'} spent ${action.cost} BANK to ${action.name}.`);
  updateScoreboard();
});
seedBtn?.addEventListener('click', () => {
  const seed = document.getElementById('seedInput')?.value.trim();
  applySeed(seed, log);
});
drawA?.addEventListener('click', () => drawOneIfMyTurn(0));
drawB?.addEventListener('click', () => drawOneIfMyTurn(1));
discA?.addEventListener('click', () => toggleDiscardMode(0));
discB?.addEventListener('click', () => toggleDiscardMode(1));
closeModalBtn?.addEventListener('click', closeRoundAlert);
document.getElementById('roundModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'roundModal') closeRoundAlert();
});

// -------------------- Single DOM Ready Init --------------------
window.addEventListener('DOMContentLoaded', () => {
  const s = loadSettings();
  writeSettingsToDOM(s);
  populateBankActions(BANK_ACTIONS);
  // Kick off initial build using current settings
  makeBtn?.click();
});
