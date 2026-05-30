// admin.js - quan tri san pham, danh muc, tai khoan, don hang, voucher va phan hoi.
import { api } from '../core/api.js';
import { money, escapeHtml, assetPath as normalizeImage, slugify } from '../core/format.js';

const statusText = {
  pending: 'Chờ lấy hàng',
  packing: 'Đang chuẩn bị',
  shipping: 'Chờ giao hàng',
  completed: 'Đã giao',
  return: 'Trả hàng',
  cancelled: 'Hủy',
};
const feedbackStatus = { new: 'Mới', read: 'Đã đọc', replied: 'Đã phản hồi' };
const roleText = { admin: 'Quản trị viên', customer: 'Khách hàng' };
function percent(value, total) {
  return total ? Math.round((Number(value || 0) * 100) / total) : 0;
}
function dashboardBar(label, value, total, className = '') {
  return `<div class="chart-bar-row ${className}"><span>${escapeHtml(label)}</span><div class="chart-track"><i style="width:${percent(value, total)}%"></i></div><b>${value}</b></div>`;
}
let backendReady = false;

const state = {
  categories: [],
  products: [],
  orders: [],
  feedbacks: [],
  users: [],
  vouchers: [],
};

async function loadFromBackend() {
  try {
    const [categories, products, orders, feedbacks, users, vouchers] = await Promise.all([
      api('/categories'),
      api('/products'),
      api('/orders'),
      api('/feedbacks').catch(() => []),
      api('/users').catch(() => []),
      api('/vouchers').catch(() => []),
    ]);
    Object.assign(state, { categories, products, orders, feedbacks, users, vouchers });
    window.categories = categories;
    window.products = products;
    window.orders = orders;
    window.feedbacks = feedbacks;
    backendReady = true;
  } catch (error) {
    console.warn('Admin dùng dữ liệu tĩnh:', error.message);
    backendReady = false;
    state.categories = window.categories || [];
    state.products = window.products || [];
    state.orders = JSON.parse(localStorage.getItem('motOrders') || '[]');
    state.feedbacks = JSON.parse(localStorage.getItem('motFeedbacks') || '[]');
    state.users = [];
    state.vouchers = [];
  }
}

function categoryName(slug) {
  return state.categories.find((c) => c.slug === slug)?.name || 'Chưa phân loại';
}

function showBackendStatus() {
  document.body.classList.toggle('backend-ready', backendReady);
}

function fillCategorySelect() {
  const select = document.getElementById('productCategory');
  if (!select) return;
  select.innerHTML = state.categories.map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('');
}

