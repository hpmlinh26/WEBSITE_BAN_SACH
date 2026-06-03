const express = require('express');
const { run, get, all, hashPassword } = require('../db');
const { can } = require('../db/permissions');
const { asyncHandler } = require('../lib/http');
const { requireAuth } = require('../middleware/auth');
const { toUserResponse } = require('../serializers');
const { normalizeUserPayload } = require('../validators');

const router = express.Router();

const USER_COLUMNS = 'id, full_name, email, phone, role, created_at, updated_at';

// Phan nhom tai khoan theo vai tro: customer -> module 'customers'; admin/manager/staff -> module 'staff'.
function moduleForRole(role) {
  return role === 'customer' ? 'customers' : 'staff';
}

// WHERE clause loc theo nhom.
function roleClauseForGroup(group) {
  if (group === 'customers') return "role = 'customer'";
  if (group === 'staff') return "role IN ('admin', 'manager', 'staff')";
  return null;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const group = String(req.query.group || '').trim();
  const limit = Number(req.query.limit || 0);
  const page = Math.max(1, Number(req.query.page || 1));
  const clause = roleClauseForGroup(group);

  // Khong chi dinh nhom -> can ca hai quyen xem (vd dashboard tong hop).
  if (!clause) {
    if (!can(req.user.role, 'customers', 'view') || !can(req.user.role, 'staff', 'view')) {
      return res.status(403).json({ message: 'Bạn không có quyền xem danh sách tài khoản.' });
    }
    const rows = await all(`SELECT ${USER_COLUMNS} FROM users ORDER BY id DESC`);
    return res.json(rows.map(toUserResponse));
  }

  const module = group === 'staff' ? 'staff' : 'customers';
  if (!can(req.user.role, module, 'view')) {
    return res.status(403).json({ message: 'Bạn không có quyền xem danh sách tài khoản này.' });
  }

  if (limit) {
    const { count } = await get(`SELECT COUNT(*) AS count FROM users WHERE ${clause}`);
    const rows = await all(`SELECT ${USER_COLUMNS} FROM users WHERE ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, (page - 1) * limit]);
    return res.json({ data: rows.map(toUserResponse), total: count, page, totalPages: Math.ceil(count / limit) });
  }
  const rows = await all(`SELECT ${USER_COLUMNS} FROM users WHERE ${clause} ORDER BY id DESC`);
  res.json(rows.map(toUserResponse));
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const u = normalizeUserPayload(req.body);
  const module = moduleForRole(u.role);
  if (!can(req.user.role, module, 'create')) {
    return res.status(403).json({ message: 'Bạn không có quyền tạo tài khoản này.' });
  }
  // Chi quan tri vien cap cao moi duoc tao tai khoan admin.
  if (u.role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ quản trị viên cấp cao mới được tạo tài khoản admin.' });
  }
  const result = await run('INSERT INTO users(full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [u.fullName, u.email, u.phone, hashPassword(u.password), u.role]);
  const created = await get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [result.id]);
  res.status(201).json(toUserResponse(created));
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const exists = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!exists) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

  const isSelf = Number(req.user.id) === Number(req.params.id);
  const module = moduleForRole(exists.role);

  if (!isSelf) {
    // Chi quan tri vien cap cao moi duoc sua tai khoan admin.
    if (exists.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ quản trị viên cấp cao mới được sửa tài khoản admin.' });
    }
    if (!can(req.user.role, module, 'edit')) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật tài khoản này.' });
    }
  }

  const u = normalizeUserPayload(req.body, true);
  // Chi admin duoc thay doi vai tro; cac truong hop khac giu nguyen vai tro cu.
  if (req.user.role !== 'admin') u.role = exists.role;
  // Khong cho ha quyen admin cuoi cung.
  if (exists.role === 'admin' && u.role !== 'admin') {
    const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (adminCount.count <= 1) return res.status(400).json({ message: 'Không thể hạ quyền tài khoản admin cuối cùng.' });
  }
  if (u.password) {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, hashPassword(u.password), req.params.id]);
  } else {
    await run('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [u.fullName, u.email, u.phone, u.role, req.params.id]);
  }
  const updated = await get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [req.params.id]);
  res.json(toUserResponse(updated));
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const target = await get('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

  // Chi quan tri vien cap cao moi duoc xoa tai khoan admin.
  if (target.role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ quản trị viên cấp cao mới được xóa tài khoản admin.' });
  }
  if (!can(req.user.role, moduleForRole(target.role), 'delete')) {
    return res.status(403).json({ message: 'Bạn không có quyền xóa tài khoản này.' });
  }
  if (target.role === 'admin') {
    const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (adminCount.count <= 1) return res.status(400).json({ message: 'Không thể xóa tài khoản admin cuối cùng.' });
  }
  const result = await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa tài khoản.', id: Number(req.params.id), changes: result.changes });
}));

module.exports = router;
