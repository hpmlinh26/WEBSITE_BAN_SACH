const { get } = require('../db');

function getProductById(id) {
  return get('SELECT id, name, author, price, original_price, image FROM products WHERE id = ?', [id]);
}

module.exports = { getProductById };
