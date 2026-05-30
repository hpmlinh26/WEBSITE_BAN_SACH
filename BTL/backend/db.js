const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

// DATA_DIR co the tro toi persistent disk khi deploy (vd Render: /var/data).
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'database.sqlite');
const SEED_PATH = path.join(__dirname, 'seed-data.json');
const CURRENT_SEED_VERSION = 'v16-pagination-extra-books-polish';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
db.run('PRAGMA foreign_keys = ON');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

async function ensureColumn(table, column, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  if (!cols.some(c => c.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT,
    author TEXT,
    price INTEGER NOT NULL CHECK(price >= 0),
    original_price INTEGER CHECK(original_price >= 0),
    discount INTEGER DEFAULT 0,
    image TEXT,
    category_slug TEXT,
    slug TEXT UNIQUE,
    stock INTEGER DEFAULT 100,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_slug) REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE SET NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await ensureColumn('users', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

  await run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    shipping_address TEXT,
    payment_method TEXT DEFAULT 'cod',
    status TEXT DEFAULT 'pending',
    total INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    author TEXT,
    product_image TEXT,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
  )`);
  await ensureColumn('order_items', 'original_price', 'INTEGER');
  await ensureColumn('order_items', 'author', 'TEXT');
  await ensureColumn('order_items', 'product_image', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'amount',
    discount_value INTEGER NOT NULL DEFAULT 0,
    min_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await seedDatabase();
}

function readSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
}

async function resetCatalogIfNeeded(seed) {
  const saved = await get('SELECT value FROM app_meta WHERE key = ?', ['seed_version']);
  const productCount = await get('SELECT COUNT(*) AS count FROM products');
  if (saved?.value === seed.seedVersion && productCount.count > 0) return;

  await run('DELETE FROM order_items');
  await run('DELETE FROM cart_items');
  await run('DELETE FROM orders');
  await run('DELETE FROM products');
  await run('DELETE FROM categories');
  await run('DELETE FROM feedbacks');
  await run('DELETE FROM vouchers');
  await run("DELETE FROM sqlite_sequence WHERE name IN ('products','categories','orders','order_items','feedbacks','vouchers')");

  await run(`INSERT INTO app_meta(key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ['seed_version', CURRENT_SEED_VERSION]);
}

async function seedDatabase() {
  const seed = readSeed();
  await resetCatalogIfNeeded(seed);

  const categoryCount = await get('SELECT COUNT(*) AS count FROM categories');
  if (categoryCount.count === 0) {
    for (const category of seed.categories || []) {
      await run('INSERT INTO categories(name, slug, image) VALUES (?, ?, ?)', [category.name, category.slug, category.image]);
    }
  }

  const productCount = await get('SELECT COUNT(*) AS count FROM products');
  if (productCount.count === 0) {
    for (const p of seed.products || []) {
      await run(`INSERT INTO products
        (name, title, author, price, original_price, discount, image, category_slug, slug, stock, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, p.title || p.name, p.author, p.price, p.originalPrice || p.original_price || p.price,
          p.discount || 0, p.image, p.category || p.category_slug, p.slug, p.stock || 100, p.description || '']
      );
    }
  }

  const userCount = await get('SELECT COUNT(*) AS count FROM users');
  if (userCount.count === 0) {
    await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ['Admin MOT', 'admin@mot.vn', '0337448886', hashPassword('123456'), 'admin']);
    await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ['Khách hàng Demo', 'user@mot.vn', '0987654321', hashPassword('123456'), 'customer']);
  }

  const voucherCount = await get('SELECT COUNT(*) AS count FROM vouchers');
  if (voucherCount.count === 0) {
    const vouchers = [
      ['MOT10K', 'Giảm 10K toàn sàn', 'Giảm 10.000đ cho đơn hàng từ 100.000đ', 'amount', 10000, 100000, 1, '2026-12-31'],
      ['MOT20K', 'Giảm 20K manga hot', 'Giảm 20.000đ cho đơn hàng từ 200.000đ', 'amount', 20000, 200000, 1, '2026-12-31'],
      ['FREESHIP', 'Freeship demo', 'Voucher miễn phí vận chuyển demo', 'amount', 15000, 150000, 1, '2026-12-31']
    ];
    for (const v of vouchers) {
      await run(`INSERT INTO vouchers(code, title, description, discount_type, discount_value, min_order, active, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, v);
    }
  }

  const orderCount = await get('SELECT COUNT(*) AS count FROM orders');
  if (orderCount.count === 0) {
    const sampleOrders = [
      { info: ['Nguyễn Văn An', '0901000001', 'an@example.com', 'Số 1 Trần Duy Hưng, Cầu Giấy, Hà Nội', 'cod', 'pending'], items: [{ productId: 7, quantity: 1 }, { productId: 12, quantity: 1 }] },
      { info: ['Trần Minh Anh', '0901000002', 'anh@example.com', 'Quận 1, TP. Hồ Chí Minh', 'momo', 'completed'], items: [{ productId: 21, quantity: 1 }] },
      { info: ['Lê Thu Hà', '0901000003', 'ha@example.com', 'Hải Châu, Đà Nẵng', 'vnpay', 'cancelled'], items: [{ productId: 53, quantity: 1 }] }
    ];
    for (const sample of sampleOrders) {
      let total = 0;
      const prepared = [];
      for (const item of sample.items) {
        const product = await get('SELECT id, name, author, price, original_price, image FROM products WHERE id = ?', [item.productId]);
        if (!product) continue;
        const subtotal = product.price * item.quantity;
        total += subtotal;
        prepared.push({ product, quantity: item.quantity, subtotal });
      }
      const result = await run(`INSERT INTO orders
        (customer_name, customer_phone, customer_email, shipping_address, payment_method, status, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [...sample.info, total]);
      for (const item of prepared) {
        await run(`INSERT INTO order_items(order_id, product_id, product_name, price, original_price, author, product_image, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.id, item.product.id, item.product.name, item.product.price, item.product.original_price || item.product.price, item.product.author, item.product.image, item.quantity, item.subtotal]);
      }
    }
  }

  const feedbackCount = await get('SELECT COUNT(*) AS count FROM feedbacks');
  if (feedbackCount.count === 0) {
    const samples = [
      ['Nguyễn Minh Châu', 'chau@example.com', '0901234567', 'Góp ý giao diện', 'Trang sản phẩm đẹp hơn rồi, mong có thêm bộ lọc theo giá.', 'new'],
      ['Hoàng An', 'an.feedback@example.com', '0912345678', 'Hỏi về đơn hàng', 'Mình muốn kiểm tra trạng thái đơn hàng và thời gian giao dự kiến.', 'read']
    ];
    for (const fb of samples) {
      await run(`INSERT INTO feedbacks(full_name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)`, fb);
    }
  }
}

module.exports = { db, DB_PATH, initDatabase, run, get, all, hashPassword };
