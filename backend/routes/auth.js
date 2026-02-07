const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, name, phone } = req.body;

        // Валидация обязательных полей
        if (!username || !email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Проверка существующего пользователя
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Создание нового пользователя
        const userData = {
            username,
            email,
            password, // В продакшене здесь должно быть хеширование пароля
            name,
            phone
        };

        const newUser = await db.createUser(userData);

        // Убираем пароль из ответа
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            data: userWithoutPassword,
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
});

// Вход пользователя
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Валидация обязательных полей
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing email or password'
            });
        }

        // Поиск пользователя
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Проверка пароля (в продакшене сравнение хешей)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Убираем пароль из ответа
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
	    token: "dev-token",        // <-- добавили токен
    userId: user.id,
            data: userWithoutPassword,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
});

// Получить информацию о текущем пользователе
router.get('/me', async (req, res) => {
    try {
        // В продакшене здесь должна быть проверка JWT токена -> req.user.id
        // Dev-mode: пробуем получить из header/query/body, иначе fallback на 1
        let userId = null;

        // 1) авторизованный middleware мог установить req.user
        if (req.user && req.user.id) userId = req.user.id;

        // 2) header x-user-id (DEVELOPMENT ONLY)
        if (!userId && req.get('x-user-id')) userId = parseInt(req.get('x-user-id'), 10);

        // 3) query param ?userId=...
        if (!userId && req.query && req.query.userId) userId = parseInt(req.query.userId, 10);

        // 4) body.userId (если вызов POST/PUT с userId)
        if (!userId && req.body && req.body.userId) userId = parseInt(req.body.userId, 10);

        // Fallback — если никто не передал userId, оставляем 1 (твой прежний поведение)
        if (!userId || Number.isNaN(userId)) userId = 1;

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: userWithoutPassword
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information'
        });
    }
});

// Обновить профиль пользователя
// Обновить профиль пользователя
router.put('/profile', async (req, res) => {
    try {
        const { userId, username, name, phone, password } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing userId'
            });
        }

        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const updatedData = {};

        if (username) updatedData.username = username;
        if (name) updatedData.name = name;
        if (phone) updatedData.phone = phone;
        if (password) updatedData.password = password;

        const updatedUser = await db.updateUser(userId, updatedData);

        const { password: _, ...safeUser } = updatedUser;

        res.json({
            success: true,
            data: safeUser,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});



// Выход пользователя
router.post('/logout', (req, res) => {
    // В продакшене здесь должно быть удаление JWT токена
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;