const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const adsRoutes = require('./routes/ads');
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');

// API routes
app.use('/api/ads', adsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));


// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/ads.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/ads.html'));
});

app.get('/create-ad.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/create-ad.html'));
});

app.get('/ad-detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/ad-detail.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
});

module.exports = app;