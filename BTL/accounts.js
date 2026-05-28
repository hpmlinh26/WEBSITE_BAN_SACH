/**
 * ACCOUNTS - CONSOLIDATED JAVASCRIPT
 * All JavaScript logic for account management merged into single file
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // ==================================================================================
    // 1. DROPDOWN MENU CONTROL - THÔNG TIN TÀI KHOẢN
    // ==================================================================================
    const menuGroup = document.querySelector('.user-profile-dashboard .menu-item-group');
    const groupHeader = document.querySelector('.user-profile-dashboard .menu-item-header');
    const arrowIcon = groupHeader ? groupHeader.querySelector('.arrow-icon') : null;

    if (groupHeader && menuGroup) {
        // Mặc định mở menu khi vào trang
        menuGroup.classList.add('active');

        groupHeader.addEventListener('click', function(e) {
            e.preventDefault();
            menuGroup.classList.toggle('active');
        });
    }

    // ==================================================================================
    // 2. TAB SWITCHING - CHUYỂN ĐỔI QUA LẠI GIỮA CÁC FORM
    // ==================================================================================
    const submenuItems = document.querySelectorAll('.user-profile-dashboard .submenu-item');
    const standaloneMenuItems = document.querySelectorAll('.user-profile-dashboard .sidebar-menu > .menu-item');
    const allTabContents = document.querySelectorAll('.user-profile-dashboard .tab-content');

    function switchTabContent(clickedItem) {
        const targetId = clickedItem.getAttribute('data-target');
        if (!targetId) return;

        // Xóa active từ tất cả mục
        submenuItems.forEach(el => el.classList.remove('active'));
        standaloneMenuItems.forEach(el => el.classList.remove('active'));

        // Thêm active vào mục vừa click
        clickedItem.classList.add('active');

        // Ẩn toàn bộ form
        allTabContents.forEach(tab => tab.classList.remove('active'));

        // Hiển thị form tương ứng
        const targetForm = document.getElementById(targetId);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    // Lắng nghe sự kiện cho submenu items
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            switchTabContent(this);
        });
    });

    // Lắng nghe sự kiện cho standalone menu items
    standaloneMenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchTabContent(this);
        });
    });

    // ==================================================================================
    // 3. PASSWORD VISIBILITY TOGGLE - ICON MẮT ẨN/HIỆN MẬT KHẨU
    // ==================================================================================
    const togglePasswordIcons = document.querySelectorAll('.user-profile-dashboard .toggle-password');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.classList.remove('fa-regular', 'fa-eye');
                    this.classList.add('fa-solid', 'fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    this.classList.remove('fa-solid', 'fa-eye-slash');
                    this.classList.add('fa-regular', 'fa-eye');
                }
            }
        });
    });

    // ==================================================================================
    // 4. FORM VALIDATION & SUBMISSION
    // ==================================================================================
    const allForms = document.querySelectorAll('.user-profile-dashboard .profile-form');

    allForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const requiredFields = form.querySelectorAll('input, select');
            let isFormValid = true;

            requiredFields.forEach(field => {
                const formGroup = field.closest('.form-group');
                if (formGroup && formGroup.querySelector('.required')) {
                    if (!field.value.trim()) {
                        field.style.borderColor = '#c92127';
                        isFormValid = false;
                    } else {
                        field.style.borderColor = '#dddddd';
                    }
                }
            });

            if (!isFormValid) {
                alert('Vui lòng kiểm tra lại và điền đầy đủ các thông tin bắt buộc (*).');
                return;
            }

            const submitBtn = form.querySelector('.btn-submit-profile');
            if (submitBtn) {
                const originalText = submitBtn.innerText;
                submitBtn.innerText = 'ĐANG XỬ LÝ...';
                submitBtn.style.opacity = '0.7';
                submitBtn.disabled = true;

                setTimeout(() => {
                    alert('Dữ liệu của bạn đã được cập nhật thành công!');
                    submitBtn.innerText = originalText;
                    submitBtn.style.opacity = '1';
                    submitBtn.disabled = false;
                }, 1200);
            }
        });
    });

    // ==================================================================================
    // 5. ORDER TABS - CHUYỂN ĐỔITRẠNG THÁI ĐƠN HÀNG
    // ==================================================================================
    const orderTabsContainer = document.querySelector('.order-tabs');
    if (orderTabsContainer) {
        const orderTabs = orderTabsContainer.querySelectorAll('.tab-item');
        const orderItems = document.querySelectorAll('.order-item');

        orderTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                orderTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const filter = this.getAttribute('data-filter');
                orderItems.forEach(item => {
                    if (filter === 'all' || item.getAttribute('data-status') === filter) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // ==================================================================================
    // 6. NOTIFICATION TABS - LỌCTHÔNG BÁO
    // ==================================================================================
    const notificationTabsContainer = document.querySelector('.notification-tabs');
    if (notificationTabsContainer) {
        const notificationTabs = notificationTabsContainer.querySelectorAll('.tab-item');
        const notificationItems = document.querySelectorAll('.notification-item');

        notificationTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                notificationTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const filter = this.getAttribute('data-filter');
                notificationItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filter === 'all' || category === filter) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // ==================================================================================
    // 7. VOUCHER TABS & COPY BUTTON
    // ==================================================================================
    const voucherTabsContainer = document.querySelector('.voucher-tabs');
    if (voucherTabsContainer) {
        const voucherTabs = voucherTabsContainer.querySelectorAll('.tab-item');
        
        voucherTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                voucherTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // COPY VOUCHER CODE
    const copyButtons = document.querySelectorAll('.btn-copy');
    copyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const code = this.getAttribute('data-code');

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = this.innerText;
                    this.innerText = 'Đã copy';
                    this.classList.add('copied');
                    this.disabled = true;

                    setTimeout(() => {
                        this.innerText = originalText;
                        this.classList.remove('copied');
                        this.disabled = false;
                    }, 2000);
                });
            }
        });
    });

    // ==================================================================================
    // 8. GLOBAL FUNCTION FOR FORM SUBMISSION (From account.5.js)
    // ==================================================================================
    window.handleFormSubmit = function(event) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('.btn-submit-profile');
        
        if (submitBtn) {
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'ĐANG XỬ LÝ...';
            submitBtn.style.opacity = '0.7';
            submitBtn.disabled = true;

            setTimeout(() => {
                alert('Dữ liệu của bạn đã được cập nhật thành công!');
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }, 1200);
        }
    };
});


// ==================================================================================
// 9. LOAD ĐƠN HÀNG THẬT TỪ BACKEND / LOCALSTORAGE
// ==================================================================================
(function initUserOrdersFromData(){
    const API_BASE = window.location.port === "3000" ? "/api" : "http://localhost:3000/api";
    const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
    const statusText = { pending: "Chờ lấy hàng", packing: "Đang chuẩn bị", shipping: "Chờ giao hàng", completed: "Đã giao", return: "Trả hàng", cancelled: "Hủy" };
    const statusFilterMap = { pending: "pending", packing: "pending", shipping: "shipping", completed: "delivered", return: "return", cancelled: "return" };
    let loadedOrderDetails = [];
    const img = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return "assets/images/placeholder-cover.svg";
        if (/^(https?:|data:|assets\/)/i.test(raw)) return raw;
        if (/^sach-\d+\./i.test(raw)) return `assets/products/${raw}`;
        return `assets/images/${raw}`;
    };

    async function api(path){
        const res = await fetch(API_BASE + path);
        const data = await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.message || "Không tải được dữ liệu");
        return data;
    }

    async function loadOrders(){
        const wrap = document.getElementById("userOrdersList");
        if(!wrap) return;
        try{
            const orders = await api("/orders");
            const details = await Promise.all(orders.slice(0, 8).map(o => api(`/orders/${o.id}`).catch(()=>({ ...o, items: [] }))));
            renderOrders(details);
        }catch(error){
            const localOrders = JSON.parse(localStorage.getItem("motOrders") || "[]");
            renderOrders(localOrders);
        }
    }

    function renderOrders(orders){
        loadedOrderDetails = orders || [];
        window.__motUserOrders = loadedOrderDetails;
        const wrap = document.getElementById("userOrdersList");
        if(!wrap) return;
        if(!orders.length){
            wrap.innerHTML = `<div class="order-card empty-user-order"><p>Bạn chưa có đơn hàng nào.</p><a href="products.html">Mua ngay</a></div>`;
            return;
        }
        wrap.innerHTML = orders.map(order => {
            const filter = statusFilterMap[order.status] || "pending";
            const items = order.items || [];
            return `<div class="order-card dynamic-order-card" data-status="${filter}">
                <div class="order-card-header">
                    <div><strong>Đơn hàng #${order.id}</strong><span>${order.date || String(order.createdAt || '').slice(0,10)}</span></div>
                    <span class="order-status-tag">${statusText[order.status] || order.status || 'Chờ xử lý'}</span>
                </div>
                <div class="order-detail-preview">
                    ${items.map(item => `<div class="order-item dynamic-order-item">
                        <div class="product-info">
                            <img src="${img(item.image)}" alt="${item.productName || item.name}" class="product-image" onerror="this.src='assets/images/placeholder-cover.svg'">
                            <div class="product-details"><h4 class="product-name">${item.productName || item.name}</h4><p>${item.author || 'MOT Store'}</p></div>
                        </div>
                        <div class="product-price-qty">
                            <div class="price-box"><span class="current-price">${money(item.price)}</span><span class="old-price">${money(item.originalPrice || item.price)}</span></div>
                            <div class="quantity">x${item.quantity}</div>
                            <div class="total-item-price">${money(item.subtotal || item.price * item.quantity)}</div>
                        </div>
                    </div>`).join('') || '<p>Đơn hàng chưa có sản phẩm chi tiết.</p>'}
                </div>
                <div class="delivery-notice-box"><div class="notice-badge">Ngày giao hàng dự kiến: 20 Tháng 05</div><p class="notice-subtext">Tổng thanh toán: <b>${money(order.total)}</b></p></div>
                <div class="order-footer-actions"><button class="btn-order-action" onclick="openUserOrderDetail(${order.id})">Xem chi tiết</button><a class="btn-order-action muted" href="invoice.html?orderId=${order.id}">Xuất hóa đơn</a></div>
            </div>`;
        }).join('');
        bindOrderTabsAgain();
    }


    window.openUserOrderDetail = function(orderId){
        const order = (window.__motUserOrders || []).find(o => Number(o.id) === Number(orderId));
        if(!order) return alert("Không tìm thấy đơn hàng.");
        let modal = document.getElementById("userOrderModal");
        if(!modal){
            modal = document.createElement("div");
            modal.id = "userOrderModal";
            modal.className = "user-order-modal";
            document.body.appendChild(modal);
        }
        const items = order.items || [];
        modal.innerHTML = `<div class="user-order-modal-card">
            <button class="user-order-close" onclick="document.getElementById('userOrderModal').classList.remove('show')">&times;</button>
            <h2>Chi tiết đơn hàng #${order.id}</h2>
            <div class="user-order-meta"><p><b>Trạng thái:</b> ${statusText[order.status] || order.status}</p><p><b>Tổng tiền:</b> ${money(order.total)}</p><p><b>Địa chỉ:</b> ${order.shippingAddress || 'Chưa có địa chỉ'}</p></div>
            <div class="user-order-modal-items">
                ${items.map(item => `<div class="user-order-modal-item"><img src="${img(item.image)}" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${item.productName || item.name}"><div><h4>${item.productName || item.name}</h4><p>${item.author || 'MOT Store'} • SL: ${item.quantity}</p></div><strong>${money(item.subtotal || item.price * item.quantity)}</strong></div>`).join('') || '<p>Đơn hàng chưa có sản phẩm.</p>'}
            </div>
            <div class="user-order-modal-actions"><a href="invoice.html?orderId=${order.id}" class="btn-order-action">Xuất hóa đơn điện tử</a></div>
        </div>`;
        modal.classList.add("show");
    };

    function bindOrderTabsAgain(){
        const container = document.querySelector('.order-tabs');
        if(!container) return;
        const tabs = container.querySelectorAll('.tab-item');
        tabs.forEach(tab => {
            tab.onclick = function(){
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const filter = this.getAttribute('data-filter');
                document.querySelectorAll('.dynamic-order-card').forEach(card => {
                    card.style.display = (filter === 'all' || card.getAttribute('data-status') === filter) ? 'block' : 'none';
                });
            };
        });
    }


    async function loadWishlist(){
        const grid = document.getElementById("wishlistGrid");
        if(!grid) return;
        try{
            const ids = JSON.parse(localStorage.getItem("motWishlist") || "[]").map(Number);
            if(!ids.length){
                grid.innerHTML = '<div class="empty-wishlist">Bạn chưa có sản phẩm yêu thích nào. Hãy bấm biểu tượng trái tim ở trang sản phẩm để lưu lại.</div>';
                return;
            }
            const products = await api("/products");
            const selected = products.filter(p => ids.includes(Number(p.id)));
            if(!selected.length){
                grid.innerHTML = '<div class="empty-wishlist">Danh sách yêu thích đang trống.</div>';
                return;
            }
            grid.innerHTML = selected.map(p => `<div class="wishlist-card" data-wish-card="${p.id}">
                <img src="${img(p.image)}" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${p.name}">
                <h3>${p.name}</h3>
                <p>${money(p.price)}</p>
                <div class="wishlist-actions">
                    <a href="product-detail.html?id=${p.id}">Xem chi tiết</a>
                    <button type="button" data-remove-wish="${p.id}">Bỏ thích</button>
                </div>
            </div>`).join('');
            grid.querySelectorAll('[data-remove-wish]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.dataset.removeWish);
                    const next = JSON.parse(localStorage.getItem("motWishlist") || "[]").map(Number).filter(x => x !== id);
                    localStorage.setItem("motWishlist", JSON.stringify(next));
                    loadWishlist();
                });
            });
        }catch(error){
            grid.innerHTML = '<div class="empty-wishlist">Chưa tải được danh sách yêu thích.</div>';
        }
    }


    async function loadVouchers(){
        const grid = document.getElementById("userVoucherGrid");
        if(!grid) return;
        try{
            const vouchers = await api("/vouchers");
            const active = vouchers.filter(v => v.active !== false);
            if(!active.length) return;
            grid.innerHTML = active.map(v => `<div class="voucher-card">
                <div class="voucher-left"><span class="voucher-ticket-text">%</span></div>
                <div class="voucher-right">
                    <h3 class="voucher-title">${v.title}</h3>
                    <p class="voucher-desc">${v.description || 'Mã ưu đãi từ MOT Store'}</p>
                    <div class="voucher-footer"><div class="code-box"><span class="code-text">${v.code}</span><span class="expiry">HSD: ${v.expiresAt || 'Không giới hạn'}</span></div><button class="btn-copy" data-code="${v.code}" onclick="navigator.clipboard?.writeText('${v.code}'); this.innerText='Đã copy';">Copy mã</button></div>
                </div>
            </div>`).join('');
        }catch(error){}
    }

    document.addEventListener('DOMContentLoaded', () => { loadOrders(); loadVouchers(); loadWishlist(); });
})();


// V15: mở đúng tab tài khoản từ link header, ví dụ accounts.html?tab=form-thong-bao
(function openAccountTabFromQuery(){
  function activateTargetTab(targetId){
    if(!targetId) return;
    const target = document.getElementById(targetId);
    if(!target) return;
    document.querySelectorAll('.user-profile-dashboard .submenu-item, .user-profile-dashboard .sidebar-menu > .menu-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.user-profile-dashboard .tab-content').forEach(tab => tab.classList.remove('active'));
    target.classList.add('active');
    const trigger = document.querySelector(`.user-profile-dashboard [data-target="${targetId}"]`);
    if(trigger){
      trigger.classList.add('active');
      const group = trigger.closest('.menu-item-group');
      if(group) group.classList.add('active');
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if(tab) setTimeout(() => activateTargetTab(tab), 60);
  });
})();
