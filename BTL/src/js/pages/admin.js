// admin.js - quan tri san pham, danh muc, tai khoan, don hang, voucher, phan hoi va phan quyen.
import { api } from '../core/api.js';
import { money, escapeHtml, assetPath as normalizeImage, slugify } from '../core/format.js';
import {
  can,
  ROLE_LABELS,
  currentUser,
  refreshPermissions,
  applyNavGating,
  applyActionGating,
} from '../core/permissions.js';

const statusText = {
  pending: 'Chờ lấy hàng',
  packing: 'Đang chuẩn bị',
  shipping: 'Chờ giao hàng',
  completed: 'Đã giao',
  return: 'Trả hàng',
  cancelled: 'Hủy',
};
const feedbackStatus = { new: 'Mới', read: 'Đã đọc', replied: 'Đã phản hồi' };
const roleText = ROLE_LABELS;
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
  customers: [],
  staff: [],
  vouchers: [],
  blogs: [],
  newsletter: [],
  rolesData: null, // { modules, roles, matrix }
};

const ADMIN_PAGE_SIZE = 20;
const pageState = { products: 1, orders: 1, customers: 1, staff: 1, vouchers: 1, feedbacks: 1, blogs: 1, newsletter: 1 };

function adminPaginate(items, key, navId, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));
  const current = Math.max(1, Math.min(totalPages, pageState[key]));
  pageState[key] = current;
  const nav = document.getElementById(navId);
  if (nav) {
    if (totalPages <= 1) {
      nav.innerHTML = '';
    } else {
      const clamp = (p) => Math.max(1, Math.min(totalPages, p));
      const dots = [];
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) dots.push(i);
        else if (dots[dots.length - 1] !== '...') dots.push('...');
      }
      nav.innerHTML = `
        <button class="page-btn" data-p="${clamp(current - 1)}" ${current === 1 ? 'disabled' : ''}>‹</button>
        ${dots.map((d) => d === '...' ? '<span class="page-dots">…</span>' : `<button class="page-btn ${d === current ? 'active' : ''}" data-p="${d}">${d}</button>`).join('')}
        <button class="page-btn" data-p="${clamp(current + 1)}" ${current === totalPages ? 'disabled' : ''}>›</button>`;
      nav.querySelectorAll('[data-p]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = Number(btn.dataset.p);
          if (next !== current) { pageState[key] = next; onPageChange(); }
        });
      });
    }
  }
  return items.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
}

async function loadFromBackend() {
  try {
    // Tai theo quyen: moi loi quyen (403) chi lam rong phan tuong ung, khong vo trang.
    const [categories, products, orders, feedbacks, customers, staff, vouchers, blogs, newsletter] = await Promise.all([
      api('/categories'),
      api('/products'),
      can('orders', 'view') ? api('/orders').catch(() => []) : Promise.resolve([]),
      can('feedbacks', 'view') ? api('/feedbacks').catch(() => []) : Promise.resolve([]),
      can('customers', 'view') ? api('/users?group=customers').catch(() => []) : Promise.resolve([]),
      can('staff', 'view') ? api('/users?group=staff').catch(() => []) : Promise.resolve([]),
      can('vouchers', 'view') ? api('/vouchers').catch(() => []) : Promise.resolve([]),
      can('blogs', 'view') ? api('/blogs/all').catch(() => []) : Promise.resolve([]),
      can('newsletter', 'view') ? api('/newsletter').catch(() => []) : Promise.resolve([]),
    ]);
    Object.assign(state, { categories, products, orders, feedbacks, customers, staff, vouchers, blogs, newsletter });
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
    state.customers = [];
    state.staff = [];
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
  set('dashboardUsers', state.customers.length + state.staff.length);
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
            `<li><img src="${normalizeImage(p.image)}" onerror="this.src='/assets/images/placeholder-cover.svg'" alt="${escapeHtml(p.name || p.title)}"><span>${escapeHtml(p.name || p.title)}</span><b>${Number(p.stock || 0)}</b></li>`
        )
        .join('') || `<li class="empty-admin">Chưa có sản phẩm sắp hết hàng.</li>`;
  }
}

