// frontend/ads.js  — обновлённый
let sellerIdFromUrl = null;
let currentPage = 1;
let totalPages = 1;
let currentView = 'grid';
let currentFilters = {
    search: '',
    category_id: '', // строка вида "1,2,3"
    min_price: '',
    max_price: '',
    location: '',
    condition: 'any',
    sort: 'newest'
};

let currentAds = [];
let frontendCategories = []; // полный список категорий из API
let slugToCategoryId = {};    // mapping slug -> id

// Сопоставление кодов городов (value в select) -> текст, который хранится в БД
const LOCATION_MAP = {
    "Москва": "Москва",
    "Санкт-Петербург": "Санкт-Петербург",
    "Екатеринбург": "Екатеринбург",
    "Казань": "Казань",
    "Новосибирск": "Новосибирск",
    "Нижний Новгород": "Нижний Новгород",
    "Челябинск": "Челябинск",
    "Самара": "Самара",
    "Ростов-на-Дону": "Ростов-на-Дону",
    "Уфа": "Уфа"
};
const CONDITION_MAP = {
    "new": "Новое",
    "like-new": "Как новое",
    "excellent": "Отличное",
    "good": "Хорошее",
    "fair": "Удовлетворительное",
    "poor": "Плохое"
};

function applyCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const categorySlug = params.get('category');
    if (!categorySlug) return;

    const categoryId = slugToCategoryId[categorySlug];
    if (!categoryId) {
        console.warn('Категория из URL не найдена:', categorySlug);
        return;
    }

    const checkbox = document.querySelector(
        `.filter-checkbox[value="${categoryId}"]`
    );

    if (!checkbox) {
        console.warn('Чекбокс категории не найден:', categoryId);
        return;
    }

    checkbox.checked = true;

    // обновляем currentFilters через существующую логику
    handleFilterChange();
    applyFilters();
}


function initializeAdsPage() {
    setupEventListeners();
   
// ✅ 1. читаем search из URL
    const params = new URLSearchParams(window.location.search);

// ===== seller ads =====
    sellerIdFromUrl = params.get('seller_id');

    if (sellerIdFromUrl) {
        const titleEl = document.getElementById('adsTitle');
        if (titleEl) {
            titleEl.textContent = 'Все объявления продавца';
        }
    }

    const searchFromUrl = params.get('search');

    if (searchFromUrl) {
        currentFilters.search = searchFromUrl;

        // ✅ 2. заполняем поле поиска визуально
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = searchFromUrl;
        }
    }

    loadCategories(); // сначала получаем категории и маппим чекбоксы
    loadAds();
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', handleSort);

    // Динамически назначим обработчики после loadCategories (но на всякий случай)
    document.addEventListener('change', (e) => {
        if (e.target && (e.target.classList.contains('filter-checkbox') || e.target.id === 'priceMin' || e.target.id === 'priceMax' || e.target.id === 'locationFilter' || e.target.name === 'condition')) {
            handleFilterChange();
        }
    });

    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const resetSearchBtn = document.getElementById('resetSearch');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (resetSearchBtn) resetSearchBtn.addEventListener('click', resetSearch);

    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setView('grid'));
    if (listViewBtn) listViewBtn.addEventListener('click', () => setView('list'));

    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));

    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) filterToggle.addEventListener('click', toggleMobileFilters);
document.querySelectorAll('input[name="condition"]').forEach(radio => {
    radio.addEventListener('change', () => {
        handleFilterChange();
    });
});

}

function handleSearch(event) {
    currentFilters.search = event.target.value;
    currentPage = 1;
    loadAds();
}

function handleSort(event) {
    currentFilters.sort = event.target.value;
    currentPage = 1;
    loadAds();
}

function handleFilterChange() {
    // --- LOCATION ---
    const locationSelect = document.getElementById('locationFilter');
    const locationValue = locationSelect?.value || '';
    const locationText = LOCATION_MAP[locationValue] || '';  // <<< КРИТИЧЕСКИЙ МОМЕНТ

    console.log("locationFilter DOM value =", locationValue);
    console.log("Mapped filter.location =", locationText);

    // --- CONDITION ---
    const conditionValue = document.querySelector('input[name="condition"]:checked')?.value || 'any';
    console.log("handleFilterChange(), selected condition:", conditionValue);

    // --- CATEGORIES ---
    const checked = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.value);

    const mappedCategoryIds = checked
        .map(v => (/^\d+$/.test(v) ? v : slugToCategoryId[v] || null))
        .filter(Boolean);

    // --- PRICE ---
    const priceMin = document.getElementById('priceMin')?.value || '';
    const priceMax = document.getElementById('priceMax')?.value || '';

    // --- APPLY FILTERS TO STATE ---
    currentFilters = {
        ...currentFilters,
        category_id: mappedCategoryIds.join(','),
        min_price: priceMin,
        max_price: priceMax,
        location: locationText,      // <<< ТЕПЕРЬ ВСЁ ВСЕГДА ПРАВИЛЬНО
        condition: conditionValue
    };

    currentPage = 1;
    // loadAds не вызываем — жмём кнопку "Применить"
}


