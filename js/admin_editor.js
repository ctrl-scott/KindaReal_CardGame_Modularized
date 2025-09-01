//https://chatgpt.com/share/68b5e8d0-ebc0-800c-a033-3412b0a92b19
// js/admin_editor.js
// A lightweight card editor that writes directly to card_json/*.json
// Requires Chrome/Edge on http://localhost (File System Access API).

const statusEl = document.getElementById('status');
const fileSelect = document.getElementById('fileSelect');
const listEl = document.getElementById('list');

const fields = {
  name:      document.getElementById('name'),
  type:      document.getElementById('type'),
  target:    document.getElementById('target'),
  copies:    document.getElementById('copies'),
  power:     document.getElementById('power'),
  scoreMod:  document.getElementById('scoreMod'),
  bankMod:   document.getElementById('bankMod'),
  bg:        document.getElementById('bg'),
};

let dirHandle = null;
let currentFileHandle = null;
let currentData = [];       // parsed JSON array
let selectedIndex = -1;     // which card is highlighted in list

const DEFAULTS = {
  name: 'Unnamed Card',
  type: 'card',
  power: 0, scoreMod: 0, bankMod: 0,
  target: 'self',
  bg: './default_bg_image.png'
};

function setStatus(t){ statusEl.textContent = t; }
function enable(el, on=true){ el.disabled = !on; }

/*function cardRowHTML(c, i){
  const tag = (c.type || '') + (c.target ? ` • ${c.target}` : '');
  return `
    <div class="rowitem" data-idx="${i}">
      <div>
        <div><strong>${escapeHTML(c.name ?? '(no name)')}</strong></div>
        <div class="muted">${tag} • Pwr ${c.power|0} • S ${c.scoreMod|0} • B ${c.bankMod|0}</div>
      </div>
      <div class="muted">#${i+1}</div>
    </div>`;
}*/

function cardRowHTML(c, i) {
  const tag = (c.type || '') + (c.target ? ' • ' + c.target : '');
  return (
    '<div class="rowitem" data-idx="' + i + '">' +
      '<div>' +
        '<div><strong>' + escapeHTML(c.name ?? '(no name)') + '</strong></div>' +
        '<div class="muted">' + tag +
          ' • Pwr ' + (c.power | 0) +
          ' • S ' + (c.scoreMod | 0) +
          ' • B ' + (c.bankMod | 0) +
        '</div>' +
      '</div>' +
      '<div class="muted">#' + (i + 1) + '</div>' +
    '</div>'
  );
}

