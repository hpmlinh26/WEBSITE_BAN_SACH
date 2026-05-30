const { ORDER_STATUSES } = require('./constants');
const { makeSlug, normalizeAssetPath, assertRequired } = require('./utils');

function normalizeCategoryPayload(body) {
  const name = String(body.name || '').trim();
  const slug = makeSlug(body.slug || name);
  const image = normalizeAssetPath(body.image, 'assets/images/placeholder-cover.svg');
  assertRequired(name, 'Tên danh mục không được để trống.');
  return { name, slug, image };
}

function normalizeProductPayload(body) {
  const name = String(body.name || body.title || '').trim();
  const author = String(body.author || '').trim();
  const price = Number(body.price || 0);
  const originalPrice = Number(body.originalPrice || body.original_price || price || 0);
  const category = String(body.category || body.category_slug || '').trim() || null;
  const image = normalizeAssetPath(body.image, 'assets/images/placeholder-cover.svg');
  const discount = Number(body.discount || 0);
  const stock = Number(body.stock || 100);
  const description = String(body.description || '').trim();
  const slug = makeSlug(body.slug || name);
  assertRequired(name, 'Tên sản phẩm không được để trống.');
  assertRequired(author, 'Tác giả/nhà xuất bản không được để trống.');
  if (!Number.isFinite(price) || price <= 0) {
    const error = new Error('Giá sản phẩm phải lớn hơn 0.');
    error.status = 400;
    throw error;
  }
  return { name, title: name, author, price, originalPrice, discount, image, category, slug, stock, description };
}

function normalizeUserPayload(body, isUpdate = false) {
  const fullName = String(body.fullName || body.full_name || body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase() || null;
  const phone = String(body.phone || '').trim() || null;
  const password = String(body.password || '').trim();
  const role = ['admin', 'customer'].includes(String(body.role || '').trim()) ? String(body.role).trim() : 'customer';
  assertRequired(fullName, 'Họ tên tài khoản không được để trống.');
  if (!email && !phone) {
    const error = new Error('Tài khoản cần có email hoặc số điện thoại.');
    error.status = 400;
    throw error;
  }
  if (!isUpdate && !password) {
    const error = new Error('Mật khẩu không được để trống khi tạo tài khoản.');
    error.status = 400;
    throw error;
  }
  return { fullName, email, phone, password, role };
}

function normalizeVoucherPayload(body) {
  const code = String(body.code || '').trim().toUpperCase();
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const discountType = ['amount', 'percent'].includes(body.discountType || body.discount_type) ? (body.discountType || body.discount_type) : 'amount';
  const discountValue = Math.max(0, Number(body.discountValue || body.discount_value || 0));
  const minOrder = Math.max(0, Number(body.minOrder || body.min_order || 0));
  const active = body.active === false || body.active === 0 || body.active === '0' ? 0 : 1;
  const expiresAt = String(body.expiresAt || body.expires_at || '').trim() || null;
  assertRequired(code, 'Mã voucher không được để trống.');
  assertRequired(title, 'Tên voucher không được để trống.');
  if (!discountValue) {
    const error = new Error('Giá trị giảm giá phải lớn hơn 0.');
    error.status = 400;
    throw error;
  }
  return { code, title, description, discountType, discountValue, minOrder, active, expiresAt };
}

function validateOrderPayload(body) {
  const customerName = String(body.customerName || body.customer_name || '').trim();
  const customerPhone = String(body.customerPhone || body.customer_phone || '').trim();
  const customerEmail = String(body.customerEmail || body.customer_email || '').trim();
  const shippingAddress = String(body.shippingAddress || body.shipping_address || '').trim();
  const paymentMethod = String(body.paymentMethod || body.payment_method || 'cod').trim();
  const status = ORDER_STATUSES.includes(String(body.status || '').trim()) ? String(body.status).trim() : 'pending';
  const items = Array.isArray(body.items) ? body.items : [];
  assertRequired(customerName, 'Vui lòng nhập họ tên người nhận.');
  assertRequired(customerPhone, 'Vui lòng nhập số điện thoại người nhận.');
  assertRequired(shippingAddress, 'Vui lòng nhập đầy đủ địa chỉ giao hàng.');
  if (!/^[0-9]{9,11}$/.test(customerPhone.replace(/\s+/g, ''))) {
    const error = new Error('Số điện thoại phải gồm 9-11 chữ số.');
    error.status = 400;
    throw error;
  }
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    const error = new Error('Email không hợp lệ.');
    error.status = 400;
    throw error;
  }
  if (!items.length) {
    const error = new Error('Đơn hàng cần có ít nhất một sản phẩm.');
    error.status = 400;
    throw error;
  }
  return { customerName, customerPhone, customerEmail, shippingAddress, paymentMethod, status, items };
}

module.exports = {
  normalizeCategoryPayload,
  normalizeProductPayload,
  normalizeUserPayload,
  normalizeVoucherPayload,
  validateOrderPayload
};
