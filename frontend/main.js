// Главный JavaScript файл для MarketPlace

const API_BASE_URL = 'http://localhost:3000/api';

// Данные для популярных объявлений
let popularAdsData = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    initializeEventListeners();
    loadInitialData();
loadCategoryCounts();
    restoreAuthState(); // Восстанавливаем состояние авторизации при загрузке
});


// ---------------------------
// АНИМАЦИИ
// ---------------------------

function initializeAnimations() {
    // Проверяем элементы, чтобы не ломать другие страницы
    if (document.getElementById('heroTitle')) {
        anime.timeline({ easing: 'easeOutExpo', duration: 1000 })
            .add({
                targets: '#heroTitle',
                opacity: [0, 1],
                translateY: [50, 0],
                delay: 300
            })
            .add({
                targets: '#heroSubtitle',
                opacity: [0, 1],
                translateY: [30, 0],
                delay: 200
            }, '-=800')
            .add({
                targets: '#heroSearch',
                opacity: [0, 1],
                translateY: [20, 0],
                delay: 100
            }, '-=600')
            .add({
                targets: '#heroCategories',
                opacity: [0, 1],
                translateY: [20, 0]
            }, '-=400');
    }

    // Анимация категорий (только если есть)
    if (document.querySelector('.category-card')) {
        anime({
            targets: '.category-card',
            opacity: [0, 1],
            translateY: [30, 0],
            delay: anime.stagger(100, { start: 800 }),
            duration: 800,
            easing: 'easeOutQuart'
        });
    }

    // Анимация при скролле (общая)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    });

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}


// ---------------------------
// КАРУСЕЛЬ
// ---------------------------

let splideInstance = null;

function initializeCarousel() {
    const slider = document.getElementById('popularAds');
    if (!slider) return;

    // Если Splide уже был создан — уничтожаем
    if (splideInstance) {
        try { splideInstance.destroy(); } catch {}
    }

    // Создаём заново
    splideInstance = new Splide('#popularAds', {
        type: popularAdsData.length > 3 ? 'loop' : 'slide',
        perPage: 4,
        perMove: 1,
        gap: '1rem',
        arrows: true,
        pagination: false,
        autoplay: true,
        interval: 3000,
        pauseOnHover: true,
        breakpoints: {
            1024: { perPage: 3 },
            768: { perPage: 2 },
            480: { perPage: 1 }
        }
    });

    splideInstance.mount();
}


// ---------------------------
// ЗАГРУЗКА ДАННЫХ
// ---------------------------

async function loadInitialData() {
    try {
        // Загружаем популярные объявления
        const response = await fetch(`${API_BASE_URL}/ads?sort=popular&limit=6`);
        const result = await response.json();

        if (result.success) {
            popularAdsData = result.data.map(ad => ({
                id: ad.id,
                title: ad.title,
                price: formatPrice(ad.price),
                image: ad.images && ad.images[0]
                    ? ad.images[0]
                    : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
                location: ad.location,
                time: formatTimeAgo(ad.created_at)
            }));

            loadPopularAds();
        } else {
            // Если API вернул ошибку, загружаем тестовые данные
            console.warn('Ads API returned success=false, loading test data', result);
            loadTestData();
        }

    } catch (error) {
        console.error('Error loading initial data:', error);
        loadTestData();
    }
}

// ---------------------------
// КАТЕГОРИИ: количество объявлений
// ---------------------------

async function loadCategoryCounts() {
    const cards = document.querySelectorAll('.category-card');
    if (cards.length === 0) return;

    try {
        const res = await fetch(`${API_BASE_URL}/categories/with-counts`);
        const result = await res.json();

        if (!result.success) return;

        const map = {};
        result.data.forEach(cat => {
            map[cat.slug] = cat.ads_count;
        });

        cards.forEach(card => {
            const slug = card.dataset.categorySlug;
            const countEl = card.querySelector('.category-count');

            if (!countEl) return;

            countEl.textContent =
                slug in map ? map[slug] : 0;
        });

    } catch (e) {
        console.error('Failed to load category counts:', e);
    }
}


