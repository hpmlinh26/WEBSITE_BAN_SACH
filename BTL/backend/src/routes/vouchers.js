const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { toVoucherResponse } = require('../serializers');
const { normalizeVoucherPayload } = require('../validators');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 0);
  const page = Math.max(1, Number(req.query.page || 1));
  if (limit) {
    const { count } = await get('SELECT COUNT(*) AS count FROM vouchers');
    const rows = await all('SELECT * FROM vouchers ORDER BY id DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
    return res.json({ data: rows.map(toVoucherResponse), total: count, page, totalPages: Math.ceil(count / limit) });
  }
  const rows = await all('SELECT * FROM vouchers ORDER BY id DESC');
  res.json(rows.map(toVoucherResponse));
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const v = normalizeVoucherPayload(req.body);
  const result = await run('INSERT INTO vouchers(code, title, description, discount_type, discount_value, min_order, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [v.code, v.title, v.description, v.discountType, v.discountValue, v.minOrder, v.active, v.expiresAt]);
  const created = await get('SELECT * FROM vouchers WHERE id = ?', [result.id]);
  res.status(201).json(toVoucherResponse(created));
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const exists = await get('SELECT id FROM vouchers WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  const v = normalizeVoucherPayload(req.body);
  await run('UPDATE vouchers SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?, min_order = ?, active = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [v.code, v.title, v.description, v.discountType, v.discountValue, v.minOrder, v.active, v.expiresAt, req.params.id]);
  const updated = await get('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
  res.json(toVoucherResponse(updated));
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  res.json({ message: 'Đã xóa voucher.', id: Number(req.params.id) });
}));

router.post('/apply', asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const total = Number(req.body.total || 0);
  const v = await get('SELECT * FROM vouchers WHERE code = ? AND active = 1', [code]);
  if (!v) return res.status(404).json({ message: 'Mã khuyến mãi không tồn tại hoặc đã tắt.' });
  if (v.expires_at && new Date(v.expires_at + 'T23:59:59') < new Date()) return res.status(400).json({ message: 'Voucher đã hết hạn.' });
  if (total < Number(v.min_order || 0)) return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${Number(v.min_order).toLocaleString('vi-VN')}đ.` });
  const discount = v.discount_type === 'percent' ? Math.round(total * Number(v.discount_value) / 100) : Number(v.discount_value);
  res.json({ ...toVoucherResponse(v), discount: Math.min(discount, total) });
}));

module.exports = router;
