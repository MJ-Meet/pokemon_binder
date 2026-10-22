/**
 * ============================================================================
 * POKÉMON BINDER — FAVORITES VAULT MODULE
 * File: js/favorites.js
 * 
 * Handles:
 *  - Favorites collection loading (loadFavorites)
 *  - Type filter pills (renderFavTypeFilterPills, selectFavTypeFilter)
 *  - One-click favorite toggling (toggleCardFavoriteDirect)
 *  - Showcase layout rendering (renderFavorites: grid & list views)
 *  - Spotlight strip of ultra rares
 *  - View toggling (setFavView) & sorting modes (setFavSort)
 * ============================================================================
 */

let favTypeFilter = 'all';

// ── Load Favorites from Server ────────────────────────────────────────────────
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

// ── Render Type Filter Pills Bar ──────────────────────────────────────────────
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

// ── Direct Favorite Heart Toggle ──────────────────────────────────────────────
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

// ── Render Favorites Showcase (Grid / List) ───────────────────────────────────
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

// ── View Toggle (Grid / List) & Sort Controls ────────────────────────────────
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
