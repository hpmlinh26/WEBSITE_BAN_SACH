const { ORDER_STATUSES, USER_ROLES, PLACEHOLDER_IMAGE } = require('./config');
const { makeSlug, normalizeAssetPath, assertRequired } = require('./lib/format');
const { createError } = require('./lib/http');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^[0-9]{9,11}$/;

function isValidEmail(email) {
  return !email || EMAIL_RE.test(email);
}

function isValidPhone(phone) {
  return !phone || PHONE_RE.test(String(phone).replace(/\s+/g, ''));
}

function normalizeCategoryPayload(body) {
  const name = String(body.name || '').trim();
  const slug = makeSlug(body.slug || name);
  const image = normalizeAssetPath(body.image, PLACEHOLDER_IMAGE);
  assertRequired(name, 'Tên danh mục không được để trống.');
  assertRequired(slug, 'Slug danh mục không hợp lệ.');
  return { name, slug, image };
}

function normalizeProductPayload(body) {
  const name = String(body.name || body.title || '').trim();
  const author = String(body.author || '').trim();
  const price = Number(body.price || 0);
  const originalPrice = Number(body.originalPrice || body.original_price || price || 0);
  const category = String(body.category || body.category_slug || '').trim() || null;
  const image = normalizeAssetPath(body.image, PLACEHOLDER_IMAGE);
  const discount = Number(body.discount || 0);
  const stock = body.stock === undefined || body.stock === '' ? 100 : Number(body.stock);
  const description = String(body.description || '').trim();
  const slug = makeSlug(body.slug || name);
  assertRequired(name, 'Tên sản phẩm không được để trống.');
  assertRequired(author, 'Tác giả/nhà xuất bản không được để trống.');
  if (!Number.isFinite(price) || price <= 0) {
    throw createError(400, 'Giá sản phẩm phải lớn hơn 0.');
  }
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    throw createError(400, 'Giá gốc sản phẩm phải lớn hơn 0.');
  }
  if (originalPrice < price) {
    throw createError(400, 'Giá gốc không được nhỏ hơn giá bán.');
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw createError(400, 'Giảm giá phải nằm trong khoảng 0-100%.');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw createError(400, 'Số lượng tồn kho phải là số nguyên không âm.');
  }
  return { name, title: name, author, price, originalPrice, discount, image, category, slug, stock, description };
}

function normalizeUserPayload(body, isUpdate = false) {
  const fullName = String(body.fullName || body.full_name || body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase() || null;
  const phone = String(body.phone || '').trim() || null;
  const password = String(body.password || '').trim();
  const role = USER_ROLES.includes(String(body.role || '').trim()) ? String(body.role).trim() : 'customer';
  assertRequired(fullName, 'Họ tên tài khoản không được để trống.');
  if (!email && !phone) {
    throw createError(400, 'Tài khoản cần có email hoặc số điện thoại.');
  }
  if (!isValidEmail(email)) {
    throw createError(400, 'Email không hợp lệ.');
  }
  if (!isValidPhone(phone)) {
    throw createError(400, 'Số điện thoại phải gồm 9-11 chữ số.');
  }
  if (!isUpdate && !password) {
    throw createError(400, 'Mật khẩu không được để trống khi tạo tài khoản.');
  }
  if (password && password.length < 6) {
    throw createError(400, 'Mật khẩu phải có ít nhất 6 ký tự.');
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
    throw createError(400, 'Giá trị giảm giá phải lớn hơn 0.');
  }
  if (discountType === 'percent' && discountValue > 100) {
    throw createError(400, 'Voucher giảm theo % không được vượt quá 100%.');
  }
  if (!Number.isFinite(minOrder)) {
    throw createError(400, 'Đơn tối thiểu không hợp lệ.');
  }
  if (expiresAt && Number.isNaN(new Date(`${expiresAt}T00:00:00`).getTime())) {
    throw createError(400, 'Hạn dùng voucher không hợp lệ.');
  }
  return { code, title, description, discountType, discountValue, minOrder, active, expiresAt };
}

function validateOrderPayload(body) {
  const userId = body.userId || body.user_id ? Number(body.userId || body.user_id) : null;
  const customerName = String(body.customerName || body.customer_name || '').trim();
  const customerPhone = String(body.customerPhone || body.customer_phone || '').trim();
  const customerEmail = String(body.customerEmail || body.customer_email || '').trim();
  const shippingAddress = String(body.shippingAddress || body.shipping_address || '').trim();
  const paymentMethod = String(body.paymentMethod || body.payment_method || 'cod').trim();
  const status = ORDER_STATUSES.includes(String(body.status || '').trim()) ? String(body.status).trim() : 'pending';
  const items = Array.isArray(body.items) ? body.items : [];
  if (userId !== null && (!Number.isInteger(userId) || userId <= 0)) {
    throw createError(400, 'Tài khoản đặt hàng không hợp lệ.');
  }
  assertRequired(customerName, 'Vui lòng nhập họ tên người nhận.');
  assertRequired(customerPhone, 'Vui lòng nhập số điện thoại người nhận.');
  assertRequired(shippingAddress, 'Vui lòng nhập đầy đủ địa chỉ giao hàng.');
  if (!/^[0-9]{9,11}$/.test(customerPhone.replace(/\s+/g, ''))) {
    throw createError(400, 'Số điện thoại phải gồm 9-11 chữ số.');
  }
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    throw createError(400, 'Email không hợp lệ.');
  }
  if (!items.length) {
    throw createError(400, 'Đơn hàng cần có ít nhất một sản phẩm.');
  }
  items.forEach((item) => {
    const productId = Number(item.productId || item.product_id);
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw createError(400, 'Sản phẩm trong đơn hàng không hợp lệ.');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw createError(400, 'Số lượng sản phẩm phải là số nguyên từ 1 trở lên.');
    }
  });
  return { userId, customerName, customerPhone, customerEmail, shippingAddress, paymentMethod, status, items };
}

module.exports = {
  normalizeCategoryPayload,
  normalizeProductPayload,
  normalizeUserPayload,
  normalizeVoucherPayload,
  validateOrderPayload,
};
