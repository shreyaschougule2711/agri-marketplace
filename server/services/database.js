const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'agriconnect.db');
let actualDbPath = DB_PATH;
try {
  const dbDir = path.dirname(actualDbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
} catch (err) {
  console.warn(`⚠️ Could not create directory for DB at ${actualDbPath}: ${err.message}`);
  console.warn(`⚠️ Falling back to local database. (Did you forget to add the Disk in Render?)`);
  actualDbPath = path.join(__dirname, '..', 'agriconnect.db');
}
const db = new Database(actualDbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ──────────────────────────────────────────────
// SCHEMA — Production-ready, no dummy data
// ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'farmer' CHECK(role IN ('farmer','buyer','admin')),
    phone TEXT DEFAULT '',
    language TEXT DEFAULT 'en',
    state TEXT DEFAULT '',
    district TEXT DEFAULT '',
    village TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    farmSize TEXT DEFAULT '',
    primaryCrops TEXT DEFAULT '',
    businessName TEXT DEFAULT '',
    businessType TEXT DEFAULT '',
    isVerified INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cropName TEXT NOT NULL,
    category TEXT DEFAULT 'vegetable',
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'kg',
    pricePerUnit REAL NOT NULL,
    quality TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'available' CHECK(status IN ('available','reserved','sold','expired')),
    organic INTEGER DEFAULT 0,
    harvestDate TEXT DEFAULT '',
    farmerId INTEGER NOT NULL,
    state TEXT DEFAULT '',
    district TEXT DEFAULT '',
    market TEXT DEFAULT '',
    description TEXT DEFAULT '',
    images TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (farmerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cropName TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT DEFAULT 'kg',
    market TEXT DEFAULT '',
    state TEXT DEFAULT '',
    updatedBy INTEGER,
    updatedAt TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cropName TEXT NOT NULL,
    price REAL NOT NULL,
    market TEXT DEFAULT '',
    recordedAt TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS groups_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupName TEXT NOT NULL,
    cropType TEXT NOT NULL,
    totalQuantity REAL DEFAULT 0,
    targetQuantity REAL NOT NULL,
    pricePerUnit REAL DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    status TEXT DEFAULT 'forming' CHECK(status IN ('forming','active','negotiating','sold','closed')),
    state TEXT DEFAULT '',
    district TEXT DEFAULT '',
    description TEXT DEFAULT '',
    createdBy INTEGER,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    quantity REAL DEFAULT 0,
    joinedAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (groupId) REFERENCES groups_table(id),
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(groupId, userId)
  );

  CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (groupId) REFERENCES groups_table(id),
    FOREIGN KEY (senderId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cropId INTEGER NOT NULL,
    cropName TEXT NOT NULL,
    quantity REAL NOT NULL,
    pricePerUnit REAL NOT NULL,
    totalAmount REAL NOT NULL,
    farmerId INTEGER NOT NULL,
    buyerId INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','shipped','delivered','cancelled')),
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (cropId) REFERENCES crops(id),
    FOREIGN KEY (farmerId) REFERENCES users(id),
    FOREIGN KEY (buyerId) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_crops_farmer ON crops(farmerId);
  CREATE INDEX IF NOT EXISTS idx_crops_status ON crops(status);
  CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmerId);
  CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyerId);
  CREATE INDEX IF NOT EXISTS idx_price_history ON price_history(cropName, recordedAt);
  CREATE INDEX IF NOT EXISTS idx_market_prices ON market_prices(cropName);
`);

// ──────────────────────────────────────────────
// Create default admin only if no users exist
// ──────────────────────────────────────────────
function init() {
  const cnt = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (cnt === 0) {
    const hashed = bcrypt.hashSync('admin@123', 10);
    db.prepare(`INSERT INTO users (name, email, password, role, language, state, district) VALUES (?,?,?,?,?,?,?)`)
      .run('Platform Admin', 'admin@agriconnect.in', hashed, 'admin', 'en', '', '');
    console.log('🔑 Default admin created: admin@agriconnect.in / admin@123');
  }
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const cropCount = db.prepare('SELECT COUNT(*) as c FROM crops').get().c;
  const groupCount = db.prepare('SELECT COUNT(*) as c FROM groups_table').get().c;
  console.log(`📊 DB: ${userCount} users, ${cropCount} crops, ${groupCount} groups`);
}

module.exports = { db, init };
