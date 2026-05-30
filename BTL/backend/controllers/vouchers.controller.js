const vouchersModel = require('../models/vouchers.model');
const { normalizeVoucherPayload, toVoucherResponse } = require('../helpers');

async function listVouchers(req, res) {
  const rows = await vouchersModel.getAllVouchers();
  res.json(rows.map(toVoucherResponse));
}

async function createVoucher(req, res) {
  const payload = normalizeVoucherPayload(req.body);
  const created = await vouchersModel.createVoucher(payload);
  res.status(201).json(toVoucherResponse(created));
}

async function updateVoucher(req, res) {
  const existing = await vouchersModel.getVoucherById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  const payload = normalizeVoucherPayload(req.body);
  const updated = await vouchersModel.updateVoucher(req.params.id, payload);
  res.json(toVoucherResponse(updated));
}

async function deleteVoucher(req, res) {
  const result = await vouchersModel.deleteVoucher(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy voucher.' });
  res.json({ message: 'Đã xóa voucher.', id: Number(req.params.id) });
}

async function applyVoucher(req, res) {
  const code = String(req.body.code || '').trim().toUpperCase();
  const total = Number(req.body.total || 0);
  const v = await vouchersModel.getActiveVoucherByCode(code);
  if (!v) return res.status(404).json({ message: 'Mã khuyến mãi không tồn tại hoặc đã tắt.' });
  if (v.expires_at && new Date(v.expires_at + 'T23:59:59') < new Date()) return res.status(400).json({ message: 'Voucher đã hết hạn.' });
  if (total < Number(v.min_order || 0)) return res.status(400).json({ message: `Đơn hàng cần tối thiểu ${Number(v.min_order).toLocaleString('vi-VN')}đ.` });
  const discount = v.discount_type === 'percent' ? Math.round(total * Number(v.discount_value) / 100) : Number(v.discount_value);
  res.json({ ...toVoucherResponse(v), discount: Math.min(discount, total) });
}

module.exports = {
  listVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  applyVoucher
};
