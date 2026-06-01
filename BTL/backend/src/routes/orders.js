const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { ORDER_STATUSES } = require('../config');
const { toOrderResponse, toOrderItemResponse } = require('../serializers');
const { validateOrderPayload } = require('../validators');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
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

  const result = await run('INSERT INTO orders (customer_name, customer_phone, customer_email, shipping_address, payment_method, status, total) VALUES (?, ?, ?, ?, ?, ?, ?)', [payload.customerName, payload.customerPhone, payload.customerEmail, payload.shippingAddress, payload.paymentMethod, payload.status, total]);
  for (const item of preparedItems) {
    await run('INSERT INTO order_items(order_id, product_id, product_name, price, original_price, author, product_image, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [result.id, item.product.id, item.product.name, item.product.price, item.product.original_price || item.product.price, item.product.author, item.product.image, item.quantity, item.subtotal]);
    await run('UPDATE products SET stock = MAX(stock - ?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [item.quantity, item.product.id]);
  }
  res.status(201).json({ id: result.id, customerName: payload.customerName, total, status: payload.status });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
  const result = await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật trạng thái đơn hàng.' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ message: 'Đã xóa đơn hàng.', id: Number(req.params.id) });
}));

module.exports = router;
