// App State
let binders = [];
let currentBinder = null;
let currentPage = 1;
const slotsPerPage = 12; // 3x4 or 4x3 grid common for binders

const typeToIcon = {
    'Fire': 'flame',
    'Water': 'droplets',
    'Grass': 'leaf',
    'Electric': 'zap',
    'Psychic': 'eye',
    'Fighting': 'fist', // Custom SVG handled below
    'Darkness': 'moon',
    'Metal': 'shield',
    'Dragon': 'dragon', // Custom SVG handled below
    'Colorless': 'circle'
};

const typeToSVG = {
    'Fighting': '<img src="/static/assets/fighting.png" class="type-icon-img" alt="Fighting">',
    'Dragon': '<img src="/static/assets/dragon.png" class="type-icon-img" alt="Dragon">'
};

// Elements
const binderList = document.getElementById('binderList');
const emptyState = document.getElementById('empty-state');
const binderView = document.getElementById('binder-view');
const slotGrid = document.getElementById('slotGrid');
const binderNameTitle = document.getElementById('binderNameTitle');
const pageIndicator = document.getElementById('pageIndicator');
const binderStats = document.getElementById('binderStats');

// Init
async function init() {
    await fetchBinders();
    setupEventListeners();
}

// API Calls
async function fetchBinders() {
    try {
        const response = await fetch('/api/binders');
        binders = await response.json();
        renderBinderList();
    } catch (error) {
        console.error('Error fetching binders:', error);
    }
}

async function fetchBinderDetail(id) {
    try {
        const response = await fetch(`/api/binders/${id}`);
        currentBinder = await response.json();
        renderBinderView();
        updateStats();
    } catch (error) {
        console.error('Error fetching binder detail:', error);
    }
}

