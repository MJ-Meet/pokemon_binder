// ── API Configuration ──────────────────────────────────────────────────────────
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const PROD_API = 'https://pokemon-binder-pkbf.onrender.com';
const API = isLocal ? 'http://localhost:8000' : PROD_API;

// ── Types & Constants ─────────────────────────────────────────────────────────
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

const RARITIES = [
  'Common','Uncommon','Rare','Super Rare','Baby Shiny',
  'Rare Shiny','Ilusration Rare(IR)','Special Art Rare (SAR)',
  'Special Ilustration Art Rare','Gold'
];

// ── Global State ──────────────────────────────────────────────────────────────
let binders         = [];
let curBinder       = null;
let curPage         = 0;          // 0-indexed binder page
const CARDS_PER_PAGE = 16;        // 4 columns × 4 rows = 16 cards per page
let curSlot         = null;
let editId          = null;
let selectedGS      = 4;          // 4x4 (16-pocket)
let selectedType    = null;
let currentPage     = 'home';     // 'home' | 'binder' | 'dashboard' | 'favorites' | 'sets'

// Filter states
let curSearch       = '';
let selectedGen     = 'all';
let selectedStatus  = 'all';      // 'all' | 'collected' | 'missing'
let selectedFilterType = 'all';

// Cached maps for fast lookup
let cardBySlotMap   = {};
let cardByNameMap   = {};

// Dashboard Chart instances
let typeChartInst   = null;
let rarityChartInst = null;
let growthChartInst = null;

// Favorites & Sets State
allFavorites     = [];
let favView          = 'grid';
let favSortMode      = 'date_desc';
let allSets          = [];
let setsStatusFilter = 'all';
let setsSortMode     = 'pct_desc';
let allCardSets      = [];

// Card Detail State
let detailCard       = null;
let detailEditType   = null;
let lastFocusedCardId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.onload = async () => {
  pingBackend();
  renderTypeSelector();
  renderDetailTypeSelector();
  initPickers();
  initDragDrop();
  fetchAllCardSets();
  await fetchBinders();
  navigateTo('home');

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
      closeCardDetail();
      closeAddSetModal();
    }
  });
};

async function pingBackend() {
  try { await fetch(`${API}/`); } catch { /* silent */ }
}

async function fetchAllCardSets() {
  try {
    const resp = await fetch(`${API}/card-sets`);
    if (resp.ok) allCardSets = await resp.json();
  } catch(e) {
    console.error('Failed to fetch card sets', e);
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;

  // Toggle active class on top navigation menu
  const menuButtons = {
    'home': 'navHome',
    'binder': 'navBinder',
    'sets': 'navSets',
    'dashboard': 'navDashboard',
    'favorites': 'navFavorites'
  };

  Object.entries(menuButtons).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.toggle('active', key === page);
    }
  });

  // Toggle page visibility
  const homeEl = document.getElementById('homePage');
  if (homeEl) homeEl.classList.toggle('hidden', page !== 'home');

  const binderEl = document.getElementById('binderPage');
  if (binderEl) binderEl.classList.toggle('hidden', page !== 'binder');

  const dashEl = document.getElementById('dashboardPage');
  if (dashEl) dashEl.classList.toggle('hidden', page !== 'dashboard');

  const favEl = document.getElementById('favoritesPage');
  if (favEl) favEl.classList.toggle('hidden', page !== 'favorites');

  const setsEl = document.getElementById('setsPage');
  if (setsEl) setsEl.classList.toggle('hidden', page !== 'sets');

  if (page === 'home')      renderHomePage();
  if (page === 'binder')    renderBinderView();
  if (page === 'dashboard') loadDashboard();
  if (page === 'favorites') loadFavorites();
  if (page === 'sets')      loadSets();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileNav() {
  const menu = document.getElementById('topNavMenu');
  if (menu) menu.classList.toggle('mobile-open');
}

// ── Region Definitions ────────────────────────────────────────────────────────
const REGION_BOUNDS = {
  1: { name: 'Kanto',  start: 1,   end: 151,  total: 151 },
  2: { name: 'Johto',  start: 152, end: 251,  total: 100 },
  3: { name: 'Hoenn',  start: 252, end: 386,  total: 135 },
  4: { name: 'Sinnoh', start: 387, end: 493,  total: 107 },
  5: { name: 'Unova',  start: 494, end: 649,  total: 156 },
  6: { name: 'Kalos',  start: 650, end: 721,  total: 72 },
  7: { name: 'Alola',  start: 722, end: 809,  total: 88 },
  8: { name: 'Galar',  start: 810, end: 905,  total: 96 },
  9: { name: 'Paldea', start: 906, end: 1025, total: 120 }
};

function getRegionCollectedCount(gen) {
  const bounds = REGION_BOUNDS[gen];
  if (!bounds) return 0;
  if (typeof POKEDEX_DATA === 'undefined' || !Array.isArray(POKEDEX_DATA)) {
    return 0;
  }
  return POKEDEX_DATA
    .filter(p => p.id >= bounds.start && p.id <= bounds.end && isPokemonCollected(p.id, p.name))
    .length;
}

function hoverBadge(gen, regionName, total) {
  const statusEl = document.getElementById('tc_badge_status');
  if (statusEl) {
    const count = getRegionCollectedCount(gen);
    statusEl.textContent = `Gen ${gen} ${regionName}: ${count}/${total}`;
  }
  document.querySelectorAll('#tcBadgesStrip .tc-badge-item').forEach(b => {
    b.classList.toggle('active', b.dataset.gen === String(gen));
  });
}

function resetBadgeHover() {
  const statusEl = document.getElementById('tc_badge_status');
  if (statusEl) {
    statusEl.textContent = 'HOVER A BADGE';
  }
  document.querySelectorAll('#tcBadgesStrip .tc-badge-item').forEach(b => {
    b.classList.remove('active');
  });
}

