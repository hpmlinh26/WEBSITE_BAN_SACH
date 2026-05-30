const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDatabase, run, get, all, hashPassword, DB_PATH } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// Frontend production build (Vite): BTL/dist. Khi dev dung `npm run dev` (Vite o cong 5173).
const DIST_DIR = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const ORDER_STATUSES = ['pending', 'packing', 'shipping', 'completed', 'return', 'cancelled'];

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function makeSlug(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
}

function normalizeAssetPath(value, fallback = 'assets/images/placeholder-cover.svg') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:|data:|assets\/)/i.test(raw)) return raw;
  if (/^sach-\d+\./i.test(raw)) return `assets/products/${raw}`;
  return `assets/images/${raw}`;
}

function assertRequired(value, message) {
  if (!String(value || '').trim()) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

function toProductResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title || row.name,
    author: row.author,
    price: row.price,
    originalPrice: row.original_price,
    discount: row.discount,
    image: row.image,
    category: row.category_slug,
    categoryName: row.category_name,
    slug: row.slug,
    stock: row.stock,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toUserResponse(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toVoucherResponse(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrder: row.min_order,
    active: Boolean(row.active),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toOrderResponse(row) {
  return {
    id: row.id,
    customer: row.customer_name,
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    status: row.status,
    total: row.total,
    date: String(row.created_at || '').slice(0, 10),
    createdAt: row.created_at
  };
}

function toOrderItemResponse(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    name: row.product_name,
    price: row.price,
    originalPrice: row.original_price || row.price,
    quantity: row.quantity,
    subtotal: row.subtotal,
    author: row.author || 'MOT Store',
    image: row.image || row.product_image || 'assets/images/placeholder-cover.svg',
    categoryName: row.category_name || 'Manga'
  };
}

function normalizeCategoryPayload(body) {
  const name = String(body.name || '').trim();
  const slug = makeSlug(body.slug || name);
  const image = normalizeAssetPath(body.image, 'assets/images/placeholder-cover.svg');
  assertRequired(name, 'Tên danh mục không được để trống.');
  return { name, slug, image };
}

function normalizeProductPayload(body) {
  const name = String(body.name || body.title || '').trim();
  const author = String(body.author || '').trim();
  const price = Number(body.price || 0);
  const originalPrice = Number(body.originalPrice || body.original_price || price || 0);
  const category = String(body.category || body.category_slug || '').trim() || null;
  const image = normalizeAssetPath(body.image, 'assets/images/placeholder-cover.svg');
  const discount = Number(body.discount || 0);
  const stock = Number(body.stock || 100);
  const description = String(body.description || '').trim();
  const slug = makeSlug(body.slug || name);
  assertRequired(name, 'Tên sản phẩm không được để trống.');
  assertRequired(author, 'Tác giả/nhà xuất bản không được để trống.');
  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error('Giá sản phẩm phải lớn hơn 0.');
    error.status = 400;
    throw error;
  }
  return { name, title: name, author, price, originalPrice, discount, image, category, slug, stock, description };
}

function normalizeUserPayload(body, isUpdate = false) {
  const fullName = String(body.fullName || body.full_name || body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase() || null;
  const phone = String(body.phone || '').trim() || null;
  const password = String(body.password || '').trim();
  const role = ['admin', 'customer'].includes(String(body.role || '').trim()) ? String(body.role).trim() : 'customer';
  assertRequired(fullName, 'Họ tên tài khoản không được để trống.');
  if (!email && !phone) {
    const error = new Error('Tài khoản cần có email hoặc số điện thoại.');
    error.status = 400;
    throw error;
  }
  if (!isUpdate && !password) {
    const error = new Error('Mật khẩu không được để trống khi tạo tài khoản.');
    error.status = 400;
    throw error;
  }
  return { fullName, email, phone, password, role };
}

function normalizeVoucherPayload(body) {
  const code = String(body.code || '').trim().toUpperCase();
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const discountType = ['amount', 'percent'].includes(body.discountType || body.discount_type) ? (body.discountType || body.discount_type) : 'amount';
  const discountValue = Math.max(0, Number(body.discountValue || body.discount_value || 0));
  const minOrder = Math.max(0, Number(body.minOrder || body.min_order || 0));
  const active = body.active === false || body.active === 0 || body.active === '0' ? 0 : 1;
  const expiresAt = String(body.expiresAt || body.expires_at || '').trim() || null;
  assertRequired(code, 'Mã voucher không được để trống.');
  assertRequired(title, 'Tên voucher không được để trống.');
  if (!discountValue) {
    const error = new Error('Giá trị giảm giá phải lớn hơn 0.');
    error.status = 400;
    throw error;
  }
  return { code, title, description, discountType, discountValue, minOrder, active, expiresAt };
}

function validateOrderPayload(body) {
  const customerName = String(body.customerName || body.customer_name || '').trim();
  const customerPhone = String(body.customerPhone || body.customer_phone || '').trim();
  const customerEmail = String(body.customerEmail || body.customer_email || '').trim();
  const shippingAddress = String(body.shippingAddress || body.shipping_address || '').trim();
  const paymentMethod = String(body.paymentMethod || body.payment_method || 'cod').trim();
  const status = ORDER_STATUSES.includes(String(body.status || '').trim()) ? String(body.status).trim() : 'pending';
  const items = Array.isArray(body.items) ? body.items : [];
  assertRequired(customerName, 'Vui lòng nhập họ tên người nhận.');
  assertRequired(customerPhone, 'Vui lòng nhập số điện thoại người nhận.');
  assertRequired(shippingAddress, 'Vui lòng nhập đầy đủ địa chỉ giao hàng.');
  if (!/^[0-9]{9,11}$/.test(customerPhone.replace(/\s+/g, ''))) {
    const error = new Error('Số điện thoại phải gồm 9-11 chữ số.');
    error.status = 400;
    throw error;
  }
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    const error = new Error('Email không hợp lệ.');
    error.status = 400;
    throw error;
  }
  if (!items.length) {
    const error = new Error('Đơn hàng cần có ít nhất một sản phẩm.');
    error.status = 400;
    throw error;
  }
  return { customerName, customerPhone, customerEmail, shippingAddress, paymentMethod, status, items };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend MOT.vn đang chạy', database: DB_PATH, time: new Date().toISOString() });
});

