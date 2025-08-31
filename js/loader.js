import { resolveArt, makeArtContext } from './art.js';
import { TYPES } from './constants.js';

async function loadJSON(url){
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok){
    // Surface the exact 404/500 and path so you can spot bad locations instantly
    throw new Error(`Failed to load ${url} (status ${res.status})`);
  }
  return res.json();
}

// themeOrCtx can be {svgTheme, imagePack, preferImages} OR "realistic"/"fantasy"
export async function buildDeck(themeOrCtx){
  const ctx = (typeof themeOrCtx === 'string')
    ? makeArtContext({ svgTheme: themeOrCtx, imagePack: 'none', preferImages: true })
    : makeArtContext(themeOrCtx);

  // IMPORTANT: these URLs are resolved relative to the HTML file.
  // Ensure a folder named "card_json" sits NEXT TO your HTML file.
  const urls = [
    './card_json/base_cards.json',
    './card_json/life_generic.json',
    './card_json/life_self.json',
    './card_json/life_opponent.json',
    './card_json/faction_events.json',
    './card_json/economy.json',
    './card_json/economy_opponent.json',
  ];

  // Load all files and show a single aggregated error if any are missing
  const results = await Promise.allSettled(urls.map(loadJSON));
  const failures = results
    .map((r, i) => [r, urls[i]])
    .filter(([r]) => r.status === 'rejected');

  if (failures.length){
    const detail = failures.map(([r, u]) => `• ${u}: ${r.reason.message || r.reason}`).join('\n');
    throw new Error(`One or more JSON files failed to load:\n${detail}`);
  }

  const [
    base, lifeGeneric, lifeSelf, lifeOpp, factionEvents, econ, econOpp
  ] = results.map(r => r.value);

  // --- SAFE expand: gives a default for defaultType so "expand(base)" is fine
  const expand = (spec, defaultType = 'card') => {
    const out = [];
    for (const s of spec || []) {
      const copies = Number.isFinite(s?.copies) ? s.copies : 1;
      for (let i = 0; i < copies; i++) {
        out.push({
          name: s?.name ?? 'Unnamed Card',
          type: s?.type ?? defaultType,
          power: Number.isFinite(s?.power) ? s.power : 0,
          scoreMod: Number.isFinite(s?.scoreMod) ? s.scoreMod : 0,
          bankMod: Number.isFinite(s?.bankMod) ? s.bankMod : 0,
          target: s?.target ?? 'self',
          // If your PNG is next to the HTML use "./default_bg_image.png".
          // If it lives in /img, change this to "./img/default_bg_image.png".
          bg: s?.bg ?? 'default_bg_image.png',
        });
      }
    }
    return out;
  };

  const rawDeck = [
    ...expand(base),                             // now defaults to 'card' safely
    ...expand(lifeGeneric, TYPES.LIFE),
    ...expand(lifeSelf, TYPES.LIFE),
    ...expand(lifeOpp, TYPES.LIFE),
    ...expand(factionEvents, TYPES.LIFE),
    ...expand(econ, TYPES.ECONOMY),
    ...expand(econOpp, TYPES.ECONOMY),
  ];

  // Assign stable ids and resolve art deterministically
  return rawDeck.map((c, i) => {
    const id = i + 1;
    const { html, meta } = resolveArt(c, ctx, id);
    return { id, ...c, art: html, __artMeta: meta };
  });
}
