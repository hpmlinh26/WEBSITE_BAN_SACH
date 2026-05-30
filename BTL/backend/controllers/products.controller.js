const productsModel = require('../models/products.model');
const { normalizeProductPayload, toProductResponse } = require('../helpers');

async function listProducts(req, res) {
  const rows = await productsModel.getProducts(req.query);
  res.json(rows.map(toProductResponse));
}

async function getProduct(req, res) {
  const row = await productsModel.getProductById(req.params.id);
  if (!row) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json(toProductResponse(row));
}

async function createProduct(req, res) {
  const payload = normalizeProductPayload(req.body);
  const created = await productsModel.createProduct(payload);
  res.status(201).json(toProductResponse(created));
}

async function updateProduct(req, res) {
  const existing = await productsModel.getProductById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  const payload = normalizeProductPayload(req.body);
  const updated = await productsModel.updateProduct(req.params.id, payload);
  res.json(toProductResponse(updated));
}

async function deleteProduct(req, res) {
  const result = await productsModel.deleteProduct(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json({ message: 'Đã xóa sản phẩm.', id: Number(req.params.id) });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