// Categories
app.get('/api/categories', asyncHandler(async (req, res) => {
  res.json(await all('SELECT id, name, slug, image FROM categories ORDER BY id ASC'));
}));
app.post('/api/categories', asyncHandler(async (req, res) => {
  const c = normalizeCategoryPayload(req.body);
  const result = await run('INSERT INTO categories(name, slug, image) VALUES (?, ?, ?)', [c.name, c.slug, c.image]);
  res.status(201).json(await get('SELECT id, name, slug, image FROM categories WHERE id = ?', [result.id]));
}));
app.put('/api/categories/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  const c = normalizeCategoryPayload(req.body);
  await run('UPDATE categories SET name = ?, slug = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [c.name, c.slug, c.image, req.params.id]);
  res.json(await get('SELECT id, name, slug, image FROM categories WHERE id = ?', [req.params.id]));
}));
app.delete('/api/categories/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  await run('UPDATE products SET category_slug = NULL WHERE category_slug = ?', [exists.slug]);
  const result = await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa danh mục.', id: Number(req.params.id), changes: result.changes });
}));

// Products
app.get('/api/products', asyncHandler(async (req, res) => {
  const { search = '', category = '', limit = '', page = '1' } = req.query;
  const where = [];
  const params = [];
  if (search) { where.push('(p.name LIKE ? OR p.author LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (category) { where.push('p.category_slug = ?'); params.push(category); }
  let sql = `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY p.id ASC';
  const numericLimit = Number(limit);
  if (Number.isFinite(numericLimit) && numericLimit > 0) {
    const numericPage = Math.max(1, Number(page) || 1);
    sql += ' LIMIT ? OFFSET ?';
    params.push(numericLimit, (numericPage - 1) * numericLimit);
  }
  const rows = await all(sql, params);
  res.json(rows.map(toProductResponse));
}));
app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const row = await get(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug WHERE p.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json(toProductResponse(row));
}));
app.post('/api/products', asyncHandler(async (req, res) => {
  const p = normalizeProductPayload(req.body);
  const result = await run(`INSERT INTO products (name, title, author, price, original_price, discount, image, category_slug, slug, stock, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [p.name, p.title, p.author, p.price, p.originalPrice, p.discount, p.image, p.category, p.slug, p.stock, p.description]);
  const created = await get('SELECT * FROM products WHERE id = ?', [result.id]);
  res.status(201).json(toProductResponse(created));
}));
app.put('/api/products/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT id FROM products WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  const p = normalizeProductPayload(req.body);
  await run(`UPDATE products SET name = ?, title = ?, author = ?, price = ?, original_price = ?, discount = ?, image = ?, category_slug = ?, slug = ?, stock = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [p.name, p.title, p.author, p.price, p.originalPrice, p.discount, p.image, p.category, p.slug, p.stock, p.description, req.params.id]);
  const updated = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(toProductResponse(updated));
}));
app.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json({ message: 'Đã xóa sản phẩm.', id: Number(req.params.id) });
}));

// Users/Auth
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const user = normalizeUserPayload(req.body);
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [user.fullName, user.email, user.phone, hashPassword(user.password), 'customer']);
  res.status(201).json({ id: result.id, fullName: user.fullName, email: user.email, phone: user.phone, role: 'customer' });
}));
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.phone || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const user = await get('SELECT id, full_name, email, phone, role, password_hash FROM users WHERE lower(email) = ? OR phone = ?', [account, account]);
  if (!user || user.password_hash !== hashPassword(password)) return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không đúng.' });
  res.json(toUserResponse(user));
}));
app.get('/api/users', asyncHandler(async (req, res) => {
  const rows = await all('SELECT id, full_name, email, phone, role, created_at, updated_at FROM users ORDER BY id DESC');
  res.json(rows.map(toUserResponse));
}));
app.post('/api/users', asyncHandler(async (req, res) => {
  const u = normalizeUserPayload(req.body);
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [u.fullName, u.email, u.phone, hashPassword(u.password), u.role]);
  const created = await get('SELECT id, full_name, email, phone, role, created_at, updated_at FROM users WHERE id = ?', [result.id]);
  res.status(201).json(toUserResponse(created));
}));
app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  const u = normalizeUserPayload(req.body, true);
  if (u.password) {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, hashPassword(u.password), req.params.id]);
  } else {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, req.params.id]);
  }
  const updated = await get('SELECT id, full_name, email, phone, role, created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
  res.json(toUserResponse(updated));
}));
app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
  const target = await get('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  if (target.role === 'admin' && adminCount.count <= 1) return res.status(400).json({ message: 'Không thể xóa tài khoản admin cuối cùng.' });
  const result = await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa tài khoản.', id: Number(req.params.id), changes: result.changes });
}));

// Cart
app.get('/api/cart/:userId', asyncHandler(async (req, res) => {
  const rows = await all(`SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, p.name, p.author, p.price, p.original_price, p.image FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? ORDER BY ci.id DESC`, [req.params.userId]);
  const items = rows.map(row => ({ id: row.id, userId: row.user_id, productId: row.product_id, quantity: row.quantity, name: row.name, author: row.author, price: row.price, originalPrice: row.original_price, image: row.image, subtotal: row.price * row.quantity }));
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
}));
app.post('/api/cart', asyncHandler(async (req, res) => {
  const userId = Number(req.body.userId || req.body.user_id);
  const productId = Number(req.body.productId || req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  if (!userId || !productId) return res.status(400).json({ message: 'Thiếu userId hoặc productId.' });
  await run(`INSERT INTO cart_items(user_id, product_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP`, [userId, productId, quantity]);
  res.status(201).json({ message: 'Đã thêm vào giỏ hàng.' });
}));
app.patch('/api/cart/:id', asyncHandler(async (req, res) => {
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  const result = await run('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [quantity, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã cập nhật giỏ hàng.' });
}));
app.delete('/api/cart/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM cart_items WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã xóa khỏi giỏ hàng.' });
}));
app.delete('/api/cart/by-user/:userId', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM cart_items WHERE user_id = ?', [req.params.userId]);
  res.json({ message: 'Đã làm trống giỏ hàng.', changes: result.changes });
}));

// Orders
app.get('/api/orders', asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM orders ORDER BY id DESC');
  res.json(rows.map(toOrderResponse));
}));
app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  const items = await all(`SELECT oi.*, COALESCE(oi.product_image, p.image) AS image, COALESCE(oi.original_price, p.original_price, oi.price) AS original_price, COALESCE(oi.author, p.author) AS author, c.name AS category_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN categories c ON p.category_slug = c.slug WHERE oi.order_id = ? ORDER BY oi.id ASC`, [req.params.id]);
  res.json({ ...toOrderResponse(order), items: items.map(toOrderItemResponse) });
}));
app.post('/api/orders', asyncHandler(async (req, res) => {
  const payload = validateOrderPayload(req.body);
  let total = 0;
  const preparedItems = [];
  for (const item of payload.items) {
    const productId = Number(item.productId || item.product_id);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const product = await get('SELECT id, name, author, price, original_price, image, stock FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(400).json({ message: `Không tìm thấy sản phẩm ID ${productId}.` });
    if (Number(product.stock || 0) < quantity) return res.status(400).json({ message: `Sản phẩm ${product.name} chỉ còn ${product.stock} trong kho.` });
    const subtotal = product.price * quantity;
    total += subtotal;
    preparedItems.push({ product, quantity, subtotal });
  }
  const voucherCode = String(req.body.voucherCode || req.body.voucher_code || '').trim().toUpperCase();
  if (voucherCode) {
    const voucher = await get('SELECT * FROM vouchers WHERE code = ? AND active = 1', [voucherCode]);
    if (voucher && total >= Number(voucher.min_order || 0)) {
      const discount = voucher.discount_type === 'percent' ? Math.round(total * Number(voucher.discount_value) / 100) : Number(voucher.discount_value);
      total = Math.max(0, total - Math.min(discount, total));
    }
  }

  const result = await run(`INSERT INTO orders (customer_name, customer_phone, customer_email, shipping_address, payment_method, status, total) VALUES (?, ?, ?, ?, ?, ?, ?)`, [payload.customerName, payload.customerPhone, payload.customerEmail, payload.shippingAddress, payload.paymentMethod, payload.status, total]);
  for (const item of preparedItems) {
    await run(`INSERT INTO order_items(order_id, product_id, product_name, price, original_price, author, product_image, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.id, item.product.id, item.product.name, item.product.price, item.product.original_price || item.product.price, item.product.author, item.product.image, item.quantity, item.subtotal]);
    await run('UPDATE products SET stock = MAX(stock - ?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.quantity, item.product.id]);
  }
  res.status(201).json({ id: result.id, customerName: payload.customerName, total, status: payload.status });
}));
app.patch('/api/orders/:id/status', asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
  const result = await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật trạng thái đơn hàng.' });
}));
app.delete('/api/orders/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ message: 'Đã xóa đơn hàng.', id: Number(req.params.id) });
}));