function openBinderRegion(gen) {
  selectedGen = String(gen);
  const genSelect = document.getElementById('filterGen');
  if (genSelect) genSelect.value = String(gen);
  document.querySelectorAll('#genFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gen == String(gen));
  });
  curPage = 0;
  navigateTo('binder');
  setTimeout(() => {
    const grid = document.getElementById('pokedexGrid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function editTrainerName() {
  const curName = localStorage.getItem('trainer_name') || 'Meet';
  const newName = prompt('Enter Trainer Name:', curName);
  if (newName && newName.trim()) {
    localStorage.setItem('trainer_name', newName.trim());
    const el = document.getElementById('tc_trainer_name');
    if (el) el.textContent = newName.trim();
  }
}

// ── Trainer Partner Pokémon Management ────────────────────────────────────────
let curPartnerDexId = 25;
let curPartnerName = 'Pikachu';
let curPartnerBg = '#ffcb05';
let curPartnerImg = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';

function openPartnerModal() {
  const storedImg = localStorage.getItem('trainer_partner_img') || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';
  const storedBg  = localStorage.getItem('trainer_partner_bg') || '#ffcb05';
  const storedName = localStorage.getItem('trainer_partner_name') || 'Pikachu';
  const storedDex = localStorage.getItem('trainer_partner_dex') || '25';

  curPartnerImg = storedImg;
  curPartnerBg = storedBg;
  curPartnerName = storedName;
  curPartnerDexId = parseInt(storedDex) || 25;

  updatePartnerPreview();

  const backdrop = document.getElementById('partnerModalBackdrop');
  if (backdrop) backdrop.classList.add('active');
}

function closePartnerModal() {
  const backdrop = document.getElementById('partnerModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function updatePartnerPreview() {
  const pBox = document.getElementById('partner_preview_box');
  const pImg = document.getElementById('partner_preview_img');
  const pName = document.getElementById('partner_preview_name');
  const pDex = document.getElementById('partner_preview_dex');

  if (pBox) pBox.style.background = curPartnerBg;
  if (pImg) pImg.src = curPartnerImg;
  if (pName) pName.textContent = curPartnerName;
  if (pDex) {
    const pad = String(curPartnerDexId).padStart(4, '0');
    pDex.textContent = `No. ${pad}`;
  }
}

function setPartnerPreset(dexId, name, color) {
  curPartnerDexId = dexId;
  curPartnerName = name;
  curPartnerBg = color;
  curPartnerImg = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;
  updatePartnerPreview();
}

function selectPartnerBg(color) {
  curPartnerBg = color;
  updatePartnerPreview();
}

function handlePartnerSearch(query) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();

  let found = null;
  if (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA)) {
    if (!isNaN(q)) {
      found = POKEDEX_DATA.find(p => p.id === parseInt(q));
    } else {
      found = POKEDEX_DATA.find(p => p.name.toLowerCase().includes(q));
    }
  }

  if (found) {
    curPartnerDexId = found.id;
    curPartnerName = found.name;
    curPartnerImg = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${found.id}.png`;
    const tDef = (typeof POKEMON_TYPES !== 'undefined') ? POKEMON_TYPES.find(t => t.name.toLowerCase() === (found.type || '').toLowerCase()) : null;
    if (tDef) curPartnerBg = tDef.color;
    updatePartnerPreview();
  }
}

function savePartnerPokemon() {
  localStorage.setItem('trainer_partner_img', curPartnerImg);
  localStorage.setItem('trainer_partner_bg', curPartnerBg);
  localStorage.setItem('trainer_partner_name', curPartnerName);
  localStorage.setItem('trainer_partner_dex', String(curPartnerDexId));

  renderTrainerCard();
  closePartnerModal();
  notify(`Trainer partner set to ${curPartnerName}! ⚡`);
}

// ── Home Page & Trainer Card Rendering ────────────────────────────────────────
function renderHomePage() {
  renderTrainerCard();
  renderHomeBinders();
}

function renderTrainerCard() {
  const nameEl = document.getElementById('tc_trainer_name');
  if (nameEl) {
    nameEl.textContent = localStorage.getItem('trainer_name') || 'Meet';
  }

  const partnerImg = localStorage.getItem('trainer_partner_img') || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';
  const partnerBg = localStorage.getItem('trainer_partner_bg') || '#ffcb05';
  const partnerEl = document.getElementById('tc_partner_img');
  const avatarBox = document.getElementById('tc_avatar_box');
  if (partnerEl) partnerEl.src = partnerImg;
  if (avatarBox) avatarBox.style.background = partnerBg;

  const bNameEl = document.getElementById('tc_active_binder_name');
  if (bNameEl) {
    bNameEl.textContent = curBinder ? curBinder.name : 'None Selected';
  }

  const total = 1025;
  let collected = 0;
  if (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA)) {
    collected = POKEDEX_DATA.filter(p => isPokemonCollected(p.id, p.name)).length;
  } else if (curBinder && curBinder.cards) {
    collected = curBinder.cards.length;
  }

  const pdxStatEl = document.getElementById('tc_pokedex_stat');
  if (pdxStatEl) {
    pdxStatEl.textContent = `${collected} / ${total}`;
  }

  const loggedEl = document.getElementById('tc_logged_cards');
  if (loggedEl) {
    loggedEl.textContent = (curBinder && curBinder.cards) ? curBinder.cards.length.toLocaleString() : '0';
  }

  const totalBindersEl = document.getElementById('tc_total_binders');
  if (totalBindersEl) {
    totalBindersEl.textContent = binders.length.toLocaleString();
  }

  const targetHitEl = document.getElementById('tc_target_hit');
  if (targetHitEl) {
    if (curBinder && curBinder.cards) {
      const specialCount = curBinder.cards.filter(c => c.rarity && (c.rarity.includes('Rare') || c.rarity.includes('SAR') || c.rarity.includes('IR') || c.rarity.includes('Gold') || c.rarity.includes('Shiny'))).length;
      targetHitEl.textContent = specialCount > 0 ? specialCount : '25';
    } else {
      targetHitEl.textContent = '25';
    }
  }
}

function renderHomeBinders() {
  const container = document.getElementById('homeBindersGrid');
  if (!container) return;

  if (!binders || binders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 12px;">📂</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">No Pokémon Binders Yet</h3>
        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px;">Create your first binder to organize cards into 16-pocket pages!</p>
        <button class="btn btn-gold" onclick="openBinderModal()">
          + Create First Binder
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = binders.map(b => {
    const isActive = curBinder && curBinder.id === b.id;
    const cardCount = (b.cards && Array.isArray(b.cards)) 
      ? b.cards.length 
      : (b.card_count !== undefined 
          ? b.card_count 
          : (isActive && curBinder && curBinder.cards ? curBinder.cards.length : 0));
    const pct = Math.min(100, Math.round((cardCount / 1025) * 100));
    const spineColor = b.color || '#ffcb05';

    return `
      <div class="home-binder-card ${isActive ? 'is-active-binder' : ''}" onclick="selectAndOpenBinder(${b.id})">
        <div class="hbc-spine" style="background-color: ${spineColor};"></div>
        <div class="hbc-content">
          <div class="hbc-header">
            <div>
              <span class="hbc-badge" style="background: ${spineColor}20; color: ${spineColor}; border: 1px solid ${spineColor}40;">
                ${b.grid_size || 4}x${b.grid_size || 4} POCKETS
              </span>
              <h3 class="hbc-title">${esc(b.name)}</h3>
            </div>
            ${isActive ? '<span class="hbc-active-tag">Active</span>' : ''}
          </div>

          <div class="hbc-stats">
            <div class="hbc-stat">
              <span class="hbc-stat-num">${cardCount}</span>
              <span class="hbc-stat-lbl">Cards Logged</span>
            </div>
            <div class="hbc-stat">
              <span class="hbc-stat-num">${b.pages || 25}</span>
              <span class="hbc-stat-lbl">Pages</span>
            </div>
            <div class="hbc-stat">
              <span class="hbc-stat-num">${pct}%</span>
              <span class="hbc-stat-lbl">Pokédex</span>
            </div>
          </div>

          <div class="hbc-progress-bar">
            <div class="hbc-progress-fill" style="width: ${pct}%; background: ${spineColor};"></div>
          </div>

          <div class="hbc-actions" onclick="event.stopPropagation()">
            <button class="btn btn-sm btn-gold" onclick="selectAndOpenBinder(${b.id})">
              Open Binder →
            </button>
            <button class="btn btn-sm btn-ghost" onclick="editBinderModal(${b.id})" title="Edit Binder">
              ✏️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectAndOpenBinder(id) {
  selectBinder(id).then(() => {
    navigateTo('binder');
  });
}

function updateBinderDropdown() {
  const dd = document.getElementById('binderSelectDropdown');
  if (!dd) return;
  if (!binders || binders.length === 0) {
    dd.innerHTML = `<option value="">No Binders Found</option>`;
    return;
  }
  dd.innerHTML = binders.map(b => {
    const cardCount = (b.cards && Array.isArray(b.cards)) 
      ? b.cards.length 
      : (b.card_count !== undefined 
          ? b.card_count 
          : (curBinder && curBinder.id === b.id && curBinder.cards ? curBinder.cards.length : ''));
    const countStr = cardCount !== '' ? ` (${cardCount} cards)` : '';
    return `<option value="${b.id}" ${curBinder && curBinder.id === b.id ? 'selected' : ''}>${esc(b.name)}${countStr}</option>`;
  }).join('');
}

// ── Fetch Binders & Select ────────────────────────────────────────────────────
async function fetchBinders() {
  try {
    const resp = await fetch(`${API}/binders`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    binders = await resp.json();

    // Check if we have a saved active binder ID in localStorage
    const savedId = parseInt(localStorage.getItem('active_binder_id'), 10);
    let target = binders.find(b => b.id === savedId);

    // If not found or invalid, prefer a binder that has cards, or fallback to first
    if (!target && binders.length > 0) {
      target = binders.find(b => (b.card_count && b.card_count > 0) || (b.cards && b.cards.length > 0)) || binders[0];
    }

    if (target) {
      await selectBinder(target.id);
    } else {
      updateCollectionStats();
      renderHomePage();
      renderBinderView();
    }
  } catch (e) {
    console.warn('Backend unavailable, using offline mode', e);
    updateCollectionStats();
    renderHomePage();
    renderBinderView();
  }
}

async function selectBinder(id) {
  try {
    const resp = await fetch(`${API}/binders/${id}`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    curBinder = await resp.json();
    localStorage.setItem('active_binder_id', curBinder.id);
    rebuildCardCache();
  } catch (e) {
    notify(`Error loading binder: ${e.message}`, true);
  } finally {
    updateCollectionStats();
    updateBinderDropdown();
    renderTrainerCard();
    renderHomeBinders();
    if (currentPage === 'binder') {
      renderBinderView();
    }
  }
}

// Build fast lookup caches for collected cards
function rebuildCardCache() {
  cardBySlotMap = {};
  cardByNameMap = {};
  if (!curBinder || !curBinder.cards) return;

  curBinder.cards.forEach(card => {
    // Map by slot
    if (card.slot !== undefined && card.slot !== null) {
      cardBySlotMap[card.slot] = card;
    }

    // Map by lowercase normalized name
    if (card.name) {
      const clean = card.name.trim().toLowerCase();
      // Store card only if not already set or prioritize matching slot
      if (!cardByNameMap[clean] || cardByNameMap[clean].slot === undefined) {
        cardByNameMap[clean] = card;
      }
    }
  });
}

// Check if a Pokémon is collected in the active binder
function getCollectedCardForPokemon(dexId, name) {
  // 1. Direct slot match (slot = dexId - 1)
  const slotCard = cardBySlotMap[dexId - 1];
  if (slotCard) return slotCard;

  const cleanName = (name || '').trim().toLowerCase();
  if (!cleanName) return null;

  // 2. Exact name match, ensuring card doesn't explicitly belong to a different slot
  const exactCard = cardByNameMap[cleanName];
  if (exactCard) {
    if (exactCard.slot === undefined || exactCard.slot === null || exactCard.slot === (dexId - 1)) {
      return exactCard;
    }
  }

  // 3. Whole-word match for card title variants (e.g. "Pidgeot EX" or "Charizard Holo")
  // Word boundaries (\b) ensure "Pidgeot" NEVER falsely matches "Pidgeotto", and "Mew" never matches "Mewtwo"
  if (curBinder && curBinder.cards) {
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    const match = curBinder.cards.find(c => {
      // Must not belong to an explicitly different dex slot
      if (c.slot !== undefined && c.slot !== null && c.slot >= 0 && c.slot !== (dexId - 1)) {
        return false;
      }
      if (!c.name) return false;
      return wordRegex.test(c.name);
    });
    if (match) return match;
  }

  return null;
}

function isPokemonCollected(dexId, name) {
  return !!getCollectedCardForPokemon(dexId, name);
}

// ── Update Pokédex Summary Badges (Collected, Remaining, Completion) ──────────
function updateCollectionStats() {
  const total = (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA)) 
    ? POKEDEX_DATA.length 
    : 1025;

  let collected = 0;
  if (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA)) {
    collected = POKEDEX_DATA.filter(p => isPokemonCollected(p.id, p.name)).length;
  } else if (curBinder && curBinder.cards) {
    collected = curBinder.cards.length;
  }

  const remaining = Math.max(0, total - collected);
  const completionPct = total > 0 ? ((collected / total) * 100).toFixed(1) : '0.0';

  const elColl = document.getElementById('statCollected');
  const elRem  = document.getElementById('statRemaining');
  const elComp = document.getElementById('statCompletion');

  if (elColl) elColl.textContent = collected.toLocaleString();
  if (elRem)  elRem.textContent  = remaining.toLocaleString();
  if (elComp) elComp.textContent = `${completionPct}%`;
}

// ── Filter & Search Logic ─────────────────────────────────────────────────────
function getFilteredPokemon() {
  if (typeof POKEDEX_DATA === 'undefined' || !Array.isArray(POKEDEX_DATA)) {
    return [];
  }

  return POKEDEX_DATA.filter(p => {
    // 1. Search Query filter (matches name, dex #, or set name)
    if (curSearch) {
      const nameMatch = p.name.toLowerCase().includes(curSearch);
      const numMatch  = String(p.id).includes(curSearch) || 
                        String(p.id).padStart(4, '0').includes(curSearch);
      
      const card = getCollectedCardForPokemon(p.id, p.name);
      const setMatch = card && card.set_name && card.set_name.toLowerCase().includes(curSearch);

      if (!nameMatch && !numMatch && !setMatch) return false;
    }

    // 2. Generation filter
    if (selectedGen !== 'all') {
      if (p.gen !== parseInt(selectedGen)) return false;
    }

    // 3. Collection Status filter
    if (selectedStatus !== 'all') {
      const isColl = isPokemonCollected(p.id, p.name);
      if (selectedStatus === 'collected' && !isColl) return false;
      if (selectedStatus === 'missing'   && isColl)  return false;
    }

    // 4. Type filter
    if (selectedFilterType !== 'all') {
      if (!p.types || !p.types.includes(selectedFilterType)) return false;
    }

    return true;
  });
}

function handlePokedexSearch(val) {
  curSearch = val.trim().toLowerCase();
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.classList.toggle('hidden', !curSearch);
  curPage = 0;
  renderBinderView();
}

function clearSearchInput() {
  const input = document.getElementById('pokedexSearchInput');
  if (input) input.value = '';
  handlePokedexSearch('');
}

function selectGenFilter(gen) {
  selectedGen = gen;
  document.querySelectorAll('#genFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gen == String(gen));
  });
  curPage = 0;
  renderBinderView();
}

function selectStatusFilter(status) {
  selectedStatus = status;
  document.querySelectorAll('#statusFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  curPage = 0;
  renderBinderView();
}

function selectTypeFilter(type) {
  selectedFilterType = type;
  document.querySelectorAll('#typeFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  curPage = 0;
  renderBinderView();
}

function resetAllFilters() {
  selectedGen = 'all';
  selectedStatus = 'all';
  selectedFilterType = 'all';
  clearSearchInput();
  selectGenFilter('all');
  selectStatusFilter('all');
  selectTypeFilter('all');
}

// ── Render Binder View ────────────────────────────────────────────────────────
function renderBinderView() {
  const filtered = getFilteredPokemon();
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / CARDS_PER_PAGE));

  if (curPage >= totalPages) curPage = totalPages - 1;
  if (curPage < 0) curPage = 0;

  // Sub-bar indicators
  const startIdx = totalFiltered > 0 ? (curPage * CARDS_PER_PAGE + 1) : 0;
  const endIdx   = Math.min((curPage + 1) * CARDS_PER_PAGE, totalFiltered);

  const showingEl = document.getElementById('showingCountText');
  if (showingEl) {
    showingEl.textContent = `SHOWING ${startIdx}–${endIdx} OF ${totalFiltered.toLocaleString()} POKÉMON`;
  }

  // Calculate page completion percentage
  const pageSlice = filtered.slice(curPage * CARDS_PER_PAGE, (curPage + 1) * CARDS_PER_PAGE);
  const pageCollected = pageSlice.filter(p => isPokemonCollected(p.id, p.name)).length;
  const pageCompletionRate = pageSlice.length > 0 
    ? ((pageCollected / pageSlice.length) * 100).toFixed(1) 
    : '0.0';

  const pageRateEl = document.getElementById('pageCompletionRate');
  if (pageRateEl) pageRateEl.textContent = `${pageCompletionRate}%`;

  // Binder Header & Page Controls
  const pageTitleEl = document.getElementById('binderPageTitle');
  if (pageTitleEl) pageTitleEl.textContent = `Binder Page ${curPage + 1}`;

  const curPageEl   = document.getElementById('curPageNum');
  const totalPageEl = document.getElementById('totalPageNum');
  if (curPageEl)   curPageEl.textContent   = curPage + 1;
  if (totalPageEl) totalPageEl.textContent = totalPages;

  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  if (btnPrev) btnPrev.disabled = (curPage === 0);
  if (btnNext) btnNext.disabled = (curPage >= totalPages - 1);

  // Render Cards Grid
  const grid = document.getElementById('cardContainer');
  const emptyState = document.getElementById('binderEmptyState');

  if (totalFiltered === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  grid.innerHTML = pageSlice.map(p => renderPokemonCard(p)).join('');
}

// ── Render Individual Pokémon Card (Collected vs Missing) ─────────────────────
function renderPokemonCard(p) {
  const card = getCollectedCardForPokemon(p.id, p.name);
  const isCollected = !!card;
  const padNumber = String(p.id).padStart(4, '0');
  const artUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

  if (isCollected) {
    // ── COLLECTED CARD: Genuine 3D Flip with Front (Image 1) & Back (Image 2) ──
    const cardImgUrl = `${API}/cards/${card.id}/image`;
    const rarityLabel = card.rarity ? ` (${esc(card.rarity)})` : '';
    const setLabel = card.set_name ? esc(card.set_name) : 'TCG Collection';

    return `
      <div class="pk-card pk-card-collected" 
           id="card-dex-${p.id}"
           data-dex-id="${p.id}"
           tabindex="0" 
           role="button"
           aria-label="${esc(p.name)}, collected Pokémon card. Click to flip, or click expand on top to view full details."
           onclick="toggleCardFlip(this, event)"
           onkeydown="handleCardKeydown(this, event)">
        <div class="pk-card-inner">
          <!-- Front Face (Image 1) -->
          <div class="pk-card-face pk-card-front-v1">
            <div class="pk-card-top-v1">
              <div class="pk-card-no-badge">No. ${padNumber}</div>
              <div class="pk-card-top-actions">
                <button class="pk-card-expand-circle" 
                        onclick="handleExpandDetails(${card.id}, ${p.id}, event)" 
                        title="Expand Card Details" 
                        aria-label="Expand Card Details">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
                <div class="pk-card-miniball" title="Collected in PokéBinder">
                  <svg viewBox="0 0 32 32" width="22" height="22">
                    <circle cx="16" cy="16" r="14" fill="#ffffff" stroke="#18181b" stroke-width="2.5"/>
                    <path d="M 2 16 A 14 14 0 0 1 30 16 Z" fill="#ef4444" stroke="#18181b" stroke-width="2.5"/>
                    <line x1="2" y1="16" x2="30" y2="16" stroke="#18181b" stroke-width="2.5"/>
                    <circle cx="16" cy="16" r="4.5" fill="#ffffff" stroke="#18181b" stroke-width="2.5"/>
                    <circle cx="16" cy="16" r="2" fill="#18181b"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="pk-card-art-wrap">
              <img src="${artUrl}" 
                   onerror="this.onerror=null;this.src='${fallbackUrl}'" 
                   class="pk-card-art" 
                   alt="${esc(p.name)}" 
                   loading="lazy" />
            </div>

            <div class="pk-card-bottom-v1">
              <div class="pk-card-name-v1">${esc(p.name)}</div>
            </div>
          </div>

          <!-- Back Face (Image 2: Full TCG Card with Expand Button & Yellow Title) -->
          <div class="pk-card-face pk-card-back-v2">
            <!-- Top Right Expand Button on Reverse Face -->
            <button class="pk-card-expand-circle pk-expand-on-back" 
                    onclick="handleExpandDetails(${card.id}, ${p.id}, event)" 
                    title="Expand Card Details" 
                    aria-label="Expand Card Details">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>

            <!-- Center TCG card art -->
            <div class="pk-card-back-tcg-wrap">
              <img src="${cardImgUrl}" 
                   onerror="this.onerror=null;this.src='${artUrl}'" 
                   class="pk-card-back-tcg-img" 
                   alt="${esc(p.name)} TCG Card" 
                   loading="lazy" />
            </div>

            <!-- Bottom Title & Subtitle bar -->
            <div class="pk-card-back-bottom-bar">
              <div class="pk-card-back-title-yellow">${esc(p.name)}${rarityLabel}</div>
              <div class="pk-card-back-subtitle-pill">
                <span class="pk-sub-badge">No. ${padNumber}</span>
                <span class="pk-sub-set">${setLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // ── UNCOLLECTED CARD: Flips to Image 4 (Not yet caught / No. XXXX / + Add button) ──
    const typeLabel = (p.types || []).join(' • ');

    return `
      <div class="pk-card pk-card-missing"
           id="card-dex-${p.id}"
           data-dex-id="${p.id}"
           tabindex="0"
           role="button"
           aria-label="${esc(p.name)}, uncollected Pokémon. Click to flip and add to collection."
           onclick="toggleCardFlip(this, event)"
           onkeydown="handleCardKeydown(this, event)">
        <div class="pk-card-inner">
          <!-- Front Face: Locked dark silhouette -->
          <div class="pk-card-face pk-card-front">
            <div class="pk-card-top">
              <span class="pk-card-number">No. ${padNumber}</span>
              <div class="pk-card-badge" title="Missing from collection">
                <span style="color:var(--accent-gold);opacity:0.6;font-size:0.8rem">＋</span>
              </div>
            </div>
            <div class="pk-card-art-wrap">
              <img src="${artUrl}" 
                   onerror="this.onerror=null;this.src='${fallbackUrl}'" 
                   class="pk-card-art" 
                   alt="Locked silhouette of ${esc(p.name)}" 
                   loading="lazy" />
            </div>
            <div class="pk-card-bottom">
              <div class="pk-card-name">${esc(p.name)}</div>
              <div class="pk-card-sublabel">${esc(typeLabel)}</div>
            </div>
          </div>

          <!-- Back Face (Image 4: Not yet caught, No. XXXX, + Add Button) -->
          <div class="pk-card-face pk-card-back-uncollected">
            <div class="pk-uncoll-content">
              <div class="pk-uncoll-title">Not yet caught</div>
              <div class="pk-uncoll-num">No. ${padNumber}</div>
              <button class="pk-uncoll-add-btn" 
                      onclick="openAddCardForMissing(${p.id}, '${esc(p.name)}', event)" 
                      title="Add ${esc(p.name)} to binder"
                      aria-label="Add ${esc(p.name)}">
                <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// ── 3D Card Interaction Handlers ──────────────────────────────────────────────
function toggleCardFlip(el, e) {
  // If the user clicked the expand button or add button, do not flip the card
  if (e && e.target && e.target.closest('.pk-card-expand-circle, .pk-uncoll-add-btn')) {
    return;
  }

  // Prevent multiple overlapping animations
  if (el.dataset.animating === 'true') return;

  el.dataset.animating = 'true';
  el.classList.toggle('is-flipped');

  setTimeout(() => {
    delete el.dataset.animating;
  }, 650);
}

function handleCardKeydown(el, e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleCardFlip(el, e);
  }
}

function handleExpandDetails(cardId, dexId, e) {
  if (e) {
    e.stopPropagation(); // Prevent the card from flipping before opening modal
  }
  lastFocusedCardId = `card-dex-${dexId}`;
  openCardDetail(cardId, dexId);
}

function openAddCardForMissing(dexId, name, e) {
  if (e) {
    e.stopPropagation(); // Prevent card from flipping when clicking the + button
  }
  openCardModalForDex(dexId, name);
}

// ── Page Navigation ───────────────────────────────────────────────────────────
function changeBinderPage(delta) {
  const filtered = getFilteredPokemon();
  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const newPage = curPage + delta;

  if (newPage >= 0 && newPage < totalPages) {
    curPage = newPage;
    renderBinderView();
    scrollToBinderTop();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBinderTop() {
  const binderEl = document.querySelector('.binder-dark-container');
  if (binderEl) {
    const topPos = binderEl.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: topPos, behavior: 'smooth' });
  }
}

// ── Card Detail Modal (Image 3 Reference) ─────────────────────────────────────
let detailDexId = null;

function navigateDetailCard(delta) {
  if (!detailDexId) return;
  const filtered = getFilteredPokemon();
  const collectedList = filtered.filter(p => isPokemonCollected(p.id, p.name));
  if (collectedList.length <= 1) return;

  const currentIdx = collectedList.findIndex(p => p.id === detailDexId);
  if (currentIdx === -1) return;

  let newIdx = currentIdx + delta;
  if (newIdx < 0) newIdx = collectedList.length - 1;
  if (newIdx >= collectedList.length) newIdx = 0;

  const nextPoke = collectedList[newIdx];
  const nextCard = getCollectedCardForPokemon(nextPoke.id, nextPoke.name);
  if (nextCard) {
    openCardDetail(nextCard.id, nextPoke.id);
  }
}

function jumpToCurrentCardPage() {
  if (!detailDexId) return;
  const filtered = getFilteredPokemon();
  const idx = filtered.findIndex(p => p.id === detailDexId);
  const targetPage = idx !== -1 ? Math.floor(idx / CARDS_PER_PAGE) : 0;
  
  closeCardDetail();
  if (currentPage !== 'binder') {
    navigateTo('binder');
  }
  curPage = targetPage;
  renderBinderView();

  setTimeout(() => {
    const cardEl = document.getElementById(`card-dex-${detailDexId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.add('pk-card-highlight-pulse');
      setTimeout(() => cardEl.classList.remove('pk-card-highlight-pulse'), 2200);
    } else {
      scrollToBinderTop();
    }
  }, 120);
}

async function openCardDetail(cardId, dexId = null) {
  let card = null;

  // Search in current binder
  if (curBinder && curBinder.cards) {
    card = curBinder.cards.find(c => c.id === cardId);
  }

  // Fallback: fetch from API
  if (!card) {
    try {
      const resp = await fetch(`${API}/cards/${cardId}`);
      if (resp.ok) card = await resp.json();
    } catch { /* use null */ }
  }

  if (!card) {
    notify('Card details not found', true);
    return;
  }

  detailCard = card;
  detailEditType = card.card_type;

  // Find pokemon data
  const p = (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA))
    ? POKEDEX_DATA.find(x => x.id === (dexId || (card.slot !== undefined ? card.slot + 1 : 1)) || x.name.toLowerCase() === (card.name || '').toLowerCase())
    : null;

  detailDexId = p ? p.id : (dexId || (card.slot !== undefined ? card.slot + 1 : 1));
  const padNumber = String(detailDexId).padStart(4, '0');
  const gen = p ? (p.gen || 1) : 1;
  const bound = REGION_BOUNDS[gen];
  const regionName = bound ? bound.name : 'Kanto';

  // Calculate binder page
  const filtered = getFilteredPokemon();
  const cardIndex = filtered.findIndex(x => x.id === detailDexId);
  const pageNum = cardIndex !== -1 ? (Math.floor(cardIndex / CARDS_PER_PAGE) + 1) : (curPage + 1);

  // Set image with artwork fallback
  const imgEl = document.getElementById('cdm_image');
  if (imgEl) {
    const artUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${detailDexId}.png`;
    imgEl.src = `${API}/cards/${card.id}/image`;
    imgEl.onerror = () => {
      imgEl.src = artUrl;
    };
  }

  // Favorite state
  updateFavBtnState(card.favorite);

  // Breadcrumbs: BINDER / GEN 1 KANTO / PAGE 1
  const breadcrumbsEl = document.getElementById('cdm_breadcrumbs');
  if (breadcrumbsEl) {
    breadcrumbsEl.innerHTML = `BINDER &nbsp;/&nbsp; GEN ${gen} ${regionName.toUpperCase()} &nbsp;/&nbsp; PAGE ${pageNum}`;
  }

  // Title: Bulbasaur No.0001
  const nameEl = document.getElementById('cdm_name');
  if (nameEl) nameEl.textContent = p ? p.name : card.name;

  const numEl = document.getElementById('cdm_title_num');
  if (numEl) numEl.textContent = `No.${padNumber}`;

  // Subtitle: Bulbasaur (IR)
  const subEl = document.getElementById('cdm_subtitle');
  if (subEl) {
    const rTag = card.rarity ? ` (${card.rarity})` : '';
    subEl.textContent = `${p ? p.name : card.name}${rTag}`;
  }

  // Badges: [ILLUSTRATION RARE] [✓ COLLECTED]
  const rarityPill = document.getElementById('cdm_rarity_pill');
  if (rarityPill) {
    rarityPill.textContent = (card.rarity || 'RARE').toUpperCase();
  }

  // Specs Table (Image 3 format)
  const setEl = document.getElementById('cdm_set');
  if (setEl) setEl.textContent = card.set_name || 'Standard';

  const rarityEl = document.getElementById('cdm_rarity');
  if (rarityEl) rarityEl.textContent = card.rarity || 'Common';

  const cardNumEl = document.getElementById('cdm_card_number');
  if (cardNumEl) {
    const total = card.set_total_cards ? `/${card.set_total_cards}` : '';
    cardNumEl.textContent = card.card_number ? `#${card.card_number}${total}` : `#${padNumber}`;
  }

  const regionEl = document.getElementById('cdm_region');
  if (regionEl) regionEl.textContent = `Gen ${gen} (${regionName})`;

  const dateEl = document.getElementById('cdm_date');
  if (dateEl) {
    const d = card.date_added || card.created_at;
    dateEl.textContent = d ? new Date(d).toLocaleDateString() : '10/22/2026';
  }

  // Notes / Quote Box
  const notesEl = document.getElementById('cdm_notes_text');
  if (notesEl) {
    if (card.notes && card.notes.trim()) {
      notesEl.textContent = card.notes;
    } else {
      const setNameStr = card.set_name || 'TCG expansion';
      notesEl.textContent = `Pulled in ${setNameStr}. Officially collected and cataloged in PokéBinder.`;
    }
  }

  // Jump Button Text
  const jumpBtnText = document.getElementById('cdm_jump_btn_text');
  if (jumpBtnText) {
    jumpBtnText.textContent = `JUMP TO PG ${pageNum}`;
  }

  // Chevrons prev / next visibility
  const collectedList = filtered.filter(x => isPokemonCollected(x.id, x.name));
  const prevBtn = document.getElementById('cdm_prev_btn');
  const nextBtn = document.getElementById('cdm_next_btn');
  if (prevBtn && nextBtn) {
    const hasMultiple = collectedList.length > 1;
    prevBtn.style.display = hasMultiple ? 'flex' : 'none';
    nextBtn.style.display = hasMultiple ? 'flex' : 'none';
  }

  // Reset to view mode
  cancelCardEdit();

  // Prevent background scrolling while modal is open
  document.body.style.overflow = 'hidden';

  // Show backdrop
  const backdrop = document.getElementById('cardDetailBackdrop');
  if (backdrop) backdrop.classList.add('active');
}

function closeCardDetail() {
  const backdrop = document.getElementById('cardDetailBackdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
  detailCard = null;

  // Restore keyboard focus to the originating card
  if (lastFocusedCardId) {
    const originCard = document.getElementById(lastFocusedCardId);
    if (originCard) originCard.focus();
  }
}

function updateFavBtnState(isFav) {
  const icon = document.getElementById('cdm_fav_icon');
  const text = document.getElementById('cdm_fav_text');
  const btn  = document.getElementById('cdm_fav_btn');
  const badge = document.getElementById('cdm_fav_badge');

  if (icon) icon.textContent = isFav ? '❤️' : '🤍';
  if (text) text.textContent = isFav ? 'Remove Favorite' : 'Add Favorite';
  if (btn) {
    btn.classList.toggle('active', !!isFav);
    btn.title = isFav ? 'Favorited card (click to remove)' : 'Add to favorites';
  }
  if (badge) badge.classList.add('hidden');
}

async function toggleCardDetailFavorite() {
  if (!detailCard) return;
  try {
    const resp = await fetch(`${API}/cards/${detailCard.id}/favorite`, { method: 'PUT' });
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const updated = await resp.json();
    detailCard.favorite = updated.favorite;
    updateFavBtnState(updated.favorite);

    if (curBinder && curBinder.cards) {
      const card = curBinder.cards.find(c => c.id === detailCard.id);
      if (card) card.favorite = updated.favorite;
      renderBinderView();
    }
    notify(updated.favorite ? '❤️ Added to favorites!' : '🤍 Removed from favorites');
  } catch (e) {
    notify(`Error: ${e.message}`, true);
  }
}

function toggleCardDetailEdit() {
  const viewMode  = document.getElementById('cdm_view_mode');
  const editMode  = document.getElementById('cdm_edit_mode');
  const editBtn   = document.getElementById('cdm_edit_toggle_btn');
  const saveBtn   = document.getElementById('cdm_save_btn');
  const cancelBtn = document.getElementById('cdm_cancel_btn');

  document.getElementById('cdm_edit_name').value = detailCard.name || '';
  document.getElementById('cdm_edit_rarity').value = detailCard.rarity || '';
  populateSetDropdown('cdm_edit_set', detailCard.set_name || '');
  document.getElementById('cdm_edit_card_number').value = detailCard.card_number || '';
  document.getElementById('cdm_edit_set_total').value = detailCard.set_total_cards || '';
  document.getElementById('cdm_edit_notes').value = detailCard.notes || '';

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

  if (viewMode)  viewMode.classList.remove('hidden');
  if (editMode)  editMode.classList.add('hidden');
  if (editBtn)   editBtn.classList.remove('hidden');
  if (saveBtn)   saveBtn.classList.add('hidden');
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function saveCardEdit() {
  if (!detailCard) return;
  const name = document.getElementById('cdm_edit_name').value.trim();
  if (!name) return notify('Card name required', true);

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

    if (curBinder) await selectBinder(curBinder.id);
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

let deleteConfirmTimeout = null;

async function deleteDetailCard(btnEl) {
  // If detailCard is missing, try to resolve it from detailDexId
  if (!detailCard && detailDexId) {
    const p = (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA))
      ? POKEDEX_DATA.find(x => x.id === detailDexId)
      : null;
    if (p) detailCard = getCollectedCardForPokemon(p.id, p.name);
  }

  if (!detailCard) {
    notify('No card found to delete', true);
    return;
  }

  const btn = btnEl || document.querySelector('.btn-delete-card');

  // Two-step in-app confirmation (never blocked by browser window.confirm restrictions)
  if (btn && !btn.dataset.confirmArmed) {
    btn.dataset.confirmArmed = 'true';
    btn.dataset.origHTML = btn.innerHTML;
    btn.innerHTML = `⚠️ CONFIRM DELETE?`;
    btn.classList.add('btn-delete-armed');

    if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
    deleteConfirmTimeout = setTimeout(() => {
      if (btn && btn.dataset.confirmArmed) {
        delete btn.dataset.confirmArmed;
        btn.innerHTML = btn.dataset.origHTML || '🗑️ DELETE CARD';
        btn.classList.remove('btn-delete-armed');
      }
    }, 4500);

    notify(`Click "CONFIRM DELETE?" again to remove ${detailCard.name}`);
    return;
  }

  // Already confirmed -> Execute deletion!
  if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
  if (btn) {
    delete btn.dataset.confirmArmed;
    btn.disabled = true;
    btn.textContent = 'Deleting…';
  }

  const targetCardId = detailCard.id;
  const targetCardName = detailCard.name || 'Card';
  const targetBinderId = detailCard.binder_id || (curBinder ? curBinder.id : null);

  try {
    const resp = await fetch(`${API}/cards/${targetCardId}`, { method: 'DELETE' });
    if (!resp.ok && resp.status !== 204 && resp.status !== 200) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server status ${resp.status}`);
    }

    // Immediately remove from in-memory collection for instant UI feedback
    if (curBinder && curBinder.cards) {
      curBinder.cards = curBinder.cards.filter(c => c.id !== targetCardId);
    }
    rebuildCardCache();
    updateCollectionStats();

    closeCardDetail();
    notify(`🗑️ "${targetCardName}" removed from collection!`);

    // Reload active binder & collection
    if (targetBinderId) {
      await selectBinder(targetBinderId);
    }
    await fetchBinders();
    renderBinderView();
    renderHomePage();
  } catch (e) {
    console.error('Delete card failed:', e);
    notify(`Failed to remove card: ${e.message}`, true);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.origHTML || '🗑️ DELETE CARD';
      btn.classList.remove('btn-delete-armed');
    }
  }
}

let modalDexId = null;

function updateLiveCardPreview(dexId = null, pName = null) {
  if (dexId) modalDexId = dexId;
  const dId = modalDexId || (curSlot !== null ? curSlot + 1 : 1);
  const pad = String(dId).padStart(4, '0');

  const p = (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA))
    ? POKEDEX_DATA.find(x => x.id === dId)
    : null;

  const inputName = document.getElementById('cm_name') ? document.getElementById('cm_name').value.trim() : '';
  const displayName = inputName || pName || (p ? p.name : 'Pokémon');

  const dexEl = document.getElementById('cm_prev_dex');
  if (dexEl) dexEl.textContent = `No. ${pad}`;

  const nameEl = document.getElementById('cm_prev_name');
  if (nameEl) nameEl.textContent = displayName;

  const typeEl = document.getElementById('cm_prev_type');
  if (typeEl) {
    const tName = selectedType || (p && p.types ? p.types[0] : 'Normal');
    typeEl.textContent = tName.toUpperCase();
    const tDef = POKEMON_TYPES.find(x => x.name === tName);
    if (tDef) {
      typeEl.style.background = tDef.color;
      typeEl.style.color = '#ffffff';
    }
  }

  const raritySelect = document.getElementById('cm_rarity');
  const rarityEl = document.getElementById('cm_prev_rarity');
  if (rarityEl) {
    const rVal = (raritySelect && raritySelect.value) ? raritySelect.value : 'REGULAR';
    rarityEl.textContent = rVal.toUpperCase();
  }

  // Preview card border glow based on type
  const cardBox = document.getElementById('cm_preview_card');
  if (cardBox) {
    const tDef = POKEMON_TYPES.find(x => x.name === selectedType);
    if (tDef) {
      cardBox.style.borderColor = '#18181b';
      cardBox.style.boxShadow = `0 10px 25px rgba(0,0,0,0.35), 0 0 16px ${tDef.color}44`;
    }
  }

  // Artwork preview (if no custom uploaded file)
  const fileInput = document.getElementById('cm_file');
  const artImg = document.getElementById('cm_prev_art');
  if (artImg && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
    artImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dId}.png`;
    artImg.onerror = () => {
      artImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dId}.png`;
    };
  }
}

// ── Add / Upload Card Modal ───────────────────────────────────────────────────
function openCardModalForDex(dexId, name) {
  curSlot = dexId - 1;
  modalDexId = dexId;
  const p = (typeof POKEDEX_DATA !== 'undefined' && Array.isArray(POKEDEX_DATA))
    ? POKEDEX_DATA.find(x => x.id === dexId)
    : null;

  document.getElementById('cm_name').value = name || (p ? p.name : '');
  document.getElementById('cm_rarity').value = '';
  populateSetDropdown('cm_set_name');
  document.getElementById('cm_card_number').value = '';
  document.getElementById('cm_set_total').value = '';

  // Select primary type
  const primType = (p && p.types && p.types[0]) ? p.types[0] : 'Normal';
  selectCardType(primType, 'cm_types');

  const fileInput = document.getElementById('cm_file');
  fileInput.value = '';
  try { fileInput.files = new DataTransfer().files; } catch(e) {}

  const wrap = document.getElementById('up_preview_wrap');
  if (wrap) wrap.classList.add('hidden');
  const empty = document.getElementById('up_empty');
  if (empty) empty.classList.remove('hidden');

  const titleEl = document.getElementById('cardModalTitle');
  if (titleEl) {
    titleEl.innerHTML = `Add ${esc(name || (p ? p.name : 'Pokémon'))} <span class="add-modal-dex-pill">No. ${String(dexId).padStart(4, '0')}</span>`;
  }

  updateLiveCardPreview(dexId, name);
  const fp1 = document.querySelector('.card-add-form-panel');
  if (fp1) fp1.scrollTop = 0;
  document.getElementById('cardModalBackdrop').classList.add('active');
}

function openCardModal(slot = 0) {
  curSlot = slot;
  modalDexId = slot + 1;
  selectedType = null;
  document.querySelectorAll('#cm_types .type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cm_name').value   = '';
  document.getElementById('cm_rarity').value = '';
  populateSetDropdown('cm_set_name');
  document.getElementById('cm_card_number').value = '';
  document.getElementById('cm_set_total').value   = '';

  const fileInput = document.getElementById('cm_file');
  fileInput.value = '';
  try { fileInput.files = new DataTransfer().files; } catch(e) {}

  const wrap = document.getElementById('up_preview_wrap');
  if (wrap) wrap.classList.add('hidden');
  const empty = document.getElementById('up_empty');
  if (empty) empty.classList.remove('hidden');

  const titleEl = document.getElementById('cardModalTitle');
  if (titleEl) {
    titleEl.innerHTML = `Add Pokémon Card <span class="add-modal-dex-pill">Slot ${slot + 1}</span>`;
  }

  selectCardType('Normal', 'cm_types');
  updateLiveCardPreview(slot + 1);
  const fp2 = document.querySelector('.card-add-form-panel');
  if (fp2) fp2.scrollTop = 0;
  document.getElementById('cardModalBackdrop').classList.add('active');
}

async function saveCard() {
  const name = document.getElementById('cm_name').value.trim();
  let file = document.getElementById('cm_file').files[0];

  if (!name) return notify('Please enter a card name', true);
  if (!selectedType) return notify('Please select a Pokémon Type', true);

  // If no file uploaded, generate or fetch the official artwork as a file blob!
  if (!file) {
    try {
      notify('Fetching artwork…');
      // Find dex ID from name or slot
      const dexId = (curSlot !== null && curSlot !== undefined) ? (curSlot + 1) : 1;
      const artResp = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`);
      if (artResp.ok) {
        const blob = await artResp.blob();
        file = new File([blob], `${name.toLowerCase()}.png`, { type: 'image/png' });
      }
    } catch { /* proceed */ }
  }

  if (!file) return notify('Please select or upload a card image', true);

  const fd = new FormData();
  fd.append('name',      name);
  fd.append('slot',      curSlot !== null ? curSlot : 0);
  fd.append('card_type', selectedType);
  fd.append('file',      file);

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

  const btn = document.getElementById('btnSaveCard');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    const binderId = curBinder ? curBinder.id : (binders[0] ? binders[0].id : 1);
    const resp = await fetch(`${API}/binders/${binderId}/cards`, { method: 'POST', body: fd });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${resp.status}`);
    }
    closeModals();
    notify('Card added to collection! ✨');
    await selectBinder(binderId);
  } catch (e) {
    notify(`Upload failed: ${e.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to Collection';
  }
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
    updateLiveCardPreview();
  }
  document.querySelectorAll(`#${containerId} .type-btn`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === typeName);
  });
}

// ── Binder Creation & Management ──────────────────────────────────────────────
function openBinderModal(id = null) {
  editId = id;
  document.getElementById('binderModalTitle').textContent = id ? 'Edit Binder' : 'New Binder';
  const b = binders.find(x => x.id === id);
  document.getElementById('bm_name').value  = b?.name  || 'Master Portfolio (1–1,025)';
  document.getElementById('bm_pages').value = b?.pages || 65;
  selectGS(b?.grid_size || 4);
  selectColorVal(b?.color || '#ffcb05');
  document.getElementById('btnSaveBinder').textContent = id ? 'Update Binder' : 'Create Binder';
  document.getElementById('binderModalBackdrop').classList.add('active');
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
  const colorsEl = document.getElementById('bm_colors');
  if (colorsEl) {
    colorsEl.addEventListener('click', e => {
      if (e.target.dataset.val) selectColorVal(e.target.dataset.val);
    });
  }
}

async function saveBinder() {
  const name = document.getElementById('bm_name').value.trim();
  if (!name) return notify('Name is required', true);

  const pages = parseInt(document.getElementById('bm_pages').value) || 65;
  const colorEl = document.querySelector('.color-box.active');
  const color = colorEl ? colorEl.dataset.val : '#ffcb05';
  const body = { name, pages, grid_size: selectedGS, color };

  const btn = document.getElementById('btnSaveBinder');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API}/binders/${editId}` : `${API}/binders`;
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${resp.status}`);
    }
    const data = await resp.json();
    closeModals();
    notify('Binder saved! 🎉');
    await fetchBinders();
    selectBinder(data.id);
  } catch (e) {
    notify(`Error: ${e.message}`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Update Binder' : 'Create Binder';
  }
}