// ---------------------------
// ТЕСТОВЫЕ ДАННЫЕ
// ---------------------------

function loadTestData() {
    popularAdsData = [
        { id: 1, title: "iPhone 14 Pro 128GB", price: "85,000 ₽", image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop", location: "Москва", time: "2 часа назад" },
        { id: 2, title: "Квартира 2-комнатная", price: "5,200,000 ₽", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop", location: "Санкт-Петербург", time: "5 часов назад" },
        { id: 3, title: "BMW X5 2020", price: "3,500,000 ₽", image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop", location: "Екатеринбург", time: "1 день назад" },
        { id: 4, title: "MacBook Pro 16", price: "180,000 ₽", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop", location: "Москва", time: "2 дня назад" },
        { id: 5, title: "PlayStation 5", price: "45,000 ₽", image: "https://images.unsplash.com/photo-1606813907461-0ca21d7c9c58?w=400&h=300&fit=crop", location: "Казань", time: "3 дня назад" },
        { id: 6, title: "Смарт-часы Apple Watch", price: "25,000 ₽", image: "https://images.unsplash.com/photo-1579586337278-3befd40d17ff?w=400&h=300&fit=crop", location: "Новосибирск", time: "4 дня назад" }
    ];

    loadPopularAds();
}


// ---------------------------
// КАРТОЧКИ
// ---------------------------

function loadPopularAds() {
    const adsList = document.getElementById('popularAdsList');
    if (!adsList) return;

    adsList.innerHTML = '';

    popularAdsData.forEach(ad => {
        adsList.appendChild(createAdCard(ad));
    });

    // ИНИЦИАЛИЗИРУЕМ КАРУСЕЛЬ ПОСЛЕ СОЗДАНИЯ КАРТОЧЕК
    initializeCarousel();
}


function createAdCard(ad) {
    const li = document.createElement('li');
    li.className = 'splide__slide';
    li.innerHTML = `
        <div class="card-hover bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer" onclick="openAdDetail(${ad.id})">
            <img src="${ad.image}" alt="${ad.title}" class="w-full h-48 object-cover">
            <div class="p-4">
                <h3 class="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">${ad.title}</h3>
                <p class="text-2xl font-bold text-blue-600 mb-2">${ad.price}</p>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <span>${ad.location}</span>
                    <span>${ad.time}</span>
                </div>
            </div>
        </div>
    `;
    return li;
}


// ---------------------------
// АВТОРИЗАЦИЯ: helper-функции
// ---------------------------

function saveAuthUser(user) {
    try {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (e) {
        console.warn('Failed to save user to localStorage', e);
    }
}

function clearAuthUser() {
    try {
        localStorage.removeItem('currentUser');
    } catch (e) {
        console.warn('Failed to clear localStorage', e);
    }
}

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (e) {
        return null;
    }
}

function updateAuthUI() {
    const user = getAuthUser();
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    if (user) {
        loginBtn.textContent = 'Профиль';
        loginBtn.dataset.loggedIn = '1';
    } else {
        loginBtn.textContent = 'Войти';
        loginBtn.dataset.loggedIn = '0';
    }
}

function openLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (!loginModal) {
        console.warn("loginModal not found!");
        return;
    }
    loginModal.classList.remove('hidden');
    loginModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}


// Восстанавливаем состояние авторизации при загрузке страницы
function restoreAuthState() {
    updateAuthUI();
}

// Утилита — редирект/открытие профиля (можно изменить на реальную страницу)
function openProfileOrModal() {
    const user = getAuthUser();
    const loginModal = document.getElementById('loginModal');
    if (user) {
        // у пользователя уже есть профиль — редирект на страницу профиля (если есть)
        window.location.href = 'profile.html';
    } else if (loginModal) {
        loginModal.classList.remove('hidden');
        loginModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }
}


// ---------------------------
// ОБРАБОТЧИКИ СОБЫТИЙ
// ---------------------------

function initializeEventListeners() {

    // ==========================
    //        ПОИСК
    // ==========================
    const mainSearch = document.getElementById('mainSearch');
    if (mainSearch) {
        mainSearch.addEventListener('input', debounce(handleSearch, 300));
    }
    // Поиск на странице объявлений
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }


    // ==========================
    //      КАТЕГОРИИ (2 типа)
    // ==========================
    const categoryIcons = document.querySelectorAll('.category-icon');
    if (categoryIcons.length > 0) {
        categoryIcons.forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.textContent.trim();
                window.location.href = `ads.html?category=${encodeURIComponent(category)}`;
            });
        });
    }

   const categoryCards = document.querySelectorAll('.category-card');

