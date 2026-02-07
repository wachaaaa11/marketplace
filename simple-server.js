const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// API endpoints data
const apiData = {
    ads: {
        success: true,
        data: [
            {
                id: 1,
                title: "iPhone 14 Pro 128GB",
                description: "Продаю iPhone 14 Pro 128GB в отличном состоянии...",
                price: 85000,
                category_id: 1,
                user_id: 1,
                location: "Москва",
                condition: "excellent",
                status: "active",
                views: 156,
                created_at: "2024-01-15T10:30:00Z",
                updated_at: "2024-01-15T10:30:00Z",
                images: [
                    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop",
                    "https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&h=600&fit=crop",
                    "https://images.unsplash.com/photo-1603891128711-11b4b03bb138?w=800&h=600&fit=crop",
                    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop"
                ],
                user: {
                    id: 1,
                    name: "Алексей К.",
                    rating: 5.0,
                    verified: true
                },
                category: {
                    id: 1,
                    name: "Электроника",
                    icon: "📱"
                }
            }
        ],
        count: 1
    },
    categories: {
        success: true,
        data: [
            { id: 1, name: "Электроника", slug: "electronics", icon: "📱", parent_id: null },
            { id: 2, name: "Недвижимость", slug: "real-estate", icon: "🏠", parent_id: null },
            { id: 3, name: "Автомобили", slug: "vehicles", icon: "🚗", parent_id: null },
            { id: 4, name: "Одежда", slug: "clothes", icon: "👕", parent_id: null },
            { id: 5, name: "Мебель", slug: "furniture", icon: "🪑", parent_id: null },
            { id: 6, name: "Спорт", slug: "sports", icon: "⚽", parent_id: null }
        ]
    }
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    
    console.log(`Request: ${req.method} ${pathname}`);
    
    // API endpoints
    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (pathname === '/api/ads') {
            res.writeHead(200);
            res.end(JSON.stringify(apiData.ads));
        } else if (pathname.startsWith('/api/ads/')) {
            res.writeHead(200);
            res.end(JSON.stringify(apiData.ads));
        } else if (pathname === '/api/categories') {
            res.writeHead(200);
            res.end(JSON.stringify(apiData.categories));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    }
    // Static files
    else {
        let filePath = pathname === '/' ? '/frontend/index.html' : `/frontend${pathname}`;
        
        // Handle .html extensions
        if (!path.extname(filePath) && !filePath.endsWith('.html')) {
            filePath += '.html';
        }
        
        const fullPath = path.join(__dirname, filePath);
        
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                console.log(`File not found: ${fullPath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Page Not Found</h1>');
                return;
            }
            
            const ext = path.extname(fullPath);
            const contentType = mimeTypes[ext] || 'text/plain';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
});

console.log('Starting server...');