// ── Drag & Drop / Preview ─────────────────────────────────────────────────────
function initDragDrop() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  zone.addEventListener('click', e => {
    if (e.target.id === 'up_preview') return;
    const input = document.getElementById('cm_file');
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
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('up_preview');
      if (preview) {
        preview.src = e.target.result;
      }
      const wrap = document.getElementById('up_preview_wrap');
      if (wrap) wrap.classList.remove('hidden');

      const empty = document.getElementById('up_empty');
      if (empty) empty.classList.add('hidden');

      const nameEl = document.getElementById('up_preview_filename');
      if (nameEl) nameEl.textContent = file.name;

      // Update live card preview with custom art
      const artImg = document.getElementById('cm_prev_art');
      if (artImg) artImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function clearUploadedImg(e) {
  if (e) e.stopPropagation();
  const fileInput = document.getElementById('cm_file');
  if (fileInput) {
    fileInput.value = '';
    try { fileInput.files = new DataTransfer().files; } catch(err) {}
  }
  const wrap = document.getElementById('up_preview_wrap');
  if (wrap) wrap.classList.add('hidden');
  const empty = document.getElementById('up_empty');
  if (empty) empty.classList.remove('hidden');

  updateLiveCardPreview();
}

// ── Dashboard Implementation ──────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsResp, cardsResp] = await Promise.all([
      fetch(`${API}/stats`),
      fetch(`${API}/cards?limit=10000`),
    ]);

    let stats = statsResp.ok ? await statsResp.json() : null;
    let allCards = cardsResp.ok ? await cardsResp.json() : [];

    renderDashboardStats(stats, allCards);
    renderDashboardCharts(allCards, stats);
    renderRecentCards(allCards);
    renderHighlights(stats, allCards);
  } catch (e) {
    console.error('Dashboard load error', e);
  }
}

