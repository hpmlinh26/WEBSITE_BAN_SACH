const { run, all } = require('../db');

function getAllFeedbacks() {
  return all('SELECT * FROM feedbacks ORDER BY id DESC');
}

async function createFeedback(payload) {
  const result = await run('INSERT INTO feedbacks(full_name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)', [payload.fullName, payload.email, payload.phone, payload.subject, payload.message, payload.status]);
  return result.id;
}

function updateFeedbackStatus(id, status) {
  return run('UPDATE feedbacks SET status = ? WHERE id = ?', [status, id]);
}

module.exports = {
  getAllFeedbacks,
  createFeedback,
  updateFeedbackStatus
};
