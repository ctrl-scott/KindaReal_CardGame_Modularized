import { TYPES } from './constants.js';

/** ArtContext */
export function makeArtContext({ svgTheme='realistic', imagePack='none', preferImages=false } = {}){
  return { svgTheme, imagePack, preferImages };
}

// --- SVG generators (unchanged visuals) ---
function artFaction(theme) {
  const fill = theme === 'fantasy' ? '#7c3aed' : '#00c853';
  const extra = theme === 'fantasy' ? '<circle cx="72" cy="40" r="8" fill="#a78bfa" />' : '';
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Faction">
            <rect x="8" y="8" width="104" height="104" rx="16" fill="${fill}" opacity="0.15"/>
            <g fill="${fill}">
              <circle cx="36" cy="40" r="12"/>
              <rect x="34" y="52" width="4" height="28" rx="2"/>
              <rect x="24" y="60" width="24" height="4" rx="2"/>
              <circle cx="72" cy="36" r="12"/>
              <rect x="70" y="48" width="4" height="30" rx="2"/>
              <rect x="60" y="58" width="24" height="4" rx="2"/>
            </g>${extra}
          </svg>`;
}

// --- Image packs ---
const PACK_MAP = {
  noir: {
    [TYPES.FACTION]: 'img/packs/noir/faction.png',
    [TYPES.BADGE]: 'img/packs/noir/badge.png',
    [TYPES.TICKET]: 'img/packs/noir/ticket.png',
    [TYPES.ECONOMY]: 'img/packs/noir/economy.png',
    [TYPES.ATTORNEY]: 'img/packs/noir/attorney.png',
    [TYPES.LIFE]: 'img/packs/noir/life.png'
  },
  watercolor: {
    [TYPES.FACTION]: 'img/packs/watercolor/faction.webp',
    [TYPES.BADGE]: 'img/packs/watercolor/badge.webp',
    [TYPES.TICKET]: 'img/packs/watercolor/ticket.webp',
    [TYPES.ECONOMY]: 'img/packs/watercolor/economy.webp',
    [TYPES.ATTORNEY]: 'img/packs/watercolor/attorney.webp',
    [TYPES.LIFE]: 'img/packs/watercolor/life.webp'
  },
  neon: {
    [TYPES.FACTION]: 'img/packs/neon/faction.avif',
    [TYPES.BADGE]: 'img/packs/neon/badge.avif',
    [TYPES.TICKET]: 'img/packs/neon/ticket.avif',
    [TYPES.ECONOMY]: 'img/packs/neon/economy.avif',
    [TYPES.ATTORNEY]: 'img/packs/neon/attorney.avif',
    [TYPES.LIFE]: 'img/packs/neon/life.avif'
  }
};

function bgDiv(url) {
  return `<div style="width:100%;height:100%;background:url('${url}') center/cover no-repeat;border-radius:12px"></div>`;
}

function packImageFor(type, imagePack) {
  if (!imagePack || imagePack === 'none') return null;
  const table = PACK_MAP[imagePack];
  return table ? table[type] || null : null;
}

// -------- Deterministic index for bg arrays --------
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFromArrayDeterministic(arr, stableKey) {
  if (arr.length === 0) return null;
  const h = hash32(String(stableKey));
  const idx = h % arr.length;
  return arr[idx];
}

/**
 * Resolve the best art for a card with deterministic behavior.
 * @param {object} card - { id, type, bg?: string|string[] }
 * @param {ArtContext} ctx - { svgTheme, imagePack, preferImages }
 * @param {string|number} stableKey - Used to select bg from arrays consistently
 * @returns {{ html: string, meta: {source:'card-bg'|'pack'|'svg', url?:string} }}
 */
export function resolveArt(card, ctx, stableKey) {
  const theme = ctx?.svgTheme || 'realistic';
  const preferImages = !!ctx?.preferImages;
  const imagePack = ctx?.imagePack || 'none';

  // 1) Card-provided bg (string OR array of strings)
  if (card?.bg) {
    const url = Array.isArray(card.bg)
      ? pickFromArrayDeterministic(card.bg, `${stableKey}|${imagePack}|${theme}`)
      : card.bg;
    if (url) {
      return { html: bgDiv(url), meta: { source: 'card-bg', url } };
    }
  }

  // 2) Image pack (by type), if preferred
  if (preferImages) {
    const packUrl = packImageFor(card.type, imagePack);
    if (packUrl) {
      return { html: bgDiv(packUrl), meta: { source: 'pack', url: packUrl } };
    }
  }

  // 3) SVG fallback
  let svg;
  switch (card.type) {
    case TYPES.FACTION: svg = artFaction(theme); break;
    case TYPES.BADGE: svg = artBadge(theme); break;
    case TYPES.TICKET: svg = artTicket(theme); break;
    case TYPES.LIFE: svg = artLife(theme); break;
    case TYPES.ECONOMY: svg = artEconomy(theme); break;
    case TYPES.ATTORNEY: svg = artAttorney(theme); break;
    default: svg = artLife(theme); // Default fallback if type is not found
  }

  return { html: svg, meta: { source: 'svg' } };
}

/**
 * Convenience wrapper that returns just HTML (compatible with your previous artForCard).
 */
export function artForCard(card, ctx, stableKey) {
  const { html } = resolveArt(card, ctx, stableKey);
  return html || "<div>Default Art</div>"; // Ensure fallback HTML
}
