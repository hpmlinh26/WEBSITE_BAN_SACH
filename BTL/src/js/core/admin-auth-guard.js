// Rao chan UX cho khu vuc quan tri: chi cho phep nhom quan tri (admin/manager/staff).
// Bao mat that su nam o backend (requireAuth + requirePermission).
const MANAGEMENT_ROLES = ['admin', 'manager', 'staff'];

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (_) {
    return null;
  }
}

const user = currentUser();

if (!MANAGEMENT_ROLES.includes(user?.role)) {
  window.location.replace('/index.html');
  throw new Error('Admin route requires a management account.');
}
