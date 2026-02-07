const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Получить все категории
router.get('/', async (req, res) => {
    try {
        const categories = await db.getAllCategories();
        
        res.json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get categories'
        });
    }
});

// Получить категории с количеством активных объявлений (БЫСТРО)
router.get('/with-counts', async (req, res) => {
    try {
        const categories = await db.getCategoriesWithAdsCount();

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error getting categories with counts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get category counts'
        });
    }
});


// Получить категорию по ID
router.get('/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const category = await db.getCategoryById(categoryId);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error getting category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get category'
        });
    }
});



module.exports = router;