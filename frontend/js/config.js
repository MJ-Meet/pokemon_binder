/**
 * PokeBinder - Config & State Management (frontend/js/config.js)
 * Shared constants, application state, and core collection utilities.
 */

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

// ── Global Reactive State ─────────────────────────────────────────────────────
let binders            = [];
let curBinder          = null;
let curPage            = 0;          // 0-indexed binder page
const CARDS_PER_PAGE   = 16;         // 4 columns × 4 rows = 16 cards per page
let curSlot            = null;
let editId             = null;
let selectedGS         = 4;          // 4x4 (16-pocket)
let selectedType       = null;
let currentPage        = 'home';     // 'home' | 'binder' | 'dashboard' | 'favorites' | 'sets'

// Filter states
let curSearch          = '';
let selectedGen        = 'all';
let selectedStatus     = 'all';      // 'all' | 'collected' | 'missing'
let selectedFilterType = 'all';

// Cached maps for fast slot & name lookups
let cardBySlotMap      = {};
let cardByNameMap      = {};

// Dashboard Chart instances
let typeChartInst      = null;
let rarityChartInst    = null;
let growthChartInst    = null;

// Favorites & Sets State
let allFavorites       = [];
let favView            = 'grid';
let favSortMode        = 'date_desc';
let allSets            = [];
let setsStatusFilter   = 'all';
let setsSortMode       = 'pct_desc';
let allCardSets        = [];

// Card Detail State
let detailCard         = null;
let detailEditType     = null;
let lastFocusedCardId  = null;
let detailDexId        = null;
let modalDexId         = null;

// ── Cache & Collection Lookups ────────────────────────────────────────────────
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
      if (!cardByNameMap[clean] || cardByNameMap[clean].slot === undefined) {
        cardByNameMap[clean] = card;
      }
    }
  });
}

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
  if (curBinder && curBinder.cards) {
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    const match = curBinder.cards.find(c => {
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

// ── Notifications, Sanitization & Helpers ─────────────────────────────────────
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
