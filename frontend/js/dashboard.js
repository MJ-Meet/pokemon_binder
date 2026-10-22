/**
 * ============================================================================
 * POKÉMON BINDER — DASHBOARD & ANALYTICS MODULE
 * File: js/dashboard.js
 * 
 * Handles:
 *  - Dashboard metrics & KPI calculations (loadDashboard, renderDashboardStats)
 *  - Chart.js visual charts (renderDashboardCharts: doughnut, bar, growth line)
 *  - Recent card activity log (renderRecentCards)
 *  - Milestone achievement highlights (renderHighlights)
 * ============================================================================
 */

// ── Dashboard Data Loader ─────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsResp, cardsResp] = await Promise.all([
      fetch(`${API}/stats`),
      fetch(`${API}/cards?limit=10000`),
    ]);

    let stats = statsResp.ok ? await statsResp.json() : null;
    let allCards = cardsResp.ok ? await cardsResp.json() : [];

    renderDashboardStats(stats, allCards);
    renderDashboardCharts(allCards, stats);
    renderRecentCards(allCards);
    renderHighlights(stats, allCards);
  } catch (e) {
    console.error('Dashboard load error', e);
  }
}

// ── Render Top Stat Cards ─────────────────────────────────────────────────────
function renderDashboardStats(stats, allCards) {
  const grid = document.getElementById('dashStatsGrid');
  if (!grid) return;

  const total = allCards.length;
  const uniqueDexSlots = new Set(allCards.map(c => c.slot)).size;
  const pokedexPct = ((uniqueDexSlots / 1025) * 100).toFixed(1);
  const favs = allCards.filter(c => c.favorite).length;
  const favsPct = total ? Math.round((favs / total) * 100) : 0;

  const typeCounts = {};
  allCards.forEach(c => { if (c.card_type) typeCounts[c.card_type] = (typeCounts[c.card_type] || 0) + 1; });
  const topTypeEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topTypeName = topTypeEntry ? topTypeEntry[0] : 'Normal';
  const topTypeCount = topTypeEntry ? topTypeEntry[1] : 0;
  const topTypeObj = POKEMON_TYPES.find(t => t.name.toLowerCase() === topTypeName.toLowerCase()) || { icon: '⭐', color: '#ffcb05' };

  const premiumCount = allCards.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare'].includes(c.rarity)).length;
  const masterSetsCount = allSets.filter(s => s.set_total_cards > 0 && s.collected >= s.set_total_cards).length;

  const statItems = [
    {
      icon: '📦',
      theme: 'red',
      val: total,
      label: 'TOTAL CARDS',
      sub: `${uniqueDexSlots} / 1,025 Pokédex (${pokedexPct}%)`,
      badge: `${binders.length} Binder${binders.length !== 1 ? 's' : ''}`
    },
    {
      icon: '❤️',
      theme: 'pink',
      val: favs,
      label: 'FAVORITES VAULT',
      sub: `${favsPct}% of entire portfolio`,
      badge: 'Curated'
    },
    {
      icon: '🏅',
      theme: 'gold',
      val: allCardSets.length || allSets.length,
      label: 'TRACKED SETS',
      sub: `${masterSetsCount} Master Set${masterSetsCount !== 1 ? 's' : ''} Complete`,
      badge: 'Expansions'
    },
    {
      icon: topTypeObj.icon,
      theme: 'type',
      typeColor: topTypeObj.color,
      val: topTypeCount,
      label: `${topTypeName.toUpperCase()} AFFINITY`,
      sub: `Most abundant element`,
      badge: 'Top Type'
    },
    {
      icon: '✨',
      theme: 'rainbow',
      val: premiumCount,
      label: 'CROWN JEWELS',
      sub: 'SAR, SIR & Gold Rares',
      badge: 'Ultra Rare'
    },
  ];

  grid.innerHTML = statItems.map(it => `
    <div class="dash-stat-card dash-stat-${it.theme}" ${it.typeColor ? `style="--card-theme-color:${it.typeColor}"` : ''}>
      <div class="dash-stat-top">
        <div class="dash-stat-icon-box">${it.icon}</div>
        <span class="dash-stat-badge">${it.badge}</span>
      </div>
      <div class="dash-stat-val">${it.val.toLocaleString()}</div>
      <div class="dash-stat-lbl font-pixel">${it.label}</div>
      <div class="dash-stat-sub">${it.sub}</div>
    </div>
  `).join('');
}

