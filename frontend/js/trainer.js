/**
 * PokeBinder - Trainer Passport & Companion Module (frontend/js/trainer.js)
 * Trainer Card, Partner Pokémon companion selection, gym badges, and home binders showcase.
 */

// ── Trainer Partner Pokémon State ─────────────────────────────────────────────
let curPartnerDexId = 25;
let curPartnerName = 'Pikachu';
let curPartnerBg = '#ffcb05';
let curPartnerImg = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';

function editTrainerName() {
  const curName = localStorage.getItem('trainer_name') || 'Meet';
  const newName = prompt('Enter Trainer Name:', curName);
  if (newName && newName.trim()) {
    localStorage.setItem('trainer_name', newName.trim());
    const el = document.getElementById('tc_trainer_name');
    if (el) el.textContent = newName.trim();
  }
}

function openPartnerModal() {
  const storedImg  = localStorage.getItem('trainer_partner_img') || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';
  const storedBg   = localStorage.getItem('trainer_partner_bg') || '#ffcb05';
  const storedName = localStorage.getItem('trainer_partner_name') || 'Pikachu';
  const storedDex  = localStorage.getItem('trainer_partner_dex') || '25';

  curPartnerImg   = storedImg;
  curPartnerBg    = storedBg;
  curPartnerName  = storedName;
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
  const partnerBg  = localStorage.getItem('trainer_partner_bg') || '#ffcb05';
  const partnerEl  = document.getElementById('tc_partner_img');
  const avatarBox  = document.getElementById('tc_avatar_box');
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
            <button class="btn btn-sm btn-ghost" onclick="openBinderModal(${b.id})" title="Edit Binder">
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

// ── Regional Gym Badges ───────────────────────────────────────────────────────
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
