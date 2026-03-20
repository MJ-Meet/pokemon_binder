const API = 'http://localhost:8000';
const COLORS = ["#e63946","#3b4cca","#ffcb05","#2dc653","#9b5de5","#f77f00","#e040fb","#00b4d8"];
const POKEMON_TYPES = [
  { name: 'Fire', color: '#f08030', icon: '🔥' },
  { name: 'Water', color: '#6890f0', icon: '💧' },
  { name: 'Grass', color: '#78c850', icon: '🌿' },
  { name: 'Electric', color: '#f8d030', icon: '⚡' },
  { name: 'Psychic', color: '#c461e8', icon: '👁️' },
  { name: 'Fighting', color: '#c03028', icon: '🥊' },
  { name: 'Dark', color: '#705848', icon: '🌑' },
  { name: 'Steel', color: '#b8b8d0', icon: '⚙️' },
  { name: 'Dragon', color: '#7038f8', icon: '🐲' },
  { name: 'Colorless', color: '#a8a878', icon: '⚪' }
];

let binders = [];
let curBinder = null;
let curPage = 0;
let curSlot = null;
let editId = null;
let curSearch = '';
let curTag = null;
let selectedGS = 3;
let pendingTags = [];
let selectedType = null;

// Init
window.onload = () => {
  fetchBinders();
  initPickers();
  initTagInput();
  initDragDrop();
  renderTypeSelector();
};

function renderTypeSelector() {
  const container = document.getElementById('cm_types');
  if (!container) return;
  container.innerHTML = POKEMON_TYPES.map(t => `
    <div class="type-btn" data-type="${t.name}" style="--type-color: ${t.color}; --type-bg: ${t.color}33" onclick="selectCardType('${t.name}')">
      <div class="type-icon">${t.icon}</div>
      <div class="type-name">${t.name}</div>
    </div>
  `).join('');
}

function selectCardType(typeName) {
  selectedType = typeName;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === typeName);
  });
}

function initDragDrop() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  zone.addEventListener('dragenter', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragover',  e => { e.preventDefault(); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById('cm_file');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      previewImg(input);
    }
  });
}

const notify = (msg, err = false) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? 'rgba(239, 68, 68, 0.9)' : 'rgba(24, 24, 31, 0.9)';
  t.classList.add('active');
  setTimeout(() => t.classList.remove('active'), 3000);
};

async function fetchBinders() {
  try {
    const resp = await fetch(`${API}/binders`);
    binders = await resp.json();
    renderSidebar();
    if (!curBinder && binders.length) selectBinder(binders[0].id);
  } catch { notify('Server unavailable', true); }
}

function renderSidebar() {
  const list = document.getElementById('binderList');
  if (!binders.length) {
    list.innerHTML = `<div style="text-align:center;padding:1rem;font-size:0.875rem;color:var(--text-dim)">No binders yet.</div>`;
    return;
  }
  list.innerHTML = binders.map(b => `
    <button class="binder-btn ${curBinder?.id === b.id ? 'active' : ''}" onclick="selectBinder(${b.id})">
      <div class="binder-icon" style="background:${b.color}"></div>
      <div class="binder-info">
        <div class="binder-info-name">${esc(b.name)}</div>
        <div class="binder-info-stats">${b.pages} Pages • ${b.grid_size*b.grid_size} Pockets</div>
      </div>
    </button>
  `).join('');
}

async function selectBinder(id) {
  try {
    const resp = await fetch(`${API}/binders/${id}`);
    curBinder = await resp.json();
    curPage = 0;
    clearFilters();
    renderSidebar();
    renderView();
  } catch { notify('Error loading binder', true); }
}