// ── Render Charts (Type, Rarity, Growth) ───────────────────────────────────────
function renderDashboardCharts(allCards) {
  // 1. Type Chart
  const typeCounts = {};
  POKEMON_TYPES.forEach(t => typeCounts[t.name] = 0);
  allCards.forEach(c => {
    if (c.card_type && typeCounts[c.card_type] !== undefined) {
      typeCounts[c.card_type]++;
    }
  });

  const typeLabels = Object.keys(typeCounts).filter(k => typeCounts[k] > 0);
  const typeData   = typeLabels.map(k => typeCounts[k]);
  const typeColors = typeLabels.map(k => POKEMON_TYPES.find(t => t.name === k)?.color || '#94a3b8');

  if (typeChartInst) typeChartInst.destroy();
  const typeCanvas = document.getElementById('typeChart');
  if (typeCanvas) {
    typeChartInst = new Chart(typeCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: typeLabels,
        datasets: [{
          data: typeData.length ? typeData : [1],
          backgroundColor: typeData.length ? typeColors : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              font: { family: "'Inter', sans-serif", weight: 'bold', size: 11 },
              color: '#334155'
            }
          }
        },
      },
    });
  }

  // 2. Rarity Chart
  const rarCounts = {};
  RARITIES.forEach(r => rarCounts[r] = 0);
  allCards.forEach(c => { if (c.rarity && rarCounts[c.rarity] !== undefined) rarCounts[c.rarity]++; });

  const rarLabels = RARITIES.filter(r => rarCounts[r] > 0);
  const rarData   = rarLabels.map(r => rarCounts[r]);
  const rarColorMap = {
    'Common': '#94a3b8',
    'Uncommon': '#60a5fa',
    'Rare': '#3b82f6',
    'Super Rare': '#8b5cf6',
    'Baby Shiny': '#06b6d4',
    'Rare Shiny': '#14b8a6',
    'Ilusration Rare(IR)': '#f59e0b',
    'Special Art Rare (SAR)': '#ec4899',
    'Special Ilustration Art Rare': '#8b5cf6',
    'Gold': '#ffd400'
  };
  const rarColors = rarLabels.map(r => rarColorMap[r] || '#ffd400');

  if (rarityChartInst) rarityChartInst.destroy();
  const rarCanvas = document.getElementById('rarityChart');
  if (rarCanvas) {
    rarityChartInst = new Chart(rarCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: rarLabels.length ? rarLabels : ['No Cards'],
        datasets: [{
          data: rarData.length ? rarData : [0],
          backgroundColor: rarColors.length ? rarColors : ['#cbd5e1'],
          borderRadius: 8,
          borderSkipped: false
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter', sans-serif" } } },
          y: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif", weight: 'bold' } } }
        }
      },
    });
  }

  // 3. Growth Chart
  const monthCounts = {};
  allCards.forEach(c => {
    if (!c.date_added) return;
    const d = new Date(c.date_added);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });

  const sortedMonths = Object.keys(monthCounts).sort();
  let cumulative = 0;
  const growthData = sortedMonths.map(m => { cumulative += monthCounts[m]; return cumulative; });

  if (growthChartInst) growthChartInst.destroy();
  const growthCanvas = document.getElementById('growthChart');
  if (growthCanvas) {
    const ctx = growthCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(255, 203, 5, 0.35)');
    grad.addColorStop(1, 'rgba(255, 203, 5, 0.01)');

    growthChartInst = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedMonths.length ? sortedMonths.map(m => {
          const [y, mo] = m.split('-');
          return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
        }) : ['Today'],
        datasets: [{
          label: 'Total Collected Cards',
          data: growthData.length ? growthData : [allCards.length],
          fill: true,
          borderColor: '#ffcb05',
          borderWidth: 3,
          backgroundColor: grad,
          tension: 0.38,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#ffcb05',
          pointBorderWidth: 2.5
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            titleFont: { family: "'Press Start 2P', monospace", size: 10 },
            bodyFont: { family: "'Inter', sans-serif", weight: 'bold' }
          }
        },
        scales: {
          x: { grid: { color: '#f8fafc' }, ticks: { font: { family: "'Inter', sans-serif" } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: "'Inter', sans-serif" }, precision: 0 } }
        }
      },
    });
  }
}

