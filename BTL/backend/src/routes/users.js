const express = require('express');
const { run, get, all, hashPassword } = require('../db');
const { asyncHandler } = require('../lib/http');
const { toUserResponse } = require('../serializers');
const { normalizeUserPayload } = require('../validators');

const router = express.Router();

const USER_COLUMNS = 'id, full_name, email, phone, role, created_at, updated_at';

router.get('/', asyncHandler(async (req, res) => {
  const rows = await all(`SELECT ${USER_COLUMNS} FROM users ORDER BY id DESC`);
  res.json(rows.map(toUserResponse));
}));

router.post('/', asyncHandler(async (req, res) => {
  const u = normalizeUserPayload(req.body);
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [u.fullName, u.email, u.phone, hashPassword(u.password), u.role]);
  const created = await get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [result.id]);
  res.status(201).json(toUserResponse(created));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  const u = normalizeUserPayload(req.body, true);
  if (u.password) {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, hashPassword(u.password), req.params.id]);
  } else {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, req.params.id]);
  }
  const updated = await get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [req.params.id]);
  res.json(toUserResponse(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
  const target = await get('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
  if (target.role === 'admin' && adminCount.count <= 1) return res.status(400).json({ message: 'Không thể xóa tài khoản admin cuối cùng.' });
  const result = await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa tài khoản.', id: Number(req.params.id), changes: result.changes });
}));

module.exports = router;