// Применить фильтры
function applyFilters() {
console.log("APPLY BUTTON → sending filters: ", currentFilters);
    currentPage = 1;
    loadAds();
}

// Очистка фильтров
function clearFilters() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    document.getElementById('locationFilter').value = '';
    const condAny = document.getElementById('condition-any');
    if (condAny) condAny.checked = true;

    currentFilters = {
        search: currentFilters.search,
        category_id: '',
        min_price: '',
        max_price: '',
        location: '',
        condition: 'any',
        sort: currentFilters.sort
    };

    currentPage = 1;
    loadAds();
}

function resetSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    clearFilters();
}

function setView(view) {
    currentView = view;
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    const adsGrid = document.getElementById('adsGrid');

    if (view === 'grid') {
        if (gridViewBtn) { gridViewBtn.classList.add('bg-blue-600', 'text-white'); gridViewBtn.classList.remove('text-gray-600'); }
        if (listViewBtn) { listViewBtn.classList.remove('bg-blue-600', 'text-white'); listViewBtn.classList.add('text-gray-600'); }
        if (adsGrid) adsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    } else {
        if (listViewBtn) { listViewBtn.classList.add('bg-blue-600', 'text-white'); listViewBtn.classList.remove('text-gray-600'); }
        if (gridViewBtn) { gridViewBtn.classList.remove('bg-blue-600', 'text-white'); gridViewBtn.classList.add('text-gray-600'); }
        if (adsGrid) adsGrid.className = 'space-y-4';
    }

    renderAds();
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadAds();
    }
}

