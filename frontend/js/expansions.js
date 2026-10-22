/**
 * ============================================================================
 * POKÉMON BINDER — EXPANSIONS & SETS MODULE
 * File: js/expansions.js
 * 
 * Handles:
 *  - Sets & expansions data loader (loadSets)
 *  - KPI aggregate metrics (renderSetsKPI)
 *  - Booster pack card layout rendering (renderSets)
 *  - Filtering, searching & sorting of expansions (filterSets, sortSetsBy, filterSetsByStatus)
 *  - Binder filter cross-navigation (filterBinderBySet)
 *  - Add Set modal lifecycle (openAddSetModal, closeAddSetModal, saveNewSet)
 *  - Preset expansion applicator (applySetPreset)
 *  - Set deletion (deleteSet)
 * ============================================================================
 */

// ── Load Sets & Expansion Data from API ───────────────────────────────────────
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

// ── Render Top KPI Metrics for Expansions ────────────────────────────────────
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

// ── Render Booster-Pack Set Cards ─────────────────────────────────────────────
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

// ── Filter Binder by Set & Cross-Navigate ─────────────────────────────────────
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

// ── Apply Expansion Preset in Add Set Modal ──────────────────────────────────
function applySetPreset(name, total) {
  const nameInput = document.getElementById('set_add_name');
  const totalInput = document.getElementById('set_add_total_cards');
  if (nameInput) nameInput.value = name;
  if (totalInput) totalInput.value = total;
}

// ── Delete Tracked Set ────────────────────────────────────────────────────────
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

// ── Filter & Sort Handlers ────────────────────────────────────────────────────
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

// ── Add Set Modal Handlers ───────────────────────────────────────────────────
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
