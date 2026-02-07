// JavaScript для детальной страницы объявления

let currentAdId = null;
let currentImageIndex = 0;

// -------------------- ИНИЦИАЛИЗАЦИЯ --------------------

function initializeAdDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    currentAdId = urlParams.get('id');

    if (currentAdId) {
        loadAdDetails();
    } else {
        //loadTestAdDetails();
    }

    setupEventListeners();
    initializeGallery();
}

// -------------------- ОБРАБОТЧИКИ --------------------

function setupEventListeners() {
    const showPhoneBtn = document.getElementById('showPhoneBtn');
    const messageBtn = document.getElementById('messageBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (showPhoneBtn) showPhoneBtn.addEventListener('click', showPhone);
    if (messageBtn) messageBtn.addEventListener('click', showMessageModal);
    if (favoriteBtn) favoriteBtn.addEventListener('click', toggleFavorite);

    // Модальное окно сообщения
    const messageModal = document.getElementById('messageModal');
    const closeMessageModal = document.getElementById('closeMessageModal');
    const messageForm = document.getElementById('messageForm');

    if (closeMessageModal) closeMessageModal.addEventListener('click', hideMessageModal);
    if (messageModal) messageModal.addEventListener('click', (e) => {
        if (e.target === messageModal) hideMessageModal();
    });
    if (messageForm) messageForm.addEventListener('submit', sendMessage);

    // Миниатюры — навешиваем делегировано при загрузке/обновлении галереи (см. bindThumbnailHandlers)
    bindThumbnailHandlers();

    // Закрытие лайтбокса через фон (сам крестик в HTML)
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }
}

// -------------------- SPLIDE (галерея) --------------------

function initializeGallery() {
    if (typeof Splide !== 'undefined') {
        // mount Splide only once
        if (!document.querySelector('#adGallery').splide) {
            const splide = new Splide('#adGallery', {
                type: 'fade',
                rewind: true,
                pagination: false,
                arrows: true,
                autoplay: false,
            });

            splide.on('moved', (newIndex) => {
                updateThumbnails(newIndex);
                currentImageIndex = newIndex;
            });

            splide.mount();
            // store reference
            document.querySelector('#adGallery').splide = splide;
        }
    }
}

// -------------------- ЗАГРУЗКА ДАННЫХ --------------------