async function updateStats() {
    if (!currentBinder) return;
    try {
        const response = await fetch(`/api/stats/${currentBinder.id}`);
        const stats = await response.json();

        document.getElementById('completionPercent').textContent = `${stats.percentage}% Complete`;
        document.getElementById('filledCount').textContent = stats.filled;
        document.getElementById('totalCount').textContent = stats.total;
        binderStats.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Rendering
function renderBinderList() {
    binderList.innerHTML = '';
    binders.forEach(binder => {
        const li = document.createElement('li');
        li.className = `binder-item ${currentBinder?.id === binder.id ? 'active' : ''}`;
        li.innerHTML = `
            <div class="binder-info">
                <i data-lucide="book" size="18"></i>
                <span class="binder-name">${binder.name}</span>
            </div>
            <button class="icon-btn delete-binder" data-id="${binder.id}">
                <i data-lucide="trash-2" size="14"></i>
            </button>
        `;
        li.onclick = (e) => {
            if (e.target.closest('.delete-binder')) return;
            fetchBinderDetail(binder.id);
        };
        binderList.appendChild(li);
    });
    lucide.createIcons();
}

function renderBinderView() {
    if (!currentBinder) return;

    emptyState.classList.add('hidden');
    binderView.classList.remove('hidden');
    binderNameTitle.textContent = currentBinder.name;

    renderSlots();
}

function renderSlots() {
    slotGrid.innerHTML = '';
    const start = (currentPage - 1) * slotsPerPage + 1;
    const end = Math.min(start + slotsPerPage - 1, currentBinder.total_slots);

    pageIndicator.textContent = `Page ${currentPage}`;

    for (let i = start; i <= end; i++) {
        const card = currentBinder.cards[i];
        const isCollected = card && card.image_path;
        const slot = document.createElement('div');
        slot.className = `slot ${isCollected ? 'filled' : ''} ${card ? 'planned' : ''}`;
        slot.dataset.slot = i;

        if (isCollected) {
            const iconName = typeToIcon[card.type] || 'help-circle';
            const svgIcon = typeToSVG[card.type];
            slot.innerHTML = `
                <div class="card-image-container">
                    <img src="${card.image_path}" class="card-image" alt="${card.name}">
                    <div class="card-overlay">
                        <span class="card-name">${card.name}</span>
                        <div class="card-type-icon type-${card.type.toLowerCase()}" title="${card.type}">
                            ${svgIcon ? svgIcon : `<i data-lucide="${iconName}"></i>`}
                        </div>
                    </div>
                </div>
            `;
        } else if (card) {
            // Placeholder/Planned state
            const iconName = typeToIcon[card.type] || 'help-circle';
            const svgIcon = typeToSVG[card.type];
            slot.innerHTML = `
                <span class="slot-number">${i}</span>
                <div class="planned-info">
                    <span class="planned-name">${card.name}</span>
                    <div class="planned-type-icon type-${card.type.toLowerCase()}" title="${card.type}">
                        ${svgIcon ? svgIcon : `<i data-lucide="${iconName}"></i>`}
                    </div>
                </div>
                <span class="slot-label">PLANNED</span>
            `;
        } else {
            // Empty state
            slot.innerHTML = `
                <span class="slot-number">${i}</span>
                <span class="slot-label">SLOT ${i}</span>
            `;
        }

        slot.onclick = () => openCardModal(i, card);
        slotGrid.appendChild(slot);
    }

    // Update pagination buttons
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = end >= currentBinder.total_slots;

    lucide.createIcons();
}

// Modal Logic
function openBinderModal() {
    document.getElementById('binderModal').classList.add('active');
}

function openCardModal(slotNumber, card = null) {
    const modal = document.getElementById('cardModal');
    const form = document.getElementById('cardForm');
    document.getElementById('modalSlotNumber').textContent = slotNumber;

    // Reset form
    form.reset();
    document.getElementById('imagePreview').innerHTML = '<i data-lucide="image" class="placeholder-icon"></i><p>Click or drag image to upload</p>';
    lucide.createIcons();

    if (card) {
        document.getElementById('cardName').value = card.name;
        document.getElementById('cardType').value = card.type;
        document.getElementById('cardRarity').value = card.rarity;
        document.getElementById('cardNotes').value = card.notes;

        if (card.image_path) {
            document.getElementById('imagePreview').innerHTML = `<img src="${card.image_path}" alt="Preview">`;
        }

        document.getElementById('deleteCardBtn').classList.remove('hidden');
        document.getElementById('deleteCardBtn').onclick = () => deleteCard(card.id);
    } else {
        document.getElementById('deleteCardBtn').classList.add('hidden');
    }

    form.dataset.slot = slotNumber;
    modal.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to remove this card?')) return;

    try {
        await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
        closeModal('cardModal');
        fetchBinderDetail(currentBinder.id);
    } catch (error) {
        console.error('Error deleting card:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('toggleSidebar').onclick = () => {
        document.getElementById('sidebar').classList.toggle('closed');
    };

    document.getElementById('newBinderBtn').onclick = openBinderModal;

    document.getElementById('binderForm').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('binderName').value;
        let total = document.getElementById('totalSlots').value;
        if (total === 'custom') total = document.getElementById('customSlots').value;

        const response = await fetch('/api/binders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, total_slots: parseInt(total) })
        });

        if (response.ok) {
            const newBinder = await response.json();
            closeModal('binderModal');
            fetchBinders();
            fetchBinderDetail(newBinder.id);
        }
    };

    document.getElementById('totalSlots').onchange = (e) => {
        document.getElementById('customSlots').classList.toggle('hidden', e.target.value !== 'custom');
    };

    document.getElementById('prevPageBtn').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderSlots();
        }
    };

    document.getElementById('nextPageBtn').onclick = () => {
        const maxPage = Math.ceil(currentBinder.total_slots / slotsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderSlots();
        }
    };

    const dropzone = document.getElementById('imageDropzone');
    dropzone.onclick = () => {
        document.getElementById('cardImage').click();
    };

    // Drag and Drop Handlers
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-active');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file && file.type.startsWith('image/')) {
            const input = document.getElementById('cardImage');
            // Create a DataTransfer to assign to the file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            // Trigger the preview
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('imagePreview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }, false);

    document.getElementById('cardImage').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('imagePreview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('cardForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('binder_id', currentBinder.id);
        formData.append('slot_number', e.target.dataset.slot);
        formData.append('name', document.getElementById('cardName').value);
        formData.append('type', document.getElementById('cardType').value);
        formData.append('rarity', document.getElementById('cardRarity').value);
        formData.append('notes', document.getElementById('cardNotes').value);

        const imageFile = document.getElementById('cardImage').files[0];
        if (imageFile) formData.append('image', imageFile);

        const response = await fetch('/api/cards', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            closeModal('cardModal');
            fetchBinderDetail(currentBinder.id);
        }
    };

    // Search and Jump Logic
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        if (!term) {
            renderSlots();
            return;
        }

        const matches = Object.entries(currentBinder.cards).filter(([slot, card]) =>
            card.name.toLowerCase().includes(term)
        );

        if (matches.length > 0) {
            // Check if any match is on a different page
            const firstMatch = parseInt(matches[0][0]);
            const matchPage = Math.ceil(firstMatch / slotsPerPage);

            if (matchPage !== currentPage) {
                currentPage = matchPage;
                renderSlots();
            }

            // Highlight the slots on the current page that match
            const slots = document.querySelectorAll('.slot');
            slots.forEach(slot => {
                const slotNum = slot.dataset.slot;
                const card = currentBinder.cards[slotNum];
                if (card && card.name.toLowerCase().includes(term)) {
                    slot.classList.add('search-match');
                    slot.classList.remove('non-match');
                } else {
                    slot.classList.add('non-match');
                    slot.classList.remove('search-match');
                }
            });
        } else {
            // No matches across entire binder?
            renderSlots();
        }
    };

    document.getElementById('slotSearchInput').onchange = (e) => {
        const slot = parseInt(e.target.value);
        if (slot >= 1 && slot <= currentBinder.total_slots) {
            currentPage = Math.ceil(slot / slotsPerPage);
            renderSlots();
            // Optional: highlight specifically?
        }
    };

    // Delete Binder
    binderList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-binder');
        if (btn) {
            const id = btn.dataset.id;
            if (confirm('Delete this entire binder and all its cards?')) {
                await fetch(`/api/binders/${id}`, { method: 'DELETE' });
                if (currentBinder?.id == id) {
                    currentBinder = null;
                    emptyState.classList.remove('hidden');
                    binderView.classList.add('hidden');
                    binderStats.classList.add('hidden');
                }
                fetchBinders();
            }
        }
    });
}

init();
