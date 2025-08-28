import { resolveArt, makeArtContext } from './art.js';
import { TYPES } from './constants.js';

async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

// themeOrCtx can be {svgTheme, imagePack, preferImages} OR "realistic"/"fantasy"
export async function buildDeck(themeOrCtx){
  const ctx = (typeof themeOrCtx === 'string')
    ? makeArtContext({ svgTheme: themeOrCtx, imagePack: 'none', preferImages: false })
    : makeArtContext(themeOrCtx);

  const [base, lifeGeneric, lifeSelf, lifeOpp, factionEvents, econ, econOpp] = await Promise.all([
    loadJSON('card_json/base_cards.json'),
    loadJSON('card_json/life_generic.json'),
    loadJSON('card_json/life_self.json'),
    loadJSON('card_json/life_opponent.json'),
    loadJSON('card_json/faction_events.json'),
    loadJSON('card_json/economy.json'),
    loadJSON('card_json/economy_opponent.json'),
  ]);

  const expand = (spec, defaultType) => {
    const out = [];
    for(const s of spec){
      const copies = Number.isFinite(s.copies) ? s.copies : 1;
      for(let i=0;i<copies;i++){
        out.push({
          name: s.name,
          type: s.type || defaultType,
          power: s.power || 0,
          scoreMod: s.scoreMod,
          bankMod: s.bankMod,
          target: s.target,
          bg: s.bg
        });
      }
    }
    return out;
  };

  const rawDeck = [
    ...expand(base),
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
    return { id, ...c, art: html, __artMeta: meta }; // __artMeta is optional/debug
  });
}
