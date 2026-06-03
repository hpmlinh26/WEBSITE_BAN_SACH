const express = require('express');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { getMatrix, setRolePermissions } = require('../db/permissions');
const { PERMISSION_MODULES, CONFIGURABLE_ROLES, ROLE_LABELS } = require('../config');

const router = express.Router();

// Mo ta cac vai tro tra ve frontend. admin: toan quyen, khong sua duoc.
function roleList() {
  return [
    { key: 'admin', label: ROLE_LABELS.admin, editable: false, note: 'Toàn quyền hệ thống.' },
    ...CONFIGURABLE_ROLES.map((key) => ({ key, label: ROLE_LABELS[key] || key, editable: true })),
  ];
}

// GET /api/roles -> module + vai tro + ma tran quyen hien tai.
router.get('/', requireAuth, requirePermission('roles', 'view'), asyncHandler(async (req, res) => {
  res.json({
    modules: PERMISSION_MODULES,
    roles: roleList(),
    matrix: getMatrix(),
  });
}));

// PUT /api/roles/:role -> cap nhat quyen cho mot vai tro cau hinh duoc.
router.put('/:role', requireAuth, requirePermission('roles', 'edit'), asyncHandler(async (req, res) => {
  const role = String(req.params.role || '').trim();
  if (!CONFIGURABLE_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Vai trò này không được phép chỉnh sửa quyền.' });
  }
  const permissions = req.body && typeof req.body.permissions === 'object' ? req.body.permissions : {};
  const updated = await setRolePermissions(role, permissions);
  res.json({ role, label: ROLE_LABELS[role] || role, permissions: updated });
}));

module.exports = router;
