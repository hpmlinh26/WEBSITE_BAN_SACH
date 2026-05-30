const feedbacksModel = require('../models/feedbacks.model');

async function listFeedbacks(req, res) {
  const rows = await feedbacksModel.getAllFeedbacks();
  res.json(rows.map(row => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    date: String(row.created_at || '').slice(0, 10)
  })));
}

async function createFeedback(req, res) {
  const fullName = String(req.body.fullName || req.body.full_name || req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const subject = String(req.body.subject || 'Phản hồi của khách hàng').trim();
  const message = String(req.body.message || '').trim();
  if (!fullName || !message) return res.status(400).json({ message: 'Vui lòng nhập họ tên và nội dung phản hồi.' });
  const id = await feedbacksModel.createFeedback({ fullName, email, phone, subject, message, status: 'new' });
  res.status(201).json({ id, fullName, email, phone, subject, message, status: 'new' });
}

async function updateFeedbackStatus(req, res) {
  const status = String(req.body.status || 'read').trim();
  const allowed = ['new', 'read', 'replied'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Trạng thái phản hồi không hợp lệ.' });
  const result = await feedbacksModel.updateFeedbackStatus(req.params.id, status);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy phản hồi.' });
  res.json({ id: Number(req.params.id), status, message: 'Đã cập nhật phản hồi.' });
}

module.exports = {
  listFeedbacks,
  createFeedback,
  updateFeedbackStatus
};