function renderAnalytics() {
  if (!window.Chart) return;

  const COLORS = ['#c92127','#2563eb','#16a34a','#7c3aed','#f97316','#0d9488','#ca8a04','#db2777'];

  function makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const existing = window.Chart.getChart(canvas);
    if (existing) existing.destroy();
    return new window.Chart(canvas, config);
  }

  function lastNMonths(n) {
    const result = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth(), label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}` });
    }
    return result;
  }

  const months = lastNMonths(6);

  const revenueByMonth = months.map((m) =>
    state.orders
      .filter((o) => o.status === 'completed')
      .filter((o) => { const d = new Date(o.date || o.createdAt || ''); return d.getFullYear() === m.year && d.getMonth() === m.month; })
      .reduce((s, o) => s + Number(o.total || 0), 0)
  );

  makeChart('chartRevenue', {
    type: 'line',
    data: {
      labels: months.map((m) => m.label),
      datasets: [{
        label: 'Doanh thu',
        data: revenueByMonth,
        borderColor: '#c92127',
        backgroundColor: 'rgba(201,33,39,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#c92127',
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.raw) } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } } },
    },
  });

  const statusKeys = ['pending','packing','shipping','completed','return','cancelled'];
  const statusLabels = { pending:'Chờ lấy hàng', packing:'Đang chuẩn bị', shipping:'Chờ giao', completed:'Đã giao', return:'Trả hàng', cancelled:'Hủy' };
  const statusCounts = statusKeys.map((k) => state.orders.filter((o) => o.status === k).length);
  const statusColors = ['#f97316','#2563eb','#7c3aed','#16a34a','#ca8a04','#c92127'];

  makeChart('chartOrderStatus', {
    type: 'doughnut',
    data: { labels: statusKeys.map((k) => statusLabels[k]), datasets: [{ data: statusCounts, backgroundColor: statusColors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 } } } }, cutout: '60%' },
  });

  const monthlyOrderCount = months.map((m) =>
    state.orders.filter((o) => { const d = new Date(o.date || o.createdAt || ''); return d.getFullYear() === m.year && d.getMonth() === m.month; }).length
  );

  makeChart('chartMonthlyOrders', {
    type: 'bar',
    data: { labels: months.map((m) => m.label), datasets: [{ label: 'Số đơn', data: monthlyOrderCount, backgroundColor: 'rgba(37,99,235,0.72)', borderRadius: 8, borderSkipped: false }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });

  const productCounts = {};
  state.orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const key = String(item.productId || item.id || item.name || '');
      if (key) productCounts[key] = (productCounts[key] || 0) + (Number(item.quantity) || 1);
    });
  });
  const topProducts = Object.entries(productCounts)
    .map(([id, qty]) => {
      const p = state.products.find((x) => String(x.id) === id || x.name === id);
      return { name: p ? (p.name || p.title || `#${id}`) : `#${id}`, qty };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  makeChart('chartTopProducts', {
    type: 'bar',
    data: {
      labels: topProducts.map((p) => (p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name)),
      datasets: [{ label: 'Số lượng bán', data: topProducts.map((p) => p.qty), backgroundColor: COLORS.map((c) => c + 'bb'), borderRadius: 6 }],
    },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
  });

  const catData = state.categories
    .map((c) => ({ name: c.name, count: state.products.filter((p) => (p.category || p.category_slug) === c.slug).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  makeChart('chartCategories', {
    type: 'bar',
    data: {
      labels: catData.map((c) => c.name),
      datasets: [{ label: 'Số sản phẩm', data: catData.map((c) => c.count), backgroundColor: COLORS.map((c) => c + 'bb'), borderRadius: 6 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });

  const revByCategory = state.categories.map((c) => {
    const catProducts = state.products.filter((p) => (p.category || p.category_slug) === c.slug);
    const catProductIds = new Set(catProducts.map((p) => String(p.id)));
    return {
      name: c.name,
      revenue: state.orders
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => {
          const itemRev = (o.items || [])
            .filter((it) => catProductIds.has(String(it.productId || it.id || '')))
            .reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 1), 0);
          return sum + itemRev;
        }, 0),
    };
  }).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  makeChart('chartRevenueByCategory', {
    type: 'bar',
    data: {
      labels: revByCategory.map((c) => c.name),
      datasets: [{ label: 'Doanh thu', data: revByCategory.map((c) => c.revenue), backgroundColor: COLORS.map((c) => c + 'bb'), borderRadius: 8 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.raw) } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } } },
    },
  });
}

function renderCategories() {
  const wrap = document.getElementById('categoriesList');
  if (!wrap) return;
  wrap.innerHTML =
    state.categories
      .map(
        (c) => `
    <article class="category-admin-card">
      <img src="${normalizeImage(c.image)}" loading="lazy" decoding="async" onerror="this.src='/assets/images/placeholder-cover.svg'" alt="${escapeHtml(c.name)}">
      <div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.slug)}</p></div>
      <div class="card-actions">
        ${can('products', 'edit') ? `<button class="btn-edit" onclick="editCategory(${c.id})">Sửa</button>` : ''}
        ${can('products', 'delete') ? `<button class="btn-delete" onclick="deleteCategory(${c.id})">Xóa</button>` : ''}
      </div>
    </article>`
      )
      .join('') || `<p class="empty-admin">Chưa có danh mục.</p>`;
}