if (categoryCards.length > 0) {
    categoryCards.forEach(card => {
        card.addEventListener('click', function () {

            const categorySlug = this.dataset.categorySlug;

            if (!categorySlug) {
                console.warn('У карточки нет data-category-slug');
                return;
            }

            window.location.href =
                `ads.html?category=${encodeURIComponent(categorySlug)}`;
        });
    });
}


// ---------------------------
// URL helpers
// ---------------------------

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}


    // ==========================
    //         ВХОД
    // ==========================
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            // если пользователь авторизован -> открываем профиль, иначе показываем модалку
            const loggedIn = loginBtn.dataset.loggedIn === '1';
            if (loggedIn) {
                openProfileOrModal();
            } else if (loginModal) {
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    if (loginBtn && loginModal && closeLoginModal && loginForm) {

        closeLoginModal.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            loginModal.classList.remove('flex');
            document.body.style.overflow = 'auto';
        });

        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.classList.add('hidden');
                loginModal.classList.remove('flex');
                document.body.style.overflow = 'auto';
            }
        });

        // ЗАМЕНА: реальная отправка на сервер
        loginForm.addEventListener('submit', handleLogin);
    }


    // ==========================
    //       РЕГИСТРАЦИЯ
    // ==========================
    const registerModal = document.getElementById('registerModal');
    const registerForm = document.getElementById('registerForm');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const openRegisterFromLogin = document.getElementById('openRegisterFromLogin');
    const openLoginFromRegister = document.getElementById('openLoginFromRegister');

    if (registerModal && registerForm && closeRegisterModal) {

        // переход из входа → в регистрацию
        if (openRegisterFromLogin && loginModal) {
            openRegisterFromLogin.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.classList.add('hidden');
                loginModal.classList.remove('flex');
                registerModal.classList.remove('hidden');
                registerModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            });
        }

        // переход из регистрации → во вход
        if (openLoginFromRegister && loginModal) {
            openLoginFromRegister.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.classList.add('hidden');
                registerModal.classList.remove('flex');
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            });
        }

        // закрытие регистрации
        closeRegisterModal.addEventListener('click', () => {
            registerModal.classList.add('hidden');
            registerModal.classList.remove('flex');
            document.body.style.overflow = 'auto';
        });

        // клик по фону
        registerModal.addEventListener('click', (e) => {
            if (e.target === registerModal) {
                registerModal.classList.add('hidden');
                registerModal.classList.remove('flex');
                document.body.style.overflow = 'auto';
            }
        });

        // ЗАМЕНА: Отправка регистрации на сервер (реальный)
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(registerForm);
            const userData = {
                username: formData.get('username'),
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: formData.get('password')
            };

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();
                console.log("Register response:", result);

                if (!result.success) {
                    showToast(result.error || "Ошибка регистрации", "error");
                    return;
                }

                showToast("Регистрация успешна!", "success");

                // Закрываем форму регистрации
                registerModal.classList.add('hidden');
                registerModal.classList.remove('flex');

                // Сразу открываем окно входа (не логиним автоматически)
                if (loginModal) {
                    loginModal.classList.remove('hidden');
                    loginModal.classList.add('flex');
                }

            } catch (error) {
                console.error("Register Error:", error);
                showToast("Сервер недоступен", "error");
            }
        });
    }


    // ==========================
    //    Мобильное меню
    // ==========================
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }


    // ==========================
    //  Плавная прокрутка якорей (исправлено)
    // ==========================
    const anchors = document.querySelectorAll('a[href^="#"]');
    if (anchors.length > 0) {
        anchors.forEach(anchor => {
            anchor.addEventListener('click', function(e) {

                const href = this.getAttribute('href');

                // игнорируем пустой якорь "#"
                if (!href || href === "#" || href.trim() === "#") {
                    return; // ничего не делаем — стандартное поведение
                }

                e.preventDefault();

                let target;
                try {
                    target = document.querySelector(href);
                } catch (err) {
                    console.warn("Некорректный селектор якоря:", href);
                    return;
                }

                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        clearAuthUser();      // удаляем пользователя
	localStorage.removeItem('token');   // удаляем токен
        localStorage.removeItem('userId');  // удаляем ID пользователя
        updateAuthUI();       // обновляем кнопки в навигации
        showToast('Вы вышли из аккаунта', 'success');
        window.location.href = 'index.html'; // редирект на главную
    });

}

}


// ---------------------------
// ПОИСК
// ---------------------------

function handleSearch(event) {
    const query = event.target.value.trim();

    if (query.length > 2) {
        console.log('Поиск:', query);
        showToast(`Поиск: "${query}"`);
    }
}


// ---------------------------
// ЛОГИН (реальная отправка на сервер)
// ---------------------------

async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get('email') || '';
    const password = formData.get('password') || '';

    if (!email || !password) {
        showToast('Введите email и пароль', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        console.log('Login response:', result);

        if (!result.success) {
            showToast(result.error || 'Неверный email или пароль', 'error');
            return;
        }
	
	
        // Успешный вход — сохраняем пользователя в localStorage
        const user = result.data;
	// сохраняем всю auth-информацию
	localStorage.setItem("token", result.token);             // "dev-token"
	localStorage.setItem("userId", result.userId);           // настоящее число ID

        saveAuthUser(user);
        updateAuthUI();

        showToast('Вход выполнен успешно!', 'success');

        // Закрываем модалку входа
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('hidden');
            loginModal.classList.remove('flex');
            document.body.style.overflow = 'auto';
        }

    } catch (error) {
        console.error('Login error:', error);
        showToast('Ошибка при соединении с сервером', 'error');
    }
}


