/**
 * ============================================================================
 * POKÉMON BINDER — MAIN APPLICATION ENTRYPOINT & ROUTER
 * File: js/app.js
 * 
 * Handles:
 *  - Global initialization on window.onload
 *  - Server connection pinging (pingBackend)
 *  - Sets catalogue preloading (fetchAllCardSets)
 *  - Single-Page Application (SPA) routing (navigateTo)
 *  - Responsive mobile navigation toggle (toggleMobileNav)
 *  - Global keyboard listener (Escape key for modal dismissal)
 * ============================================================================
 */

// ── Application Initialization ───────────────────────────────────────────────
window.onload = async () => {
  pingBackend();
  renderTypeSelector();
  renderDetailTypeSelector();
  initPickers();
  initDragDrop();
  fetchAllCardSets();
  await fetchBinders();
  navigateTo('home');

  // Global keyboard shortcut listeners
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
      closeCardDetail();
      closeAddSetModal();
      if (typeof closePartnerModal === 'function') closePartnerModal();
    }
  });
};

// ── Backend Connectivity Ping ────────────────────────────────────────────────
async function pingBackend() {
  try { await fetch(`${API}/`); } catch { /* silent */ }
}

// ── Card Sets Hydration ──────────────────────────────────────────────────────
async function fetchAllCardSets() {
  try {
    const resp = await fetch(`${API}/card-sets`);
    if (resp.ok) allCardSets = await resp.json();
  } catch(e) {
    console.error('Failed to fetch card sets', e);
  }
}

// ── Single-Page Navigation Router ────────────────────────────────────────────
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

  // Mount/refresh target page data
  if (page === 'home')      renderHomePage();
  if (page === 'binder')    renderBinderView();
  if (page === 'dashboard') loadDashboard();
  if (page === 'favorites') loadFavorites();
  if (page === 'sets')      loadSets();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Mobile Responsive Navigation Toggle ──────────────────────────────────────
function toggleMobileNav() {
  const menu = document.getElementById('topNavMenu');
  if (menu) menu.classList.toggle('mobile-open');
}