function renderProducts() {
  const tbody = document.getElementById('productsList');
  if (!tbody) return;
  const visible = adminPaginate(state.products, 'products', 'productsPageNav', renderProducts);
  tbody.innerHTML =
    visible
      .map((p) => {
        const category = p.category || p.category_slug;
        return `<tr>
      <td>#${p.id}</td>
      <td><img class="table-cover" src="${normalizeImage(p.image)}" loading="lazy" decoding="async" onerror="this.src='/assets/images/placeholder-cover.svg'" alt="${escapeHtml(p.name || p.title)}"></td>
      <td><strong>${escapeHtml(p.name || p.title)}</strong><small>${escapeHtml(p.slug || '')}</small></td>
      <td>${escapeHtml(p.author || 'Không rõ')}</td>
      <td>${money(p.price)}</td>
      <td><span class="stock-pill ${Number(p.stock || 0) <= 10 ? 'low' : ''}">${Number(p.stock ?? 0)}</span></td>
      <td>${escapeHtml(p.categoryName || categoryName(category))}</td>
      ${rowActions('products', p.id, 'editProduct', 'deleteProduct')}
    </tr>`;
      })
      .join('') || `<tr><td colspan="8">Chưa có sản phẩm.</td></tr>`;
  fillCategorySelect();
}

