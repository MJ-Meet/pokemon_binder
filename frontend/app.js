// ── API Config ────────────────────────────────────────────────────────────────
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const PROD_API = 'https://pokemon-binder-pkbf.onrender.com';
const API = isLocal ? 'http://localhost:8000' : PROD_API;

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = ["#e63946","#3b4cca","#ffcb05","#2dc653","#9b5de5","#f77f00","#e040fb","#00b4d8"];
const POKEMON_TYPES = [
  { name: 'Fire',      color: '#f08030', icon: '🔥' },
  { name: 'Water',     color: '#6890f0', icon: '💧' },
  { name: 'Grass',     color: '#78c850', icon: '🌿' },
  { name: 'Electric',  color: '#f8d030', icon: '⚡' },
  { name: 'Psychic',   color: '#c461e8', icon: '👁️' },
  { name: 'Fighting',  color: '#c03028', icon: '🥊' },
  { name: 'Dark',      color: '#705848', icon: '🌑' },
  { name: 'Steel',     color: '#b8b8d0', icon: '⚙️' },
  { name: 'Dragon',    color: '#7038f8', icon: '🐲' },
  { name: 'Colorless', color: '#a8a878', icon: '⚪' },
];
const RARITIES = ['Common','Uncommon','Rare','Super Rare','Baby Shiny','Rare Shiny','Ilusration Rare(IR)','Special Art Rare (SAR)','Special Ilustration Art Rare','Gold'];

// ── State ─────────────────────────────────────────────────────────────────────
let binders        = [];
let curBinder      = null;
let curPage        = 0;
let curSlot        = null;
let editId         = null;
let curSearch      = '';
let selectedGS     = 3;
let selectedType   = null;
let currentPage    = 'binder'; // 'binder' | 'dashboard' | 'favorites' | 'sets'

// Advanced filter state
let advFilters = { type: null, rarity: null, set_name: '', fav_only: false, recent: false };

// Dashboard charts
let typeChartInst    = null;
let rarityChartInst  = null;
let growthChartInst  = null;

// Favorites state
let allFavorites = [];
let favView      = 'grid'; // 'grid' | 'list'
let favSortMode  = 'date_desc';

// Sets state
let allSets         = [];
let setsStatusFilter = 'all';
let setsSortMode    = 'pct_desc';
let allCardSets     = [];

// Card detail state
let detailCard      = null;
let detailEditType  = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.onload = () => {
  pingBackend();
  fetchBinders();
  fetchAllCardSets();
  initPickers();
  initDragDrop();
  renderTypeSelector();
  renderDetailTypeSelector();
  renderAdvancedFilters();
  navigateTo('binder');
};

async function fetchAllCardSets() {
  try {
    const resp = await fetch(`${API}/card-sets`);
    if (resp.ok) {
      allCardSets = await resp.json();
    }
  } catch(e) {
    console.error('Failed to fetch card sets', e);
  }
}

// ── Backend Ping (Render cold start) ──────────────────────────────────────────
async function pingBackend() {
  try { await fetch(`${API}/`); } catch { /* silent */ }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;

  // Toggle nav active states
  ['binder','dashboard','favorites','sets'].forEach(p => {
    const btn = document.getElementById('nav' + p.charAt(0).toUpperCase() + p.slice(1));
    if (btn) btn.classList.toggle('active', p === page);
  });

  // Toggle page visibility
  document.getElementById('binderPage').style.display    = page === 'binder'    ? '' : 'none';
  document.getElementById('dashboardPage').classList.toggle('hidden', page !== 'dashboard');
  document.getElementById('favoritesPage').classList.toggle('hidden', page !== 'favorites');
  document.getElementById('setsPage').classList.toggle('hidden',      page !== 'sets');

  if (page === 'dashboard') loadDashboard();
  if (page === 'favorites') loadFavorites();
  if (page === 'sets')      loadSets();
}

// ── Type Selectors ────────────────────────────────────────────────────────────
function renderTypeSelector() {
  const container = document.getElementById('cm_types');
  if (!container) return;
  container.innerHTML = POKEMON_TYPES.map(t => `
    <div class="type-btn" data-type="${t.name}" style="--type-color:${t.color};--type-bg:${t.color}33" onclick="selectCardType('${t.name}','cm_types')">
      <div class="type-icon">${t.icon}</div>
      <div class="type-name">${t.name}</div>
    </div>
  `).join('');
}

function renderDetailTypeSelector() {
  const container = document.getElementById('cdm_edit_types');
  if (!container) return;
  container.innerHTML = POKEMON_TYPES.map(t => `
    <div class="type-btn" data-type="${t.name}" style="--type-color:${t.color};--type-bg:${t.color}33" onclick="selectCardType('${t.name}','cdm_edit_types')">
      <div class="type-icon">${t.icon}</div>
      <div class="type-name">${t.name}</div>
    </div>
  `).join('');
}