function escapeHTML(s){ return String(s).replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

async function pickFolder(){
  try{
    dirHandle = await window.showDirectoryPicker({ id: 'card_json' });
  }catch(e){
    setStatus('Folder selection cancelled.');
    return;
  }
  // Filter to json files
  const files = [];
  for await (const entry of dirHandle.values()){
    if (entry.kind === 'file' && entry.name.endsWith('.json')) files.push(entry);
  }
  files.sort((a,b)=>a.name.localeCompare(b.name));

  fileSelect.innerHTML = files.map(f=>`<option value="${f.name}">${f.name}</option>`).join('');
  enable(fileSelect, files.length>0);
  enable(document.getElementById('reload'), true);
  enable(document.getElementById('saveFile'), true);

  if (files.length === 0){
    setStatus('No *.json files found in this folder.');
  } else {
    setStatus(`Loaded folder. ${files.length} JSON files.`);
    currentFileHandle = await dirHandle.getFileHandle(files[0].name);
    await loadCurrentFile();
  }
}

async function ensurePermission(handle, mode='readwrite'){
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

async function loadCurrentFile(){
  if (!currentFileHandle) return;
  if (!(await ensurePermission(currentFileHandle, 'readwrite'))){
    setStatus('Permission denied for this file.');
    return;
  }
  const file = await currentFileHandle.getFile();
  const text = await file.text();
  try{
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('JSON root is not an array');
    currentData = arr;
    renderList();
    setStatus(`Loaded ${currentFileHandle.name} (${currentData.length} cards).`);
  }catch(e){
    setStatus(`Parse error: ${e.message}`);
  }
}

function renderList(){
  listEl.innerHTML = currentData.map(cardRowHTML).join('');
  listEl.querySelectorAll('.rowitem').forEach(el=>{
    el.onclick = ()=> {
      selectedIndex = Number(el.dataset.idx);
      const c = currentData[selectedIndex] || {};
      // populate form
      fields.name.value     = c.name ?? '';
      fields.type.value     = c.type ?? 'card';
      fields.target.value   = c.target ?? '';
      fields.copies.value   = Number.isFinite(c.copies) ? c.copies : 1;
      fields.power.value    = Number.isFinite(c.power) ? c.power : 0;
      fields.scoreMod.value = Number.isFinite(c.scoreMod) ? c.scoreMod : 0;
      fields.bankMod.value  = Number.isFinite(c.bankMod) ? c.bankMod : 0;
      fields.bg.value       = c.bg ?? '';
      // highlight
      listEl.querySelectorAll('.rowitem').forEach(e=> e.style.background='');
      el.style.background = 'var(--surface)';
    };
  });
}

function readForm(){
  const v = (id) => fields[id].value;
  const n = (id) => Number(fields[id].value);
  const target = v('target') || undefined; // omit if empty
  const copies = Math.max(1, n('copies') || 1);
  return {
    name: v('name') || DEFAULTS.name,
    type: v('type') || DEFAULTS.type,
    target,
    power: n('power') || 0,
    scoreMod: n('scoreMod') || 0,
    bankMod: n('bankMod') || 0,
    bg: v('bg') || DEFAULTS.bg,
    ...(copies !== 1 ? { copies } : {}) // only write if >1
  };
}

async function saveFile(){
  if (!currentFileHandle) return;
  const writable = await currentFileHandle.createWritable();
  await writable.write(JSON.stringify(currentData, null, 2));
  await writable.close();
  setStatus(`Saved ${currentFileHandle.name} (${currentData.length} cards).`);
}

function pushNewCard(){
  const c = readForm();
  currentData.push(c);
  renderList();
  setStatus('Card added (not yet saved). Click “Save file”.');
}
function updateSelected(){
  if (selectedIndex < 0) { setStatus('Select a card to update.'); return; }
  currentData[selectedIndex] = { ...currentData[selectedIndex], ...readForm() };
  renderList();
  setStatus(`Updated row #${selectedIndex+1} (not yet saved).`);
}
function deleteSelected(){
  if (selectedIndex < 0) { setStatus('Select a card to delete.'); return; }
  currentData.splice(selectedIndex, 1);
  selectedIndex = -1;
  renderList();
  setStatus('Deleted (not yet saved).');
}

async function newFile(){
  if (!dirHandle) return;
  const name = prompt('New JSON file name (e.g., custom_events.json):');
  if (!name) return;
  const fh = await dirHandle.getFileHandle(name, { create: true });
  currentFileHandle = fh;
  currentData = [];
  fileSelect.insertAdjacentHTML('beforeend', `<option value="${name}">${name}</option>`);
  fileSelect.value = name;
  renderList();
  setStatus(`Created ${name}. Add cards then “Save file”.`);
}

// “Rebuild game” options
function openGame(){
  window.open('./cardgame_v7_modularized.html', '_blank');
}
function rebuildGame(){
  // If the game is open in this tab (or after you open it), it will read settings and rebuild.
  // Easiest: tell the user to press the “Build Deck” button OR auto-click it:
  const game = window.opener || window; // try same tab first
  try{
    if (game && game.document){
      const btn = game.document.getElementById('makeDeck');
      if (btn) { btn.click(); setStatus('Triggered “Build Deck” in game.'); return; }
    }
  }catch{}
  setStatus('Open the game and click “Build Deck”.');
}

document.getElementById('pickFolder').onclick   = pickFolder;
document.getElementById('reload').onclick       = loadCurrentFile;
document.getElementById('saveFile').onclick     = saveFile;
document.getElementById('newFile').onclick      = newFile;
document.getElementById('addCard').onclick      = pushNewCard;
document.getElementById('updateCard').onclick   = updateSelected;
document.getElementById('deleteCard').onclick   = deleteSelected;
document.getElementById('openGame').onclick     = openGame;
document.getElementById('rebuildGame').onclick  = rebuildGame;

fileSelect.onchange = async ()=>{
  if (!dirHandle) return;
  currentFileHandle = await dirHandle.getFileHandle(fileSelect.value);
  await loadCurrentFile();
};
