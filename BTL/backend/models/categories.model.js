const { run, get, all } = require('../db');

function getAllCategories() {
  return all('SELECT id, name, slug, image FROM categories ORDER BY id ASC');
}

function getCategoryRow(id) {
  return get('SELECT * FROM categories WHERE id = ?', [id]);
}

function getCategoryById(id) {
  return get('SELECT id, name, slug, image FROM categories WHERE id = ?', [id]);
}

async function createCategory(payload) {
  const result = await run('INSERT INTO categories(name, slug, image) VALUES (?, ?, ?)', [payload.name, payload.slug, payload.image]);
  return getCategoryById(result.id);
}

async function updateCategory(id, payload) {
  await run('UPDATE categories SET name = ?, slug = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payload.name, payload.slug, payload.image, id]);
  return getCategoryById(id);
}

function clearProductsCategory(slug) {
  return run('UPDATE products SET category_slug = NULL WHERE category_slug = ?', [slug]);
}

function deleteCategory(id) {
  return run('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = {
  getAllCategories,
  getCategoryRow,
  getCategoryById,
  createCategory,
  updateCategory,
  clearProductsCategory,
  deleteCategory
};