function selectCardType(typeName, containerId = 'cm_types') {
  if (containerId === 'cdm_edit_types') {
    detailEditType = typeName;
  } else {
    selectedType = typeName;
  }
  document.querySelectorAll(`#${containerId} .type-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === typeName);
  });
}

// ── Advanced Filters ──────────────────────────────────────────────────────────
function renderAdvancedFilters() {
  // Type filter chips
  const typeGrid = document.getElementById('filterTypeGrid');
  if (typeGrid) {
    typeGrid.innerHTML = POKEMON_TYPES.map(t => `
      <div class="filter-type-chip" data-type="${t.name}" style="color:${t.color}" onclick="applyAdvancedFilter('type','${t.name}')">
        ${t.icon} ${t.name}
      </div>
    `).join('');
  }

  // Rarity filter chips
  const rarGrid = document.getElementById('filterRarityGrid');
  if (rarGrid) {
    rarGrid.innerHTML = RARITIES.map(r => `
      <div class="filter-rarity-chip" data-rarity="${r}" onclick="applyAdvancedFilter('rarity','${r}')">${r}</div>
    `).join('');
  }
}

function applyAdvancedFilter(key, value) {
  if (key === 'type') {
    advFilters.type = (advFilters.type === value) ? null : value;
    document.querySelectorAll('.filter-type-chip').forEach(c => c.classList.toggle('active', c.dataset.type === advFilters.type));
  } else if (key === 'rarity') {
    advFilters.rarity = (advFilters.rarity === value) ? null : value;
    document.querySelectorAll('.filter-rarity-chip').forEach(c => c.classList.toggle('active', c.dataset.rarity === advFilters.rarity));
  } else if (key === 'set_name') {
    advFilters.set_name = value;
  } else if (key === 'fav_only') {
    advFilters.fav_only = value;
  } else if (key === 'recent') {
    advFilters.recent = value;
  }
  renderActiveFilterChips();
  renderView();
}

function clearAdvancedFilters() {
  advFilters = { type: null, rarity: null, set_name: '', fav_only: false, recent: false };
  document.querySelectorAll('.filter-type-chip, .filter-rarity-chip').forEach(c => c.classList.remove('active'));
  const si = document.getElementById('filterSetInput');
  if (si) si.value = '';
  const fo = document.getElementById('filterFavOnly');
  if (fo) fo.checked = false;
  const ro = document.getElementById('filterRecentOnly');
  if (ro) ro.checked = false;
  renderActiveFilterChips();
  renderView();
}

function renderActiveFilterChips() {
  const chips = document.getElementById('activeFilterChips');
  if (!chips) return;
  const items = [];
  if (advFilters.type)    items.push({ label: `Type: ${advFilters.type}`,     key: 'type',     val: null });
  if (advFilters.rarity)  items.push({ label: `Rarity: ${advFilters.rarity}`, key: 'rarity',   val: null });
  if (advFilters.set_name) items.push({ label: `Set: ${advFilters.set_name}`,  key: 'set_name', val: '' });
  if (advFilters.fav_only) items.push({ label: 'Favorites Only',               key: 'fav_only', val: false });
  if (advFilters.recent)   items.push({ label: 'Recent (7d)',                  key: 'recent',   val: false });

  chips.innerHTML = items.map(it => `
    <div class="active-chip">
      ${esc(it.label)}
      <span class="active-chip-remove" onclick="clearOneFilter('${it.key}')">✕</span>
    </div>
  `).join('');
}

function clearOneFilter(key) {
  if (key === 'type')     { advFilters.type = null; document.querySelectorAll('.filter-type-chip').forEach(c => c.classList.remove('active')); }
  if (key === 'rarity')   { advFilters.rarity = null; document.querySelectorAll('.filter-rarity-chip').forEach(c => c.classList.remove('active')); }
  if (key === 'set_name') { advFilters.set_name = ''; const el = document.getElementById('filterSetInput'); if (el) el.value = ''; }
  if (key === 'fav_only') { advFilters.fav_only = false; const el = document.getElementById('filterFavOnly'); if (el) el.checked = false; }
  if (key === 'recent')   { advFilters.recent = false; const el = document.getElementById('filterRecentOnly'); if (el) el.checked = false; }
  renderActiveFilterChips();
  renderView();
}

function toggleFilterPanel() {
  const panel = document.getElementById('filterPanel');
  const btn   = document.getElementById('filterToggleBtn');
  const isHidden = panel.classList.toggle('hidden');
  btn.classList.toggle('active', !isHidden);
}

// ── Binder Fetch / Sidebar ────────────────────────────────────────────────────
async function fetchBinders() {
  try {
    const resp = await fetch(`${API}/binders`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    binders = await resp.json();
    renderSidebar();
    if (!curBinder && binders.length) selectBinder(binders[0].id);
  } catch (e) { notify(`Server unavailable: ${e.message}`, true); }
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
        <div class="binder-info-stats">${b.pages} Pages • ${b.grid_size * b.grid_size}-Pocket</div>
      </div>
    </button>
  `).join('');
}