function renderOrders() {
  const tbody = document.getElementById('ordersList');
  if (!tbody) return;
  const visible = adminPaginate(state.orders, 'orders', 'ordersPageNav', renderOrders);
  tbody.innerHTML =
    visible
      .map(
        (o) => `
    <tr>
      <td>#${o.id}</td>
      <td><strong>${escapeHtml(o.customer || o.customerName || 'Khách hàng')}</strong><small>${escapeHtml(o.phone || '')}</small></td>
      <td>${money(o.total)}</td>
      <td><span class="status-pill status-${o.status}">${statusText[o.status] || escapeHtml(o.status)}</span></td>
      <td>${escapeHtml(o.date || String(o.createdAt || '').slice(0, 10))}</td>
      <td class="cell-actions"><button class="btn-edit" onclick="openOrderModal(${o.id})">Xem chi tiết</button>${can('orders', 'edit') && ['pending', 'packing'].includes(o.status) ? `<button class="btn-delete" onclick="cancelOrderAdmin(${o.id})">Hủy</button>` : ''}${can('orders', 'delete') ? `<button class="btn-delete" onclick="deleteOrder(${o.id})">Xóa</button>` : ''}</td>
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có đơn hàng.</td></tr>`;
  renderMetrics();
  fillOrderProductSelect();
}

function renderFeedbacks() {
  const wrap = document.getElementById('feedbackList');
  if (!wrap) return;
  const visible = adminPaginate(state.feedbacks, 'feedbacks', 'feedbacksPageNav', renderFeedbacks);
  wrap.innerHTML =
    visible
      .map(
        (f) => `
    <article class="feedback-card status-${f.status}">
      <div class="feedback-head">
        <div><h3>${escapeHtml(f.subject || 'Phản hồi người dùng')}</h3><p>${escapeHtml(f.fullName || f.full_name || 'Khách hàng')} • ${escapeHtml(f.email || f.phone || 'Không có liên hệ')}</p></div>
        <span>${feedbackStatus[f.status] || escapeHtml(f.status)}</span>
      </div>
      <p class="feedback-message">${escapeHtml(f.message || '')}</p>
      <div class="feedback-actions"><small>${escapeHtml(f.date || String(f.createdAt || '').slice(0, 10))}</small><div>${can('feedbacks', 'edit') ? `<button class="btn-edit" onclick="markFeedback(${f.id}, 'read')">Đã đọc</button><button class="btn-edit" onclick="markFeedback(${f.id}, 'replied')">Đã phản hồi</button>` : ''}</div></div>
    </article>`
      )
      .join('') || `<div class="empty-admin">Chưa có phản hồi nào.</div>`;
}

function renderBlogs() {
  const tbody = document.getElementById('blogsList');
  if (!tbody) return;
  const visible = adminPaginate(state.blogs, 'blogs', 'blogsPageNav', renderBlogs);
  const blogStatusText = { published: 'Đã xuất bản', draft: 'Nháp' };
  tbody.innerHTML =
    visible
      .map(
        (b) => `
    <tr>
      <td>#${b.id}</td>
      <td><strong>${escapeHtml(b.title)}</strong></td>
      <td><small>${escapeHtml(b.slug)}</small></td>
      <td>${escapeHtml(b.tag || '—')}</td>
      <td><span class="status-pill ${b.status === 'published' ? 'status-completed' : 'status-cancelled'}">${blogStatusText[b.status] || escapeHtml(b.status)}</span></td>
      <td>${escapeHtml(String(b.createdAt || '').slice(0, 10))}</td>
      ${rowActions('blogs', b.id, 'editBlog', 'deleteBlog')}
    </tr>`
      )
      .join('') || `<tr><td colspan="7">Chưa có bài viết nào.</td></tr>`;
}

function renderNewsletterSubscribers() {
  const tbody = document.getElementById('newsletterList');
  if (!tbody) return;
  const visible = adminPaginate(state.newsletter, 'newsletter', 'newsletterPageNav', renderNewsletterSubscribers);
  tbody.innerHTML =
    visible
      .map(
        (s) => `
    <tr>
      <td>#${s.id}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(String(s.createdAt || '').slice(0, 10))}</td>
    </tr>`
      )
      .join('') || `<tr><td colspan="3">Chưa có email đăng ký nào.</td></tr>`;
}

// Nut Sua/Xoa cho 1 dong, an theo quyen cua module.
function rowActions(module, id, fnEdit, fnDelete) {
  const buttons = [];
  if (can(module, 'edit')) buttons.push(`<button class="btn-edit" onclick="${fnEdit}(${id})">Sửa</button>`);
  if (can(module, 'delete')) buttons.push(`<button class="btn-delete" onclick="${fnDelete}(${id})">Xóa</button>`);
  return `<td class="cell-actions">${buttons.join('') || '<small>—</small>'}</td>`;
}

function renderCustomers() {
  const tbody = document.getElementById('customersList');
  if (!tbody) return;
  const visible = adminPaginate(state.customers, 'customers', 'customersPageNav', renderCustomers);
  tbody.innerHTML =
    visible
      .map(
        (u) => `
    <tr>
      <td>#${u.id}</td>
      <td><strong>${escapeHtml(u.fullName)}</strong><small>${escapeHtml(u.email || 'Chưa có email')}</small></td>
      <td>${escapeHtml(u.phone || '-')}</td>
      <td>${escapeHtml(String(u.createdAt || '').slice(0, 10))}</td>
      ${rowActions('customers', u.id, 'editUser', 'deleteUser')}
    </tr>`
      )
      .join('') || `<tr><td colspan="5">Chưa có khách hàng.</td></tr>`;
}

function renderStaff() {
  const tbody = document.getElementById('staffList');
  if (!tbody) return;
  const visible = adminPaginate(state.staff, 'staff', 'staffPageNav', renderStaff);
  tbody.innerHTML =
    visible
      .map(
        (u) => `
    <tr>
      <td>#${u.id}</td>
      <td><strong>${escapeHtml(u.fullName)}</strong><small>${escapeHtml(u.email || 'Chưa có email')}</small></td>
      <td>${escapeHtml(u.phone || '-')}</td>
      <td><span class="role-pill role-${u.role}">${roleText[u.role] || u.role}</span></td>
      <td>${escapeHtml(String(u.createdAt || '').slice(0, 10))}</td>
      ${rowActions('staff', u.id, 'editUser', 'deleteUser')}
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có người quản trị.</td></tr>`;
}

function renderVouchers() {
  const tbody = document.getElementById('vouchersList');
  if (!tbody) return;
  const visible = adminPaginate(state.vouchers, 'vouchers', 'vouchersPageNav', renderVouchers);
  tbody.innerHTML =
    visible
      .map(
        (v) => `
    <tr>
      <td><strong>${escapeHtml(v.code)}</strong><small>${escapeHtml(v.title)}</small></td>
      <td>${v.discountType === 'percent' ? `${v.discountValue}%` : money(v.discountValue)}</td>
      <td>${money(v.minOrder)}</td>
      <td><span class="status-pill ${v.active ? 'status-completed' : 'status-cancelled'}">${v.active ? 'Đang bật' : 'Đã tắt'}</span></td>
      <td>${escapeHtml(v.expiresAt || 'Không giới hạn')}</td>
      ${rowActions('vouchers', v.id, 'editVoucher', 'deleteVoucher')}
    </tr>`
      )
      .join('') || `<tr><td colspan="6">Chưa có voucher.</td></tr>`;
}

async function reloadAll() {
  await loadFromBackend();
  Object.keys(pageState).forEach((k) => (pageState[k] = 1));
  renderCategories();
  renderProducts();
  renderOrders();
  renderFeedbacks();
  renderCustomers();
  renderStaff();
  renderVouchers();
  renderBlogs();
  renderNewsletterSubscribers();
  renderDashboard();
  renderAnalytics();
  showBackendStatus();
  applyNavGating();
  applyActionGating();
  await renderRolesPage();
}

function modal(id, show = true) {
  const el = document.getElementById(id);
  if (el) {
    if (show) el.querySelectorAll('form.was-validated').forEach((form) => form.classList.remove('was-validated'));
    el.style.display = show ? 'flex' : 'none';
  }
}

const validEmail = (value) => !value || /^\S+@\S+\.\S+$/.test(value);
const validPhone = (value) => !value || /^[0-9]{9,11}$/.test(String(value || '').replace(/\s+/g, ''));

function setInvalid(input, message) {
  input?.setCustomValidity(message || '');
  if (message) {
    input?.reportValidity();
    input?.focus();
  }
  return !message;
}

function validateNativeForm(form) {
  form?.classList.add('was-validated');
  form?.querySelectorAll('input, select, textarea').forEach((field) => field.setCustomValidity(''));
  if (!form?.checkValidity()) {
    form?.reportValidity();
    return false;
  }
  return true;
}

function updateVoucherValueLimit() {
  const type = document.getElementById('voucherType')?.value;
  const value = document.getElementById('voucherValue');
  if (!value) return;
  if (type === 'percent') {
    value.max = '100';
    value.step = '1';
    value.placeholder = 'VD: 10';
  } else {
    value.removeAttribute('max');
    value.step = '1000';
    value.placeholder = 'VD: 10000';
  }
}

window.reloadAdminData = reloadAll;
window.closeModal = () => document.querySelectorAll('.modal').forEach((m) => (m.style.display = 'none'));

// Categories
window.openAddCategory = function () {
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categorySlug').value = '';
  document.getElementById('categoryImage').value = '/assets/products/sach-38.jpg';
  document.getElementById('categoryModalTitle').textContent = 'Thêm danh mục';
  modal('categoryModal');
};
window.editCategory = function (id) {
  const c = state.categories.find((x) => Number(x.id) === Number(id));
  if (!c) return;
  document.getElementById('categoryId').value = c.id;
  document.getElementById('categoryName').value = c.name;
  document.getElementById('categorySlug').value = c.slug;
  document.getElementById('categoryImage').value = c.image || '/assets/images/placeholder-cover.svg';
  document.getElementById('categoryModalTitle').textContent = 'Sửa danh mục';
  modal('categoryModal');
};
window.handleSaveCategory = async function (event) {
  event.preventDefault();
  if (!validateNativeForm(event.target)) return;
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
  document.getElementById('productImage').value = '/assets/products/sach-38.jpg';
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
  document.getElementById('productDiscount').value = p.discount ?? 0;
  document.getElementById('productStock').value = p.stock ?? 100;
  document.getElementById('productImage').value = p.image || '/assets/images/placeholder-cover.svg';
  document.getElementById('productDescription').value = p.description || '';
  fillCategorySelect();
  document.getElementById('productCategory').value = p.category || p.category_slug || '';
  document.getElementById('modalTitle').textContent = 'Sửa sản phẩm';
  modal('productModal');
};
window.handleSaveProduct = async function (event) {
  event.preventDefault();
  if (!validateNativeForm(event.target)) return;
  const id = document.getElementById('productId').value;
  const priceInput = document.getElementById('productPrice');
  const originalPriceInput = document.getElementById('productOriginalPrice');
  const discountInput = document.getElementById('productDiscount');
  const stockInput = document.getElementById('productStock');
  const price = Number(priceInput.value || 0);
  const originalPrice = Number(originalPriceInput.value || 0);
  const discount = Number(discountInput.value || 0);
  const stock = Number(stockInput.value || 0);
  if (originalPrice < price) return setInvalid(originalPriceInput, 'Giá gốc không được nhỏ hơn giá bán.');
  if (!Number.isInteger(discount) || discount < 0 || discount > 100) return setInvalid(discountInput, 'Giảm giá phải là số nguyên từ 0 đến 100.');
  if (!Number.isInteger(stock) || stock < 0) return setInvalid(stockInput, 'Số lượng tồn kho phải là số nguyên không âm.');
  const payload = {
    name: document.getElementById('productName').value.trim(),
    author: document.getElementById('productAuthor').value.trim(),
    price,
    originalPrice,
    discount,
    category: document.getElementById('productCategory').value,
    image: normalizeImage(document.getElementById('productImage').value),
    description: document.getElementById('productDescription').value.trim(),
    stock,
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
  if (!validateNativeForm(event.target)) return;
  const productId = Number(document.getElementById('orderProductId').value);
  const quantityInput = document.getElementById('orderQuantity');
  const quantity = Number(quantityInput.value || 1);
  const selectedProduct = state.products.find((p) => Number(p.id) === productId);
  if (!productId || !selectedProduct) return setInvalid(document.getElementById('orderProductId'), 'Vui lòng chọn sản phẩm.');
  if (!Number.isInteger(quantity) || quantity < 1) return setInvalid(quantityInput, 'Số lượng phải là số nguyên từ 1 trở lên.');
  if (quantity > Number(selectedProduct.stock || 0)) return setInvalid(quantityInput, `Sản phẩm này chỉ còn ${selectedProduct.stock || 0} trong kho.`);
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
          <img src="${normalizeImage(item.image)}" onerror="this.src='/assets/images/placeholder-cover.svg'" alt="${escapeHtml(item.productName || item.name)}">
          <div><h4>${escapeHtml(item.productName || item.name)}</h4><p>${escapeHtml(item.author || 'MOT Store')} • SL: ${item.quantity}</p></div>
          <strong>${money(item.subtotal || item.price * item.quantity)}</strong>
        </div>`
            )
            .join('') || '<p>Đơn hàng chưa có sản phẩm chi tiết.</p>'
        }
      </div>
      <div class="invoice-link-row"><a class="btn-edit" href="/pages/invoice.html?orderId=${detail.id}" target="_blank">Xuất hóa đơn điện tử</a></div>`;
  } catch (error) {
    if (body) body.innerHTML = `<p class="red-text">${escapeHtml(error.message)}</p>`;
  }
};
window.handleUpdateOrder = async function (event) {
  event.preventDefault();
  if (!validateNativeForm(event.target)) return;
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
window.cancelOrderAdmin = async function (id) {
  if (!confirm('Hủy đơn hàng này? Tồn kho sẽ được hoàn lại.')) return;
  try {
    await api(`/orders/${id}/cancel`, { method: 'PATCH' });
    await reloadAll();
    alert('Đã hủy đơn hàng.');
  } catch (error) {
    alert(error.message);
  }
};

// Users (tach 2 nhom: customers / staff)
// Chuyen tab Khach hang <-> Nguoi quan tri.
window.switchAccountTab = function (tab) {
  document.querySelectorAll('.admin-tab[data-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const customersPanel = document.getElementById('customersPanel');
  const staffPanel = document.getElementById('staffPanel');
  if (customersPanel) customersPanel.hidden = tab !== 'customers';
  if (staffPanel) staffPanel.hidden = tab !== 'staff';
};

// Chinh select vai tro theo nhom va quyen cua nguoi dang dang nhap.
function setupRoleField(group, role) {
  const roleGroup = document.getElementById('userRoleGroup');
  const roleSelect = document.getElementById('userRole');
  if (!roleGroup || !roleSelect) return;
  const isStaff = group === 'staff';
  roleGroup.hidden = !isStaff;
  // Chi admin moi duoc gan vai tro admin.
  const allowAdmin = currentUser()?.role === 'admin';
  const options = [
    { value: 'staff', label: ROLE_LABELS.staff },
    { value: 'manager', label: ROLE_LABELS.manager },
  ];
  if (allowAdmin) options.push({ value: 'admin', label: ROLE_LABELS.admin });
  roleSelect.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  if (isStaff) roleSelect.value = options.some((o) => o.value === role) ? role : 'staff';
}

window.openAddUser = function (group = 'customers') {
  document.querySelector('#userModal form')?.reset();
  document.getElementById('userId').value = '';
  document.getElementById('userGroup').value = group;
  setupRoleField(group, 'staff');
  document.getElementById('userModalTitle').textContent = group === 'staff' ? 'Thêm người quản trị' : 'Thêm khách hàng';
  document.getElementById('userPassword').required = true;
  modal('userModal');
};
window.editUser = function (id) {
  const u = [...state.customers, ...state.staff].find((x) => Number(x.id) === Number(id));
  if (!u) return;
  const group = u.role === 'customer' ? 'customers' : 'staff';
  document.getElementById('userId').value = u.id;
  document.getElementById('userGroup').value = group;
  document.getElementById('userFullName').value = u.fullName || '';
  document.getElementById('userEmail').value = u.email || '';
  document.getElementById('userPhone').value = u.phone || '';
  setupRoleField(group, u.role);
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').required = false;
  document.getElementById('userModalTitle').textContent = group === 'staff' ? 'Cập nhật người quản trị' : 'Cập nhật khách hàng';
  modal('userModal');
};
window.handleSaveUser = async function (event) {
  event.preventDefault();
  if (!validateNativeForm(event.target)) return;
  const id = document.getElementById('userId').value;
  const emailInput = document.getElementById('userEmail');
  const phoneInput = document.getElementById('userPhone');
  const passwordInput = document.getElementById('userPassword');
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email && !phone) return setInvalid(emailInput, 'Tài khoản cần có email hoặc số điện thoại.');
  if (!validEmail(email)) return setInvalid(emailInput, 'Email không hợp lệ.');
  if (!validPhone(phone)) return setInvalid(phoneInput, 'Số điện thoại phải gồm 9-11 chữ số.');
  if (password && password.length < 6) return setInvalid(passwordInput, 'Mật khẩu phải có ít nhất 6 ký tự.');
  // Khach hang luon co vai tro 'customer'; nhom quan tri lay tu select.
  const group = document.getElementById('userGroup').value;
  const role = group === 'staff' ? document.getElementById('userRole').value : 'customer';
  const payload = {
    fullName: document.getElementById('userFullName').value.trim(),
    email,
    phone,
    role,
    password,
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
  updateVoucherValueLimit();
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
  updateVoucherValueLimit();
  modal('voucherModal');
};
window.handleSaveVoucher = async function (event) {
  event.preventDefault();
  updateVoucherValueLimit();
  if (!validateNativeForm(event.target)) return;
  const id = document.getElementById('voucherId').value;
  const type = document.getElementById('voucherType').value;
  const valueInput = document.getElementById('voucherValue');
  const minOrderInput = document.getElementById('voucherMinOrder');
  const expiresInput = document.getElementById('voucherExpiresAt');
  const discountValue = Number(valueInput.value || 0);
  const minOrder = Number(minOrderInput.value || 0);
  if (type === 'percent' && discountValue > 100) return setInvalid(valueInput, 'Voucher giảm theo % không được vượt quá 100%.');
  if (!Number.isFinite(minOrder) || minOrder < 0) return setInvalid(minOrderInput, 'Đơn tối thiểu phải là số không âm.');
  if (expiresInput.value && new Date(`${expiresInput.value}T23:59:59`) < new Date()) return setInvalid(expiresInput, 'Hạn dùng voucher không nên là ngày trong quá khứ.');
  const payload = {
    code: document.getElementById('voucherCode').value.trim(),
    title: document.getElementById('voucherTitle').value.trim(),
    description: document.getElementById('voucherDescription').value.trim(),
    discountType: type,
    discountValue,
    minOrder,
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

// Blogs
window.openAddBlog = function () {
  document.querySelector('#blogModal form')?.reset();
  document.getElementById('blogId').value = '';
  document.getElementById('blogAuthor').value = 'MOT Store';
  document.getElementById('blogStatus').value = 'published';
  document.getElementById('blogModalTitle').textContent = 'Thêm bài viết';
  modal('blogModal');
};
window.editBlog = function (id) {
  const b = state.blogs.find((x) => Number(x.id) === Number(id));
  if (!b) return;
  document.getElementById('blogId').value = b.id;
  document.getElementById('blogTitle').value = b.title || '';
  document.getElementById('blogSlug').value = b.slug || '';
  document.getElementById('blogTag').value = b.tag || '';
  document.getElementById('blogAuthor').value = b.author || 'MOT Store';
  document.getElementById('blogImage').value = b.image || '';
  document.getElementById('blogStatus').value = b.status || 'published';
  document.getElementById('blogExcerpt').value = b.excerpt || '';
  document.getElementById('blogContent').value = b.content || '';
  document.getElementById('blogModalTitle').textContent = 'Sửa bài viết';
  modal('blogModal');
};
window.handleSaveBlog = async function (event) {
  event.preventDefault();
  if (!validateNativeForm(event.target)) return;
  const id = document.getElementById('blogId').value;
  const title = document.getElementById('blogTitle').value.trim();
  const payload = {
    title,
    slug: document.getElementById('blogSlug').value.trim() || slugify(title),
    tag: document.getElementById('blogTag').value.trim(),
    author: document.getElementById('blogAuthor').value.trim() || 'MOT Store',
    image: document.getElementById('blogImage').value.trim(),
    status: document.getElementById('blogStatus').value,
    excerpt: document.getElementById('blogExcerpt').value.trim(),
    content: document.getElementById('blogContent').value.trim(),
  };
  try {
    await api(id ? `/blogs/${id}` : '/blogs', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    closeModal();
    await reloadAll();
    alert('Đã lưu bài viết.');
  } catch (error) {
    alert(error.message);
  }
};
window.deleteBlog = async function (id) {
  if (!confirm('Xóa bài viết này?')) return;
  try {
    await api(`/blogs/${id}`, { method: 'DELETE' });
    await reloadAll();
    alert('Đã xóa bài viết.');
  } catch (error) {
    alert(error.message);
  }
};

// ===== Vai trò & phân quyền =====
const ACTION_LABELS = { view: 'Xem', create: 'Thêm', edit: 'Sửa', delete: 'Xóa' };
const MATRIX_COLUMNS = ['view', 'create', 'edit', 'delete'];
let selectedRole = null;

window.switchRoleTab = function (role) {
  selectedRole = role;
  renderRolesMatrix();
};

function renderRoleTabs() {
  const tabs = document.getElementById('rolesTabs');
  const data = state.rolesData;
  if (!tabs || !data) return;
  tabs.innerHTML = data.roles
    .map(
      (r) => `<button type="button" class="admin-tab ${r.key === selectedRole ? 'active' : ''}" onclick="switchRoleTab('${r.key}')">${escapeHtml(r.label)}</button>`
    )
    .join('');
}

function renderRolesMatrix() {
  const table = document.getElementById('rolesMatrix');
  const data = state.rolesData;
  if (!table || !data) return;
  renderRoleTabs();
  const roleDef = data.roles.find((r) => r.key === selectedRole) || data.roles[0];
  const editable = Boolean(roleDef?.editable) && can('roles', 'edit');
  const matrix = data.matrix[selectedRole] || {};

  const thead = `<thead><tr><th>Module</th>${MATRIX_COLUMNS.map((c) => `<th>${ACTION_LABELS[c]}</th>`).join('')}</tr></thead>`;
  const rows = data.modules
    .map((mod) => {
      const cells = MATRIX_COLUMNS.map((action) => {
        if (!mod.actions.includes(action)) return '<td class="perm-na">–</td>';
        const checked = matrix[mod.key]?.[action] ? 'checked' : '';
        const disabled = editable ? '' : 'disabled';
        return `<td><input type="checkbox" data-module="${mod.key}" data-action="${action}" ${checked} ${disabled}></td>`;
      }).join('');
      return `<tr><td>${escapeHtml(mod.label)}</td>${cells}</tr>`;
    })
    .join('');
  table.className = `admin-table roles-matrix${editable ? '' : ' readonly'}`;
  table.innerHTML = thead + `<tbody>${rows}</tbody>`;

  const hint = document.getElementById('rolesHint');
  if (hint) {
    if (!roleDef?.editable) hint.textContent = `${roleDef?.label || 'Vai trò này'} có toàn quyền hệ thống và không thể chỉnh sửa.`;
    else if (!can('roles', 'edit')) hint.textContent = `Bạn chỉ có quyền xem phân quyền của vai trò ${roleDef.label}.`;
    else hint.textContent = `Tích chọn quyền cho vai trò: ${roleDef.label}. Nhớ bấm "Lưu phân quyền".`;
  }
  const saveBtn = document.getElementById('rolesSaveBtn');
  if (saveBtn) saveBtn.style.display = editable ? '' : 'none';
}

async function renderRolesPage() {
  const table = document.getElementById('rolesMatrix');
  if (!table) return; // khong phai trang roles
  if (!can('roles', 'view')) {
    table.innerHTML = '<tbody><tr><td>Bạn không có quyền xem trang này.</td></tr></tbody>';
    return;
  }
  try {
    const data = await api('/roles');
    state.rolesData = data;
    if (!selectedRole || !data.roles.some((r) => r.key === selectedRole)) {
      const firstEditable = data.roles.find((r) => r.editable);
      selectedRole = (firstEditable || data.roles[0]).key;
    }
    renderRolesMatrix();
  } catch (error) {
    table.innerHTML = `<tbody><tr><td>${escapeHtml(error.message)}</td></tr></tbody>`;
  }
}

window.saveRolePermissions = async function () {
  if (!state.rolesData || !selectedRole) return;
  const roleDef = state.rolesData.roles.find((r) => r.key === selectedRole);
  if (!roleDef?.editable) return;
  const permissions = {};
  document.querySelectorAll('#rolesMatrix input[type="checkbox"]').forEach((cb) => {
    const mod = cb.dataset.module;
    const action = cb.dataset.action;
    if (!permissions[mod]) permissions[mod] = {};
    permissions[mod][action] = cb.checked;
  });
  try {
    await api(`/roles/${selectedRole}`, { method: 'PUT', body: JSON.stringify({ permissions }) });
    // Cap nhat lai du lieu va quyen cua chinh minh (phong khi sua vai tro cua minh).
    await refreshPermissions();
    await renderRolesPage();
    alert('Đã lưu phân quyền.');
  } catch (error) {
    alert(error.message);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('voucherType')?.addEventListener('change', updateVoucherValueLimit);
  updateVoucherValueLimit();
  // Lay quyen moi nhat tu server truoc khi render (phong khi admin vua doi phan quyen).
  await refreshPermissions();
  await reloadAll();

  // Tu dong tai lai du lieu moi 15 giay; dung khi tab bi an de tiet kiem tai nguyen.
  let pollTimer = null;
  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      await loadFromBackend();
      renderOrders();
      renderFeedbacks();
      renderNewsletterSubscribers();
      renderDashboard();
      showBackendStatus();
    }, 15000);
  }
  function stopPoll() {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPoll(); else startPoll();
  });
  startPoll();
});
