const cartModel = require('../models/cart.model');

async function getCart(req, res) {
  const rows = await cartModel.getCartItemsByUserId(req.params.userId);
  const items = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    name: row.name,
    author: row.author,
    price: row.price,
    originalPrice: row.original_price,
    image: row.image,
    subtotal: row.price * row.quantity
  }));
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
}

async function addToCart(req, res) {
  const userId = Number(req.body.userId || req.body.user_id);
  const productId = Number(req.body.productId || req.body.product_id);
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  if (!userId || !productId) return res.status(400).json({ message: 'Thiếu userId hoặc productId.' });
  await cartModel.addCartItem(userId, productId, quantity);
  res.status(201).json({ message: 'Đã thêm vào giỏ hàng.' });
}

async function updateCartItem(req, res) {
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  const result = await cartModel.updateCartItem(req.params.id, quantity);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã cập nhật giỏ hàng.' });
}

async function deleteCartItem(req, res) {
  const result = await cartModel.deleteCartItem(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  res.json({ message: 'Đã xóa khỏi giỏ hàng.' });
}

async function clearCart(req, res) {
  const result = await cartModel.deleteCartItemsByUser(req.params.userId);
  res.json({ message: 'Đã làm trống giỏ hàng.', changes: result.changes });
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  clearCart
};