function fillOrderProductSelect() {
  const select = document.getElementById('orderProductId');
  if (!select) return;
  select.innerHTML =
    `<option value="">Chọn sản phẩm</option>` +
    state.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name || p.title)} - ${money(p.price)}</option>`).join('');
}

function renderMetrics() {
  const metricOrders = document.getElementById('metricOrders');
  const metricPending = document.getElementById('metricPending');
  const metricRevenue = document.getElementById('metricRevenue');
  if (metricOrders) metricOrders.textContent = state.orders.length;
  if (metricPending) metricPending.textContent = state.orders.filter((o) => ['pending', 'packing'].includes(o.status)).length;
  if (metricRevenue)
    metricRevenue.textContent = money(state.orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total || 0), 0));
}

function renderDashboard() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const completedOrders = state.orders.filter((o) => o.status === 'completed');
  const revenue = completedOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const pendingCount = state.orders.filter((o) => ['pending', 'packing', 'shipping'].includes(o.status)).length;
  const lowStock = state.products.filter((p) => Number(p.stock || 0) <= 10).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  set('dashboardProducts', state.products.length);
  set('dashboardCategories', state.categories.length);
  set('dashboardUsers', state.users.length);
  set('dashboardOrders', state.orders.length);
  set('dashboardRevenue', money(revenue));
  set('dashboardPending', pendingCount);
  set('dashboardVouchers', state.vouchers.length);
  set('dashboardFeedbacks', state.feedbacks.filter((f) => ['new', 'read'].includes(f.status)).length);
  set('dashboardLowStock', lowStock.length);

  const recentOrders = document.getElementById('dashboardRecentOrders');
  if (recentOrders) {
    recentOrders.innerHTML =
      state.orders
        .slice(0, 5)
        .map(
          (o) => `
      <tr><td>#${o.id}</td><td><strong>${escapeHtml(o.customer || o.customerName || 'Khách hàng')}</strong><small>${escapeHtml(o.phone || '')}</small></td><td>${money(o.total)}</td><td><span class="status-pill status-${o.status}">${statusText[o.status] || escapeHtml(o.status)}</span></td></tr>
    `
        )
        .join('') || `<tr><td colspan="4">Chưa có đơn hàng.</td></tr>`;
  }
  const recentFeedbacks = document.getElementById('dashboardRecentFeedbacks');
  if (recentFeedbacks) {
    recentFeedbacks.innerHTML =
      state.feedbacks
        .slice(0, 4)
        .map(
          (f) => `
      <article class="feedback-card status-${f.status}"><div class="feedback-head"><div><h3>${escapeHtml(f.subject || 'Phản hồi')}</h3><p>${escapeHtml(f.fullName || f.full_name || 'Khách hàng')}</p></div><span>${feedbackStatus[f.status] || escapeHtml(f.status)}</span></div><p class="feedback-message">${escapeHtml(f.message || '')}</p></article>
    `
        )
        .join('') || `<div class="empty-admin">Chưa có phản hồi nào.</div>`;
  }

  const statusChart = document.getElementById('dashboardStatusChart');
  if (statusChart) {
    const totalOrders = Math.max(1, state.orders.length);
    const counts = Object.keys(statusText).map((key) => ({
      key,
      label: statusText[key],
      value: state.orders.filter((o) => o.status === key).length,
      pct: percent(state.orders.filter((o) => o.status === key).length, totalOrders),
    }));
    statusChart.innerHTML = counts
      .map(
        (x) => `
      <div class="status-overview-row status-${x.key}">
        <div class="status-overview-left">
          <span class="status-dot"></span>
          <b>${escapeHtml(x.label)}</b>
        </div>
        <div class="status-overview-track"><i style="width:${x.pct}%"></i></div>
        <strong>${x.value}</strong>
      </div>`
      )
      .join('');
  }

  const categoryChart = document.getElementById('dashboardCategoryChart');
  if (categoryChart) {
    const rows = state.categories
      .map((c) => ({ label: c.name, value: state.products.filter((p) => (p.category || p.category_slug) === c.slug).length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const maxValue = Math.max(1, ...rows.map((r) => r.value));
    categoryChart.innerHTML = rows.map((x) => dashboardBar(x.label, x.value, maxValue)).join('') || `<div class="empty-admin">Chưa có dữ liệu danh mục.</div>`;
  }

  const lowStockList = document.getElementById('dashboardLowStockList');
  if (lowStockList) {
    lowStockList.innerHTML =
      lowStock
        .slice(0, 6)
        .map(
          (p) =>
            `<li><img src="${normalizeImage(p.image)}" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${escapeHtml(p.name || p.title)}"><span>${escapeHtml(p.name || p.title)}</span><b>${Number(p.stock || 0)}</b></li>`
        )
        .join('') || `<li class="empty-admin">Chưa có sản phẩm sắp hết hàng.</li>`;
  }
}

function renderCategories() {
  const wrap = document.getElementById('categoriesList');
  if (!wrap) return;
  wrap.innerHTML =
    state.categories
      .map(
        (c) => `
    <article class="category-admin-card">
      <img src="${normalizeImage(c.image)}" loading="lazy" decoding="async" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${escapeHtml(c.name)}">
      <div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.slug)}</p></div>
      <div class="card-actions">
        <button class="btn-edit" onclick="editCategory(${c.id})">Sửa</button>
        <button class="btn-delete" onclick="deleteCategory(${c.id})">Xóa</button>
      </div>
    </article>`
      )
      .join('') || `<p class="empty-admin">Chưa có danh mục.</p>`;
}