function renderView() {
  const main = document.getElementById('binderMainView');
  const empty = document.getElementById('binderEmptyState');
  if (!curBinder) { main.classList.add('hidden'); empty.classList.remove('hidden'); return; }
  
  main.classList.remove('hidden');
  empty.classList.add('hidden');

  const b = curBinder;
  const isSearching = curSearch || curTag;

  // Header
  const head = document.getElementById('headerSection');
  head.innerHTML = `
    <div class="header-spine" style="background:${b.color}"></div>
    <div class="header-main">
      <h1 class="header-title">${esc(b.name)}</h1>
      <div class="header-actions">
        <button class="btn btn-outline btn-sm" onclick="exportPDF(${b.id})">📄 Export PDF</button>
        <button class="btn btn-outline btn-sm" onclick="openBinderModal(${b.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBinder(${b.id})">🗑️ Delete</button>
      </div>
    </div>
  `;

  // Stats
  const total = b.pages * b.grid_size * b.grid_size;
  const cards = b.cards.length;
  const statTags = new Set();
  b.cards.forEach(c => c.tags?.forEach(t => statTags.add(t.name)));
  
  document.getElementById('statsSection').innerHTML = `
    <div class="stat-card"><div class="stat-val">${cards}</div><div class="stat-lbl">Cards</div></div>
    <div class="stat-card"><div class="stat-val">${total - cards}</div><div class="stat-lbl">Empty Slots</div></div>
    <div class="stat-card"><div class="stat-val">${b.pages}</div><div class="stat-lbl">Pages</div></div>
    <div class="stat-card"><div class="stat-val">${statTags.size}</div><div class="stat-lbl">Unique Tags</div></div>
  `;

  // Filter Chips
  const filters = document.getElementById('tagFilters');
  const tagMap = {};
  b.cards.forEach(c => c.tags?.forEach(t => tagMap[t.name] = t));
  const sortedTags = Object.values(tagMap).sort((ax,bx) => ax.name.localeCompare(bx.name));
  filters.innerHTML = sortedTags.map(t => `
    <span class="tag-chip ${curTag === t.name ? 'active' : ''}" style="background:${t.color}" onclick="toggleTag('${t.name}')">
      ${esc(t.name)}
    </span>
  `).join('');
  if (curTag || curSearch) filters.innerHTML += `<button style="background:none;border:none;color:var(--red);font-size:0.75rem;cursor:pointer;margin-left:auto" onclick="clearFilters()">Clear Filters ✕</button>`;

  // Pagination
  const pag = document.getElementById('paginationRows');
  if (isSearching) {
    pag.classList.add('hidden');
  } else {
    pag.classList.remove('hidden');
    pag.innerHTML = Array.from({length: b.pages}, (_,i) => {
      const has = b.cards.some(c => c.slot >= i*(b.grid_size**2) && c.slot < (i+1)*(b.grid_size**2));
      return `<button class="page-btn ${i === curPage ? 'active' : ''} ${has ? 'has-cards' : ''}" onclick="gotoPage(${i})">${i+1}</button>`;
    }).join('');
  }

  // Grid
  const grid = document.getElementById('cardContainer');
  grid.style.gridTemplateColumns = `repeat(${b.grid_size}, 1fr)`;
  grid.className = isSearching ? 'searching' : '';
  
  let html = '';
  if (isSearching) {
    const filtered = b.cards.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(curSearch.toLowerCase());
      const tagMatch = !curTag || c.tags.some(t => t.name === curTag);
      return nameMatch && tagMatch;
    }).sort((ax,bx) => ax.slot - bx.slot);
    
    if (!filtered.length) { html = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-dim);">No cards match your search criteria.</div>`; }
    else { html = filtered.map(c => renderCard(c)).join(''); }
  } else {
    const gsq = b.grid_size**2;
    const start = curPage * gsq;
    const end = start + gsq;
    const cardMap = {};
    b.cards.forEach(c => cardMap[c.slot] = c);
    for (let s=start; s<end; s++) {
      const c = cardMap[s];
      html += c ? renderCard(c) : `
        <div class="card-slot card-empty" onclick="openCardModal(${s})">
          <div class="plus">＋</div>
          <div style="font-size:0.6rem;font-weight:800;text-transform:uppercase;opacity:0.5">Slot ${s+1}</div>
        </div>`;
    }
  }
  grid.innerHTML = html;
}

function renderCard(c) {
  const typeDef = POKEMON_TYPES.find(t => t.name === c.card_type) || POKEMON_TYPES[9];
  const tagsHtml = (c.tags || []).slice(0, 3).map(t => `<span class="mini-tag" style="background:${t.color}">${esc(t.name)}</span>`).join('');
  const fullTags = (c.tags || []).map(t => `<span class="tag-chip" style="background:${t.color}">${esc(t.name)}</span>`).join('');
  return `
    <div class="card-slot card-filled">
      <img src="${API}/cards/${c.id}/image" class="card-img" loading="lazy">
      <div class="card-tags">
        <span class="mini-tag" style="background:${typeDef.color}; color:#fff; display:flex; align-items:center; gap:4px">
          <span>${typeDef.icon}</span> ${esc(typeDef.name)}
        </span>
        ${tagsHtml}
      </div>
      <div class="card-label">${esc(c.name)}</div>
      <div class="card-overlay">
        <div class="overlay-name">${esc(c.name)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center">${fullTags}</div>
        <button class="btn btn-danger btn-sm" style="margin-top:0.5rem" onclick="deleteCard(${c.id})">Remove</button>
      </div>
    </div>
  `;
}

