const categoriesModel = require('../models/categories.model');
const { normalizeCategoryPayload } = require('../helpers');

async function listCategories(req, res) {
  res.json(await categoriesModel.getAllCategories());
}

async function createCategory(req, res) {
  const payload = normalizeCategoryPayload(req.body);
  const created = await categoriesModel.createCategory(payload);
  res.status(201).json(created);
}

async function updateCategory(req, res) {
  const existing = await categoriesModel.getCategoryRow(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  const payload = normalizeCategoryPayload(req.body);
  const updated = await categoriesModel.updateCategory(req.params.id, payload);
  res.json(updated);
}

async function deleteCategory(req, res) {
  const existing = await categoriesModel.getCategoryRow(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
  await categoriesModel.clearProductsCategory(existing.slug);
  const result = await categoriesModel.deleteCategory(req.params.id);
  res.json({ message: 'Đã xóa danh mục.', id: Number(req.params.id), changes: result.changes });
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