async function loadAdDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/ads/${currentAdId}`);
        const result = await response.json();

        if (result.success) {
            displayAdDetails(result.data);
        } else {
            showToast('Объявление не найдено', 'error');
            //loadTestAdDetails();
        }
    } catch (error) {
        console.error('Error loading ad details:', error);
        showToast('Ошибка при загрузке объявления', 'error');
        //loadTestAdDetails();
    }
}

// -------------------- ОТОБРАЖЕНИЕ --------------------

function displayAdDetails(ad) {
    // title
    document.title = `${ad.title} - ASQUIRE`;
    const breadcrumb = document.getElementById('breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = ad.title;

    const titleEl = document.getElementById('adTitle') || document.querySelector('h1');
    if (titleEl) titleEl.textContent = ad.title;

    const priceEl = document.getElementById('adPrice') || document.querySelector('.text-3xl.font-bold.text-blue-600');
    if (priceEl) priceEl.textContent = formatPrice(ad.price);

    const locationEl = document.getElementById('adLocation') || document.querySelector('.text-sm.text-gray-600');
    if (locationEl) locationEl.textContent = ad.location || '';

    const publishedEl = document.getElementById('adPublished');
    if (publishedEl) publishedEl.textContent = formatTimeAgo(ad.created_at || new Date());

    const idEl = document.getElementById('adId');
    if (idEl) idEl.textContent = ad.id;

    const viewsEl = document.getElementById('adViews');
    if (viewsEl) viewsEl.textContent = ad.views || 0;

    const descriptionEl = document.querySelector('.prose');
    if (descriptionEl) descriptionEl.innerHTML = `<p class="mb-4">${escapeHtml(ad.description || '')}</p>`;

    updateSellerInfo(ad.user);
    updateGallery(ad.images || ad.photos || []);
    updateCharacteristics(ad);


    // показать кнопку удаления если владелец
    const deleteBtn = document.getElementById('deleteAdBtn');
    const currentUserId = localStorage.getItem('userId');
    if (deleteBtn && currentUserId && parseInt(currentUserId, 10) === ad.user_id) {
        deleteBtn.classList.remove('hidden');
        deleteBtn.addEventListener('click', () => deleteAd(ad.id));
    }
    window.currentAdPhone = ad.user?.phone || null;
    loadSimilarAds(ad);

const sellerAdsBtn = document.getElementById('sellerAdsBtn');

if (sellerAdsBtn && ad.user?.id) {
    sellerAdsBtn.addEventListener('click', () => {
        window.location.href = `seller-ads.html?seller_id=${ad.user.id}`;
    });
}



}

// маленькая утилита защиты от XSS при вставке описания
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function mapCondition(cond) {
    const map = {
	"like-new": "Как новое",
        new: "Новое",
        excellent: "Отличное",
	good: "Хорошее",
	fair: "Удовлетворительное",
	poor: "Плохое",
            };
    return map[cond] || "Не указано";
}

function mapStatus(status) {
    const map = {
        active: "Активно",
        sold: "Продано",
        closed: "Закрыто",
    };
    return map[status] || "Не указано";
}

function mapBargain(flag) {
    return flag ? "Да" : "Нет";
}


// -------------------- ХАРАКТЕРИСТИКИ --------------------

function updateCharacteristics(ad) {
    console.log("DEBUG characteristics:", ad);

    const list = document.getElementById("characteristicsList");
    if (!list) return;

    list.innerHTML = "";

    const chars = [
        { label: "Категория", value: ad.category?.name },
        { label: "Состояние", value: mapCondition(ad.condition) },
        { label: "Статус", value: mapStatus(ad.status) },
        { label: "Готов к торгу", value: mapBargain(ad.contact_info?.acceptBargain) },
    ].filter(item => item.value != null && item.value !== "");

    for (const item of chars) {
        const li = document.createElement("li");
        li.className = "flex justify-between py-2 border-b";
        li.innerHTML = `
            <span class="text-gray-600">${item.label}:</span>
            <span class="font-medium">${item.value}</span>
        `;
        list.appendChild(li);
    }
}



// -------------------- ПРОДАВЕЦ --------------------

async function updateSellerInfo(user) {
    if (!user) return;

    // Имя
    const sellerName = document.getElementById("sellerName");
    sellerName.textContent = user.name || "Пользователь";

    // Аватар (инициалы)
    const avatar = document.getElementById("sellerAvatar");
    if (user.name) {
        const parts = user.name.split(" ");
        avatar.textContent = parts.map(p => p[0]).join("").toUpperCase();
    }

    // "На сайте с"
    const sellerSince = document.getElementById("sellerSince");
    if (user.created_at) {
        const date = new Date(user.created_at);
        sellerSince.textContent =
            "На сайте с " +
            date.toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "long"
            });
    } else {
        sellerSince.textContent = "";
    }

    // Количество объявлений продавца
    const sellerAdsCount = document.getElementById("sellerAdsCount");

    try {
	const res = await fetch(`${API_BASE_URL}/ads?user_id=${user.id}&status=active`);
        const json = await res.json();

        if (json.success) {
            sellerAdsCount.textContent = json.count;
        } else {
            sellerAdsCount.textContent = "—";
        }
    } catch (err) {
        console.error("Ошибка загрузки объявлений продавца", err);
        sellerAdsCount.textContent = "—";
    }
}

// -------------------- ПОХОЖИЕ ОБЪЯВЛЕНИЯ --------------------
async function loadSimilarAds(ad) {
    if (!ad?.category_id) return;

    try {
        const res = await fetch(
            `${API_BASE_URL}/ads?category_id=${ad.category_id}`
        );
        const json = await res.json();

        if (!json.success) return;

        // исключаем текущее объявление
        const similar = json.data.filter(a => a.id !== ad.id);

        if (similar.length === 0) return;

        renderSimilarAds(similar);

    } catch (err) {
        console.error("Ошибка загрузки похожих объявлений", err);
    }
}

function renderSimilarAds(ads) {
    const list = document.getElementById("similarAdsList");
    if (!list) return;

    list.innerHTML = "";

    ads.forEach(ad => {
        list.appendChild(createSimilarAdCard(ad));
    });

    new Splide("#similarAds", {
        type: ads.length > 4 ? "loop" : "slide",
        perPage: 4,
        perMove: 1,
        gap: "1rem",
        autoplay: ads.length > 1,
        interval: 4000,
        pauseOnHover: true,
        arrows: true,
        pagination: false,
        breakpoints: {
            1024: { perPage: 3 },
            768:  { perPage: 2 },
            480:  { perPage: 1 }
        }
    }).mount();
}

function createSimilarAdCard(ad) {
    const li = document.createElement("li");
    li.className = "splide__slide";

    const img = ad.images?.[0] ?? "https://via.placeholder.com/400x300";

    li.innerHTML = `
        <div class="bg-white rounded-xl shadow-md overflow-hidden card-hover cursor-pointer"
             onclick="window.location.href='ad-detail.html?id=${ad.id}'">

            <img src="${img}" alt="${ad.title}" class="w-full h-48 object-cover">

            <div class="p-4">
                <h3 class="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
                    ${ad.title}
                </h3>

                <p class="text-xl font-bold text-blue-600 mb-2">
                    ${formatPrice(ad.price)}
                </p>

                <div class="flex justify-between text-sm text-gray-500">
                    <span>${ad.location || ""}</span>
                    <span>${formatTimeAgo(ad.created_at)}</span>
                </div>
            </div>
        </div>
    `;

    return li;
}


// -------------------- ГАЛЕРЕЯ: ОБНОВЛЕНИЕ И НАВЕСКА --------------------

function updateGallery(images) {
    const normalized = (images || []).map(item => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") return item.url || item.path || item.src || null;
        return null;
    }).filter(Boolean);

    const galleryEl = document.querySelector('#adGallery');
    const list = galleryEl?.querySelector('.splide__list');
    const thumbsContainer = document.getElementById('thumbnails');

    if (!galleryEl || !list || !thumbsContainer) {
        console.warn("Gallery elements missing");
        return;
    }

    // 1. Полностью очищаем старые слайды
    list.innerHTML = "";

    // 2. Полностью очищаем миниатюры
    thumbsContainer.innerHTML = "";

    // 3. Создаём новые слайды и миниатюры
    normalized.forEach((url, index) => {
        // === SLIDE ===
        const li = document.createElement('li');
        li.className = "splide__slide";
li.innerHTML = `
    <div class="w-full h-[420px] bg-black flex items-center justify-center">
        <img
            src="${url}"
            alt="Фото ${index + 1}"
            class="max-h-full max-w-full object-contain cursor-pointer"
            onclick="openLightbox(${index})"
        >
    </div>
