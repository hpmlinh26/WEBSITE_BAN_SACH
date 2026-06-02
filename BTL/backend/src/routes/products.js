const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { toProductResponse } = require('../serializers');
const { normalizeProductPayload } = require('../validators');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { search = '', category = '', limit = '', page = '1' } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('(p.name LIKE ? OR p.author LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('p.category_slug = ?');
    params.push(category);
  }
  let sql = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug';
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

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await get('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug WHERE p.id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json(toProductResponse(row));
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const p = normalizeProductPayload(req.body);
  const result = await run('INSERT INTO products (name, title, author, price, original_price, discount, image, category_slug, slug, stock, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [p.name, p.title, p.author, p.price, p.originalPrice, p.discount, p.image, p.category, p.slug, p.stock, p.description]);
  const created = await get('SELECT * FROM products WHERE id = ?', [result.id]);
  res.status(201).json(toProductResponse(created));
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const exists = await get('SELECT id FROM products WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  const p = normalizeProductPayload(req.body);
  await run('UPDATE products SET name = ?, title = ?, author = ?, price = ?, original_price = ?, discount = ?, image = ?, category_slug = ?, slug = ?, stock = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [p.name, p.title, p.author, p.price, p.originalPrice, p.discount, p.image, p.category, p.slug, p.stock, p.description, req.params.id]);
  const updated = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(toProductResponse(updated));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json({ message: 'Đã xóa sản phẩm.', id: Number(req.params.id) });
}));

module.exports = router;
