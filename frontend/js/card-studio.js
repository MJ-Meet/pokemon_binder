/**
 * ============================================================================
 * POKÉMON BINDER — CARD STUDIO & UPLOAD MODULE
 * File: js/card-studio.js
 * 
 * Handles:
 *  - Card Studio / Add Card modal (openCardModal, openCardModalForDex)
 *  - Live card preview rendering (updateLiveCardPreview)
 *  - Type selectors (cm_types & cdm_edit_types)
 *  - Drag & drop image uploads and file previewing
 *  - Card creation API request (saveCard)
 * ============================================================================
 */

// ── Live Card Preview in Studio ──────────────────────────────────────────────
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

// ── Open Card Modal for Specific Dex ID ──────────────────────────────────────
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

// ── Open Card Modal for Generic Slot ─────────────────────────────────────────
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

// ── Save / Upload Card to Backend ────────────────────────────────────────────
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

// ── Drag & Drop / Image Previewing ────────────────────────────────────────────
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