`;
        list.appendChild(li);

        // === THUMBNAIL ===
        const thumb = document.createElement('div');
        thumb.className = "thumbnail";
        thumb.dataset.slide = index;
        thumb.innerHTML = `<img src="${url}" alt="Миниатюра ${index + 1}">`;
        thumbsContainer.appendChild(thumb);
    });

    // 4. Обновляем Splide
    if (galleryEl.splide) {
        try {
            galleryEl.splide.refresh();
        } catch (e) {
            console.warn("Splide refresh error, remounting…");
            try {
                galleryEl.splide.mount();
            } catch (err) {
                console.error("Splide remount failed", err);
            }
        }
    } else {
        initializeGallery();
    }

    // 5. Навешиваем обработчики для миниатюр
    bindThumbnailHandlers();

    // Активируем первую миниатюру
    updateThumbnails(0);
}


function bindThumbnailHandlers() {
    // удаляем старые обработчики, чтобы не было двойного навешивания
    const thumbs = document.querySelectorAll('.thumbnail');
    thumbs.forEach((thumb, index) => {
        thumb.removeEventListener('click', () => goToSlide(index)); // safe no-op if different ref
    });

    // навешиваем корректные обработчики
    document.querySelectorAll('.thumbnail').forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            goToSlide(index);
        });
    });
}

function updateThumbnails(activeIndex) {
    const thumbs = document.querySelectorAll('.thumbnail');
    thumbs.forEach((thumb, idx) => {
        thumb.classList.toggle('is-active', idx === activeIndex);
    });
}

function goToSlide(index) {
    const galleryEl = document.querySelector('#adGallery');
    if (galleryEl && galleryEl.splide) {
        try {
            galleryEl.splide.go(index);
        } catch (e) {
            console.warn('Splide go error', e);
        }
    }
    updateThumbnails(index);
    currentImageIndex = index;
}

// -------------------- ЛАЙТБОКС --------------------

function openLightbox(index) {
    const imgs = document.querySelectorAll('.splide__slide img');
    if (!imgs || !imgs[index]) return;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    if (!lightbox || !lightboxImage) return;

    lightboxImage.src = imgs[index].src;
    lightboxImage.alt = imgs[index].alt || `Фото ${index + 1}`;

    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = 'auto';
}

// -------------------- ТЕЛЕФОН --------------------

function showPhone() {
    const phone = window.currentAdPhone;

    if (!phone) {
        showToast("Телефон скрыт владельцем", "error");
        return;
    }

    // КОПИРОВАНИЕ В БУФЕР
    navigator.clipboard.writeText(phone).catch(() => {
        const temp = document.createElement("textarea");
        temp.value = phone;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
    });

    showToast(`Телефон скопирован: ${phone}`, "success");

    const btn = document.getElementById("showPhoneBtn");
    btn.textContent = phone;
    btn.disabled = true;
    btn.classList.add("bg-gray-400");
    btn.classList.remove("bg-green-600", "hover:bg-green-700");
}

// -------------------- МОДАЛКА СООБЩЕНИЯ --------------------

function showMessageModal() {
    const messageModal = document.getElementById('messageModal');
    if (!messageModal) return;
    messageModal.classList.remove('hidden');
    messageModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function hideMessageModal() {
    const messageModal = document.getElementById('messageModal');
    if (!messageModal) return;
    messageModal.classList.add('hidden');
    messageModal.classList.remove('flex');
    document.body.style.overflow = 'auto';
}

// -------------------- ИЗБРАННОЕ --------------------

function toggleFavorite() {
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (!favoriteBtn) return;

    const isFavorited = favoriteBtn.classList.contains('bg-red-500');

    if (isFavorited) {
        favoriteBtn.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            В избранное
        `;
        favoriteBtn.classList.remove('bg-red-500', 'text-white');
        favoriteBtn.classList.add('border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
        showToast('Удалено из избранного', 'info');
    } else {
        favoriteBtn.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            В избранном
        `;
        favoriteBtn.classList.add('bg-red-500', 'text-white');
        favoriteBtn.classList.remove('border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
        showToast('Добавлено в избранное', 'success');
    }
}

// -------------------- ОТПРАВКА СООБЩЕНИЯ --------------------

async function sendMessage(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const name = formData.get('name') || event.target.querySelector('input[type="text"]')?.value;
    const phone = formData.get('phone') || event.target.querySelector('input[type="tel"]')?.value;
    const email = formData.get('email') || event.target.querySelector('input[type="email"]')?.value;
    const message = formData.get('message') || event.target.querySelector('textarea')?.value;

    if (!name || !phone || !message) {
        showToast('Заполните все обязательные поля', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ads/${currentAdId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, message })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Сообщение отправлено успешно!', 'success');
            hideMessageModal();
            event.target.reset();
        } else {
            showToast(result.error || 'Ошибка при отправке сообщения', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Ошибка при отправке сообщения', 'error');
    }
}

// -------------------- УДАЛЕНИЕ --------------------

async function deleteAd(adId) {
    if (!confirm("Удалить объявление?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/ads/${adId}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (result.success) {
            showToast("Объявление удалено", "success");
            setTimeout(() => {
                window.location.href = "ads.html";
            }, 800);
        } else {
            showToast(result.error || "Ошибка удаления", "error");
        }
    } catch (error) {
        console.error("Error deleting ad:", error);
        showToast("Ошибка удаления", "error");
    }
}

// -------------------- УТИЛИТЫ --------------------

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function formatTimeAgo(date) {
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
