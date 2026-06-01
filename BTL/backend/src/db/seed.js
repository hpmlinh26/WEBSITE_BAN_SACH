const fs = require('fs');
const { run, get, hashPassword } = require('./connection');
const { SEED_PATH, SEED_VERSION } = require('../config');

function readSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
}

// Khi doi phien ban seed (hoac DB rong), xoa catalog cu de nap lai tu seed-data.json.
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
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`, ['seed_version', SEED_VERSION]);
}

async function seedCategories(seed) {
  const { count } = await get('SELECT COUNT(*) AS count FROM categories');
  if (count > 0) return;
  for (const category of seed.categories || []) {
    await run('INSERT INTO categories(name, slug, image) VALUES (?, ?, ?)', [category.name, category.slug, category.image]);
  }
}

async function seedProducts(seed) {
  const { count } = await get('SELECT COUNT(*) AS count FROM products');
  if (count > 0) return;
  for (const p of seed.products || []) {
    await run(`INSERT INTO products
      (name, title, author, price, original_price, discount, image, category_slug, slug, stock, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.title || p.name, p.author, p.price, p.originalPrice || p.original_price || p.price,
        p.discount || 0, p.image, p.category || p.category_slug, p.slug, p.stock || 100, p.description || '']
    );
  }
}

async function seedUsers() {
  const { count } = await get('SELECT COUNT(*) AS count FROM users');
  if (count > 0) return;
  await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['Admin MOT', 'admin@mot.vn', '0337448886', hashPassword('123456'), 'admin']);
  await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    ['Khách hàng Demo', 'user@mot.vn', '0987654321', hashPassword('123456'), 'customer']);
}

async function seedVouchers() {
  const { count } = await get('SELECT COUNT(*) AS count FROM vouchers');
  if (count > 0) return;
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

async function seedOrders() {
  const { count } = await get('SELECT COUNT(*) AS count FROM orders');
  if (count > 0) return;
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

async function seedFeedbacks() {
  const { count } = await get('SELECT COUNT(*) AS count FROM feedbacks');
  if (count > 0) return;
  const samples = [
    ['Nguyễn Minh Châu', 'chau@example.com', '0901234567', 'Góp ý giao diện', 'Trang sản phẩm đẹp hơn rồi, mong có thêm bộ lọc theo giá.', 'new'],
    ['Hoàng An', 'an.feedback@example.com', '0912345678', 'Hỏi về đơn hàng', 'Mình muốn kiểm tra trạng thái đơn hàng và thời gian giao dự kiến.', 'read']
  ];
  for (const fb of samples) {
    await run(`INSERT INTO feedbacks(full_name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)`, fb);
  }
}

async function seedDatabase() {
  const seed = readSeed();
  await resetCatalogIfNeeded(seed);
  await seedCategories(seed);
  await seedProducts(seed);
  await seedUsers();
  await seedVouchers();
  await seedOrders();
  await seedFeedbacks();
}

module.exports = { seedDatabase };