// ---------------------------
// ДЕТАЛЬ ОБЪЯВЛЕНИЯ
// ---------------------------

function openAdDetail(adId) {
    window.location.href = `ad-detail.html?id=${adId}`;
}


// ---------------------------
// МОБИЛЬНОЕ МЕНЮ
// ---------------------------

function toggleMobileMenu() {
    showToast('Мобильное меню');
}


function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// ---------------------------
// УТИЛИТЫ
// ---------------------------

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
    return forms[(number % 100 > 4 && number % 100 < 20)
        ? 2 : cases[Math.min(number % 10, 5)]];
}


// ---------------------------
// TOAST
// ---------------------------

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `
        fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white
        transform translate-x-full transition-transform duration-300
        ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function getAuthToken() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
        return null;
    }
    return token;
}

function handleCreateAdClick() {
    const token = getAuthToken();
    console.log("TOKEN:", token);

    if (!token) {
        const loginModal = document.getElementById("loginModal");
        if (loginModal) {
            loginModal.classList.remove("hidden");
            loginModal.classList.add("flex");
        }
        return;
    }

    // Есть токен → редиректим
    window.location.href = "create-ad.html";
}


// кнопка в header
const createAdLinkNav = document.getElementById("createAdLinkNav");
if (createAdLinkNav) {
    createAdLinkNav.addEventListener("click", handleCreateAdClick);
}

// кнопка в CTA блоке
const createAdLinkCTA = document.getElementById("createAdLinkCTA");
if (createAdLinkCTA) {
    createAdLinkCTA.addEventListener("click", handleCreateAdClick);
}

// ---------------------------
// Диагностический обработчик ошибок (временно)
// ---------------------------

// Флаг, чтобы показать alert только один раз
let __diagnostic_error_shown = false;

window.addEventListener('error', function(e) {
    try {
        // Выводим полную структуру события в консоль
        console.group('DIAGNOSTIC window.error');
        console.log('event:', e);
        console.log('message:', e.message);
        console.log('filename:', e.filename);
        console.log('lineno:', e.lineno);
        console.log('colno:', e.colno);
        console.log('error object:', e.error);
        console.groupEnd();

        // Показываем alert один раз с основными деталями, чтобы их можно было скопировать
        if (!__diagnostic_error_shown) {
            __diagnostic_error_shown = true;
            const msg = `Error: ${e.message || '—'}\nFile: ${e.filename || '—'}\nLine: ${e.lineno || '—'}:${e.colno || '—'}\nSee console for full event object.`;
            // eslint-disable-next-line no-alert
            alert(msg);
        }

        // НЕ показываем тост (чтобы не вызывать рекурсию); оставляем только лог.
    } catch (handlerErr) {
        // Если обработчик сам упал — логируем и прекращаем
        console.error('Ошибка в диагностическом обработчике ошибок:', handlerErr);
    }
});

// Ловим необработанные отменённые промисы
window.addEventListener('unhandledrejection', function(evt) {
    try {
        console.group('DIAGNOSTIC unhandledrejection');
        console.log('promise:', evt.promise);
        console.log('reason:', evt.reason);
        console.groupEnd();
        if (!__diagnostic_error_shown) {
            __diagnostic_error_shown = true;
            // eslint-disable-next-line no-alert
            alert(`UnhandledRejection: ${String(evt.reason)}\nSee console for details.`);
        }
    } catch (handlerErr) {
        console.error('Ошибка в обработчике unhandledrejection:', handlerErr);
    }
});

// ---------------------------
// Авто-применение категории из URL (ads.html)
// ---------------------------

document.addEventListener('DOMContentLoaded', () => {

    // работаем ТОЛЬКО на ads.html
    if (!document.getElementById('filtersSidebar')) return;

    const categoryFromUrl = getQueryParam('category');
    if (!categoryFromUrl) return;

    // находим чекбокс категории
    const checkbox = document.querySelector(
        `.filter-checkbox[value="${categoryFromUrl}"]`
    );

    if (!checkbox) {
        console.warn('Категория из URL не найдена:', categoryFromUrl);
        return;
    }

    // включаем чекбокс
    checkbox.checked = true;

    // визуально применяем стиль (label)
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    // если есть кнопка "Применить фильтры" — жмём её
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.click();
    }
});

function goToAdsWithSearch(query) {
    const text = query.trim();
    if (!text) return;

    window.location.href =
        `ads.html?search=${encodeURIComponent(text)}`;
}
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('mainSearch');

    if (!searchInput) return; // мы не на главной странице

    // Кнопка 🔍 — это кнопка внутри того же блока
    const searchButton = searchInput.parentElement.querySelector('button');

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            goToAdsWithSearch(searchInput.value);
        });
    }

    // Enter в поле ввода
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            goToAdsWithSearch(searchInput.value);
        }
    });
});



// ---------------------------
// ОБРАБОТКА ОШИБОК ИЗОБРАЖЕНИЙ
// ---------------------------

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdодD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+Tm8gaW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {

    const createBtn = document.getElementById('createAdBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function (e) {
            e.preventDefault();

            const token = localStorage.getItem("token");
            const userId = localStorage.getItem("userId");

            if (!token || !userId) {
                // пользователь не вошёл → открыть модалку
                openLoginModal();
                return;
            }

            // пользователь вошёл → переход
            window.location.href = "create-ad.html";
        });
    }

});