function renderDashboardStats(stats, allCards) {
  const grid = document.getElementById('dashStatsGrid');
  if (!grid) return;

  const total = allCards.length;
  const uniqueDexSlots = new Set(allCards.map(c => c.slot)).size;
  const pokedexPct = ((uniqueDexSlots / 1025) * 100).toFixed(1);
  const favs = allCards.filter(c => c.favorite).length;
  const favsPct = total ? Math.round((favs / total) * 100) : 0;

  const typeCounts = {};
  allCards.forEach(c => { if (c.card_type) typeCounts[c.card_type] = (typeCounts[c.card_type] || 0) + 1; });
  const topTypeEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topTypeName = topTypeEntry ? topTypeEntry[0] : 'Normal';
  const topTypeCount = topTypeEntry ? topTypeEntry[1] : 0;
  const topTypeObj = POKEMON_TYPES.find(t => t.name.toLowerCase() === topTypeName.toLowerCase()) || { icon: '⭐', color: '#ffcb05' };

  const premiumCount = allCards.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare'].includes(c.rarity)).length;
  const masterSetsCount = allSets.filter(s => s.set_total_cards > 0 && s.collected >= s.set_total_cards).length;

  const statItems = [
    {
      icon: '📦',
      theme: 'red',
      val: total,
      label: 'TOTAL CARDS',
      sub: `${uniqueDexSlots} / 1,025 Pokédex (${pokedexPct}%)`,
      badge: `${binders.length} Binder${binders.length !== 1 ? 's' : ''}`
    },
    {
      icon: '❤️',
      theme: 'pink',
      val: favs,
      label: 'FAVORITES VAULT',
      sub: `${favsPct}% of entire portfolio`,
      badge: 'Curated'
    },
    {
      icon: '🏅',
      theme: 'gold',
      val: allCardSets.length || allSets.length,
      label: 'TRACKED SETS',
      sub: `${masterSetsCount} Master Set${masterSetsCount !== 1 ? 's' : ''} Complete`,
      badge: 'Expansions'
    },
    {
      icon: topTypeObj.icon,
      theme: 'type',
      typeColor: topTypeObj.color,
      val: topTypeCount,
      label: `${topTypeName.toUpperCase()} AFFINITY`,
      sub: `Most abundant element`,
      badge: 'Top Type'
    },
    {
      icon: '✨',
      theme: 'rainbow',
      val: premiumCount,
      label: 'CROWN JEWELS',
      sub: 'SAR, SIR & Gold Rares',
      badge: 'Ultra Rare'
    },
  ];

  grid.innerHTML = statItems.map(it => `
    <div class="dash-stat-card dash-stat-${it.theme}" ${it.typeColor ? `style="--card-theme-color:${it.typeColor}"` : ''}>
      <div class="dash-stat-top">
        <div class="dash-stat-icon-box">${it.icon}</div>
        <span class="dash-stat-badge">${it.badge}</span>
      </div>
      <div class="dash-stat-val">${it.val.toLocaleString()}</div>
      <div class="dash-stat-lbl font-pixel">${it.label}</div>
      <div class="dash-stat-sub">${it.sub}</div>
    </div>
  `).join('');
}

