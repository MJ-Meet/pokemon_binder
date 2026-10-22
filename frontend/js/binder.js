/**
 * PokeBinder - Binder & Pokédex Grid Module (frontend/js/binder.js)
 * 1,025 Pokédex portfolio, 3D card flipping, pagination, filters, and binder portfolio management.
 */

// ── Fetch Binders & Select ────────────────────────────────────────────────────
async function fetchBinders() {
  try {
    const resp = await fetch(`${API}/binders`);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    binders = await resp.json();

    const savedId = parseInt(localStorage.getItem('active_binder_id'), 10);
    let target = binders.find(b => b.id === savedId);

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

// ── Search & Filter Controls ──────────────────────────────────────────────────
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

// ── Render Binder Page ────────────────────────────────────────────────────────
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

// ── Render Individual Pokémon Card ───────────────────────────────────────────
function renderPokemonCard(p) {
  const card = getCollectedCardForPokemon(p.id, p.name);
  const isCollected = !!card;
  const padNumber = String(p.id).padStart(4, '0');
  const artUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

  if (isCollected) {
    // ── COLLECTED CARD: Genuine 3D Flip with Front & TCG Back ──
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
          <!-- Front Face -->
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

          <!-- Back Face: Full TCG Card with Expand Button & Yellow Title -->
          <div class="pk-card-face pk-card-back-v2">
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

            <div class="pk-card-back-tcg-wrap">
              <img src="${cardImgUrl}" 
                   onerror="this.onerror=null;this.src='${artUrl}'" 
                   class="pk-card-back-tcg-img" 
                   alt="${esc(p.name)} TCG Card" 
                   loading="lazy" />
            </div>

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
    // ── UNCOLLECTED CARD: Locked Silhouette & Add Button on Reverse ──
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
  if (e && e.target && e.target.closest('.pk-card-expand-circle, .pk-uncoll-add-btn')) {
    return;
  }
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
  if (e) e.stopPropagation();
  lastFocusedCardId = `card-dex-${dexId}`;
  openCardDetail(cardId, dexId);
}

function openAddCardForMissing(dexId, name, e) {
  if (e) e.stopPropagation();
  openCardModalForDex(dexId, name);
}

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

// ── Binder Creation & Portfolio Management Modal ──────────────────────────────
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
