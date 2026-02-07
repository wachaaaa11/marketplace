// backend/database/database.js
// SQLite implementation for the project (replaces the in-memory Map-based DB).
// Uses sqlite3 with promise wrappers.

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const dbFile = path.resolve(__dirname, 'database.db');
const needInit = !fs.existsSync(dbFile);

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open SQLite DB:', err);
    process.exit(1);
  }
});

const runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      // this is the statement's context: lastID, changes
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// Initialize schema and seed data (only when DB file didn't exist)
async function init() {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rating REAL DEFAULT 0,
      verified INTEGER DEFAULT 0
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT,
      icon TEXT,
      parent_id INTEGER,
      FOREIGN KEY(parent_id) REFERENCES categories(id)
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      category_id INTEGER,
      user_id INTEGER,
      location TEXT,
      condition TEXT,
      status TEXT DEFAULT 'active',
      views INTEGER DEFAULT 0,
      images TEXT,            -- JSON array stored as TEXT
      contact_info TEXT,      -- JSON object as TEXT
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_id INTEGER,
      sender_name TEXT,
      sender_phone TEXT,
      sender_email TEXT,
      message TEXT,
      user_id INTEGER, -- recipient or related user
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ad_id) REFERENCES ads(id)
    );
  `);

  // Indexes for performance
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ads_user_id ON ads(user_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ads_category_id ON ads(category_id)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_messages_ad_id ON messages(ad_id)`);

  // Seed initial data similar to previous in-memory DB, only if empty
  const catCount = await getAsync(`SELECT COUNT(1) as cnt FROM categories`);
  if (catCount && catCount.cnt === 0) {
    const categories = [
      { name: 'Электроника', slug: 'electronics', icon: '📱' },
      { name: 'Недвижимость', slug: 'real-estate', icon: '🏠' },
      { name: 'Автомобили', slug: 'vehicles', icon: '🚗' },
      { name: 'Одежда', slug: 'clothes', icon: '👕' },
      { name: 'Мебель', slug: 'furniture', icon: '🪑' },
      { name: 'Спорт', slug: 'sports', icon: '⚽' }
    ];
    for (const c of categories) {
      await runAsync(`INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)`, [c.name, c.slug, c.icon]);
    }
    console.log('Seeded categories');
  }

  const userCount = await getAsync(`SELECT COUNT(1) as cnt FROM users`);
  if (userCount && userCount.cnt === 0) {
    // Note: password stored in plaintext here (for demo). Change to hashed in production.
    await runAsync(
      `INSERT INTO users (username, email, password, name, phone, rating, verified) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['alexey_k', 'alexey@example.com', 'demo_password', 'Алексей К.', '+7 (999) 123-45-67', 5.0, 1]
    );
    console.log('Seeded user alexey_k');
  }

  const adsCount = await getAsync(`SELECT COUNT(1) as cnt FROM ads`);
  if (adsCount && adsCount.cnt === 0) {
    const sampleImages = [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1603891128711-11b4b03bb138?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop'
    ];
    // find user id and category id
    const user = await getAsync(`SELECT id FROM users WHERE username = ?`, ['alexey_k']);
    const cat = await getAsync(`SELECT id FROM categories WHERE slug = ?`, ['electronics']);
    await runAsync(
      `INSERT INTO ads (title, description, price, category_id, user_id, location, condition, status, views, images, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'iPhone 14 Pro 128GB',
        'Продаю iPhone 14 Pro 128GB в отличном состоянии...',
        85000,
        cat ? cat.id : 1,
        user ? user.id : 1,
        'Москва',
        'excellent',
        'active',
        156,
        JSON.stringify(sampleImages),
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
    console.log('Seeded sample ad');
  }
}

(async () => {
  if (needInit) {
    try {
      await init();
      console.log('SQLite DB initialized.');
    } catch (e) {
      console.error('DB init error:', e);
    }
  } else {
    // DB exists: still ensure tables exist (idempotent)
    try {
      await init();
    } catch (e) {
      console.error('DB ensure tables error:', e);
    }
  }
})();



// Helper to map DB row to ad object expected by routes
function mapAdRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    category_id: row.category_id,
    user_id: row.user_id,
    location: row.location,
    condition: row.condition,
    status: row.status,
    views: row.views,
    images: row.images ? JSON.parse(row.images) : [],
    contact_info: row.contact_info ? JSON.parse(row.contact_info) : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Exported API (methods used by routes)
const Database = {
  // Users
  async createUser(userData) {
    const { username, email, password, name, phone } = userData;
    const { lastID } = await runAsync(
      `INSERT INTO users (username, email, password, name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, password, name, phone, new Date().toISOString()]
    );
    const user = await getAsync(`SELECT id, username, email, name, phone, created_at, rating, verified FROM users WHERE id = ?`, [lastID]);
    return user;
  },

  async getUserById(id) {
    const row = await getAsync(`SELECT id, username, email, name, phone, created_at, rating, verified FROM users WHERE id = ?`, [id]);
    return row || null;
  },

  async getUserByEmail(email) {
    const row = await getAsync(`SELECT id, username, email, password, name, phone, created_at, rating, verified FROM users WHERE email = ?`, [email]);
    return row || null;
  },

  async updateUser(id, data) {
    const allowed = ['username', 'name', 'phone', 'password'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (key in data) {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (sets.length === 0) {
      return await getAsync(
        `SELECT id, username, email, name, phone, created_at, rating, verified FROM users WHERE id = ?`,
        [id]
      );
    }

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);

    const res = await runAsync(sql, params);
    if (res.changes === 0) {
      return null;
    }

    return await getAsync(
      `SELECT id, username, email, name, phone, created_at, rating, verified FROM users WHERE id = ?`,
      [id]
    );
  },


  // Ads
  async createAd(adData) {
    const {
      title, description, price = 0, category_id = null, user_id = null,
      location = null, condition = null, images = [], contact_info = null
    } = adData;

    const imagesJson = JSON.stringify(images || []);
    const contactJson = contact_info ? JSON.stringify(contact_info) : null;

    const { lastID } = await runAsync(
      `INSERT INTO ads (title, description, price, category_id, user_id, location, condition, status, views, images, contact_info, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?, ?, ?)`,
      [title, description, price, category_id, user_id, location, condition, imagesJson, contactJson, new Date().toISOString(), new Date().toISOString()]
    );
    const row = await getAsync(`SELECT * FROM ads WHERE id = ?`, [lastID]);
    return mapAdRow(row);
  },

  async getAdById(id) {
    const row = await getAsync(`SELECT * FROM ads WHERE id = ?`, [id]);
    return mapAdRow(row);
  },

  // filters: category_id, min_price, max_price, location, search, sort
  async getAllAds(filters = {}) {

console.log("USING DB FILE:", dbFile);

const test2 = await allAsync(`SELECT id, title, location, length(location) as len FROM ads`);
console.log("==== LOCATION FULL DEBUG ====");
test2.forEach(r => console.log(`[${r.id}] "${r.location}" (len=${r.len})`));

console.log("=== getAllAds() START ===");
console.log("Incoming filters:", filters);



    const clauses = [];
    const params = [];
// FILTER BY USER (seller)
if (filters.user_id) {
  clauses.push(`user_id = ?`);
  params.push(parseInt(filters.user_id));
}
if (filters.status) {
    clauses.push(`status = ?`);
    params.push(filters.status);  
}

// MULTI-CATEGORY SUPPORT
if (filters.category_id) {
  // Разбиваем строку: "2,4,7" → [2,4,7]
  const ids = filters.category_id
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(n => !isNaN(n));

  if (ids.length === 1) {
    clauses.push(`category_id = ?`);
    params.push(ids[0]);
  } else if (ids.length > 1) {
    const placeholders = ids.map(() => '?').join(',');
    clauses.push(`category_id IN (${placeholders})`);
    params.push(...ids);
  }
}
    if (filters.min_price) {
      clauses.push(`price >= ?`);
      params.push(parseFloat(filters.min_price));
    }
    if (filters.max_price) {
      clauses.push(`price <= ?`);
      params.push(parseFloat(filters.max_price));
    }
if (filters.location) {
  clauses.push(`location LIKE ?`);
params.push(`%${filters.location}%`);

}
    if (filters.search) {
      clauses.push(`(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)`);
      params.push(`%${filters.search.toLowerCase()}%`);
      params.push(`%${filters.search.toLowerCase()}%`);
    }

// CONDITION (single or multi)
if (filters.condition && filters.condition !== 'any') {
  const conds = String(filters.condition)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (conds.length === 1) {
    clauses.push(`condition = ?`);
    params.push(conds[0]);
  } else if (conds.length > 1) {
    const placeholders = conds.map(() => '?').join(',');
    clauses.push(`condition IN (${placeholders})`);
    params.push(...conds);
  }
}


    let where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    // Sorting
    let orderBy = `ORDER BY datetime(created_at) DESC`;
    switch (filters.sort) {
      case 'price-low':
        orderBy = `ORDER BY price ASC`;
        break;
      case 'price-high':
        orderBy = `ORDER BY price DESC`;
        break;
      case 'oldest':
        orderBy = `ORDER BY datetime(created_at) ASC`;
        break;
      case 'popular':
        orderBy = `ORDER BY views DESC`;
        break;
      default:
        orderBy = `ORDER BY datetime(created_at) DESC`;
    }




console.log("SQL WHERE:", where);
console.log("SQL PARAMS:", params);
console.log("=== LOCATION DEBUG ===");
console.log("Raw filter.location =", filters.location);

const test = await allAsync(`SELECT id, title, location FROM ads`);
console.log("DB locations:", test.map(r => r.location));





    const sql = `SELECT * FROM ads ${where} ${orderBy} LIMIT 1000`;
    const rows = await allAsync(sql, params);
    return rows.map(mapAdRow);
  },

  async updateAd(id, adData) {
    // build dynamic SET clause
    const allowed = ['title','description','price','category_id','location','condition','status','views','images','contact_info'];
    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (key in adData) {
        if (key === 'images' || key === 'contact_info') {
          sets.push(`${key} = ?`);
          params.push(JSON.stringify(adData[key]));
        } else {
          sets.push(`${key} = ?`);
          params.push(adData[key]);
        }
      }
    }
    if (sets.length === 0) {
      // nothing to update
      const row = await getAsync(`SELECT * FROM ads WHERE id = ?`, [id]);
      return mapAdRow(row);
    }
    // always update updated_at
    sets.push(`updated_at = ?`);
    params.push(new Date().toISOString());

    const sql = `UPDATE ads SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);
    const res = await runAsync(sql, params);
    if (res.changes === 0) return null;
    const updated = await getAsync(`SELECT * FROM ads WHERE id = ?`, [id]);
    return mapAdRow(updated);
  },

  async deleteAd(id) {
    const res = await runAsync(`DELETE FROM ads WHERE id = ?`, [id]);
    return res.changes > 0;
  },

  // Categories
  async getAllCategories() {
    const rows = await allAsync(`SELECT id, name, slug, icon, parent_id FROM categories ORDER BY id`);
    return rows;
  },

  async getCategoryById(id) {
    const row = await getAsync(`SELECT id, name, slug, icon, parent_id FROM categories WHERE id = ?`, [id]);
    return row || null;
  },

async getCategoryBySlug(slug) {
    const row = await getAsync(
        `SELECT id, name, slug, icon, parent_id FROM categories WHERE slug = ?`,
        [slug]
    );
    return row || null;
},
async getCategoriesWithAdsCount() {
  const rows = await allAsync(`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.icon,
      c.parent_id,
      COUNT(a.id) AS ads_count
    FROM categories c
    LEFT JOIN ads a 
      ON a.category_id = c.id
      AND a.status = 'active'
    GROUP BY c.id
    ORDER BY c.id
  `);
  return rows;
},


  // Messages
  async createMessage(messageData) {
    const { ad_id, sender_name, sender_phone, sender_email, message, user_id } = messageData;
    const { lastID } = await runAsync(
      `INSERT INTO messages (ad_id, sender_name, sender_phone, sender_email, message, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ad_id, sender_name, sender_phone, sender_email, message, user_id || null, new Date().toISOString()]
    );
    const row = await getAsync(`SELECT * FROM messages WHERE id = ?`, [lastID]);
    return row;
  },


  async getMessagesByAdId(adId) {
    const rows = await allAsync(`SELECT * FROM messages WHERE ad_id = ? ORDER BY datetime(created_at) ASC`, [adId]);
    return rows;
  },

  // Stats
  async getStats() {
    const totalUsers = (await getAsync(`SELECT COUNT(1) as cnt FROM users`)).cnt;
    const totalAds = (await getAsync(`SELECT COUNT(1) as cnt FROM ads`)).cnt;
    const totalCategories = (await getAsync(`SELECT COUNT(1) as cnt FROM categories`)).cnt;
    const activeAds = (await getAsync(`SELECT COUNT(1) as cnt FROM ads WHERE status = 'active'`)).cnt;
    return {
      totalUsers,
      totalAds,
      totalCategories,
      activeAds
    };
  }
};



module.exports = Database;
