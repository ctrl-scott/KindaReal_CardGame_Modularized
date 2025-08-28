// js/settings.js
const KEY = 'cardgame_art_settings_v1';

const DEFAULTS = {
  svgTheme: 'realistic',   // 'realistic' | 'fantasy'
  imagePack: 'none',       // 'none' | 'noir' | 'watercolor' | 'neon' | ...
  preferImages: false      // boolean
};

export function loadSettings(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  }catch{
    return { ...DEFAULTS };
  }
}

export function saveSettings(s){
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Helper for UI inputs → settings obj
export function readSettingsFromDOM(){
  const svgTheme = document.getElementById('svgTheme')?.value || DEFAULTS.svgTheme;
  const imagePack = document.getElementById('imagePack')?.value || DEFAULTS.imagePack;
  const preferImages = !!document.getElementById('preferImages')?.checked;
  return { svgTheme, imagePack, preferImages };
}

export function writeSettingsToDOM(s){
  const { svgTheme, imagePack, preferImages } = s;
  const $svg = document.getElementById('svgTheme');
  const $pack = document.getElementById('imagePack');
  const $pref = document.getElementById('preferImages');
  if($svg) $svg.value = svgTheme;
  if($pack) $pack.value = imagePack;
  if($pref) $pref.checked = preferImages;
}
