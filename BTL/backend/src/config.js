const path = require('path');

// backend/ root (file nay nam trong backend/src/).
const ROOT_DIR = path.join(__dirname, '..');

// DATA_DIR co the tro toi persistent disk khi deploy (vd Render: /var/data).
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'database.sqlite');
const SEED_PATH = path.join(ROOT_DIR, 'seed-data.json');

// Frontend production build (Vite): BTL/dist. Khi dev dung `npm run dev` (Vite o cong 5173).
const DIST_DIR = path.join(ROOT_DIR, '..', 'dist');

const PORT = process.env.PORT || 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'mot-store-demo-auth-secret';

// Tang gia tri nay moi khi seed-data.json doi de DB tu seed lai catalog.
const SEED_VERSION = 'v16-pagination-extra-books-polish';

const ORDER_STATUSES = ['pending', 'packing', 'shipping', 'completed', 'return', 'cancelled'];
const FEEDBACK_STATUSES = ['new', 'read', 'replied'];
// Cac vai tro he thong. customer = khach hang; admin/manager/staff = nhom quan tri.
const USER_ROLES = ['admin', 'manager', 'staff', 'customer'];
// Cac vai tro duoc truy cap khu vuc quan tri (khong phai khach hang).
const MANAGEMENT_ROLES = ['admin', 'manager', 'staff'];
// admin = toan quyen (khong chinh sua duoc); customer khong co quyen quan tri.
// Chi manager/staff la cau hinh duoc trong trang Vai tro & phan quyen.
const CONFIGURABLE_ROLES = ['manager', 'staff'];

const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];

// Cac module trong khu vuc quan tri va hanh dong tuong ung de phan quyen.
const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Tổng quan', actions: ['view'] },
  { key: 'products', label: 'Sách & danh mục', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'orders', label: 'Đơn hàng', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'vouchers', label: 'Voucher', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'feedbacks', label: 'Thư phản hồi', actions: ['view', 'edit'] },
  { key: 'customers', label: 'Khách hàng', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'staff', label: 'Người quản trị', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'roles', label: 'Vai trò & phân quyền', actions: ['view', 'edit'] },
];

// Nhan hien thi cho tung vai tro (dung o backend va mirror o frontend).
const ROLE_LABELS = {
  admin: 'Quản trị viên',
  manager: 'Người quản lý',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
};

// Quyen mac dinh khi seed lan dau cho manager/staff.
// Dang: { role: { module: [actions...] } }. admin luon toan quyen (khong can liet ke).
const DEFAULT_PERMISSIONS = {
  manager: {
    dashboard: ['view'],
    products: ['view', 'create', 'edit', 'delete'],
    orders: ['view', 'create', 'edit', 'delete'],
    vouchers: ['view', 'create', 'edit', 'delete'],
    feedbacks: ['view', 'edit'],
    customers: ['view', 'create', 'edit', 'delete'],
    staff: ['view'],
    roles: [],
  },
  staff: {
    dashboard: ['view'],
    products: ['view', 'edit'],
    orders: ['view', 'edit'],
    vouchers: ['view'],
    feedbacks: ['view', 'edit'],
    customers: ['view'],
    staff: [],
    roles: [],
  },
};

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-cover.svg';

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  DB_PATH,
  SEED_PATH,
  DIST_DIR,
  PORT,
  AUTH_SECRET,
  SEED_VERSION,
  ORDER_STATUSES,
  FEEDBACK_STATUSES,
  USER_ROLES,
  MANAGEMENT_ROLES,
  CONFIGURABLE_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  PLACEHOLDER_IMAGE,
};
