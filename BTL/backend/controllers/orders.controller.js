const ordersModel = require('../models/orders.model');
const catalogModel = require('../models/catalog.model');
const vouchersModel = require('../models/vouchers.model');
const { validateOrderPayload, toOrderResponse, toOrderItemResponse, ORDER_STATUSES } = require('../helpers');

async function listOrders(req, res) {
  const rows = await ordersModel.getOrders();
  res.json(rows.map(toOrderResponse));
}

async function getOrderDetails(req, res) {
  const order = await ordersModel.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  const items = await ordersModel.getOrderItems(req.params.id);
  res.json({ ...toOrderResponse(order), items: items.map(toOrderItemResponse) });
}

async function createOrder(req, res) {
  const payload = validateOrderPayload(req.body);
  let total = 0;
  const preparedItems = [];
  for (const item of payload.items) {
    const productId = Number(item.productId || item.product_id);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const product = await catalogModel.getProductById(productId);
    if (!product) return res.status(400).json({ message: `Không tìm thấy sản phẩm ID ${productId}.` });
    const subtotal = product.price * quantity;
    total += subtotal;
    preparedItems.push({ product, quantity, subtotal });
  }

  const voucherCode = String(req.body.voucherCode || req.body.voucher_code || '').trim().toUpperCase();
  if (voucherCode) {
    const voucher = await vouchersModel.getActiveVoucherByCode(voucherCode);
    if (voucher && total >= Number(voucher.min_order || 0)) {
      const discount = voucher.discount_type === 'percent'
        ? Math.round(total * Number(voucher.discount_value) / 100)
        : Number(voucher.discount_value);
      total = Math.max(0, total - Math.min(discount, total));
    }
  }

  const orderId = await ordersModel.createOrder(payload, total);
  for (const item of preparedItems) {
    await ordersModel.createOrderItem(orderId, item);
  }
  res.status(201).json({ id: orderId, customerName: payload.customerName, total, status: payload.status });
}

async function updateOrderStatus(req, res) {
  const status = String(req.body.status || '').trim();
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
  const result = await ordersModel.updateOrderStatus(req.params.id, status);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật trạng thái đơn hàng.' });
}

async function deleteOrder(req, res) {
  const result = await ordersModel.deleteOrder(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json({ message: 'Đã xóa đơn hàng.', id: Number(req.params.id) });
}

module.exports = {
  listOrders,
  getOrderDetails,
  createOrder,
  updateOrderStatus,
  deleteOrder
};
