/**
 * PokeBinder - Binder & Pokédex Grid Module (frontend/js/binder.js)
 * 1,025 Pokédex portfolio, 3D card flipping, pagination, filters, and binder portfolio management.
 */

// ── Page Flip State (Separate Hover, Manually Pinned, and Flip-All States) ────
let isFlipAllActive = false;
const pinnedCardStates = new Map(); // dexId -> true (pinned flipped) | false (pinned front during Flip All)

function resetPageFlipState() {
  isFlipAllActive = false;
  pinnedCardStates.clear();
  updateFlipAllButtonUI();
}

function updateFlipAllButtonUI(hasCards = true) {
  const btn = document.getElementById('btnFlipAll');
  const label = document.getElementById('btnFlipAllLabel');
  if (label) {
    label.textContent = isFlipAllActive ? 'FLIP BACK ALL' : 'FLIP ALL';
  }
  if (btn) {
    btn.classList.toggle('is-active', isFlipAllActive);
    btn.setAttribute('aria-pressed', String(isFlipAllActive));
    btn.title = isFlipAllActive ? 'Flip all cards on this page back to front' : 'Flip all cards on this page';
    btn.disabled = !hasCards;
  }
}

function applyCardFlipState(cardEl) {
  if (!cardEl) return;
  const dexId = parseInt(cardEl.dataset.dexId, 10);
  const pinOverride = pinnedCardStates.has(dexId) ? pinnedCardStates.get(dexId) : undefined;

  // Deterministic state priority:
  // 1. Explicit per-card pin override (true = pinned flipped, false = flipped back during Flip All)
  // 2. Page-level Flip All state (true = all cards flipped)
  // 3. Automatic hover / keyboard focus (controlled by CSS when neither 1 nor 2 locks the card)
  if (pinOverride === true) {
    cardEl.classList.add('is-flipped', 'is-pinned');
    cardEl.classList.remove('is-unflipped-override', 'is-hover-suppressed');
    cardEl.setAttribute('aria-pressed', 'true');
  } else if (pinOverride === false) {
    cardEl.classList.remove('is-flipped', 'is-pinned');
    cardEl.classList.add('is-unflipped-override');
    cardEl.setAttribute('aria-pressed', 'false');
  } else if (isFlipAllActive) {
    cardEl.classList.add('is-flipped');
    cardEl.classList.remove('is-pinned', 'is-unflipped-override', 'is-hover-suppressed');
    cardEl.setAttribute('aria-pressed', 'true');
  } else {
    cardEl.classList.remove('is-flipped', 'is-pinned', 'is-unflipped-override');
    cardEl.setAttribute('aria-pressed', 'false');
  }
}

function syncAllCardsFlipState() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('#cardContainer .pk-card').forEach(cardEl => {
    applyCardFlipState(cardEl);
  });
}

function toggleFlipAllCards() {
  const cards = (typeof document !== 'undefined' && document.querySelectorAll)
    ? document.querySelectorAll('#cardContainer .pk-card')
    : [];
  if (!cards.length) return;

  if (!isFlipAllActive) {
    // First click: Flip every card on the current page simultaneously and keep flipped
    isFlipAllActive = true;
    pinnedCardStates.clear();
  } else {
    // Second click: Return every card on the current page to its original front side
    isFlipAllActive = false;
    pinnedCardStates.clear();
  }

  cards.forEach(cardEl => {
    cardEl.classList.remove('is-hover-suppressed');
    applyCardFlipState(cardEl);
  });
  updateFlipAllButtonUI(cards.length > 0);
}

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
    resetPageFlipState();
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
  resetPageFlipState();
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
  resetPageFlipState();
  renderBinderView();
}