function toggleMobileFilters() {
    const sidebar = document.getElementById('filtersSidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
}

async function loadAds() {
    const adsGrid = document.getElementById('adsGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');

    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    if (adsGrid) adsGrid.innerHTML = '';
    if (noResults) noResults.classList.add('hidden');

    try {
        const params = new URLSearchParams({
            page: currentPage,
            sort: currentFilters.sort,
            search: currentFilters.search || ''
        });
	
	if (sellerIdFromUrl) {params.append('user_id', sellerIdFromUrl);}
        if (currentFilters.category_id) params.append('category_id', currentFilters.category_id);
        if (currentFilters.min_price) params.append('min_price', currentFilters.min_price);
        if (currentFilters.max_price) params.append('max_price', currentFilters.max_price);
        if (currentFilters.location) params.append('location', currentFilters.location);
        // Для condition: если any — не отправляем; если не any — отправляем строку.

// -------- Состояние --------
if (currentFilters.condition && currentFilters.condition !== 'any') {
    params.append('condition', currentFilters.condition);
}



        const response = await fetch(`${API_BASE_URL}/ads?${params.toString()}`);
console.log("FETCH PARAMS = ", params.toString());

        const result = await response.json();

        if (result.success) {
            const ads = result.data || [];
	    
	    if (sellerIdFromUrl && ads.length && ads[0].user?.name) {
    const titleEl = document.getElementById('adsTitle');
    if (titleEl) {
        titleEl.textContent = `Все объявления продавца ${ads[0].user.name}`;
    }
}


            if (ads.length === 0) {
                if (noResults) noResults.classList.remove('hidden');
                currentAds = [];
                renderAds();
                updatePagination(0);
            } else {
                currentAds = ads;
                renderAds();
                updatePagination(result.count || ads.length);
            }

            const resultsCount = document.getElementById('resultsCount');
            if (resultsCount) {
                resultsCount.textContent = `Найдено ${result.count ?? currentAds.length} объявлений`;
            }
        } else {
            // Если бэкенд вернул success: false
            console.warn('Backend returned success:false for /ads', result);
            if (noResults) noResults.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading ads:', error);
        // showToast('Ошибка при загрузке объявлений', 'error'); // если у тебя есть тул для тостов
        if (noResults) noResults.classList.remove('hidden');
    } finally {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const result = await response.json();

        if (result.success) {
            frontendCategories = result.data || [];
            slugToCategoryId = {};
            frontendCategories.forEach(c => {
                if (c.slug) slugToCategoryId[c.slug] = String(c.id);
                // также можно обновить HTML-лейблы или добавить счетчики
            });

            // Обновим value у чекбоксов (если они в HTML заданы slug'ами)
            document.querySelectorAll('.filter-checkbox').forEach(cb => {
                const val = cb.value;
                // Если value — slug и есть в карте, заменим на id
                if (slugToCategoryId[val]) {
                    cb.value = slugToCategoryId[val];
                }
            });
	applyCategoryFromUrl();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderAds() {
    const adsGrid = document.getElementById('adsGrid');
    if (!adsGrid) return;
    adsGrid.innerHTML = '';

    if (!currentAds || currentAds.length === 0) return;

    currentAds.forEach(ad => {
        const el = currentView === 'grid' ? createGridAdElement(ad) : createListAdElement(ad);
        adsGrid.appendChild(el);
    });

    anime({
        targets: '.ad-card',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(80),
        duration: 500,
        easing: 'easeOutQuart'
    });
}

function createGridAdElement(ad) {
    const div = document.createElement('div');
    div.className = 'ad-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer card-hover';
    div.onclick = () => openAdDetail(ad.id);

    const image = ad.images && ad.images[0] ? ad.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop';

    div.innerHTML = `
        <img src="${image}" alt="${escapeHtml(ad.title)}" class="w-full h-48 object-cover">
        <div class="p-4">
            <h3 class="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">${escapeHtml(ad.title)}</h3>
            <p class="text-2xl font-bold text-blue-600 mb-2">${formatPrice(ad.price)}</p>
            <div class="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>${escapeHtml(ad.location || '')}</span>
                <span>${formatTimeAgo(ad.created_at)}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-400">
                <span>Просмотров: ${ad.views || 0}</span>
                <span class="px-2 py-1 bg-gray-100 rounded">${escapeHtml(ad.condition || '—')}</span>
            </div>
        </div>
    `;
    return div;
}

function createListAdElement(ad) {
    const div = document.createElement('div');
    div.className = 'ad-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer card-hover flex';
    div.onclick = () => openAdDetail(ad.id);

    const image = ad.images && ad.images[0] ? ad.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop';

    div.innerHTML = `
        <img src="${image}" alt="${escapeHtml(ad.title)}" class="w-48 h-32 object-cover">
        <div class="flex-1 p-4">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-lg text-gray-900 flex-1">${escapeHtml(ad.title)}</h3>
                <p class="text-2xl font-bold text-blue-600 ml-4">${formatPrice(ad.price)}</p>
            </div>
            <p class="text-sm text-gray-600 mb-2 line-clamp-2">${escapeHtml(ad.description || '')}</p>
            <div class="flex justify-between items-center text-sm text-gray-500">
                <span>${escapeHtml(ad.location || '')}</span>
                <span>${formatTimeAgo(ad.created_at)}</span>
                <span>Просмотров: ${ad.views || 0}</span>
            </div>
        </div>
    `;
    return div;
}

function updatePagination(totalCount) {
    const itemsPerPage = 12;
    totalPages = Math.max(1, Math.ceil((totalCount || currentAds.length) / itemsPerPage));

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                const btn = document.createElement('button');
                btn.className = `px-3 py-2 border rounded-lg ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`;
                btn.textContent = i;
                btn.onclick = () => { currentPage = i; loadAds(); };
                pageNumbers.appendChild(btn);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                const span = document.createElement('span');

                span.className = 'px-3 py-2';
                span.textContent = '...';
                pageNumbers.appendChild(span);
            }
        }
    }
}

// Утилиты
function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(price);
}
function formatTimeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const adDate = new Date(date);
    const diffInHours = Math.floor((now - adDate) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Только что';
    if (diffInHours < 24) return `${diffInHours} час${getPluralForm(diffInHours, ['', 'а', 'ов'])} назад`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${getPluralForm(diffInDays, ['день', 'дня', 'дней'])} назад`;
}
function getPluralForm(number, forms) {
    const cases = [2, 0, 1, 1, 1, 2];
    return forms[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)]];
}
function debounce(fn, ms = 200) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }

// Навесить туда, где нужно (в main.js или внизу HTML): initializeAdsPage();