// Vouchers
app.get('/api/vouchers', asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM vouchers ORDER BY id DESC');
  res.json(rows.map(toVoucherResponse));
}));
app.post('/api/vouchers', asyncHandler(async (req, res) => {
  const v = normalizeVoucherPayload(req.body);
  const result = await run(`INSERT INTO vouchers(code, title, description, discount_type, discount_value, min_order, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [v.code, v.title, v.description, v.discountType, v.discountValue, v.minOrder, v.active, v.expiresAt]);
  const created = await get('SELECT * FROM vouchers WHERE id = ?', [result.id]);
  res.status(201).json(toVoucherResponse(created));
}));
app.put('/api/vouchers/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT id FROM vouchers WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  const v = normalizeVoucherPayload(req.body);
  await run(`UPDATE vouchers SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?, min_order = ?, active = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [v.code, v.title, v.description, v.discountType, v.discountValue, v.minOrder, v.active, v.expiresAt, req.params.id]);
  const updated = await get('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
  res.json(toVoucherResponse(updated));
}));
app.delete('/api/vouchers/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  res.json({ message: 'Đã xóa voucher.', id: Number(req.params.id) });
}));
app.post('/api/vouchers/apply', asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const total = Number(req.body.total || 0);
  const v = await get('SELECT * FROM vouchers WHERE code = ? AND active = 1', [code]);
  if (!v) return res.status(404).json({ message: 'Mã khuyến mãi không tồn tại hoặc đã tắt.' });
  if (v.expires_at && new Date(v.expires_at + 'T23:59:59') < new Date()) return res.status(400).json({ message: 'Voucher đã hết hạn.' });
  if (total < Number(v.min_order || 0)) return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${Number(v.min_order).toLocaleString('vi-VN')}đ.` });
  const discount = v.discount_type === 'percent' ? Math.round(total * Number(v.discount_value) / 100) : Number(v.discount_value);
  res.json({ ...toVoucherResponse(v), discount: Math.min(discount, total) });
}));

// Feedbacks
app.get('/api/feedbacks', asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM feedbacks ORDER BY id DESC');
  res.json(rows.map(row => ({ id: row.id, fullName: row.full_name, email: row.email, phone: row.phone, subject: row.subject, message: row.message, status: row.status, createdAt: row.created_at, date: String(row.created_at || '').slice(0, 10) })));
}));
app.post('/api/feedbacks', asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || req.body.full_name || req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const subject = String(req.body.subject || 'Phản hồi của khách hàng').trim();
  const message = String(req.body.message || '').trim();
  if (!fullName || !message) return res.status(400).json({ message: 'Vui lòng nhập họ tên và nội dung phản hồi.' });
  const result = await run('INSERT INTO feedbacks(full_name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, phone, subject, message, 'new']);
  res.status(201).json({ id: result.id, fullName, email, phone, subject, message, status: 'new' });
}));
app.patch('/api/feedbacks/:id/status', asyncHandler(async (req, res) => {
  const status = String(req.body.status || 'read').trim();
  const allowed = ['new', 'read', 'replied'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Trạng thái phản hồi không hợp lệ.' });
  const result = await run('UPDATE feedbacks SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy phản hồi.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật phản hồi.' });
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/backend')) return res.status(403).send('Forbidden');
  next();
});
// Phuc vu frontend da build (no-op neu thu muc dist chua ton tai).
// Asset (anh, JS/CSS da hash) cache lau de bot tai lai; HTML luon revalidate.
app.use(
  express.static(DIST_DIR, {
    maxAge: '1d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);
app.get('/', (req, res) => {
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res
    .status(200)
    .send(
      '<h1>MOT backend đang chạy</h1>' +
        '<p>Frontend chưa được build. Khi phát triển: chạy <code>npm run dev</code> trong thư mục BTL ' +
        '(Vite tại <a href="http://localhost:5173">http://localhost:5173</a>). ' +
        'Khi triển khai: chạy <code>npm run build</code> rồi mở <a href="/">http://localhost:3000</a>.</p>'
    );
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Lỗi server. Vui lòng kiểm tra terminal.' : err.message;
  res.status(status).json({ message });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('========================================');
    console.log(`MOT.vn backend is running: http://localhost:${PORT}`);
    console.log(`API health check:        http://localhost:${PORT}/api/health`);
    console.log(`Products API:            http://localhost:${PORT}/api/products`);
    console.log(`SQLite database:         ${DB_PATH}`);
    console.log('========================================');
  });
}).catch(error => {
  console.error('Không khởi động được database:', error);
  process.exit(1);
});
