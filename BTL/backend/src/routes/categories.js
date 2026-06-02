const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { normalizeCategoryPayload } = require('../validators');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await all('SELECT id, name, slug, image FROM categories ORDER BY id ASC'));
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const c = normalizeCategoryPayload(req.body);
  const result = await run('INSERT INTO categories(name, slug, image) VALUES (?, ?, ?)', [c.name, c.slug, c.image]);
  res.status(201).json(await get('SELECT id, name, slug, image FROM categories WHERE id = ?', [result.id]));
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  const c = normalizeCategoryPayload(req.body);
  await run('UPDATE categories SET name = ?, slug = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [c.name, c.slug, c.image, req.params.id]);
  res.json(await get('SELECT id, name, slug, image FROM categories WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  await run('UPDATE products SET category_slug = NULL WHERE category_slug = ?', [exists.slug]);
  const result = await run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa danh mục.', id: Number(req.params.id), changes: result.changes });
}));

module.exports = router;
