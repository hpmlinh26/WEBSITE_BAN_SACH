// Quan ly phan quyen theo vai tro (role-based permissions).
// Du lieu nam o bang role_permissions; cache trong bo nho de can() chay dong bo.
const { run, all } = require('./connection');
const {
  PERMISSION_MODULES,
  CONFIGURABLE_ROLES,
  DEFAULT_PERMISSIONS,
} = require('../config');

const MODULE_ACTIONS = Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, m.actions]));

// cache: Set cac chuoi "role:module:action" duoc phep.
let cache = new Set();

function key(role, module, action) {
  return `${role}:${module}:${action}`;
}

// Nap toan bo quyen tu DB vao cache. Goi luc khoi dong va sau moi lan cap nhat.
async function loadPermissions() {
  const rows = await all('SELECT role, module, action, allowed FROM role_permissions');
  const next = new Set();
  rows.forEach((r) => {
    if (r.allowed) next.add(key(r.role, r.module, r.action));
  });
  cache = next;
  return cache;
}

// Seed quyen mac dinh cho manager/staff neu bang con trong.
async function seedPermissions() {
  const rows = await all('SELECT COUNT(*) AS count FROM role_permissions');
  if (rows[0] && rows[0].count > 0) return;
  for (const role of CONFIGURABLE_ROLES) {
    const roleDefaults = DEFAULT_PERMISSIONS[role] || {};
    for (const mod of PERMISSION_MODULES) {
      const allowedActions = roleDefaults[mod.key] || [];
      for (const action of mod.actions) {
        const allowed = allowedActions.includes(action) ? 1 : 0;
        await run(
          'INSERT OR REPLACE INTO role_permissions(role, module, action, allowed) VALUES (?, ?, ?, ?)',
          [role, mod.key, action, allowed]
        );
      }
    }
  }
}

// Kiem tra quyen (dong bo). admin luon toan quyen.
function can(role, module, action) {
  if (role === 'admin') return true;
  return cache.has(key(role, module, action));
}

// Tra ve ma tran quyen day du cho tat ca vai tro cau hinh duoc + admin (read-only toan quyen).
function getMatrix() {
  const matrix = {};
  // admin: toan quyen, danh dau editable=false o tang route/frontend.
  const roles = ['admin', ...CONFIGURABLE_ROLES];
  for (const role of roles) {
    matrix[role] = {};
    for (const mod of PERMISSION_MODULES) {
      matrix[role][mod.key] = {};
      for (const action of mod.actions) {
        matrix[role][mod.key][action] = can(role, mod.key, action);
      }
    }
  }
  return matrix;
}

// Luu quyen cho mot vai tro. permissions = { module: { action: bool } }.
// Chi chap nhan module/action hop le; bo qua phan thua. Sau khi luu se reload cache.
async function setRolePermissions(role, permissions) {
  if (!CONFIGURABLE_ROLES.includes(role)) {
    const err = new Error('Vai trò này không được phép chỉnh sửa quyền.');
    err.status = 400;
    throw err;
  }
  for (const mod of PERMISSION_MODULES) {
    const modPerms = (permissions && permissions[mod.key]) || {};
    for (const action of mod.actions) {
      const allowed = modPerms[action] ? 1 : 0;
      await run(
        'INSERT OR REPLACE INTO role_permissions(role, module, action, allowed) VALUES (?, ?, ?, ?)',
        [role, mod.key, action, allowed]
      );
    }
  }
  await loadPermissions();
  return getMatrix()[role];
}

// Danh sach quyen phang cho 1 vai tro (dung tra ve frontend): ["module:action", ...].
function listPermissions(role) {
  if (role === 'admin') {
    const list = [];
    for (const mod of PERMISSION_MODULES) {
      for (const action of mod.actions) list.push(`${mod.key}:${action}`);
    }
    return list;
  }
  return [...cache].filter((k) => k.startsWith(`${role}:`)).map((k) => k.slice(role.length + 1));
}

module.exports = {
  MODULE_ACTIONS,
  loadPermissions,
  seedPermissions,
  can,
  getMatrix,
  setRolePermissions,
  listPermissions,
};