async function selectBinder(id) {
  try {
    const resp = await fetch(`${API}/binders/${id}`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const isSame = curBinder && curBinder.id === id;
    curBinder = await resp.json();
    if (!isSame) { curPage = 0; clearFilters(); }
    renderSidebar();
    renderView();
    navigateTo('binder');
  } catch (e) { notify(`Error loading binder: ${e.message}`, true); }
}

// ── Binder View Render ────────────────────────────────────────────────────────
function renderView() {
  const main  = document.getElementById('binderMainView');
  const empty = document.getElementById('binderEmptyState');
  if (!curBinder) { main.classList.add('hidden'); empty.classList.remove('hidden'); return; }

  main.classList.remove('hidden');
  empty.classList.add('hidden');

  const b = curBinder;

  // Header
  document.getElementById('headerSection').innerHTML = `
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
  const total     = b.pages * b.grid_size * b.grid_size;
  const cards     = b.cards.length;
  const favCount  = b.cards.filter(c => c.favorite).length;

  document.getElementById('statsSection').innerHTML = `
    <div class="stat-card"><div class="stat-val">${cards}</div><div class="stat-lbl">Cards</div></div>
    <div class="stat-card"><div class="stat-val">${total - cards}</div><div class="stat-lbl">Empty Slots</div></div>
    <div class="stat-card"><div class="stat-val">${b.pages}</div><div class="stat-lbl">Pages</div></div>
    <div class="stat-card"><div class="stat-val">${favCount}</div><div class="stat-lbl">Favorites</div></div>
  `;

  // Apply all filters
  const isFiltering = curSearch || advFilters.type || advFilters.rarity || advFilters.set_name || advFilters.fav_only || advFilters.recent;

  // Pagination
  const pag = document.getElementById('paginationRows');
  if (isFiltering) {
    pag.classList.add('hidden');
  } else {
    pag.classList.remove('hidden');
    pag.innerHTML = Array.from({ length: b.pages }, (_, i) => {
      const has = b.cards.some(c => c.slot >= i * (b.grid_size ** 2) && c.slot < (i + 1) * (b.grid_size ** 2));
      return `<button class="page-btn ${i === curPage ? 'active' : ''} ${has ? 'has-cards' : ''}" onclick="gotoPage(${i})">${i + 1}</button>`;
    }).join('');
  }

  // Grid
  const grid = document.getElementById('cardContainer');
  grid.style.gridTemplateColumns = `repeat(${b.grid_size}, 1fr)`;
  grid.className = isFiltering ? 'searching' : '';

  const now7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let html = '';
  if (isFiltering) {
    const filtered = b.cards.filter(c => {
      if (curSearch && !c.name.toLowerCase().includes(curSearch.toLowerCase())) return false;
      if (advFilters.type && c.card_type !== advFilters.type) return false;
      if (advFilters.rarity && c.rarity !== advFilters.rarity) return false;
      if (advFilters.set_name && !(c.set_name || '').toLowerCase().includes(advFilters.set_name.toLowerCase())) return false;
      if (advFilters.fav_only && !c.favorite) return false;
      if (advFilters.recent && c.date_added && new Date(c.date_added).getTime() < now7d) return false;
      return true;
    }).sort((a, bx) => a.slot - bx.slot);

    html = filtered.length
      ? filtered.map(c => renderCard(c)).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-dim);">No cards match your filters.</div>`;
  } else {
    const gsq   = b.grid_size ** 2;
    const start = curPage * gsq;
    const end   = start + gsq;
    const cardMap = {};
    b.cards.forEach(c => cardMap[c.slot] = c);
    for (let s = start; s < end; s++) {
      const c = cardMap[s];
      html += c ? renderCard(c) : `
        <div class="card-slot card-empty" onclick="openCardModal(${s})">
          <div class="plus">＋</div>
          <div style="font-size:0.6rem;font-weight:800;text-transform:uppercase;opacity:0.5">Slot ${s + 1}</div>
        </div>`;
    }
  }
  grid.innerHTML = html;
}

function renderCard(c) {
  const typeDef  = POKEMON_TYPES.find(t => t.name === c.card_type) || POKEMON_TYPES[9];
  const favStar  = c.favorite ? `<div class="card-fav-star">❤️</div>` : '';
  return `
    <div class="card-slot card-filled" onclick="openCardDetail(${c.id})">
      <img src="${API}/cards/${c.id}/image" class="card-img" loading="lazy" alt="${esc(c.name)}">
      <div class="card-tags">
        <span class="mini-tag" style="background:${typeDef.color};color:#fff;display:flex;align-items:center;gap:3px">
          ${typeDef.icon} ${esc(typeDef.name)}
        </span>
      </div>
      ${favStar}
      <div class="card-label">${esc(c.name)}</div>
    </div>
  `;
}

// ── Actions ───────────────────────────────────────────────────────────────────
function gotoPage(p)     { curPage = p; renderView(); }
function handleSearch(v) { curSearch = v; renderView(); }
function clearFilters()  {
  curSearch = '';
  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  clearAdvancedFilters();
}

// ── Card Detail Modal ─────────────────────────────────────────────────────────
async function openCardDetail(cardId) {
  // Find card in curBinder first, then fall back to any binder
  let card = curBinder?.cards?.find(c => c.id === cardId);

  // If not found locally (e.g., opened from favorites/dashboard), fetch from API
  if (!card) {
    try {
      const resp = await fetch(`${API}/cards/${cardId}`);
      if (resp.ok) card = await resp.json();
    } catch { /* use null */ }
  }
  if (!card) { notify('Card not found', true); return; }

  detailCard = card;
  detailEditType = card.card_type;

  // Set image
  document.getElementById('cdm_image').src = `${API}/cards/${card.id}/image`;

  // Favorite state
  updateFavBtnState(card.favorite);

  // View mode content
  const typeDef = POKEMON_TYPES.find(t => t.name === card.card_type) || POKEMON_TYPES[9];
  document.getElementById('cdm_type_badge').innerHTML = `<span style="background:${typeDef.color};color:#fff;padding:0.3rem 0.875rem;border-radius:50px;font-size:0.8125rem;font-weight:700;display:inline-flex;align-items:center;gap:0.375rem">${typeDef.icon} ${typeDef.name}</span>`;
  document.getElementById('cdm_rarity_badge').textContent = card.rarity || '';
  document.getElementById('cdm_rarity_badge').style.display = card.rarity ? '' : 'none';
  document.getElementById('cdm_name').textContent = card.name;

  // Meta
  const setStr = card.set_name
    ? (card.set_total_cards ? `${card.set_name} (${card.set_total_cards} cards)` : card.set_name)
    : '—';
  document.getElementById('cdm_set').textContent         = setStr;
  document.getElementById('cdm_card_number').textContent = card.card_number ? `#${card.card_number}` : '—';
  const binderName = binders.find(b => b.id === card.binder_id)?.name || '—';
  document.getElementById('cdm_binder').textContent      = binderName;
  document.getElementById('cdm_date').textContent        = card.date_added ? new Date(card.date_added).toLocaleDateString() : '—';

  // Notes
  document.getElementById('cdm_notes_text').textContent = card.notes || 'No notes added.';

  // Reset to view mode
  cancelCardEdit();

  // Show backdrop
  document.getElementById('cardDetailBackdrop').classList.add('active');
}

