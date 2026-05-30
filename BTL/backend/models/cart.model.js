const { run, all } = require('../db');

function getCartItemsByUserId(userId) {
  return all(`SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, p.name, p.author, p.price, p.original_price, p.image FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ? ORDER BY ci.id DESC`, [userId]);
}

function addCartItem(userId, productId, quantity) {
  return run(`INSERT INTO cart_items(user_id, product_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP`, [userId, productId, quantity]);
}

function updateCartItem(id, quantity) {
  return run('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [quantity, id]);
}

function deleteCartItem(id) {
  return run('DELETE FROM cart_items WHERE id = ?', [id]);
}

function deleteCartItemsByUser(userId) {
  return run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

module.exports = {
  getCartItemsByUserId,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  deleteCartItemsByUser
};