// ── Recent Cards Activity Feed ────────────────────────────────────────────────
function renderRecentCards(allCards) {
  const list = document.getElementById('recentCardsList');
  if (!list) return;

  const sorted = [...allCards]
    .filter(c => c.date_added)
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 6);

  if (!sorted.length) {
    list.innerHTML = `<div class="dash-empty-pulls">🎴 No cards logged yet. Open your binder and add your first Pokémon!</div>`;
    return;
  }

  list.innerHTML = sorted.map(c => {
    const pad = String((c.slot !== null && c.slot !== undefined) ? c.slot + 1 : 1).padStart(4, '0');
    const tDef = POKEMON_TYPES.find(t => t.name.toLowerCase() === (c.card_type || '').toLowerCase()) || { color: '#64748b' };
    const dateStr = new Date(c.date_added).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="dash-recent-row" onclick="openCardDetail(${c.id}, ${(c.slot || 0) + 1})">
        <div class="dash-recent-art-wrap">
          <img src="${API}/cards/${c.id}/image" loading="lazy" alt="${esc(c.name)}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(c.slot || 0) + 1}.png'">
        </div>
        <div class="dash-recent-info">
          <div class="dash-recent-title-row">
            <span class="dash-recent-name">${esc(c.name)}</span>
            <span class="dash-recent-dex font-pixel">#${pad}</span>
          </div>
          <div class="dash-recent-meta-row">
            <span class="dash-recent-type-pill" style="background:${tDef.color}">${esc(c.card_type || 'Normal')}</span>
            ${c.rarity ? `<span class="dash-recent-rarity-pill">${esc(c.rarity)}</span>` : ''}
            ${c.set_name ? `<span class="dash-recent-set-name">${esc(c.set_name)}</span>` : ''}
          </div>
        </div>
        <div class="dash-recent-date">${dateStr}</div>
      </div>
    `;
  }).join('');
}

// ── Milestone Achievement Highlights ──────────────────────────────────────────
function renderHighlights(stats, allCards) {
  const list = document.getElementById('dashHighlights');
  if (!list) return;

  const favs = allCards.filter(c => c.favorite);
  const sets = new Set(allCards.filter(c => c.set_name).map(c => c.set_name));
  const ultraRares = allCards.filter(c => ['Gold', 'Special Art Rare (SAR)', 'Special Ilustration Art Rare'].includes(c.rarity));

  const items = [
    { icon: '👑', title: 'MASTER CURATOR', desc: `${allCards.length} Total Cards across ${binders.length} active binder${binders.length !== 1 ? 's' : ''}`, bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
    { icon: '💖', title: 'FAVORITES SHOWCASE', desc: `${favs.length} Pokémon cards marked as personal favorites`, bg: 'linear-gradient(135deg, #fff1f2, #ffe4e6)' },
    { icon: '💎', title: 'ULTRA RARE VAULT', desc: `${ultraRares.length} Special Art Rares & Gold tier cards collected`, bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' },
    { icon: '🗺️', title: 'EXPANSION FRONTIER', desc: `${sets.size} Card sets and expansions actively collected`, bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }
  ];

  list.innerHTML = items.map(h => `
    <div class="dash-highlight-card" style="background:${h.bg}">
      <div class="dash-hl-icon">${h.icon}</div>
      <div class="dash-hl-text">
        <div class="dash-hl-title font-pixel">${h.title}</div>
        <div class="dash-hl-desc">${h.desc}</div>
      </div>
    </div>
  `).join('');
}
