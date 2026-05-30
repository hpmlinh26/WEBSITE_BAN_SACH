const { run, get, all } = require('../db');

function getOrders() {
  return all('SELECT * FROM orders ORDER BY id DESC');
}

function getOrderById(id) {
  return get('SELECT * FROM orders WHERE id = ?', [id]);
}

function getOrderItems(orderId) {
  return all(`SELECT oi.*, COALESCE(oi.product_image, p.image) AS image, COALESCE(oi.original_price, p.original_price, oi.price) AS original_price, COALESCE(oi.author, p.author) AS author, c.name AS category_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN categories c ON p.category_slug = c.slug WHERE oi.order_id = ? ORDER BY oi.id ASC`, [orderId]);
}

async function createOrder(payload, total) {
  const result = await run(`INSERT INTO orders (customer_name, customer_phone, customer_email, shipping_address, payment_method, status, total) VALUES (?, ?, ?, ?, ?, ?, ?)`, [payload.customerName, payload.customerPhone, payload.customerEmail, payload.shippingAddress, payload.paymentMethod, payload.status, total]);
  return result.id;
}

function createOrderItem(orderId, item) {
  return run(`INSERT INTO order_items(order_id, product_id, product_name, price, original_price, author, product_image, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [orderId, item.product.id, item.product.name, item.product.price, item.product.original_price || item.product.price, item.product.author, item.product.image, item.quantity, item.subtotal]);
}

function updateOrderStatus(id, status) {
  return run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
}

function deleteOrder(id) {
  return run('DELETE FROM orders WHERE id = ?', [id]);
}

module.exports = {
  getOrders,
  getOrderById,
  getOrderItems,
  createOrder,
  createOrderItem,
  updateOrderStatus,
  deleteOrder
};