function closeCardDetail() {
  document.getElementById('cardDetailBackdrop').classList.remove('active');
  detailCard = null;
}

function updateFavBtnState(isFav) {
  document.getElementById('cdm_fav_icon').textContent = isFav ? '❤️' : '🤍';
  document.getElementById('cdm_fav_text').textContent = isFav ? 'Remove Favorite' : 'Add Favorite';
  const badge = document.getElementById('cdm_fav_badge');
  badge.classList.toggle('hidden', !isFav);
}

async function toggleCardDetailFavorite() {
  if (!detailCard) return;
  try {
    const resp = await fetch(`${API}/cards/${detailCard.id}/favorite`, { method: 'PUT' });
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const updated = await resp.json();
    detailCard.favorite = updated.favorite;
    updateFavBtnState(updated.favorite);
    // Refresh binder data silently
    if (curBinder) {
      const card = curBinder.cards.find(c => c.id === detailCard.id);
      if (card) card.favorite = updated.favorite;
      renderView();
    }
    notify(updated.favorite ? '❤️ Added to favorites!' : '🤍 Removed from favorites');
  } catch (e) { notify(`Error: ${e.message}`, true); }
}

function toggleCardDetailEdit() {
  const viewMode  = document.getElementById('cdm_view_mode');
  const editMode  = document.getElementById('cdm_edit_mode');
  const editBtn   = document.getElementById('cdm_edit_toggle_btn');
  const saveBtn   = document.getElementById('cdm_save_btn');
  const cancelBtn = document.getElementById('cdm_cancel_btn');

  // Populate edit fields from detailCard
  document.getElementById('cdm_edit_name').value = detailCard.name || '';
  document.getElementById('cdm_edit_rarity').value = detailCard.rarity || '';
  populateSetDropdown('cdm_edit_set', detailCard.set_name || '');
  document.getElementById('cdm_edit_card_number').value = detailCard.card_number || '';
  document.getElementById('cdm_edit_set_total').value = detailCard.set_total_cards || '';
  document.getElementById('cdm_edit_notes').value = detailCard.notes || '';

  // Populate edit type selector
  detailEditType = detailCard.card_type;
  document.querySelectorAll('#cdm_edit_types .type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === detailEditType);
  });

  viewMode.classList.add('hidden');
  editMode.classList.remove('hidden');
  editBtn.classList.add('hidden');
  saveBtn.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');
}

function cancelCardEdit() {
  const viewMode  = document.getElementById('cdm_view_mode');
  const editMode  = document.getElementById('cdm_edit_mode');
  const editBtn   = document.getElementById('cdm_edit_toggle_btn');
  const saveBtn   = document.getElementById('cdm_save_btn');
  const cancelBtn = document.getElementById('cdm_cancel_btn');

  viewMode.classList.remove('hidden');
  editMode.classList.add('hidden');
  editBtn.classList.remove('hidden');
  saveBtn.classList.add('hidden');
  cancelBtn.classList.add('hidden');
}