function renderDashboardCharts(allCards) {
  // 1. Type Chart
  const typeCounts = {};
  POKEMON_TYPES.forEach(t => typeCounts[t.name] = 0);
  allCards.forEach(c => {
    if (c.card_type && typeCounts[c.card_type] !== undefined) {
      typeCounts[c.card_type]++;
    }
  });

  const typeLabels = Object.keys(typeCounts).filter(k => typeCounts[k] > 0);
  const typeData   = typeLabels.map(k => typeCounts[k]);
  const typeColors = typeLabels.map(k => POKEMON_TYPES.find(t => t.name === k)?.color || '#94a3b8');

  if (typeChartInst) typeChartInst.destroy();
  const typeCanvas = document.getElementById('typeChart');
  if (typeCanvas) {
    typeChartInst = new Chart(typeCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: typeLabels,
        datasets: [{
          data: typeData.length ? typeData : [1],
          backgroundColor: typeData.length ? typeColors : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              font: { family: "'Inter', sans-serif", weight: 'bold', size: 11 },
              color: '#334155'
            }
          }
        },
      },
    });
  }

  // 2. Rarity Chart
  const rarCounts = {};
  RARITIES.forEach(r => rarCounts[r] = 0);
  allCards.forEach(c => { if (c.rarity && rarCounts[c.rarity] !== undefined) rarCounts[c.rarity]++; });

  const rarLabels = RARITIES.filter(r => rarCounts[r] > 0);
  const rarData   = rarLabels.map(r => rarCounts[r]);
  const rarColorMap = {
    'Common': '#94a3b8',
    'Uncommon': '#60a5fa',
    'Rare': '#3b82f6',
    'Super Rare': '#8b5cf6',
    'Baby Shiny': '#06b6d4',
    'Rare Shiny': '#14b8a6',
    'Ilusration Rare(IR)': '#f59e0b',
    'Special Art Rare (SAR)': '#ec4899',
    'Special Ilustration Art Rare': '#8b5cf6',
    'Gold': '#ffd400'
  };
  const rarColors = rarLabels.map(r => rarColorMap[r] || '#ffd400');

  if (rarityChartInst) rarityChartInst.destroy();
  const rarCanvas = document.getElementById('rarityChart');
  if (rarCanvas) {
    rarityChartInst = new Chart(rarCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: rarLabels.length ? rarLabels : ['No Cards'],
        datasets: [{
          data: rarData.length ? rarData : [0],
          backgroundColor: rarColors.length ? rarColors : ['#cbd5e1'],
          borderRadius: 8,
          borderSkipped: false
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter', sans-serif" } } },
          y: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", weight: 'bold' } } }
        }
      },
    });
  }

  // 3. Growth Chart
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
  const growthCanvas = document.getElementById('growthChart');
  if (growthCanvas) {
    const ctx = growthCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(255, 203, 5, 0.35)');
    grad.addColorStop(1, 'rgba(255, 203, 5, 0.01)');

    growthChartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedMonths.length ? sortedMonths.map(m => {
          const [y, mo] = m.split('-');
          return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
        }) : ['Today'],
        datasets: [{
          label: 'Total Collected Cards',
          data: growthData.length ? growthData : [allCards.length],
          fill: true,
          borderColor: '#ffcb05',
          borderWidth: 3,
          backgroundColor: grad,
          tension: 0.38,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#ffcb05',
          pointBorderWidth: 2.5
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            titleFont: { family: "'Press Start 2P', monospace", size: 10 },
            bodyFont: { family: "'Inter', sans-serif", weight: 'bold' }
          }
        },
        scales: {
          x: { grid: { color: '#f8fafc' }, ticks: { font: { family: "'Inter', sans-serif" } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter', sans-serif" }, precision: 0 } }
        }
      },
    });
  }
}