function selectStatusFilter(status) {
  selectedStatus = status;
  document.querySelectorAll('#statusFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  curPage = 0;
  resetPageFlipState();
  renderBinderView();
}

function selectTypeFilter(type) {
  selectedFilterType = type;
  document.querySelectorAll('#typeFilterPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  curPage = 0;
  resetPageFlipState();
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
  const endIdx = Math.min((curPage + 1) * CARDS_PER_PAGE, totalFiltered);

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

  const curPageEl = document.getElementById('curPageNum');
  const totalPageEl = document.getElementById('totalPageNum');
  if (curPageEl) curPageEl.textContent = curPage + 1;
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
    updateFlipAllButtonUI(false);
    return;
  }
  emptyState.classList.add('hidden');

  grid.innerHTML = pageSlice.map(p => renderPokemonCard(p)).join('');
  syncAllCardsFlipState();
  updateFlipAllButtonUI(true);
}

// ── Render Individual Pokémon Card ───────────────────────────────────────────
function renderPokemonCard(p) {
  const card = getCollectedCardForPokemon(p.id, p.name);
  const isCollected = !!card;
  const padNumber = String(p.id).padStart(4, '0');
  const artUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
  const safeNameHtml = esc(p.name);
  const safeNameJs = safeNameHtml.replace(/'/g, "\\'");

  if (isCollected) {
    // ── COLLECTED CARD: Hover-to-Flip 3D Card Revealing Actual Trading Card ──
    const cardImgUrl = `${API}/cards/${card.id}/image`;
    const displayName = esc(card.name || p.name);
    const typeInfo = card.card_type
      ? (POKEMON_TYPES.find(t => t.name.toLowerCase() === card.card_type.toLowerCase()) || null)
      : null;

    // Build optional real-data metadata badges (only when present in actual card data)
    const metaBadges = [];
    if (card.card_type) {
      const dotColor = typeInfo ? typeInfo.color : '#f5c542';
      metaBadges.push(
        `<span class="pk-tcg-pill pk-tcg-pill-type"><span class="pk-tcg-type-dot" style="background:${dotColor}"></span>${esc(card.card_type)}</span>`
      );
    }
    if (card.rarity) {
      metaBadges.push(`<span class="pk-tcg-pill pk-tcg-pill-rarity">${esc(card.rarity)}</span>`);
    }
    if (card.set_name || card.card_number) {
      const numStr = card.card_number
        ? `#${card.card_number}${card.set_total_cards ? '/' + card.set_total_cards : ''}`
        : '';
      const setParts = [card.set_name ? esc(card.set_name) : '', numStr].filter(Boolean).join(' ');
      if (setParts) {
        metaBadges.push(`<span class="pk-tcg-pill pk-tcg-pill-set">${setParts}</span>`);
      }
    }

    return `
      <div class="pk-card pk-card-collected"
           id="card-dex-${p.id}"
           data-dex-id="${p.id}"
           data-pokemon-name="${safeNameHtml}"
           data-card-id="${card.id}"
           data-collected="true"
           tabindex="0"
           aria-pressed="false"
           aria-label="${displayName}, No. ${padNumber}, collected Pokémon card. Hover to flip, click to pin or unpin."
           onpointerdown="recordCardPointer(this, event)"
           onmouseleave="handleCardMouseLeave(this)"
           onclick="handleCardClick(this, event)"
           onkeydown="handleCardKeydown(this, event)">

        <!-- Subtle Golden Outer Glow Behind Card -->
        <div class="pk-card-aura" aria-hidden="true"></div>

        <!-- 3D Elevation & Rotation Stage -->
        <div class="pk-card-stage">
          <div class="pk-card-inner">
            <!-- Front Face (Preserved Original Binder Design) -->
            <div class="pk-card-face pk-card-front pk-card-front-v1">
              <div class="pk-card-top-v1">
                <div class="pk-card-no-badge">No. ${padNumber}</div>
                <div class="pk-card-top-actions">
                  <button type="button"
                          class="pk-card-expand-circle"
                          onclick="handleExpandDetails(${card.id}, ${p.id}, event)"
                          onkeydown="event.stopPropagation()"
                          title="Expand Card Details"
                          aria-label="Expand details for ${displayName}">
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
                     alt="${safeNameHtml}"
                     loading="lazy" />
              </div>

              <div class="pk-card-bottom-v1">
                <div class="pk-card-name-v1">${safeNameHtml}</div>
              </div>

              <div class="pk-card-sheen" aria-hidden="true"></div>
            </div>

            <!-- Reverse Face: Actual Collected Pokémon Trading Card -->
            <div class="pk-card-face pk-card-back pk-card-back-tcg">
              <button type="button"
                      class="pk-card-expand-circle pk-tcg-expand-btn"
                      onclick="handleExpandDetails(${card.id}, ${p.id}, event)"
                      onkeydown="event.stopPropagation()"
                      title="Expand Card Details"
                      aria-label="Expand details for ${displayName}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#18181b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>

              <div class="pk-tcg-art-stage">
                <img src="${cardImgUrl}"
                     onerror="this.onerror=null;this.src='${artUrl}';this.classList.add('pk-tcg-art-fallback')"
                     class="pk-tcg-artwork"
                     alt="${displayName} Pokémon trading card"
                     loading="lazy" />
              </div>

              <div class="pk-tcg-footer">
                <div class="pk-tcg-title-row">
                  <span class="pk-tcg-name" title="${displayName}">${displayName}</span>
                  <span class="pk-tcg-dex">No. ${padNumber}</span>
                </div>
                ${metaBadges.length > 0 ? `<div class="pk-tcg-meta-row">${metaBadges.join('')}</div>` : ''}
              </div>

              <div class="pk-card-sheen pk-card-sheen-back" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // ── UNCOLLECTED CARD: Hover-to-Flip 3D Card Revealing Golden "+" Add Action ──
    const typeLabel = (p.types || []).join(' • ');

    return `
      <div class="pk-card pk-card-missing"
           id="card-dex-${p.id}"
           data-dex-id="${p.id}"
           data-pokemon-name="${safeNameHtml}"
           data-collected="false"
           tabindex="0"
           aria-pressed="false"
           aria-label="${safeNameHtml}, No. ${padNumber}, uncollected Pokémon. Hover to flip, click to pin, or click plus to add."
           onpointerdown="recordCardPointer(this, event)"
           onmouseleave="handleCardMouseLeave(this)"
           onclick="handleCardClick(this, event)"
           onkeydown="handleCardKeydown(this, event)">

        <!-- Subtle Golden Outer Glow Behind Card -->
        <div class="pk-card-aura pk-card-aura-missing" aria-hidden="true"></div>

        <!-- 3D Elevation & Rotation Stage (Same 3D Flip as Collected Cards) -->
        <div class="pk-card-stage">
          <div class="pk-card-inner">
            <!-- Front Face (Preserved Dark Navy Silhouette) -->
            <div class="pk-card-face pk-card-front pk-card-missing-front">
              <div class="pk-card-top">
                <span class="pk-card-number">No. ${padNumber}</span>
                <div class="pk-card-badge" title="Missing from collection">
                  <span style="color:var(--accent-gold);opacity:0.65;font-size:0.8rem">＋</span>
                </div>
              </div>
              <div class="pk-card-art-wrap">
                <img src="${artUrl}"
                     onerror="this.onerror=null;this.src='${fallbackUrl}'"
                     class="pk-card-art"
                     alt="Silhouette of ${safeNameHtml}"
                     loading="lazy" />
              </div>
              <div class="pk-card-bottom">
                <div class="pk-card-name">${safeNameHtml}</div>
                <div class="pk-card-sublabel">${esc(typeLabel)}</div>
              </div>
              <div class="pk-card-sheen" aria-hidden="true"></div>
            </div>

            <!-- Reverse Face: Minimal Dark Card-Addition Design with Prominent Golden "+" -->
            <div class="pk-card-face pk-card-back pk-card-back-add">
              <div class="pk-add-back-top">
                <span class="pk-add-back-dex">No. ${padNumber}</span>
                <span class="pk-add-back-poke">${safeNameHtml}</span>
              </div>

              <div class="pk-add-center-group">
                <button type="button"
                        class="pk-add-plus-btn"
                        onclick="handleAddBackClick(this, ${p.id}, '${safeNameJs}', event)"
                        onkeydown="event.stopPropagation()"
                        title="Add ${safeNameHtml} to collection"
                        aria-label="Add ${safeNameHtml} to collection">
                  <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <div class="pk-add-heading">ADD TO COLLECTION</div>
                <div class="pk-add-subtext">Click to add this Pokémon</div>
              </div>

              <div class="pk-card-sheen pk-card-sheen-back" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// ── Hover, Pin, Flip-All, Touch & Keyboard 3D Card Interaction Handlers ──────
function isTouchCapableInteraction(el) {
  if (el && el.dataset.lastPointerType) {
    return el.dataset.lastPointerType === 'touch' || el.dataset.lastPointerType === 'pen';
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
}

function recordCardPointer(el, e) {
  if (!el || !e) return;
  el.dataset.lastPointerType = e.pointerType || 'mouse';
}

function handleCardMouseLeave(el) {
  if (!el) return;
  // Clear temporary post-unlock hover suppression; never override pinned or Flip-All states
  el.classList.remove('is-hover-suppressed');
}

function toggleCardPinState(el, suppressHoverOnUnlock = true) {
  if (!el) return;
  const dexId = parseInt(el.dataset.dexId, 10);
  if (!dexId) return;

  const currentPin = pinnedCardStates.has(dexId) ? pinnedCardStates.get(dexId) : undefined;

  if (isFlipAllActive) {
    if (currentPin === false) {
      // Return this card to flipped (matching Flip All)
      pinnedCardStates.delete(dexId);
      el.classList.remove('is-hover-suppressed');
    } else {
      // Flip this individual card back to front while keeping all other cards flipped
      pinnedCardStates.set(dexId, false);
      if (suppressHoverOnUnlock) el.classList.add('is-hover-suppressed');
    }
  } else {
    if (currentPin === true) {
      // Unlock pinned card and restore normal hover behavior
      pinnedCardStates.delete(dexId);
      if (suppressHoverOnUnlock) el.classList.add('is-hover-suppressed');
    } else {
      // Pin this card flipped independently so it stays flipped after mouse leaves
      pinnedCardStates.set(dexId, true);
      el.classList.remove('is-hover-suppressed');
    }
  }

  applyCardFlipState(el);
}

function handleCardClick(el, e) {
  if (!el) return;

  // Independent action buttons inside the card handle their own click actions
  if (e && e.target && typeof e.target.closest === 'function' &&
      e.target.closest('.pk-card-expand-circle, .pk-add-plus-btn')) {
    return;
  }

  const isTouch = isTouchCapableInteraction(el);
  toggleCardPinState(el, !isTouch);
}

function handleAddBackClick(btnEl, dexId, name, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const cardEl = btnEl && typeof btnEl.closest === 'function' ? btnEl.closest('.pk-card') : null;

  // On touch devices, ensure the card is revealed first if somehow tapped before flipping
  if (cardEl && isTouchCapableInteraction(cardEl) && !cardEl.classList.contains('is-flipped')) {
    toggleCardPinState(cardEl, false);
    return;
  }

  openAddCardForMissing(dexId, name, e);
}

function handleCardKeydown(el, e) {
  if (!el || e.target !== el) return;

  if (e.key === 'Escape') {
    const dexId = parseInt(el.dataset.dexId, 10);
    if (isFlipAllActive) {
      pinnedCardStates.set(dexId, false);
    } else {
      pinnedCardStates.delete(dexId);
    }
    el.classList.add('is-hover-suppressed');
    applyCardFlipState(el);
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleCardPinState(el, true);
  }
}

function handleExpandDetails(cardId, dexId, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const cardEl = document.getElementById(`card-dex-${dexId}`);
  if (cardEl && isTouchCapableInteraction(cardEl) && !cardEl.classList.contains('is-flipped')) {
    toggleCardPinState(cardEl, false);
    return;
  }
  lastFocusedCardId = `card-dex-${dexId}`;
  openCardDetail(cardId, dexId);
}

function openAddCardForMissing(dexId, name, e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  openCardModalForDex(dexId, name);
}

function changeBinderPage(delta) {
  const filtered = getFilteredPokemon();
  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const newPage = curPage + delta;

  if (newPage >= 0 && newPage < totalPages) {
    curPage = newPage;
    resetPageFlipState();
    renderBinderView();
    scrollToBinderTop();
  }
}

// ── Binder Creation & Portfolio Management Modal ──────────────────────────────
function openBinderModal(id = null) {
  editId = id;
  document.getElementById('binderModalTitle').textContent = id ? 'Edit Binder' : 'New Binder';
  const b = binders.find(x => x.id === id);
  document.getElementById('bm_name').value = b?.name || 'Master Portfolio (1–1,025)';
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