async function saveCardEdit() {
  if (!detailCard) return;
  const name = document.getElementById('cdm_edit_name').value.trim();
  if (!name) { notify('Card name required', true); return; }

  const cardNum = document.getElementById('cdm_edit_card_number').value;
  const setTotal = document.getElementById('cdm_edit_set_total').value;
  if (cardNum && setTotal && parseInt(cardNum) > parseInt(setTotal)) {
    return notify('Card number cannot exceed Set Total Cards', true);
  }

  const body = {
    name,
    card_type:       detailEditType || detailCard.card_type,
    rarity:          document.getElementById('cdm_edit_rarity').value || null,
    set_name:        document.getElementById('cdm_edit_set').value.trim() || null,
    card_number:     parseInt(cardNum) || null,
    set_total_cards: parseInt(setTotal) || null,
    notes:           document.getElementById('cdm_edit_notes').value.trim() || null,
  };

  const btn = document.getElementById('cdm_save_btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const resp = await fetch(`${API}/cards/${detailCard.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${resp.status}`);
    }
    const updated = await resp.json();
    detailCard = updated;

    // Refresh binder
    if (curBinder) await selectBinder(curBinder.id);

    // Re-open in view mode with updated data
    cancelCardEdit();
    await openCardDetail(updated.id);

    notify('Card updated! ✨');
  } catch (e) {
    notify(`Save failed: ${e.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save';
  }
}

async function deleteDetailCard() {
  if (!detailCard) return;
  if (!confirm('Remove this card from your collection?')) return;
  try {
    await fetch(`${API}/cards/${detailCard.id}`, { method: 'DELETE' });
    closeCardDetail();
    notify('Card removed');
    if (curBinder) selectBinder(curBinder.id);
  } catch { notify('Failed to remove card', true); }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  renderDashboardSkeleton();
  try {
    const [statsResp, cardsResp] = await Promise.all([
      fetch(`${API}/stats`),
      fetch(`${API}/cards?limit=10000`),
    ]);

    let stats = null;
    if (statsResp.ok) stats = await statsResp.json();

    let allCards = [];
    if (cardsResp.ok) allCards = await cardsResp.json();

    renderDashboardStats(stats, allCards);
    renderDashboardCharts(allCards, stats);
    renderRecentCards(allCards);
    renderHighlights(stats, allCards);
  } catch (e) {
    notify(`Dashboard load error: ${e.message}`, true);
    document.getElementById('dashStatsGrid').innerHTML = `<p style="color:var(--text-dim)">Could not load stats. Is the backend running?</p>`;
  }
}

function renderDashboardSkeleton() {
  const grid = document.getElementById('dashStatsGrid');
  grid.innerHTML = Array(5).fill(0).map(() => `
    <div class="dash-stat-skeleton">
      <div class="skeleton skeleton-line" style="width:40%;margin-bottom:0.5rem"></div>
      <div class="skeleton skeleton-line" style="width:60%;height:28px;margin-bottom:0.5rem"></div>
      <div class="skeleton skeleton-line" style="width:50%"></div>
    </div>
  `).join('');
}

function renderDashboardStats(stats, allCards) {
  const grid = document.getElementById('dashStatsGrid');
  const total = allCards.length;
  const favs  = allCards.filter(c => c.favorite).length;

  // Count by type
  const typeCounts = {};
  allCards.forEach(c => { typeCounts[c.card_type] = (typeCounts[c.card_type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  // Count by rarity
  const rarCounts = {};
  allCards.forEach(c => { if (c.rarity) rarCounts[c.rarity] = (rarCounts[c.rarity] || 0) + 1; });
  const topRar = Object.entries(rarCounts).sort((a, b) => b[1] - a[1])[0];

  // Unique sets
  const sets = new Set(allCards.filter(c => c.set_name).map(c => c.set_name));

  const statItems = [
    { icon: '📦', val: total, label: 'Total Cards', sub: `Across ${binders.length} binder${binders.length !== 1 ? 's' : ''}`, color: 'yellow' },
    { icon: '❤️', val: favs,  label: 'Favorites',   sub: total ? `${Math.round(favs/total*100)}% of collection` : '', color: 'red' },
    { icon: '🏅', val: sets.size, label: 'Sets Tracked', sub: topRar ? `Most: ${topRar[0]}` : 'No sets yet', color: 'blue' },
    { icon: '🔥', val: topType ? topType[1] : 0, label: topType ? `${topType[0]} Cards` : 'Top Type', sub: topType ? 'Most common type' : 'No cards yet', color: 'green' },
    { icon: '✨', val: allCards.filter(c => c.rarity === 'Special Art Rare (SAR)' || c.rarity === 'Special Ilustration Art Rare' || c.rarity === 'Gold').length, label: 'Premium Cards', sub: 'SAR, SIAR & Gold', color: 'purple' },
  ];

  grid.innerHTML = statItems.map(it => `
    <div class="dash-stat-card color-${it.color}">
      <div class="dash-stat-icon">${it.icon}</div>
      <div class="dash-stat-val">${it.val}</div>
      <div class="dash-stat-lbl">${it.label}</div>
      ${it.sub ? `<div class="dash-stat-sub">${it.sub}</div>` : ''}
    </div>
  `).join('');
}

function renderDashboardCharts(allCards, stats) {
  // TYPE CHART
  const typeCounts = {};
  POKEMON_TYPES.forEach(t => typeCounts[t.name] = 0);
  allCards.forEach(c => { if (typeCounts[c.card_type] !== undefined) typeCounts[c.card_type]++; });

  const typeLabels = Object.keys(typeCounts).filter(k => typeCounts[k] > 0);
  const typeData   = typeLabels.map(k => typeCounts[k]);
  const typeColors = typeLabels.map(k => POKEMON_TYPES.find(t => t.name === k)?.color || '#888');

  if (typeChartInst) typeChartInst.destroy();
  const typeCtx = document.getElementById('typeChart').getContext('2d');
  typeChartInst = new Chart(typeCtx, {
    type: 'doughnut',
    data: { labels: typeLabels, datasets: [{ data: typeData, backgroundColor: typeColors, borderColor: '#18181f', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } } },
    },
  });

  // RARITY CHART
  const rarCounts = {};
  RARITIES.forEach(r => rarCounts[r] = 0);
  allCards.forEach(c => { if (c.rarity && rarCounts[c.rarity] !== undefined) rarCounts[c.rarity]++; });

  const rarLabels = RARITIES.filter(r => rarCounts[r] > 0);
  const rarData   = rarLabels.map(r => rarCounts[r]);
  const rarColors = ['#94a3b8','#60a5fa','#4ade80','#facc15','#f87171','#c084fc','#f472b6'];

  if (rarityChartInst) rarityChartInst.destroy();
  const rarCtx = document.getElementById('rarityChart').getContext('2d');
  rarityChartInst = new Chart(rarCtx, {
    type: 'bar',
    data: {
      labels: rarLabels,
      datasets: [{
        data: rarData,
        backgroundColor: rarColors.slice(0, rarLabels.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { display: false } },
      },
    },
  });

  // GROWTH CHART — simulate monthly growth from date_added
  const monthCounts = {};
  allCards.forEach(c => {
    if (!c.date_added) return;
    const d = new Date(c.date_added);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });

  const sortedMonths = Object.keys(monthCounts).sort();
  let cumulative = 0;
  const growthData = sortedMonths.map(m => { cumulative += monthCounts[m]; return cumulative; });

  if (growthChartInst) growthChartInst.destroy();
  const growthCtx = document.getElementById('growthChart').getContext('2d');
  growthChartInst = new Chart(growthCtx, {
    type: 'line',
    data: {
      labels: sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        label: 'Total Cards',
        data: growthData,
        fill: true,
        borderColor: '#ffcb05',
        backgroundColor: 'rgba(255,203,5,0.08)',
        tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ffcb05',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}

function renderRecentCards(allCards) {
  const list = document.getElementById('recentCardsList');
  const sorted = [...allCards]
    .filter(c => c.date_added)
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 6);

  if (!sorted.length) {
    list.innerHTML = `<p style="color:var(--text-dim);font-size:0.875rem">No cards yet.</p>`;
    return;
  }

  list.innerHTML = sorted.map(c => `
    <div class="recent-card-item" onclick="openCardDetail(${c.id})">
      <img class="recent-card-img" src="${API}/cards/${c.id}/image" loading="lazy" alt="${esc(c.name)}">
      <div class="recent-card-info">
        <div class="recent-card-name">${esc(c.name)}</div>
        <div class="recent-card-meta">${c.card_type || '—'} ${c.rarity ? '• ' + c.rarity : ''}</div>
      </div>
      <span style="font-size:0.72rem;color:var(--text-dim)">${new Date(c.date_added).toLocaleDateString()}</span>
    </div>
  `).join('');
}

function renderHighlights(stats, allCards) {
  const list = document.getElementById('dashHighlights');
  const favs = allCards.filter(c => c.favorite);
  const ultraRares = allCards.filter(c => ['Ultra Rare','Secret Rare','Rainbow Rare'].includes(c.rarity));
  const sets = new Set(allCards.filter(c => c.set_name).map(c => c.set_name));

  list.innerHTML = [
    { icon: '❤️', label: 'Favorited Cards', value: favs.length },
    { icon: '💎', label: 'Premium Rarity',  value: ultraRares.length },
    { icon: '📚', label: 'Sets Tracked',    value: sets.size },
    { icon: '📦', label: 'Total Binders',   value: binders.length },
  ].map(h => `
    <div class="highlight-item">
      <div class="highlight-icon">${h.icon}</div>
      <div class="highlight-info">
        <div class="highlight-label">${h.label}</div>
        <div class="highlight-value">${h.value}</div>
      </div>
    </div>
  `).join('');
}

// ── Favorites ─────────────────────────────────────────────────────────────────
async function loadFavorites() {
  try {
    const resp = await fetch(`${API}/favorites`);
    if (resp.ok) {
      allFavorites = await resp.json();
    } else {
      // Fall back: gather from all binders if /favorites not available
      const bindersResp = await fetch(`${API}/binders`);
      if (bindersResp.ok) {
        const bindersData = await bindersResp.json();
        allFavorites = bindersData.flatMap(b => (b.cards || []).filter(c => c.favorite));
      }
    }
    renderFavorites();
  } catch (e) { notify(`Could not load favorites: ${e.message}`, true); }
}

function renderFavorites() {
  const grid    = document.getElementById('favGrid');
  const empty   = document.getElementById('favEmpty');
  const subtitle = document.getElementById('favSubtitle');

  subtitle.textContent = `${allFavorites.length} card${allFavorites.length !== 1 ? 's' : ''} in your favorites`;

  // Sort
  let sorted = [...allFavorites];
  if (favSortMode === 'date_desc') sorted.sort((a, b) => new Date(b.date_added || 0) - new Date(a.date_added || 0));
  else if (favSortMode === 'date_asc') sorted.sort((a, b) => new Date(a.date_added || 0) - new Date(b.date_added || 0));
  else if (favSortMode === 'name_asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (favSortMode === 'rarity') {
    const rarOrder = { 'Gold': 0, 'Special Ilustration Art Rare': 1, 'Special Art Rare (SAR)': 2, 'Ilusration Rare(IR)': 3, 'Rare Shiny': 4, 'Baby Shiny': 5, 'Super Rare': 6, 'Rare': 7, 'Uncommon': 8, 'Common': 9, '': 10 };
    sorted.sort((a, b) => (rarOrder[a.rarity || ''] ?? 10) - (rarOrder[b.rarity || ''] ?? 10));
  }

  if (!sorted.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    document.getElementById('favHighlights').innerHTML = '';
    return;
  }
  empty.classList.add('hidden');

  // Highlights strip
  const types = {};
  sorted.forEach(c => { types[c.card_type] = (types[c.card_type] || 0) + 1; });
  const topType = Object.entries(types).sort((a,b) => b[1]-a[1])[0];
  const ultraCount = sorted.filter(c => ['Ultra Rare','Secret Rare','Rainbow Rare'].includes(c.rarity)).length;

  document.getElementById('favHighlights').innerHTML = `
    <div class="fav-highlight-card">
      <div class="fav-highlight-val">${sorted.length}</div>
      <div class="fav-highlight-lbl">Total Favorites</div>
    </div>
    <div class="fav-highlight-card">
      <div class="fav-highlight-val">${ultraCount}</div>
      <div class="fav-highlight-lbl">Premium Rarities</div>
    </div>
    <div class="fav-highlight-card">
      <div class="fav-highlight-val">${topType ? topType[0] : '—'}</div>
      <div class="fav-highlight-lbl">Favorite Type</div>
    </div>
  `;

  // Grid
  grid.className = `fav-grid${favView === 'list' ? ' list-view' : ''}`;
  grid.innerHTML = sorted.map(c => renderCard(c)).join('');
}

function setFavView(v) {
  favView = v;
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewList').classList.toggle('active', v === 'list');
  renderFavorites();
}

function setFavSort(v) {
  favSortMode = v;
  renderFavorites();
}

// ── Sets ──────────────────────────────────────────────────────────────────────
async function loadSets() {
  try {
    const resp = await fetch(`${API}/sets`);
    if (resp.ok) {
      allSets = await resp.json();
    }
    renderSets();
  } catch (e) { notify(`Could not load sets: ${e.message}`, true); }
}

function renderSets() {
  const grid  = document.getElementById('setsGrid');
  const empty = document.getElementById('setsEmpty');

  let filtered = [...allSets];

  // Status filter
  if (setsStatusFilter === 'complete') {
    filtered = filtered.filter(s => s.total > 0 && s.collected >= s.total);
  } else if (setsStatusFilter === 'incomplete') {
    filtered = filtered.filter(s => !s.total || s.collected < s.total);
  }

  // Search
  const query = document.getElementById('setSearchInput')?.value.toLowerCase() || '';
  if (query) filtered = filtered.filter(s => s.set_name.toLowerCase().includes(query));

  // Sort
  if (setsSortMode === 'pct_desc') {
    filtered.sort((a, b) => (b.collected / (b.total || 1)) - (a.collected / (a.total || 1)));
  } else if (setsSortMode === 'pct_asc') {
    filtered.sort((a, b) => (a.collected / (a.total || 1)) - (b.collected / (b.total || 1)));
  } else if (setsSortMode === 'name_asc') {
    filtered.sort((a, b) => a.set_name.localeCompare(b.set_name));
  } else if (setsSortMode === 'collected_desc') {
    filtered.sort((a, b) => b.collected - a.collected);
  }

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = filtered.map(s => {
    const pct = s.total ? Math.round((s.collected / s.total) * 100) : null;
    const isComplete = pct === 100;

    let badgeClass = 'badge-0', fillClass = 'fill-0', badgeText = 'Unknown';
    if (pct !== null) {
      badgeText = `${pct}%`;
      if (pct >= 100) { badgeClass = 'badge-100'; fillClass = 'fill-100'; }
      else if (pct >= 75) { badgeClass = 'badge-75'; fillClass = 'fill-75'; }
      else if (pct >= 50) { badgeClass = 'badge-50'; fillClass = 'fill-50'; }
      else if (pct > 0)   { badgeClass = 'badge-25'; fillClass = 'fill-25'; }
    }

    return `
      <div class="set-card ${isComplete ? 'complete' : ''}">
        <div class="set-card-header">
          <div class="set-name">${esc(s.set_name)}</div>
          <div class="set-badge ${badgeClass}">${isComplete ? '✓ Complete' : badgeText}</div>
        </div>
        <div class="set-progress-bar-wrapper">
          <div class="set-progress-stats">
            <span>${s.collected} of ${s.total || '?'} cards</span>
            <span class="set-progress-pct">${pct !== null ? pct + '%' : 'Unknown total'}</span>
          </div>
          <div class="set-progress-bar-bg">
            <div class="set-progress-bar-fill ${fillClass}" style="width:${pct !== null ? Math.min(pct, 100) : 0}%"></div>
          </div>
        </div>
        <div class="set-card-footer">
          <span>📦 ${s.collected} collected</span>
          ${s.total ? `<span>🎯 ${s.total - s.collected} remaining</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterSets(query) { renderSets(); }

function sortSetsBy(val) {
  setsSortMode = val;
  renderSets();
}

function filterSetsByStatus(status) {
  setsStatusFilter = status;
  ['all','complete','incomplete'].forEach(s => {
    const btn = document.getElementById(`setFilter${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (btn) btn.classList.toggle('active', s === status);
  });
  renderSets();
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openBinderModal(id = null) {
  editId = id;
  document.getElementById('binderModalTitle').textContent = id ? 'Edit Binder' : 'New Binder';
  const b = binders.find(x => x.id === id);
  document.getElementById('bm_name').value  = b?.name  || '';
  document.getElementById('bm_pages').value = b?.pages || 10;
  selectGS(b?.grid_size || 3);
  selectColorVal(b?.color || '#e63946');
  document.getElementById('btnSaveBinder').textContent = id ? 'Update Binder' : 'Create Binder';
  document.getElementById('binderModalBackdrop').classList.add('active');
}

function openCardModal(slot) {
  curSlot      = slot;
  selectedType = null;
  document.querySelectorAll('#cm_types .type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cm_name').value    = '';
  document.getElementById('cm_rarity').value  = '';
  populateSetDropdown('cm_set_name');
  document.getElementById('cm_card_number').value = '';
  document.getElementById('cm_set_total').value = '';

  const fileInput = document.getElementById('cm_file');
  fileInput.value = '';
  try { fileInput.files = new DataTransfer().files; } catch(e) {}

  document.getElementById('up_preview').classList.add('hidden');
  document.getElementById('up_preview').src = '';
  document.getElementById('up_empty').classList.remove('hidden');

  document.getElementById('cardModalBackdrop').classList.add('active');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// ── Grid Size / Color Pickers ─────────────────────────────────────────────────
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

// ── Drag & Drop / Preview ─────────────────────────────────────────────────────
function initDragDrop() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  zone.addEventListener('click', e => {
    if (e.target.id === 'up_preview') return;
    const input = document.getElementById('cm_file');
    if (input.files && input.files.length > 0) return;
    input.click();
  });

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

function previewImg(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('up_preview');
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      document.getElementById('up_empty').classList.add('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ── Save Binder ───────────────────────────────────────────────────────────────
async function saveBinder() {
  const name = document.getElementById('bm_name').value.trim();
  if (!name) return notify('Name is required', true);

  const pages   = parseInt(document.getElementById('bm_pages').value);
  const colorEl = document.querySelector('.color-box.active');
  if (!colorEl) return notify('Please select a color', true);
  const color   = colorEl.dataset.val;
  const body    = { name, pages, grid_size: selectedGS, color };

  const btn = document.getElementById('btnSaveBinder');
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const method = editId ? 'PUT' : 'POST';
    const url    = editId ? `${API}/binders/${editId}` : `${API}/binders`;
    const resp   = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${resp.status}`);
    }
    const data = await resp.json();
    closeModals();
    notify('Binder saved! 🎉');
    await fetchBinders();
    selectBinder(data.id);
  } catch (e) {
    notify(`Error: ${e.message}`, true);
  } finally {
    btn.disabled    = false;
    btn.textContent = editId ? 'Update Binder' : 'Create Binder';
  }
}

// ── Save Card ─────────────────────────────────────────────────────────────────
async function saveCard() {
  const name = document.getElementById('cm_name').value.trim();
  const file = document.getElementById('cm_file').files[0];

  if (!name)         return notify('Please enter a card name', true);
  if (!file)         return notify('Please select a card image', true);
  if (!selectedType) return notify('Please select a Pokémon Type', true);

  const fd = new FormData();
  fd.append('name',            name);
  fd.append('slot',            curSlot);
  fd.append('card_type',       selectedType);
  fd.append('file',            file);
  const rarityVal = document.getElementById('cm_rarity').value;
  if (rarityVal) fd.append('rarity', rarityVal);

  const setName = document.getElementById('cm_set_name').value.trim();
  if (setName) fd.append('set_name', setName);

  const cardNum = document.getElementById('cm_card_number').value;
  const setTotal = document.getElementById('cm_set_total').value;
  
  if (cardNum && setTotal && parseInt(cardNum) > parseInt(setTotal)) {
    return notify('Card number cannot exceed Set Total Cards', true);
  }

  if (cardNum) fd.append('card_number', cardNum);
  if (setTotal) fd.append('set_total_cards', setTotal);

  const btn       = document.getElementById('btnSaveCard');
  btn.disabled    = true;
  btn.textContent = 'Uploading…';

  try {
    const resp = await fetch(`${API}/binders/${curBinder.id}/cards`, { method: 'POST', body: fd });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${resp.status}`);
    }
    closeModals();
    notify('Card added! ✨');
    selectBinder(curBinder.id);
  } catch (e) {
    notify(`Upload failed: ${e.message}`, true);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Add to Collection';
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteBinder(id) {
  if (!confirm('Permanently delete this binder and all its cards?')) return;
  try {
    await fetch(`${API}/binders/${id}`, { method: 'DELETE' });
    curBinder = null;
    notify('Binder deleted');
    fetchBinders();
  } catch { notify('Failed to delete binder', true); }
}

async function deleteCard(id) {
  if (!confirm('Remove card?')) return;
  try {
    await fetch(`${API}/cards/${id}`, { method: 'DELETE' });
    notify('Card removed');
    if (curBinder) selectBinder(curBinder.id);
  } catch { notify('Failed to remove card', true); }
}

// ── Export PDF ────────────────────────────────────────────────────────────────
async function exportPDF(id) {
  try {
    notify('Generating PDF…');
    const resp = await fetch(`${API}/binders/${id}/export`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const name = binders.find(b => b.id === id)?.name || 'binder';
    a.href     = url;
    a.download = name.replace(/\s+/g, '_') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('PDF downloaded! 📄');
  } catch (e) {
    notify(`Export failed: ${e.message}`, true);
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const notify = (msg, err = false) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? 'rgba(239, 68, 68, 0.9)' : 'rgba(24, 24, 31, 0.95)';
  t.classList.add('active');
  setTimeout(() => t.classList.remove('active'), 3500);
};

// ── XSS Escape ────────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return s.toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Explicit Set Management ───────────────────────────────────────────────────
function openAddSetModal() {
  document.getElementById('set_add_name').value = '';
  document.getElementById('set_add_total_cards').value = '';
  document.getElementById('addSetModal').classList.add('active');
}

function closeAddSetModal() {
  document.getElementById('addSetModal').classList.remove('active');
}

async function saveNewSet() {
  const name = document.getElementById('set_add_name').value.trim();
  const totalCards = parseInt(document.getElementById('set_add_total_cards').value);
  if (!name || isNaN(totalCards) || totalCards < 1) {
    return notify('Please fill all fields properly', true);
  }

  try {
    const resp = await fetch(`${API}/card-sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, total_cards: totalCards })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create set');
    }
    
    const newSet = await resp.json();
    allCardSets.push(newSet);
    
    closeAddSetModal();
    notify('Set added!');
    
    if (currentPage === 'sets') loadSets();
    
  } catch (e) {
    notify(`Error: ${e.message}`, true);
  }
}

function populateSetDropdown(selectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">— None —</option>' + allCardSets.map(s => {
    return `<option value="${esc(s.name)}"${s.name === selectedValue ? ' selected' : ''}>${esc(s.name)}</option>`;
  }).join('');
}

function onSetSelectionChange(selectId, totalInputId) {
  const select = document.getElementById(selectId);
  const totalInput = document.getElementById(totalInputId);
  const val = select.value;
  if (!val) {
    totalInput.value = '';
    return;
  }
  const setObj = allCardSets.find(s => s.name === val);
  if (setObj) {
    totalInput.value = setObj.total_cards;
  }
}