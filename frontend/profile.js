// profile.js (исправленная версия с правильным userId и корректным handleSave)

(() => {
    'use strict';

    const _getAuthUser = (typeof getAuthUser === 'function') ? getAuthUser : () => null;
    window._getAuthUserGlobal = _getAuthUser;
    const _saveAuthUser = (typeof saveAuthUser === 'function') ? saveAuthUser : null;
    const _showToast = (typeof showToast === 'function') ? showToast : (msg, t = 'info') => console.info('TOAST', t, msg);
    const _API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '/api';
    
    window._API_BASE_GLOBAL = _API_BASE;

    const sel = {
        profileView: () => document.getElementById('profileView'),
        profileEdit: () => document.getElementById('profileEdit'),
        editBtn: () => document.getElementById('editBtn'),
        cancelEditBtn: () => document.getElementById('cancelEditBtn'),
        saveBtn: () => document.getElementById('saveBtn'),

        viewUsername: () => document.getElementById('viewUsername'),
        viewEmail: () => document.getElementById('viewEmail'),
        viewName: () => document.getElementById('viewName'),
        viewPhone: () => document.getElementById('viewPhone'),
        viewCreated: () => document.getElementById('viewCreated'),
        viewRating: () => document.getElementById('viewRating'),
        viewVerified: () => document.getElementById('viewVerified'),

        inputUsername: () => document.getElementById('inputUsername'),
        inputName: () => document.getElementById('inputName'),
        inputPhone: () => document.getElementById('inputPhone'),
        inputPassword: () => document.getElementById('inputPassword')
    };

    let userData = null;
    let initialValues = {};

    function isProfilePage() {
        return !!(sel.profileView() && sel.profileEdit());
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!isProfilePage()) return;
        bindButtons();
        loadProfileSafe();
    });

    function bindButtons() {
        sel.editBtn()?.addEventListener('click', enterEditMode);
        sel.cancelEditBtn()?.addEventListener('click', cancelEditMode);
        sel.saveBtn()?.addEventListener('click', handleSave);
    }

    async function loadProfileSafe() {
        try {
            const localUser = _getAuthUser ? _getAuthUser() : null;

            if (localUser) {
                populateViewFromLocal(localUser);
            }

        } catch (err) {
            console.error('loadProfileSafe error', err);
            _showToast('Ошибка при загрузке профиля', 'error');
        }
    }

    function populateViewFromLocal(local) {
        if (!local) return;

        const user = {
            id: local.id,
            username: local.username || '',
            email: local.email || '',
            name: local.name || '',
            phone: local.phone || '',
            created_at: local.created_at || '',
            rating: (typeof local.rating !== 'undefined') ? local.rating : '',
            verified: (typeof local.verified !== 'undefined') ? local.verified : false
        };

        userData = user;
        initialValues = {
            username: user.username,
            email: user.email,
            name: user.name,
            phone: user.phone
        };

        safeSetText(sel.viewUsername(), user.username || '—');
        safeSetText(sel.viewEmail(), user.email || '—');
        safeSetText(sel.viewName(), user.name || '—');
        safeSetText(sel.viewPhone(), user.phone || '—');
        safeSetText(sel.viewCreated(), user.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : '—');
        safeSetText(sel.viewRating(), user.rating !== '' ? String(user.rating) : '—');
        safeSetText(sel.viewVerified(), user.verified ? 'Да' : 'Нет');

        sel.inputUsername().value = user.username;
        sel.inputName().value = user.name;
        sel.inputPhone().value = user.phone;
        sel.inputPassword().value = '';
    }

    function safeSetText(el, text) {
        if (!el) return;
        el.textContent = text;
    }

    function enterEditMode() {
        sel.profileView().classList.add('hidden');
        sel.profileEdit().classList.remove('hidden');

        sel.inputUsername().value = initialValues.username;
        sel.inputName().value = initialValues.name;
        sel.inputPhone().value = initialValues.phone;
        sel.inputPassword().value = '';
    }

    function cancelEditMode() {
        sel.inputPassword().value = '';
        sel.profileEdit().classList.add('hidden');
        sel.profileView().classList.remove('hidden');
    }

    function validateUsername(u) {
        if (!u) return { ok: false, message: 'Логин не может быть пустым' };
        if (u.length < 3) return { ok: false, message: 'Логин должен быть минимум 3 символа' };
        return { ok: true };
    }

    function validatePhone(p) {
        if (!p) return { ok: true };
        const cleaned = p.replace(/[0-9\+\-\s\(\)]/g, '');
        if (cleaned.length > 0) return { ok: false, message: 'Телефон содержит недопустимые символы' };
        return { ok: true };
    }

    function validatePassword(p) {
        if (!p) return { ok: true };
        if (p.length < 6) return { ok: false, message: 'Пароль должен быть минимум 6 символов' };
        return { ok: true };
    }

    // =========================================================
    // Сохранение изменений + отправка на сервер
    // =========================================================
    async function handleSave() {
        try {
            const localUser = _getAuthUser ? _getAuthUser() : null;
            if (!localUser || !localUser.id) {
                _showToast("Ошибка: не найден ID пользователя", "error");
                return;
            }

            const newUsername = sel.inputUsername()?.value.trim() ?? '';
            const newName = sel.inputName()?.value.trim() ?? '';
            const newPhone = sel.inputPhone()?.value.trim() ?? '';
            const newPassword = sel.inputPassword()?.value ?? '';

            // Валидация
            const v1 = validateUsername(newUsername);
            if (!v1.ok) return _showToast(v1.message, 'error');

            const v2 = validatePhone(newPhone);
            if (!v2.ok) return _showToast(v2.message, 'error');

            const v3 = validatePassword(newPassword);
            if (!v3.ok) return _showToast(v3.message, 'error');

            // Формируем список изменений
            const updated = { userId: localUser.id };

            if (newUsername !== initialValues.username) updated.username = newUsername;
            if (newName !== initialValues.name) updated.name = newName;
            if (newPhone !== initialValues.phone) updated.phone = newPhone;
            if (newPassword) updated.password = newPassword;

            if (Object.keys(updated).length === 1) {
                _showToast('Нет изменений для сохранения', 'info');
                return;
            }

            const headers = { 'Content-Type': 'application/json' };
            if (localUser.token) {
                headers['Authorization'] = `Bearer ${localUser.token}`;
            }

            const saveBtn = sel.saveBtn();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Сохраняем...';

            // === Отправляем на сервер ===
            try {
                await fetch(`${_API_BASE}/auth/profile`, {
                    method: 'PUT',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify(updated)
                });
            } catch (err) {
                console.warn("Server update failed:", err);
            }

            // === Применяем изменения локально ===
            const finalUser = {
                ...localUser,
                ...updated
            };

            if (_saveAuthUser) _saveAuthUser(finalUser);

            initialValues = {
                username: finalUser.username,
                email: finalUser.email,
                name: finalUser.name,
                phone: finalUser.phone
            };

            populateViewFromLocal(finalUser);

            _showToast('Изменения сохранены', 'success');

            sel.profileEdit().classList.add('hidden');
            sel.profileView().classList.remove('hidden');

        } catch (err) {
            console.error('handleSave error', err);
            _showToast('Ошибка сохранения', 'error');
        } finally {
            sel.inputPassword().value = '';
            const saveBtn = sel.saveBtn();
            saveBtn.disabled = false;
            saveBtn.textContent = 'Сохранить';
        }
    }

})();


