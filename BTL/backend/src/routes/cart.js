const express = require('express');
const { run, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { toCartItemResponse } = require('../serializers');

const router = express.Router();

router.get('/:userId', asyncHandler(async (req, res) => {
  const rows = await all('SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, p.name, p.author, p.price, p.original_price, p.image FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? ORDER BY ci.id DESC', [req.params.userId]);
  const items = rows.map(toCartItemResponse);
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const userId = Number(req.body.userId || req.body.user_id);
  const productId = Number(req.body.productId || req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  if (!userId || !productId) return res.status(400).json({ message: 'Thiếu userId hoặc productId.' });
  await run('INSERT INTO cart_items(user_id, product_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP', [userId, productId, quantity]);
  res.status(201).json({ message: 'Đã thêm vào giỏ hàng.' });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  const result = await run('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [quantity, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã cập nhật giỏ hàng.' });
}));

router.delete('/by-user/:userId', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM cart_items WHERE user_id = ?', [req.params.userId]);
  res.json({ message: 'Đã làm trống giỏ hàng.', changes: result.changes });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM cart_items WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã xóa khỏi giỏ hàng.' });
}));

module.exports = router;