// Actions
function gotoPage(p) { curPage = p; renderView(); }
function handleSearch(v) { curSearch = v; renderView(); }
function toggleTag(t) { curTag = (curTag === t) ? null : t; renderView(); }
function clearFilters() { curSearch = ''; curTag = null; document.getElementById('searchInput').value = ''; renderView(); }

// Modals
function openBinderModal(id = null) {
  editId = id;
  document.getElementById('binderModalTitle').textContent = id ? 'Edit Binder' : 'New Binder';
  const b = binders.find(x => x.id === id);
  document.getElementById('bm_name').value = b?.name || '';
  document.getElementById('bm_pages').value = b?.pages || 10;
  selectGS(b?.grid_size || 3);
  selectColorVal(b?.color || '#e63946');
  document.getElementById('btnSaveBinder').textContent = id ? 'Update Binder' : 'Create Binder';
  document.getElementById('binderModalBackdrop').classList.add('active');
}

function openCardModal(slot) {
  curSlot = slot;
  pendingTags = [];
  selectedType = null;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cm_name').value = '';
  document.getElementById('cm_file').value = '';
  document.getElementById('up_preview').classList.add('hidden');
  document.getElementById('up_empty').classList.remove('hidden');
  document.getElementById('cardModalBackdrop').classList.add('active');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

function selectGS(v) {
  selectedGS = v;
  document.querySelectorAll('.gs-btn').forEach(btn => btn.classList.toggle('active', btn.id === `gs${v}`));
}

function selectColorVal(v) {
  document.querySelectorAll('.color-box').forEach(b => b.classList.toggle('active', b.dataset.val === v));
}

function initPickers() {
  document.getElementById('bm_colors').addEventListener('click', e => {
    if (e.target.dataset.val) selectColorVal(e.target.dataset.val);
  });
}

function initTagInput() {
  const input = document.getElementById('cm_tags');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().toLowerCase();
      if (val) addTag(val);
      input.value = '';
    }
  });
}

function addTag(name) {
  if (pendingTags.includes(name)) return;
  pendingTags.push(name);
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.innerHTML = `<span>${esc(name)}</span><span class="pill-remove" onclick="this.parentElement.remove(); pendingTags=pendingTags.filter(x=>x!=='${name}')">+</span>`;
  document.getElementById('tagInputBox').insertBefore(pill, document.getElementById('cm_tags'));
}

function previewImg(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('up_preview').src = e.target.result;
      document.getElementById('up_preview').classList.remove('hidden');
      document.getElementById('up_empty').classList.add('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveBinder() {
  const name = document.getElementById('bm_name').value.trim();
  if (!name) return notify('Name is required', true);
  const pages = parseInt(document.getElementById('bm_pages').value);
  const color = document.querySelector('.color-box.active').dataset.val;
  const body = { name, pages, grid_size: selectedGS, color };
  
  document.getElementById('btnSaveBinder').disabled = true;
  try {
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API}/binders/${editId}` : `${API}/binders`;
    const resp = await fetch(url, {
      method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    const data = await resp.json();
    closeModals();
    notify('Success!');
    await fetchBinders();
    selectBinder(data.id);
  } catch { notify('Error saving binder', true); }
  finally { document.getElementById('btnSaveBinder').disabled = false; }
}

async function saveCard() {
  const name = document.getElementById('cm_name').value.trim();
  const file = document.getElementById('cm_file').files[0];
  if (!name || !file) return notify('Name and Image are required', true);
  if (!selectedType) return notify('Please select a Pokémon Type', true);

  const fd = new FormData();
  fd.append('name', name);
  fd.append('slot', curSlot);
  fd.append('card_type', selectedType);
  fd.append('file', file);
  fd.append('tags', pendingTags.join(','));

  document.getElementById('btnSaveCard').disabled = true;
  try {
    const resp = await fetch(`${API}/binders/${curBinder.id}/cards`, { method:'POST', body:fd });
    if (resp.ok) {
      closeModals();
      notify('Card added!');
      selectBinder(curBinder.id);
    } else { notify('Upload failed', true); }
  } catch { notify('Error', true); }
  finally { document.getElementById('btnSaveCard').disabled = false; }
}

async function deleteBinder(id) {
  if (!confirm('Permanently delete this binder?')) return;
  await fetch(`${API}/binders/${id}`, { method: 'DELETE' });
  curBinder = null;
  fetchBinders();
}

async function deleteCard(id) {
  if (!confirm('Remove card?')) return;
  await fetch(`${API}/cards/${id}`, { method: 'DELETE' });
  selectBinder(curBinder.id);
}

async function exportPDF(id) {
  window.location.href = `${API}/binders/${id}/export`;
  notify('PDF Download Started');
}

function esc(s) {
  if (!s) return '';
  return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
