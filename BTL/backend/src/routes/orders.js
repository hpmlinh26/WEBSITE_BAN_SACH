const express = require('express');
const { run, get, all, transaction } = require('../db');
const { asyncHandler } = require('../lib/http');
const { ORDER_STATUSES } = require('../config');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { can } = require('../db/permissions');
const { toOrderResponse, toOrderItemResponse } = require('../serializers');
const { validateOrderPayload } = require('../validators');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId || req.query.user_id || 0);
  const limit = Number(req.query.limit || 0);
  const page = Math.max(1, Number(req.query.page || 1));

  if (userId) {
    if (Number(req.user.id) !== userId && !can(req.user.role, 'orders', 'view')) return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này.' });
    const user = await get('SELECT id, email, phone FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    const where = ['user_id = ?'];
    const params = [userId];
    if (user.email) {
      where.push('(user_id IS NULL AND customer_email = ?)');
      params.push(user.email);
    }
    if (user.phone) {
      where.push('(user_id IS NULL AND customer_phone = ?)');
      params.push(user.phone);
    }
    const rows = await all(`SELECT * FROM orders WHERE ${where.join(' OR ')} ORDER BY id DESC`, params);
    if (!limit) return res.json(rows.map(toOrderResponse));
    const total = rows.length;
    const data = rows.slice((page - 1) * limit, page * limit).map(toOrderResponse);
    return res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  }

  if (!can(req.user.role, 'orders', 'view')) return res.status(403).json({ message: 'Bạn không có quyền xem toàn bộ đơn hàng.' });

  if (limit) {
    const { count } = await get('SELECT COUNT(*) AS count FROM orders');
    const rows = await all('SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
    return res.json({ data: rows.map(toOrderResponse), total: count, page, totalPages: Math.ceil(count / limit) });
  }

  const rows = await all('SELECT * FROM orders ORDER BY id DESC');
  res.json(rows.map(toOrderResponse));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  const items = await all('SELECT oi.*, COALESCE(oi.product_image, p.image) AS image, COALESCE(oi.original_price, p.original_price, oi.price) AS original_price, COALESCE(oi.author, p.author) AS author, c.name AS category_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN categories c ON p.category_slug = c.slug WHERE oi.order_id = ? ORDER BY oi.id ASC', [req.params.id]);
  res.json({ ...toOrderResponse(order), items: items.map(toOrderItemResponse) });
}));

router.post('/', asyncHandler(async (req, res) => {
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

  const orderId = await transaction(async () => {
    const result = await run('INSERT INTO orders (user_id, customer_name, customer_phone, customer_email, shipping_address, payment_method, status, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [payload.userId, payload.customerName, payload.customerPhone, payload.customerEmail, payload.shippingAddress, payload.paymentMethod, payload.status, total]);
    for (const item of preparedItems) {
      await run('INSERT INTO order_items(order_id, product_id, product_name, price, original_price, author, product_image, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [result.id, item.product.id, item.product.name, item.product.price, item.product.original_price || item.product.price, item.product.author, item.product.image, item.quantity, item.subtotal]);
      await run('UPDATE products SET stock = MAX(stock - ?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.quantity, item.product.id]);
    }
    return result.id;
  });
  res.status(201).json({ id: orderId, customerName: payload.customerName, total, status: payload.status });
}));

router.patch('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  if (Number(order.user_id) !== Number(req.user.id) && !can(req.user.role, 'orders', 'edit')) {
    return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này.' });
  }
  if (!['pending', 'packing'].includes(order.status)) {
    return res.status(400).json({ message: 'Chỉ có thể hủy đơn khi đang chờ lấy hàng hoặc đang chuẩn bị.' });
  }
  const items = await all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  await transaction(async () => {
    for (const item of items) {
      if (item.product_id) {
        await run('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
    await run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId]);
  });
  res.json({ id: orderId, status: 'cancelled', message: 'Đã hủy đơn hàng.' });
}));

router.patch('/:id/status', requireAuth, requirePermission('orders', 'edit'), asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
  const result = await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật trạng thái đơn hàng.' });
}));

router.delete('/:id', requireAuth, requirePermission('orders', 'delete'), asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ message: 'Đã xóa đơn hàng.', id: Number(req.params.id) });
}));

module.exports = router;