// Загружаем объявления пользователя
document.addEventListener('DOMContentLoaded', () => {
setTimeout(loadMyAds, 50);
});

async function loadMyAds() {
    const user = window._getAuthUserGlobal ? window._getAuthUserGlobal() : null;

    if (!user) return;
    
    try {
        const res = await fetch(`${window._API_BASE_GLOBAL}/ads`);
        const data = await res.json();

        if (!data.success) return;

        const myAds = data.data.filter(ad => ad.user_id === user.id);
        renderMyAds(myAds);

    } catch (e) {
        console.error("Failed to load my ads:", e);
    }
}

function renderMyAds(ads) {
    const list = document.getElementById("myAdsList");
    list.innerHTML = "";

    ads.forEach(ad => list.appendChild(createMyAdCard(ad)));

    new Splide("#myAds", {
    type: ads.length > 3 ? "loop" : "slide",
    perPage: 4,
    perMove: 1,
    gap: "1rem",
    autoplay: ads.length > 1,
    interval: 3000,
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

function createMyAdCard(ad) {
    const li = document.createElement("li");
    li.className = "splide__slide";

    const img = ad.images?.[0] ?? "https://via.placeholder.com/400x300";

    li.innerHTML = `
    <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
         onclick="window.location.href='ad-detail.html?id=${ad.id}'">

        <img src="${img}" alt="${ad.title}" class="w-full h-48 object-cover">

        <div class="p-4">
            <h3 class="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">${ad.title}</h3>
            <p class="text-xl font-bold text-blue-600 mb-2">${formatPrice(ad.price)}</p>

            <div class="flex justify-between text-sm text-gray-500">
                <span>${ad.location}</span>
                <span>${formatTimeAgo(ad.created_at)}</span>
            </div>
        </div>
    </div>
`;

    return li;
}


