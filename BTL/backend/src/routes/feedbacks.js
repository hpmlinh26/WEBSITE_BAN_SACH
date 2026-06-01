const express = require('express');
const { run, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { FEEDBACK_STATUSES } = require('../config');
const { toFeedbackResponse } = require('../serializers');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM feedbacks ORDER BY id DESC');
  res.json(rows.map(toFeedbackResponse));
}));

router.post('/', asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || req.body.full_name || req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const subject = String(req.body.subject || 'Phản hồi của khách hàng').trim();
  const message = String(req.body.message || '').trim();
  if (!fullName || !message) return res.status(400).json({ message: 'Vui lòng nhập họ tên và nội dung phản hồi.' });
  const result = await run('INSERT INTO feedbacks(full_name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, phone, subject, message, 'new']);
  res.status(201).json({ id: result.id, fullName, email, phone, subject, message, status: 'new' });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = String(req.body.status || 'read').trim();
  if (!FEEDBACK_STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái phản hồi không hợp lệ.' });
  const result = await run('UPDATE feedbacks SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy phản hồi.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật phản hồi.' });
}));

module.exports = router;