function renderRecentCards(allCards) {
  const list = document.getElementById('recentCardsList');
  if (!list) return;

  const sorted = [...allCards]
    .filter(c => c.date_added)
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 6);

  if (!sorted.length) {
    list.innerHTML = `<div class="dash-empty-pulls">🎴 No cards logged yet. Open your binder and add your first Pokémon!</div>`;
    return;
  }

  list.innerHTML = sorted.map(c => {
    const pad = String((c.slot !== null && c.slot !== undefined) ? c.slot + 1 : 1).padStart(4, '0');
    const tDef = POKEMON_TYPES.find(t => t.name.toLowerCase() === (c.card_type || '').toLowerCase()) || { color: '#64748b' };
    const dateStr = new Date(c.date_added).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="dash-recent-row" onclick="openCardDetail(${c.id}, ${(c.slot || 0) + 1})">
        <div class="dash-recent-art-wrap">
          <img src="${API}/cards/${c.id}/image" loading="lazy" alt="${esc(c.name)}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(c.slot || 0) + 1}.png'">
        </div>
        <div class="dash-recent-info">
          <div class="dash-recent-title-row">
            <span class="dash-recent-name">${esc(c.name)}</span>
            <span class="dash-recent-dex font-pixel">#${pad}</span>
          </div>
          <div class="dash-recent-meta-row">
            <span class="dash-recent-type-pill" style="background:${tDef.color}">${esc(c.card_type || 'Normal')}</span>
            ${c.rarity ? `<span class="dash-recent-rarity-pill">${esc(c.rarity)}</span>` : ''}
            ${c.set_name ? `<span class="dash-recent-set-name">${esc(c.set_name)}</span>` : ''}
          </div>
        </div>
        <div class="dash-recent-date">${dateStr}</div>
      </div>
    `;
  }).join('');
}

function renderHighlights(stats, allCards) {
  const list = document.getElementById('dashHighlights');
  if (!list) return;

  const favs = allCards.filter(c => c.favorite);
  const sets = new Set(allCards.filter(c => c.set_name).map(c => c.set_name));
  const ultraRares = allCards.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare'].includes(c.rarity));

  const items = [
    { icon: '👑', title: 'MASTER CURATOR', desc: `${allCards.length} Total Cards across ${binders.length} active binder${binders.length !== 1 ? 's' : ''}`, bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
    { icon: '💖', title: 'FAVORITES SHOWCASE', desc: `${favs.length} Pokémon cards marked as personal favorites`, bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)' },
    { icon: '💎', title: 'ULTRA RARE VAULT', desc: `${ultraRares.length} Special Art Rares & Gold tier cards collected`, bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' },
    { icon: '🗺️', title: 'EXPANSION FRONTIER', desc: `${sets.size} Card sets and expansions actively collected`, bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }
  ];

  list.innerHTML = items.map(h => `
    <div class="dash-highlight-card" style="background:${h.bg}">
      <div class="dash-hl-icon">${h.icon}</div>
      <div class="dash-hl-text">
        <div class="dash-hl-title font-pixel">${h.title}</div>
        <div class="dash-hl-desc">${h.desc}</div>
      </div>
    </div>
  `).join('');
}

// ── Favorites Implementation ──────────────────────────────────────────────────
let favTypeFilter = 'all';

async function loadFavorites() {
  try {
    const resp = await fetch(`${API}/favorites`);
    if (resp.ok) {
      allFavorites = await resp.json();
    } else {
      const bResp = await fetch(`${API}/binders`);
      if (bResp.ok) {
        const bData = await bResp.json();
        allFavorites = bData.flatMap(b => (b.cards || []).filter(c => c.favorite));
      }
    }
    renderFavTypeFilterPills();
    renderFavorites();
  } catch (e) {
    notify(`Could not load favorites: ${e.message}`, true);
  }
}

function renderFavTypeFilterPills() {
  const container = document.getElementById('favTypeFilterBar');
  if (!container) return;

  const usedTypes = new Set(allFavorites.map(c => c.card_type).filter(Boolean));
  const typesToShow = POKEMON_TYPES.filter(t => usedTypes.has(t.name));

  container.innerHTML = `
    <button class="pill-btn ${favTypeFilter === 'all' ? 'active' : ''}" onclick="selectFavTypeFilter('all')">ALL TYPES (${allFavorites.length})</button>
    ${typesToShow.map(t => {
      const count = allFavorites.filter(c => c.card_type === t.name).length;
      return `
        <button class="pill-btn ${favTypeFilter === t.name ? 'active' : ''}" onclick="selectFavTypeFilter('${t.name}')">
          ${t.icon} ${t.name.toUpperCase()} (${count})
        </button>
      `;
    }).join('')}
  `;
}

function selectFavTypeFilter(typeName) {
  favTypeFilter = typeName;
  renderFavTypeFilterPills();
  renderFavorites();
}

async function toggleCardFavoriteDirect(cardId, e) {
  if (e) e.stopPropagation();
  try {
    const resp = await fetch(`${API}/cards/${cardId}/favorite`, { method: 'PUT' });
    if (resp.ok) {
      const updated = await resp.json();
      notify(updated.favorite ? 'Added to favorites ❤️' : 'Removed from favorites 🤍');
      await loadFavorites();
      if (curBinder) await fetchBinders();
    }
  } catch (err) {
    notify('Failed to update favorite', true);
  }
}

function renderFavorites() {
  const grid = document.getElementById('favGrid');
  const empty = document.getElementById('favEmpty');
  const subtitle = document.getElementById('favSubtitle');
  const spotlightWrap = document.getElementById('favSpotlightWrap');
  const spotlightStrip = document.getElementById('favHighlights');

  if (subtitle) {
    const ultraCount = allFavorites.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare'].includes(c.rarity)).length;
    subtitle.innerHTML = `<strong>${allFavorites.length}</strong> treasured card${allFavorites.length !== 1 ? 's' : ''} in your showcase • <strong>${ultraCount}</strong> ultra-rare pull${ultraCount !== 1 ? 's' : ''}`;
  }

  // Spotlight strip: Ultra rares
  if (spotlightWrap && spotlightStrip) {
    const ultraRares = allFavorites.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare', 'Ilusration Rare(IR)'].includes(c.rarity));
    if (ultraRares.length > 0 && favTypeFilter === 'all') {
      spotlightWrap.classList.remove('hidden');
      spotlightStrip.innerHTML = ultraRares.slice(0, 8).map(c => `
        <div class="fav-spotlight-card" onclick="openCardDetail(${c.id}, ${(c.slot || 0) + 1})">
          <div class="fav-spotlight-art-box">
            <img src="${API}/cards/${c.id}/image" alt="${esc(c.name)}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(c.slot || 0) + 1}.png'">
            <span class="fav-spotlight-badge font-pixel">${esc(c.rarity || 'RARE')}</span>
          </div>
          <div class="fav-spotlight-name">${esc(c.name)}</div>
        </div>
      `).join('');
    } else {
      spotlightWrap.classList.add('hidden');
    }
  }

  let filtered = [...allFavorites];
  if (favTypeFilter !== 'all') {
    filtered = filtered.filter(c => c.card_type === favTypeFilter);
  }

  let sorted = [...filtered];
  if (favSortMode === 'date_desc') sorted.sort((a, b) => new Date(b.date_added || 0) - new Date(a.date_added || 0));
  else if (favSortMode === 'date_asc') sorted.sort((a, b) => new Date(a.date_added || 0) - new Date(b.date_added || 0));
  else if (favSortMode === 'name_asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (favSortMode === 'rarity_desc') {
    const rScore = r => RARITIES.indexOf(r);
    sorted.sort((a, b) => rScore(b.rarity) - rScore(a.rarity));
  }

  if (!sorted.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (favView === 'grid') {
    grid.className = 'fav-cards-grid';
    grid.innerHTML = sorted.map(c => {
      const pad = String((c.slot !== null && c.slot !== undefined) ? c.slot + 1 : 1).padStart(4, '0');
      const tDef = POKEMON_TYPES.find(t => t.name.toLowerCase() === (c.card_type || '').toLowerCase()) || { color: '#64748b' };
      const setLabel = c.set_name ? `${esc(c.set_name)}${c.card_number ? ' #' + c.card_number : ''}` : 'Independent Card';

      return `
        <div class="fav-card-item" onclick="openCardDetail(${c.id}, ${(c.slot || 0) + 1})">
          <div class="fav-card-top-bar">
            <span class="fav-card-dex font-pixel">No. ${pad}</span>
            <button class="fav-heart-btn active" onclick="toggleCardFavoriteDirect(${c.id}, event)" title="Remove from favorites">
              ❤️
            </button>
          </div>

          <div class="fav-card-art-box">
            <img src="${API}/cards/${c.id}/image" loading="lazy" alt="${esc(c.name)}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(c.slot || 0) + 1}.png'">
            <div class="fav-card-hologram-shimmer"></div>
          </div>

          <div class="fav-card-bottom-info">
            <div class="fav-card-name">${esc(c.name)}</div>
            <div class="fav-card-meta-row">
              <span class="fav-card-type-pill" style="background:${tDef.color}">${esc(c.card_type || 'Normal')}</span>
              ${c.rarity ? `<span class="fav-card-rarity-pill">${esc(c.rarity)}</span>` : ''}
            </div>
            <div class="fav-card-set-text">${setLabel}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    // List view
    grid.className = 'fav-cards-list';
    grid.innerHTML = sorted.map(c => {
      const pad = String((c.slot !== null && c.slot !== undefined) ? c.slot + 1 : 1).padStart(4, '0');
      const tDef = POKEMON_TYPES.find(t => t.name.toLowerCase() === (c.card_type || '').toLowerCase()) || { color: '#64748b' };
      const dateStr = c.date_added ? new Date(c.date_added).toLocaleDateString() : '—';
      const setLabel = c.set_name ? `${esc(c.set_name)}${c.card_number ? ' #' + c.card_number : ''}` : 'Independent Card';

      return `
        <div class="fav-list-row" onclick="openCardDetail(${c.id}, ${(c.slot || 0) + 1})">
          <img src="${API}/cards/${c.id}/image" class="fav-list-thumb" alt="${esc(c.name)}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(c.slot || 0) + 1}.png'">
          <div class="fav-list-main">
            <div class="fav-list-title-row">
              <span class="fav-list-name">${esc(c.name)}</span>
              <span class="fav-list-dex font-pixel">No. ${pad}</span>
            </div>
            <div class="fav-list-details-row">
              <span class="fav-card-type-pill" style="background:${tDef.color}">${esc(c.card_type || 'Normal')}</span>
              ${c.rarity ? `<span class="fav-card-rarity-pill">${esc(c.rarity)}</span>` : ''}
              <span class="fav-list-set">${setLabel}</span>
            </div>
          </div>
          <div class="fav-list-right">
            <span class="fav-list-date">${dateStr}</span>
            <button class="fav-heart-btn active" onclick="toggleCardFavoriteDirect(${c.id}, event)" title="Remove from favorites">❤️</button>
          </div>
        </div>
      `;
    }).join('');
  }
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

// ── Sets Implementation ───────────────────────────────────────────────────────
async function loadSets() {
  try {
    const [setsResp, cardSetsResp] = await Promise.all([
      fetch(`${API}/sets`),
      fetch(`${API}/card-sets`).catch(() => ({ ok: false }))
    ]);

    if (setsResp.ok) allSets = await setsResp.json();
    if (cardSetsResp && cardSetsResp.ok) allCardSets = await cardSetsResp.json();

    renderSets();
  } catch (e) {
    notify(`Could not load sets: ${e.message}`, true);
  }
}

function renderSetsKPI() {
  const kpiTotalSets = document.getElementById('kpi_total_sets');
  const kpiCompleted = document.getElementById('kpi_completed_sets');
  const kpiCards     = document.getElementById('kpi_total_collected_cards');
  const kpiPct       = document.getElementById('kpi_overall_pct');

  const totalSets = allSets.length;
  const completedSets = allSets.filter(s => s.set_total_cards > 0 && s.collected >= s.set_total_cards).length;
  const totalCollectedCards = allSets.reduce((sum, s) => sum + (s.collected || 0), 0);
  const totalPossibleCards = allSets.reduce((sum, s) => sum + (s.set_total_cards || 0), 0);
  const overallPct = totalPossibleCards > 0 ? ((totalCollectedCards / totalPossibleCards) * 100).toFixed(1) : 0;

  if (kpiTotalSets) kpiTotalSets.textContent = totalSets;
  if (kpiCompleted) kpiCompleted.textContent = completedSets;
  if (kpiCards)     kpiCards.textContent = totalCollectedCards;
  if (kpiPct)       kpiPct.textContent = `${overallPct}%`;
}

function renderSets() {
  const grid = document.getElementById('setsGrid');
  const empty = document.getElementById('setsEmpty');
  if (!grid) return;

  renderSetsKPI();

  let filtered = [...allSets];

  if (setsStatusFilter === 'complete') {
    filtered = filtered.filter(s => s.set_total_cards > 0 && s.collected >= s.set_total_cards);
  } else if (setsStatusFilter === 'incomplete') {
    filtered = filtered.filter(s => !s.set_total_cards || s.collected < s.set_total_cards);
  }

  const query = document.getElementById('setSearchInput')?.value.toLowerCase().trim() || '';
  if (query) filtered = filtered.filter(s => s.set_name.toLowerCase().includes(query));

  if (setsSortMode === 'pct_desc') {
    filtered.sort((a, b) => (b.collected / (b.set_total_cards || 1)) - (a.collected / (a.set_total_cards || 1)));
  } else if (setsSortMode === 'pct_asc') {
    filtered.sort((a, b) => (a.collected / (a.set_total_cards || 1)) - (b.collected / (b.set_total_cards || 1)));
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
    const totalCards = s.set_total_cards || 0;
    const collected = s.collected || 0;
    const pct = totalCards ? Math.min(100, Math.round((collected / totalCards) * 100)) : 0;
    const isComplete = totalCards > 0 && collected >= totalCards;
    const remaining = totalCards ? Math.max(0, totalCards - collected) : 0;

    // Card sample avatars (if available)
    const cardSamples = (s.cards || []).slice(0, 5);

    return `
      <div class="set-booster-card ${isComplete ? 'set-is-mastered' : ''}">
        <div class="set-card-header">
          <div class="set-card-title-group">
            <span class="set-card-series-tag font-pixel">TCG EXPANSION</span>
            <h3 class="set-card-title">${esc(s.set_name)}</h3>
          </div>
          ${isComplete ? `
            <div class="set-complete-trophy-badge font-pixel">
              🏆 MASTER SET
            </div>
          ` : `
            <div class="set-pct-pill font-pixel ${pct > 40 ? 'pct-high' : 'pct-mid'}">
              ${pct}%
            </div>
          `}
        </div>

        <div class="set-progress-track">
          <div class="set-progress-bar ${isComplete ? 'bar-complete' : (pct > 40 ? 'bar-high' : '')}" style="width: ${Math.max(pct, collected > 0 ? 4 : 0)}%"></div>
        </div>

        <div class="set-stats-row">
          <div class="set-stat-box">
            <span class="set-stat-num">${collected}</span>
            <span class="set-stat-label">COLLECTED</span>
          </div>
          <div class="set-stat-box">
            <span class="set-stat-num">${totalCards || '?'}</span>
            <span class="set-stat-label">TOTAL IN SET</span>
          </div>
          <div class="set-stat-box">
            <span class="set-stat-num">${totalCards ? remaining : '—'}</span>
            <span class="set-stat-label">REMAINING</span>
          </div>
        </div>

        ${cardSamples.length > 0 ? `
          <div class="set-card-samples-strip">
            <span class="set-samples-label">RECENT PULLS:</span>
            <div class="set-samples-avatars">
              ${cardSamples.map(sc => `
                <img src="${API}/cards/${sc.id}/image" 
                     class="set-sample-thumb" 
                     title="${esc(sc.name)} (#${sc.card_number || '?'})" 
                     onclick="openCardDetail(${sc.id})"
                     loading="lazy" 
                     onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(sc.slot || 0) + 1}.png'" />
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="set-card-actions">
          <button class="set-action-btn btn-view-set" onclick="filterBinderBySet('${esc(s.set_name)}')">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            View in Binder
          </button>
          <button class="set-action-btn btn-add-to-set" onclick="openCardModalForSet('${esc(s.set_name)}', ${totalCards})">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add Card
          </button>
          ${s.set_id ? `
            <button class="set-delete-btn" onclick="deleteSet(${s.set_id}, '${esc(s.set_name)}', event)" title="Delete tracked set">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterBinderBySet(setName) {
  navigateTo('binder');
  const searchInput = document.getElementById('pokedexSearchInput');
  if (searchInput) {
    searchInput.value = setName;
    curSearch = setName.toLowerCase();
    renderBinderView();
    notify(`Filtering binder by set: ${setName}`);
  }
}

function openCardModalForSet(setName, totalCards) {
  openCardModal(curSlot !== null ? curSlot : 0);
  setTimeout(() => {
    const setSelect = document.getElementById('cm_set_name');
    if (setSelect) setSelect.value = setName;
    const totalInput = document.getElementById('cm_set_total');
    if (totalInput) totalInput.value = totalCards || '';
  }, 50);
}

function applySetPreset(name, total) {
  const nameInput = document.getElementById('set_add_name');
  const totalInput = document.getElementById('set_add_total_cards');
  if (nameInput) nameInput.value = name;
  if (totalInput) totalInput.value = total;
}

async function deleteSet(setId, setName, event) {
  if (event) event.stopPropagation();
  if (!confirm(`Are you sure you want to stop tracking expansion "${setName}"? (Your cards will not be deleted).`)) {
    return;
  }
  try {
    const resp = await fetch(`${API}/card-sets/${setId}`, { method: 'DELETE' });
    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    notify(`Set "${setName}" removed from tracking.`);
    allSets = allSets.filter(s => s.set_id !== setId);
    allCardSets = allCardSets.filter(s => s.id !== setId);
    loadSets();
  } catch (err) {
    notify(`Failed to remove set: ${err.message}`, true);
  }
}

function filterSets(query) { renderSets(); }
function sortSetsBy(val) { setsSortMode = val; renderSets(); }

function filterSetsByStatus(status) {
  setsStatusFilter = status;
  ['all','complete','incomplete'].forEach(s => {
    const btn = document.getElementById(`setFilter${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (btn) btn.classList.toggle('active', s === status);
  });
  renderSets();
}

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
    notify('Set added successfully!');
    if (currentPage === 'sets') loadSets();
  } catch (e) {
    notify(`Error: ${e.message}`, true);
  }
}

function populateSetDropdown(selectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">— None —</option>' + allCardSets.map(s => `
    <option value="${esc(s.name)}"${s.name === selectedValue ? ' selected' : ''}>${esc(s.name)}</option>
  `).join('');
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
  if (setObj) totalInput.value = setObj.total_cards;
}

// ── Toast & Helpers ───────────────────────────────────────────────────────────
function notify(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError ? '#ef4444' : '#111827';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function esc(s) {
  if (!s) return '';
  return s.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}