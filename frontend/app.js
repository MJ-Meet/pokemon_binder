/**
 * ============================================================================
 * POKÉMON BINDER — MODULAR FRONTEND ARCHITECTURE
 * ============================================================================
 * The monolithic app.js has been refactored into a clean, modern multi-module
 * architecture under the `frontend/js/` directory:
 * 
 *  📁 frontend/js/
 *   ├── 📄 config.js       — API configs, Pokémon types, constants, state & card caches
 *   ├── 📄 trainer.js      — Trainer profile, gym badge showcase & partner companion selector
 *   ├── 📄 binder.js       — 3D interactive binder views, page-turning & 1,025 slot grid
 *   ├── 📄 card-detail.js  — Fullscreen card inspector, holographic tilt & inline editor
 *   ├── 📄 card-studio.js  — Card Studio uploader, drag-and-drop & artwork preview
 *   ├── 📄 dashboard.js    — Analytics, Chart.js graphs, pulls activity log & milestones
 *   ├── 📄 favorites.js    — Curated favorites vault, spotlight strip & grid/list modes
 *   ├── 📄 expansions.js   — Expansion booster sets, master set tracking & set management
 *   └── 📄 app.js          — Application bootstrapper, SPA router & global event listeners
 * ============================================================================
 */

// Fallback loader for legacy environments or standalone script inclusion
if (typeof POKEMON_TYPES === 'undefined' && typeof document !== 'undefined') {
  const modules = [
    'js/config.js',
    'js/trainer.js',
    'js/binder.js',
    'js/card-detail.js',
    'js/card-studio.js',
    'js/dashboard.js',
    'js/favorites.js',
    'js/expansions.js',
    'js/app.js'
  ];
  modules.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    document.head.appendChild(s);
  });
}