function renderProducts() {
  const tbody = document.getElementById('productsList');
  if (!tbody) return;
  tbody.innerHTML =
    state.products
      .map((p) => {
        const category = p.category || p.category_slug;
        return `<tr>
      <td>#${p.id}</td>
      <td><img class="table-cover" src="${normalizeImage(p.image)}" loading="lazy" decoding="async" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${escapeHtml(p.name || p.title)}"></td>
      <td><strong>${escapeHtml(p.name || p.title)}</strong><small>${escapeHtml(p.slug || '')}</small></td>
      <td>${escapeHtml(p.author || 'Không rõ')}</td>
      <td>${money(p.price)}</td>
      <td><span class="stock-pill ${Number(p.stock || 0) <= 10 ? 'low' : ''}">${Number(p.stock ?? 0)}</span></td>
      <td>${escapeHtml(p.categoryName || categoryName(category))}</td>
      <td class="cell-actions"><button class="btn-edit" onclick="editProduct(${p.id})">Sửa</button><button class="btn-delete" onclick="deleteProduct(${p.id})">Xóa</button></td>
    </tr>`;
      })
      .join('') || `<tr><td colspan="8">Chưa có sản phẩm.</td></tr>`;
  fillCategorySelect();
}

function renderOrders() {
  const tbody = document.getElementById('ordersList');
  if (!tbody) return;
  tbody.innerHTML =
    state.orders
      .map(
        (o) => `
    <tr>
      <td>#${o.id}</td>
      <td><strong>${escapeHtml(o.customer || o.customerName || 'Khách hàng')}</strong><small>${escapeHtml(o.phone || '')}</small></td>
      <td>${money(o.total)}</td>
      <td><span class="status-pill status-${o.status}">${statusText[o.status] || escapeHtml(o.status)}</span></td>
      <td>${escapeHtml(o.date || String(o.createdAt || '').slice(0, 10))}</td>
      <td class="cell-actions"><button class="btn-edit" onclick="openOrderModal(${o.id})">Xem chi tiết</button><button class="btn-delete" onclick="deleteOrder(${o.id})">Xóa</button></td>
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có đơn hàng.</td></tr>`;
  renderMetrics();
  fillOrderProductSelect();
}

function renderFeedbacks() {
  const wrap = document.getElementById('feedbackList');
  if (!wrap) return;
  wrap.innerHTML =
    state.feedbacks
      .map(
        (f) => `
    <article class="feedback-card status-${f.status}">
      <div class="feedback-head">
        <div><h3>${escapeHtml(f.subject || 'Phản hồi người dùng')}</h3><p>${escapeHtml(f.fullName || f.full_name || 'Khách hàng')} • ${escapeHtml(f.email || f.phone || 'Không có liên hệ')}</p></div>
        <span>${feedbackStatus[f.status] || escapeHtml(f.status)}</span>
      </div>
      <p class="feedback-message">${escapeHtml(f.message || '')}</p>
      <div class="feedback-actions"><small>${escapeHtml(f.date || String(f.createdAt || '').slice(0, 10))}</small><div><button class="btn-edit" onclick="markFeedback(${f.id}, 'read')">Đã đọc</button><button class="btn-edit" onclick="markFeedback(${f.id}, 'replied')">Đã phản hồi</button></div></div>
    </article>`
      )
      .join('') || `<div class="empty-admin">Chưa có phản hồi nào.</div>`;
}

function renderUsers() {
  const tbody = document.getElementById('usersList');
  if (!tbody) return;
  tbody.innerHTML =
    state.users
      .map(
        (u) => `
    <tr>
      <td>#${u.id}</td>
      <td><strong>${escapeHtml(u.fullName)}</strong><small>${escapeHtml(u.email || 'Chưa có email')}</small></td>
      <td>${escapeHtml(u.phone || '-')}</td>
      <td><span class="role-pill role-${u.role}">${roleText[u.role] || u.role}</span></td>
      <td>${escapeHtml(String(u.createdAt || '').slice(0, 10))}</td>
      <td class="cell-actions"><button class="btn-edit" onclick="editUser(${u.id})">Sửa</button><button class="btn-delete" onclick="deleteUser(${u.id})">Xóa</button></td>
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có tài khoản.</td></tr>`;
}

function renderVouchers() {
  const tbody = document.getElementById('vouchersList');
  if (!tbody) return;
  tbody.innerHTML =
    state.vouchers
      .map(
        (v) => `
    <tr>
      <td><strong>${escapeHtml(v.code)}</strong><small>${escapeHtml(v.title)}</small></td>
      <td>${v.discountType === 'percent' ? `${v.discountValue}%` : money(v.discountValue)}</td>
      <td>${money(v.minOrder)}</td>
      <td><span class="status-pill ${v.active ? 'status-completed' : 'status-cancelled'}">${v.active ? 'Đang bật' : 'Đã tắt'}</span></td>
      <td>${escapeHtml(v.expiresAt || 'Không giới hạn')}</td>
      <td class="cell-actions"><button class="btn-edit" onclick="editVoucher(${v.id})">Sửa</button><button class="btn-delete" onclick="deleteVoucher(${v.id})">Xóa</button></td>
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có voucher.</td></tr>`;
}

async function reloadAll() {
  await loadFromBackend();
  renderCategories();
  renderProducts();
  renderOrders();
  renderFeedbacks();
  renderUsers();
  renderVouchers();
  renderDashboard();
  showBackendStatus();
}

function modal(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'flex' : 'none';
}

window.reloadAdminData = reloadAll;
window.closeModal = () => document.querySelectorAll('.modal').forEach((m) => (m.style.display = 'none'));

// Categories
window.openAddCategory = function () {
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categorySlug').value = '';
  document.getElementById('categoryImage').value = 'assets/products/sach-38.jpg';
  document.getElementById('categoryModalTitle').textContent = 'Thêm danh mục';
  modal('categoryModal');
};
window.editCategory = function (id) {
  const c = state.categories.find((x) => Number(x.id) === Number(id));
  if (!c) return;
  document.getElementById('categoryId').value = c.id;
  document.getElementById('categoryName').value = c.name;
  document.getElementById('categorySlug').value = c.slug;
  document.getElementById('categoryImage').value = c.image || 'assets/images/placeholder-cover.svg';
  document.getElementById('categoryModalTitle').textContent = 'Sửa danh mục';
  modal('categoryModal');
};
window.handleSaveCategory = async function (event) {
  event.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value.trim();
  const payload = {
    name,
    slug: document.getElementById('categorySlug').value.trim() || slugify(name),
    image: normalizeImage(document.getElementById('categoryImage').value),
  };
  try {
    await api(id ? `/categories/${id}` : '/categories', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã lưu danh mục.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteCategory = async function (id) {
  if (!confirm('Xóa danh mục này? Sản phẩm thuộc danh mục sẽ chuyển thành chưa phân loại.')) return;
  try {
    await api(`/categories/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa danh mục.');
  } catch (error) {
    alert(error.message);
  }
};

// Products
window.openAddProduct = function () {
  document.querySelector('#productModal form')?.reset();
  document.getElementById('productId').value = '';
  document.getElementById('productImage').value = 'assets/products/sach-38.jpg';
  document.getElementById('productDiscount').value = '20';
  document.getElementById('productStock').value = '100';
  document.getElementById('modalTitle').textContent = 'Thêm sản phẩm';
  fillCategorySelect();
  modal('productModal');
};
window.editProduct = function (id) {
  const p = state.products.find((x) => Number(x.id) === Number(id));
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name || p.title || '';
  document.getElementById('productAuthor').value = p.author || '';
  document.getElementById('productPrice').value = p.price || 0;
  document.getElementById('productOriginalPrice').value = p.originalPrice || p.original_price || p.price || 0;
  document.getElementById('productDiscount').value = p.discount || 20;
  document.getElementById('productStock').value = p.stock ?? 100;
  document.getElementById('productImage').value = p.image || 'assets/images/placeholder-cover.svg';
  document.getElementById('productDescription').value = p.description || '';
  fillCategorySelect();
  document.getElementById('productCategory').value = p.category || p.category_slug || '';
  document.getElementById('modalTitle').textContent = 'Sửa sản phẩm';
  modal('productModal');
};
window.handleSaveProduct = async function (event) {
  event.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    name: document.getElementById('productName').value.trim(),
    author: document.getElementById('productAuthor').value.trim(),
    price: Number(document.getElementById('productPrice').value || 0),
    originalPrice: Number(document.getElementById('productOriginalPrice').value || 0),
    discount: Number(document.getElementById('productDiscount').value || 0),
    category: document.getElementById('productCategory').value,
    image: normalizeImage(document.getElementById('productImage').value),
    description: document.getElementById('productDescription').value.trim(),
    stock: Math.max(0, Number(document.getElementById('productStock').value || 0)),
  };
  try {
    await api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã lưu sản phẩm.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteProduct = async function (id) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return;
  try {
    await api(`/products/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa sản phẩm.');
  } catch (error) {
    alert(error.message);
  }
};

// Orders
window.openAddOrder = function () {
  document.querySelector('#addOrderModal form')?.reset();
  fillOrderProductSelect();
  modal('addOrderModal');
};
window.handleCreateOrder = async function (event) {
  event.preventDefault();
  const productId = Number(document.getElementById('orderProductId').value);
  const quantity = Math.max(1, Number(document.getElementById('orderQuantity').value || 1));
  const payload = {
    customerName: document.getElementById('orderCustomerName').value.trim(),
    customerPhone: document.getElementById('orderCustomerPhone').value.trim(),
    customerEmail: document.getElementById('orderCustomerEmail').value.trim(),
    shippingAddress: document.getElementById('orderShippingAddress').value.trim(),
    paymentMethod: document.getElementById('orderPaymentMethod').value,
    status: document.getElementById('orderCreateStatus').value,
    items: [{ productId, quantity }],
  };
  try {
    await api('/orders', { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã tạo đơn hàng.');
  } catch (error) {
    alert(error.message);
  }
};
window.openOrderModal = async function (id) {
  const order = state.orders.find((o) => Number(o.id) === Number(id));
  const input = document.getElementById('orderId');
  if (input) input.value = id;
  const status = document.getElementById('orderStatus');
  if (status && order) status.value = order.status;
  const body = document.getElementById('orderDetailBody');
  if (body) body.innerHTML = `<p>Đang tải chi tiết đơn hàng...</p>`;
  modal('orderModal');
  try {
    const detail = await api(`/orders/${id}`);
    const items = detail.items || [];
    if (body)
      body.innerHTML = `
      <div class="order-customer-box">
        <div><strong>Khách hàng</strong><p>${escapeHtml(detail.customerName || detail.customer || 'Khách hàng')}</p></div>
        <div><strong>Liên hệ</strong><p>${escapeHtml(detail.phone || '')}<br>${escapeHtml(detail.email || '')}</p></div>
        <div><strong>Địa chỉ</strong><p>${escapeHtml(detail.shippingAddress || 'Chưa có địa chỉ')}</p></div>
        <div><strong>Tổng tiền</strong><p class="red-text">${money(detail.total)}</p></div>
      </div>
      <div class="order-detail-items">
        ${
          items
            .map(
              (item) => `<div class="order-detail-item">
          <img src="${normalizeImage(item.image)}" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${escapeHtml(item.productName || item.name)}">
          <div><h4>${escapeHtml(item.productName || item.name)}</h4><p>${escapeHtml(item.author || 'MOT Store')} • SL: ${item.quantity}</p></div>
          <strong>${money(item.subtotal || item.price * item.quantity)}</strong>
        </div>`
            )
            .join('') || '<p>Đơn hàng chưa có sản phẩm chi tiết.</p>'
        }
      </div>
      <div class="invoice-link-row"><a class="btn-edit" href="invoice.html?orderId=${detail.id}" target="_blank">Xuất hóa đơn điện tử</a></div>`;
  } catch (error) {
    if (body) body.innerHTML = `<p class="red-text">${escapeHtml(error.message)}</p>`;
  }
};
window.handleUpdateOrder = async function (event) {
  event.preventDefault();
  const id = document.getElementById('orderId').value;
  const status = document.getElementById('orderStatus').value;
  try {
    await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    closeModal();
    await reloadAll();
    alert('Đã cập nhật trạng thái đơn hàng.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteOrder = async function (id) {
  if (!confirm('Xóa đơn hàng này?')) return;
  try {
    await api(`/orders/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa đơn hàng.');
  } catch (error) {
    alert(error.message);
  }
};

// Users
window.openAddUser = function () {
  document.querySelector('#userModal form')?.reset();
  document.getElementById('userId').value = '';
  document.getElementById('userModalTitle').textContent = 'Thêm tài khoản';
  document.getElementById('userPassword').required = true;
  modal('userModal');
};
window.editUser = function (id) {
  const u = state.users.find((x) => Number(x.id) === Number(id));
  if (!u) return;
  document.getElementById('userId').value = u.id;
  document.getElementById('userFullName').value = u.fullName || '';
  document.getElementById('userEmail').value = u.email || '';
  document.getElementById('userPhone').value = u.phone || '';
  document.getElementById('userRole').value = u.role || 'customer';
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').required = false;
  document.getElementById('userModalTitle').textContent = 'Cập nhật tài khoản';
  modal('userModal');
};
window.handleSaveUser = async function (event) {
  event.preventDefault();
  const id = document.getElementById('userId').value;
  const payload = {
    fullName: document.getElementById('userFullName').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    phone: document.getElementById('userPhone').value.trim(),
    role: document.getElementById('userRole').value,
    password: document.getElementById('userPassword').value.trim(),
  };
  try {
    await api(id ? `/users/${id}` : '/users', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã lưu tài khoản.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteUser = async function (id) {
  if (!confirm('Xóa tài khoản này?')) return;
  try {
    await api(`/users/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa tài khoản.');
  } catch (error) {
    alert(error.message);
  }
};

// Vouchers
window.openAddVoucher = function () {
  document.querySelector('#voucherModal form')?.reset();
  document.getElementById('voucherId').value = '';
  document.getElementById('voucherModalTitle').textContent = 'Thêm voucher';
  document.getElementById('voucherActive').value = '1';
  modal('voucherModal');
};
window.editVoucher = function (id) {
  const v = state.vouchers.find((x) => Number(x.id) === Number(id));
  if (!v) return;
  document.getElementById('voucherId').value = v.id;
  document.getElementById('voucherCode').value = v.code || '';
  document.getElementById('voucherTitle').value = v.title || '';
  document.getElementById('voucherDescription').value = v.description || '';
  document.getElementById('voucherType').value = v.discountType || 'amount';
  document.getElementById('voucherValue').value = v.discountValue || 0;
  document.getElementById('voucherMinOrder').value = v.minOrder || 0;
  document.getElementById('voucherActive').value = v.active ? '1' : '0';
  document.getElementById('voucherExpiresAt').value = v.expiresAt || '';
  document.getElementById('voucherModalTitle').textContent = 'Cập nhật voucher';
  modal('voucherModal');
};
window.handleSaveVoucher = async function (event) {
  event.preventDefault();
  const id = document.getElementById('voucherId').value;
  const payload = {
    code: document.getElementById('voucherCode').value.trim(),
    title: document.getElementById('voucherTitle').value.trim(),
    description: document.getElementById('voucherDescription').value.trim(),
    discountType: document.getElementById('voucherType').value,
    discountValue: Number(document.getElementById('voucherValue').value || 0),
    minOrder: Number(document.getElementById('voucherMinOrder').value || 0),
    active: document.getElementById('voucherActive').value === '1',
    expiresAt: document.getElementById('voucherExpiresAt').value,
  };
  try {
    await api(id ? `/vouchers/${id}` : '/vouchers', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã lưu voucher.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteVoucher = async function (id) {
  if (!confirm('Xóa voucher này?')) return;
  try {
    await api(`/vouchers/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa voucher.');
  } catch (error) {
    alert(error.message);
  }
};

window.markFeedback = async function (id, status) {
  try {
    await api(`/feedbacks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await reloadAll();
  } catch (error) {
    alert(error.message);
  }
};

document.addEventListener('DOMContentLoaded', reloadAll);
