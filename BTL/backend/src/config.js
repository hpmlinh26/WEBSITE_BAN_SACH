const path = require('path');
// Nap bien moi truong tu backend/.env (neu co). Tren Render, bien duoc cau hinh
// truc tiep trong render.yaml / Dashboard nen khong can file .env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
const SEED_VERSION = 'v17-blog-newsletter-cancel';

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
  { key: 'blogs', label: 'Blog', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'newsletter', label: 'Đăng ký nhận tin', actions: ['view'] },
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
    blogs: ['view', 'create', 'edit', 'delete'],
    newsletter: ['view'],
    staff: ['view'],
    roles: [],
  },
  staff: {
    dashboard: ['view'],
    products: ['view', 'edit'],
    orders: ['view', 'edit'],
    vouchers: ['view'],
    feedbacks: ['view', 'edit'],
    blogs: ['view', 'edit'],
    newsletter: [],
    customers: ['view'],
    staff: [],
    roles: [],
  },
};

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-cover.svg';

// URL goc cua app (de MoMo redirect ve sau khi thanh toan).
// - Local: lay tu env APP_BASE_URL, mac dinh http://localhost:PORT.
// - Render: tu dong dung RENDER_EXTERNAL_URL (Render bom san), nen redirect/IPN
//   luon tro dung domain that ma khong can cau hinh tay.
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// Cau hinh cong thanh toan MoMo. Toan bo lay tu bien moi truong (xem backend/.env.example).
// Local: dien trong backend/.env. Deploy: dien trong render.yaml hoac Render Dashboard.
const MOMO = {
  partnerCode: process.env.MOMO_PARTNER_CODE || '',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  endpoint: process.env.MOMO_ENDPOINT || '',
  requestType: process.env.MOMO_REQUEST_TYPE || 'payWithMethod',
  lang: process.env.MOMO_LANG || 'vi',
  // MoMo redirect nguoi dung ve URL nay (browser-side) sau khi thanh toan.
  redirectUrl: process.env.MOMO_REDIRECT_URL || `${APP_BASE_URL}/api/payment/momo/return`,
  // MoMo goi server-to-server bao ket qua (chi hoat dong khi URL cong khai internet).
  ipnUrl: process.env.MOMO_IPN_URL || `${APP_BASE_URL}/api/payment/momo/ipn`,
  // Trang hoa don de redirect tiep sau khi xu ly ket qua.
  invoicePath: process.env.MOMO_INVOICE_PATH || '/pages/invoice.html',
};

module.exports = {
  APP_BASE_URL,
  MOMO,
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
