const crypto = require('crypto');
const express = require('express');
const { get, run } = require('../db');
const { asyncHandler } = require('../lib/http');
const { MOMO, APP_BASE_URL } = require('../config');
const momo = require('../lib/momo');

const router = express.Router();

// Build URL trang hoa don kem trang thai thanh toan de redirect nguoi dung ve.
function invoiceRedirect(orderDbId, paid) {
  return `${MOMO.invoicePath}?orderId=${orderDbId}&payment=${paid ? 'success' : 'failed'}`;
}

// Khach bam "Thanh toan MoMo" -> tao giao dich, tra ve payUrl de frontend redirect sang MoMo.
router.post('/momo/create', asyncHandler(async (req, res) => {
  const orderDbId = Number(req.body.orderId || req.body.order_id || 0);
  const order = await get('SELECT * FROM orders WHERE id = ?', [orderDbId]);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  if (order.payment_status === 'paid') return res.status(400).json({ message: 'Đơn hàng đã được thanh toán.' });

  const amount = Math.round(Number(order.total || 0));
  if (!Number.isInteger(amount) || amount < 1000) {
    return res.status(400).json({ message: 'Số tiền tối thiểu cho thanh toán MoMo là 1.000đ.' });
  }

  const momoOrderId = `MOT${orderDbId}T${Date.now()}`;
  const requestId = crypto.randomUUID();
  const { payUrl } = await momo.createPayment({
    orderDbId,
    amount,
    orderInfo: `Thanh toan don hang MOT Store #${orderDbId}`,
    requestId,
    momoOrderId,
  });

  // Ghi nhan dang cho thanh toan + luu ma giao dich MoMo de doi chieu.
  await run("UPDATE orders SET payment_method = 'momo', payment_status = 'unpaid', payment_ref = ? WHERE id = ?", [momoOrderId, orderDbId]);
  res.json({ payUrl });
}));

// Cap nhat trang thai don hang dua tren ket qua MoMo (dung chung cho return + IPN).
async function applyResult(params) {
  if (!momo.verifyCallback(params)) return { ok: false, reason: 'invalid-signature' };
  const { orderDbId } = momo.decodeExtraData(params.extraData);
  const orderId = Number(orderDbId || 0);
  if (!orderId) return { ok: false, reason: 'no-order' };
  const order = await get('SELECT id, payment_status FROM orders WHERE id = ?', [orderId]);
  if (!order) return { ok: false, reason: 'order-not-found' };

  const paid = String(params.resultCode) === '0';
  // Khong ghi de neu da paid (tranh xu ly trung khi ca return lan IPN cung goi).
  if (order.payment_status !== 'paid') {
    await run('UPDATE orders SET payment_status = ?, payment_ref = ? WHERE id = ?', [paid ? 'paid' : 'failed', params.orderId, orderId]);
  }
  return { ok: true, paid, orderId };
}

// MoMo redirect trinh duyet nguoi dung ve day -> xu ly roi chuyen toi trang hoa don.
router.get('/momo/return', asyncHandler(async (req, res) => {
  const result = await applyResult(req.query);
  if (!result.ok) {
    const fallback = momo.decodeExtraData(req.query.extraData).orderDbId;
    return res.redirect(`${APP_BASE_URL}${invoiceRedirect(fallback || '', false)}`);
  }
  res.redirect(`${APP_BASE_URL}${invoiceRedirect(result.orderId, result.paid)}`);
}));

// IPN: MoMo goi server-to-server (chi hoat dong khi URL cong khai). Phai tra ve 204.
router.post('/momo/ipn', asyncHandler(async (req, res) => {
  await applyResult(req.body);
  res.status(204).end();
}));

module.exports = router;
