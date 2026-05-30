const usersModel = require('../models/users.model');
const { normalizeUserPayload, toUserResponse } = require('../helpers');

async function listUsers(req, res) {
  const rows = await usersModel.getAllUsers();
  res.json(rows.map(toUserResponse));
}

async function createUser(req, res) {
  const payload = normalizeUserPayload(req.body);
  const created = await usersModel.createUser(payload);
  res.status(201).json(toUserResponse(created));
}

async function updateUser(req, res) {
  const existing = await usersModel.getUserRow(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  const payload = normalizeUserPayload(req.body, true);
  const updated = payload.password
    ? await usersModel.updateUserWithPassword(req.params.id, payload)
    : await usersModel.updateUser(req.params.id, payload);
  res.json(toUserResponse(updated));
}

async function deleteUser(req, res) {
  const adminCount = await usersModel.countAdmins();
  const target = await usersModel.getUserRow(req.params.id);
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  if (target.role === 'admin' && adminCount.count <= 1) return res.status(400).json({ message: 'Không thể xóa tài khoản admin cuối cùng.' });
  const result = await usersModel.deleteUser(req.params.id);
  res.json({ message: 'Đã xóa tài khoản.', id: Number(req.params.id), changes: result.changes });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
