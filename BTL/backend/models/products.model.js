const { run, get, all } = require('../db');

function getProducts(filters) {
  const { search = '', category = '', limit = '', page = '1' } = filters || {};
  const where = [];
  const params = [];
  if (search) {
    where.push('(p.name LIKE ? OR p.author LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('p.category_slug = ?');
    params.push(category);
  }
  let sql = `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY p.id ASC';
  const numericLimit = Number(limit);
  if (Number.isFinite(numericLimit) && numericLimit > 0) {
    const numericPage = Math.max(1, Number(page) || 1);
    sql += ' LIMIT ? OFFSET ?';
    params.push(numericLimit, (numericPage - 1) * numericLimit);
  }
  return all(sql, params);
}

function getProductById(id) {
  return get('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_slug = c.slug WHERE p.id = ?', [id]);
}

async function createProduct(payload) {
  const result = await run(`INSERT INTO products (name, title, author, price, original_price, discount, image, category_slug, slug, stock, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [payload.name, payload.title, payload.author, payload.price, payload.originalPrice, payload.discount, payload.image, payload.category, payload.slug, payload.stock, payload.description]);
  return get('SELECT * FROM products WHERE id = ?', [result.id]);
}

async function updateProduct(id, payload) {
  await run(`UPDATE products SET name = ?, title = ?, author = ?, price = ?, original_price = ?, discount = ?, image = ?, category_slug = ?, slug = ?, stock = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [payload.name, payload.title, payload.author, payload.price, payload.originalPrice, payload.discount, payload.image, payload.category, payload.slug, payload.stock, payload.description, id]);
  return get('SELECT * FROM products WHERE id = ?', [id]);
}

function deleteProduct(id) {
  return run('DELETE FROM products WHERE id = ?', [id]);
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
