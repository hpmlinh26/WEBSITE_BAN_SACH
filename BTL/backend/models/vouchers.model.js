const { run, get, all } = require('../db');

function getAllVouchers() {
  return all('SELECT * FROM vouchers ORDER BY id DESC');
}

function getVoucherById(id) {
  return get('SELECT * FROM vouchers WHERE id = ?', [id]);
}

function getActiveVoucherByCode(code) {
  return get('SELECT * FROM vouchers WHERE code = ? AND active = 1', [code]);
}

async function createVoucher(payload) {
  const result = await run(`INSERT INTO vouchers(code, title, description, discount_type, discount_value, min_order, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [payload.code, payload.title, payload.description, payload.discountType, payload.discountValue, payload.minOrder, payload.active, payload.expiresAt]);
  return getVoucherById(result.id);
}

async function updateVoucher(id, payload) {
  await run(`UPDATE vouchers SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?, min_order = ?, active = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [payload.code, payload.title, payload.description, payload.discountType, payload.discountValue, payload.minOrder, payload.active, payload.expiresAt, id]);
  return getVoucherById(id);
}

function deleteVoucher(id) {
  return run('DELETE FROM vouchers WHERE id = ?', [id]);
}

module.exports = {
  getAllVouchers,
  getVoucherById,
  getActiveVoucherByCode,
  createVoucher,
  updateVoucher,
  deleteVoucher
};
