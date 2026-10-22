/**
 * PokeBinder - Card Detail Showcase Modal (frontend/js/card-detail.js)
 * TCG specification table, navigation chevrons, favorite toggle, inline editing, and deletion.
 */

let deleteConfirmTimeout = null;

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

  // Specs Table
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

async function deleteDetailCard(btnEl) {
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

  // Two-step armed confirmation
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

  // Confirmed -> Execute deletion
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

    if (curBinder && curBinder.cards) {
      curBinder.cards = curBinder.cards.filter(c => c.id !== targetCardId);
    }
    rebuildCardCache();
    updateCollectionStats();

    closeCardDetail();
    notify(`🗑️ "${targetCardName}" removed from collection!`);

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
  if (!select || !totalInput) return;
  const val = select.value;
  if (!val) {
    totalInput.value = '';
    return;
  }
  const setObj = allCardSets.find(s => s.name === val);
  if (setObj) totalInput.value = setObj.total_cards;
}
