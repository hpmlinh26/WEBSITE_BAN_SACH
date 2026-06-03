// Tien ich phan quyen phia frontend (UX gating).
// Nguon du lieu: localStorage.currentUser (luu khi dang nhap, gom .role va .permissions).
// Backend van la rao chan bao mat that su; day chi an/hien nut + dieu huong.
import { api } from './api.js';

export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  manager: 'Người quản lý',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
};

export const MANAGEMENT_ROLES = ['admin', 'manager', 'staff'];

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (_) {
    return null;
  }
}

function permissionSet(user) {
  const list = Array.isArray(user?.permissions) ? user.permissions : [];
  return new Set(list);
}

// can(module, action): admin toan quyen; con lai dua tren danh sach permissions.
export function can(module, action) {
  const user = currentUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  return permissionSet(user).has(`${module}:${action}`);
}

// Co bat ky quyen nao trong module khong (de quyet dinh hien muc menu).
export function canAccessModule(module) {
  const user = currentUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  const set = permissionSet(user);
  for (const entry of set) {
    if (entry.startsWith(`${module}:`)) return true;
  }
  return false;
}

export function isManagement(user = currentUser()) {
  return MANAGEMENT_ROLES.includes(user?.role);
}

// Lay lai quyen moi nhat tu server (phong khi admin vua doi phan quyen) va cap nhat localStorage.
export async function refreshPermissions() {
  try {
    const me = await api('/auth/me');
    const user = currentUser() || {};
    const merged = { ...user, ...me };
    localStorage.setItem('currentUser', JSON.stringify(merged));
    return merged;
  } catch (_) {
    return currentUser();
  }
}

// An cac muc menu (sidebar) ma vai tro hien tai khong co quyen xem.
// Moi muc menu can co thuoc tinh data-module="key" hoac data-module="key1,key2".
export function applyNavGating(root = document) {
  root.querySelectorAll('.sidebar-nav [data-module]').forEach((el) => {
    const mods = String(el.dataset.module || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const allowed = mods.some((m) => canAccessModule(m));
    el.style.display = allowed ? '' : 'none';
  });
}

// An cac phan tu tinh (vd nut "Thêm ...") thieu quyen.
// Dung thuoc tinh data-perm="module:action" (vd data-perm="products:create").
export function applyActionGating(root = document) {
  root.querySelectorAll('[data-perm]').forEach((el) => {
    const [module, action] = String(el.dataset.perm || '').split(':');
    el.style.display = module && action && !can(module, action) ? 'none' : '';
  });
}
