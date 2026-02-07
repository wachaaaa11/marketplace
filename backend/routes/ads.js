const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Получить все объявления с фильтрацией и поиском
router.get('/', async (req, res) => {
    try {
        const filters = {
            category_id: req.query.category_id,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            location: req.query.location,
	    condition: req.query.condition,
            search: req.query.search,
            sort: req.query.sort || 'newest',
	    user_id: req.query.user_id 
        };

        const ads = await db.getAllAds(filters);
        
        // Добавляем информацию о пользователе и категории
        const adsWithDetails = await Promise.all(ads.map(async (ad) => {
            const user = await db.getUserById(ad.user_id);
            const category = await db.getCategoryById(ad.category_id);
            
            return {
                ...ad,
                user: user ? {
                    id: user.id,
                    name: user.name,
		    phone: user.phone,
                    rating: user.rating
                } : null,
                category: category ? {
                    id: category.id,
                    name: category.name,
                    icon: category.icon
                } : null
            };
        }));

        res.json({
            success: true,
            data: adsWithDetails,
            count: adsWithDetails.length
        });
    } catch (error) {
        console.error('Error getting ads:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ads'
        });
    }
});

// Получить объявление по ID
router.get('/:id', async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const ad = await db.getAdById(adId);
        
        if (!ad) {
            return res.status(404).json({
                success: false,
                error: 'Ad not found'
            });
        }

        // Увеличиваем количество просмотров
        await db.updateAd(adId, { views: ad.views + 1 });

        // Получаем дополнительную информацию
        const user = await db.getUserById(ad.user_id);
        const category = await db.getCategoryById(ad.category_id);
        const messages = await db.getMessagesByAdId(adId);

        const adWithDetails = {
    ...ad,
    user: user ? {
        id: user.id,
        name: user.name,
        phone: user.phone,
        rating: user.rating,
        verified: user.verified,
        created_at: user.created_at
    } : null,
    category: category ? {
        id: category.id,
        name: category.name,
        icon: category.icon
    } : null,
    contact_info: ad.contact_info,
    messages: messages.length
};


        res.json({
            success: true,
            data: adWithDetails
        });
    } catch (error) {
        console.error('Error getting ad:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ad'
        });
    }
});

// Создать новое объявление
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            category_id,
            location,
            condition,
            images,
            contactName,
            contactPhone,
            contactEmail
        } = req.body;

        // Валидация обязательных полей
        if (!title || !description || !price || !category_id || !location || !condition) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Проверяем существование категории
        const category = await db.getCategoryById(parseInt(category_id));
        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Создаем объявление
        const adData = {
            title,
            description,
            price: parseInt(price),
            category_id: parseInt(category_id),
            user_id: 1, // Временно используем ID 1 для демонстрации
            location,
            condition,
            images: images || [],
            contact_info: {
                name: contactName,
                phone: contactPhone,
                email: contactEmail
            }
        };

        const newAd = await db.createAd(adData);

        res.status(201).json({
            success: true,
            data: newAd,
            message: 'Ad created successfully'
        });
    } catch (error) {
        console.error('Error creating ad:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create ad'
        });
    }
});

// Обновить объявление
router.put('/:id', async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const ad = await db.getAdById(adId);
        
        if (!ad) {
            return res.status(404).json({
                success: false,
                error: 'Ad not found'
            });
        }

        const updatedAd = await db.updateAd(adId, req.body);
        
        res.json({
            success: true,
            data: updatedAd,
            message: 'Ad updated successfully'
        });
    } catch (error) {
        console.error('Error updating ad:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ad'
        });
    }
});

// Удалить объявление
router.delete('/:id', async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const ad = await db.getAdById(adId);
        
        if (!ad) {
            return res.status(404).json({
                success: false,
                error: 'Ad not found'
            });
        }

        const deleted = await db.deleteAd(adId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Ad deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete ad'
            });
        }
    } catch (error) {
        console.error('Error deleting ad:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete ad'
        });
    }
});

// Отправить сообщение по объявлению
router.post('/:id/message', async (req, res) => {
    try {
        const adId = parseInt(req.params.id);
        const ad = await db.getAdById(adId);
        
        if (!ad) {
            return res.status(404).json({
                success: false,
                error: 'Ad not found'
            });
        }

        const { name, phone, email, message } = req.body;

        if (!name || !phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const messageData = {
            ad_id: adId,
            sender_name: name,
            sender_phone: phone,
            sender_email: email,
            message,
            user_id: ad.user_id
        };

        const newMessage = await db.createMessage(messageData);

        res.status(201).json({
            success: true,
            data: newMessage,
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// === Новый маршрут: создание объявления для новой страницы ===
router.post('/create', async (req, res) => {
    try {
        const {
            user_id,
            category,      // slug: "electronics"
            title,
            description,
            price,
            location,
            condition,
            images,
            showPhone,
            allowMessages,
            acceptBargain
        } = req.body;

        // Проверка обязательных полей
        if (!title || !description || !price || !category || !location || !condition) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Находим категорию по slug
        const cat = await db.getCategoryBySlug(category);
        if (!cat) {
            return res.status(400).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Собираем contact_info — оно сохраняется как JSON
        const contact_info = {
            showPhone: !!showPhone,
            allowMessages: !!allowMessages,
            acceptBargain: !!acceptBargain
        };

        // Создаем объявление
        const newAd = await db.createAd({
            user_id,
            category_id: cat.id,
            title,
            description,
            price: parseFloat(price),
            location,
            condition,
            images: images || [],
            contact_info
        });

        res.json({
            success: true,
            data: newAd
        });

    } catch (err) {
        console.error("Error creating ad:", err);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});


module.exports = router;