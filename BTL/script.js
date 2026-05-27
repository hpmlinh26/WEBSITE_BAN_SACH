// script.js - xử lý chung cho frontend MOT Manga Store.
(function () {
  const API_BASE = window.location.port === "3000" ? "/api" : "http://localhost:3000/api";
  const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  let appProducts = [];
  let appCategories = [];

  async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Lỗi kết nối API");
    return data;
  }

  async function fetchData() {
    try {
      const [products, categories] = await Promise.all([api("/products"), api("/categories")]);
      appProducts = products.map(normalizeProduct);
      appCategories = categories;
    } catch (error) {
      console.warn("Không kết nối backend, dùng data.js:", error.message);
      appProducts = (window.products || []).map(normalizeProduct);
      appCategories = window.categories || [];
    }
    window.products = appProducts;
    window.categories = appCategories;
  }

  function normalizeProduct(p) {
    return {
      ...p,
      title: p.title || p.name,
      name: p.name || p.title,
      originalPrice: p.originalPrice || p.original_price || p.price,
      category: p.category || p.category_slug,
      categoryName: p.categoryName || p.category_name || "Manga",
      image: p.image || "assets/images/Mangan.png"
    };
  }

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  }

  function getCart() {
    return JSON.parse(localStorage.getItem("motCart") || "{}");
  }

  function setCart(cart) {
    localStorage.setItem("motCart", JSON.stringify(cart));
    updateCartBadge();
  }

  function cartCount() {
    return Object.values(getCart()).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  function toast(message) {
    let box = qs(".mot-toast");
    if (!box) {
      box = document.createElement("div");
      box.className = "mot-toast";
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(box.timer);
    box.timer = setTimeout(() => box.classList.remove("show"), 1800);
  }

  function updateCartBadge() {
    qsa(".cart-box .badge").forEach(badge => {
      badge.textContent = cartCount();
    });
  }

  async function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const key = String(productId);
    cart[key] = Number(cart[key] || 0) + Number(quantity || 1);
    setCart(cart);

    const user = getCurrentUser();
    if (user?.id) {
      api("/cart", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, productId, quantity })
      }).catch(() => {});
    }
    toast("Đã thêm vào giỏ hàng");
  }

  function productCard(product, options = {}) {
    const action = options.compact ? "" : `<button class="btn-buy-now" data-buy="${product.id}">Mua</button>`;
    return `
      <article class="product-item functional-card" data-product-id="${product.id}" tabindex="0">
        <div class="product-image">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.src='assets/images/Mangan.png'">
          <span class="discount-badge">-${product.discount || 20}%</span>
        </div>
        <div class="product-info">
          <div class="product-rating">★★★★★</div>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <p class="product-author">${escapeHtml(product.author || "MOT Manga")}</p>
          <div class="product-price">
            <span class="price">${money(product.price)}</span>
            <span class="original-price">${money(product.originalPrice)}</span>
          </div>
          <div class="product-actions">
            ${action}
            <button class="btn-cart-icon" data-add-cart="${product.id}" aria-label="Thêm ${escapeHtml(product.name)} vào giỏ"><i class="fa-solid fa-cart-shopping"></i></button>
          </div>
        </div>
      </article>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function goProduct(id) {
    window.location.href = `product-detail.html?id=${id}`;
  }

  function initHeader() {
    qsa(".logo a").forEach(a => a.href = "index.html");
    qsa(".menu a").forEach(a => {
      const text = a.textContent.trim().toUpperCase();
      if (text.includes("TRANG CHỦ")) a.href = "index.html";
      if (text.includes("BLOG")) a.href = "blog.html";
      if (text.includes("LIÊN HỆ")) a.href = "contact.html";
    });

    qsa(".dropdown-btn").forEach(btn => {
      btn.type = "button";
      btn.addEventListener("click", () => {
        const wrapper = btn.closest(".dropdown-wrapper");
        wrapper?.classList.toggle("open");
      });
    });

    renderHeaderCategories();

    qsa(".search-box").forEach(box => {
      const input = qs("input", box);
      const button = qs("button", box);
      const submit = () => {
        const keyword = encodeURIComponent(input?.value.trim() || "");
        window.location.href = keyword ? `products.html?search=${keyword}` : "products.html";
      };
      button?.addEventListener("click", submit);
      input?.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    });

    qsa(".cart-box").forEach(cart => {
      cart.style.cursor = "pointer";
      cart.addEventListener("click", () => { window.location.href = "cart.html"; });
    });

    qsa(".user-circle, .icons .fa-user").forEach(icon => {
      icon.addEventListener("click", openUserMenu);
    });

    updateAuthUI();
    updateCartBadge();
  }

  function renderHeaderCategories() {
    qsa(".dropdown-menu").forEach(menu => {
      menu.innerHTML = `<p class="dropdown-title">DANH MỤC SẢN PHẨM</p>` + appCategories.map(c =>
        `<li><a href="products.html?category=${encodeURIComponent(c.slug)}">${escapeHtml(c.name)}</a></li>`
      ).join("");
    });
  }

  function openUserMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    qs(".user-menu-popover")?.remove();
    const user = getCurrentUser();
    if (!user) {
      if (window.openAuth) window.openAuth();
      return;
    }
    const pop = document.createElement("div");
    pop.className = "user-menu-popover";
    pop.innerHTML = `
      <strong>${escapeHtml(user.fullName || "Tài khoản")}</strong>
      <span>${escapeHtml(user.email || user.phone || "Khách hàng")}</span>
      <a href="accounts.html">Hồ sơ cá nhân</a>
      ${user.role === "admin" ? `<a href="products-manager.html">Trang quản trị</a>` : ""}
      <button type="button" id="logoutBtn">Đăng xuất</button>`;
    document.body.appendChild(pop);
    const rect = event.currentTarget.getBoundingClientRect();
    pop.style.top = `${rect.bottom + window.scrollY + 10}px`;
    pop.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    qs("#logoutBtn", pop).addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      pop.remove();
      updateAuthUI();
      toast("Đã đăng xuất");
    });
  }

  function updateAuthUI() {
    const user = getCurrentUser();
    qsa(".btn-login").forEach(btn => {
      btn.textContent = user ? (user.fullName || "Tài khoản") : "Login";
      btn.onclick = user ? openUserMenu : window.openAuth;
    });
  }

  function bindProductClicks(root = document) {
    qsa("[data-product-id]", root).forEach(card => {
      if (card.dataset.boundCard === "1") return;
      card.dataset.boundCard = "1";
      card.addEventListener("click", e => {
        if (e.target.closest("button")) return;
        goProduct(card.dataset.productId);
      });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter") goProduct(card.dataset.productId);
      });
    });
    qsa("[data-add-cart]", root).forEach(btn => {
      if (btn.dataset.boundAdd === "1") return;
      btn.dataset.boundAdd = "1";
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(Number(btn.dataset.addCart));
      });
    });
    qsa("[data-buy]", root).forEach(btn => {
      if (btn.dataset.boundBuy === "1") return;
      btn.dataset.boundBuy = "1";
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(Number(btn.dataset.buy));
        window.location.href = "cart.html";
      });
    });
  }

  function initHomePage() {
    const flashGrid = qs(".flash-sale-section .products-grid");
    if (flashGrid) {
      flashGrid.innerHTML = appProducts.slice(0, 5).map(p => productCard(p)).join("");
      bindProductClicks(flashGrid);
    }

    const categoryGrid = qs(".category-grid");
    if (categoryGrid) {
      categoryGrid.innerHTML = appCategories.map(c => `
        <a class="category-item" href="products.html?category=${encodeURIComponent(c.slug)}">
          <div class="category-image"><img src="${c.image || 'assets/images/Mangan.png'}" alt="${escapeHtml(c.name)}" onerror="this.src='assets/images/Mangan.png'"></div>
          <p class="category-name">${escapeHtml(c.name)}</p>
        </a>`).join("");
    }

    const trendingGrid = qs(".trending-products .products-grid, .trending-section .products-grid");
    if (trendingGrid) {
      trendingGrid.innerHTML = appProducts.slice(2, 7).map(p => productCard(p, { compact: true })).join("");
      bindProductClicks(trendingGrid);
    }

    qsa(".btn-view-more").forEach(a => { a.href = "products.html"; });
    initSliderAndCountdown();
  }

  function initProductsPage() {
    const container = qs("#list-container") || qs(".products-page-grid") || qs(".products-grid[data-page='products']");
    if (!container || !document.body.classList.contains("products-page")) return;
    const params = new URLSearchParams(location.search);
    const search = params.get("search") || "";
    const selectedCategory = params.get("category") || "";
    const searchInput = qs("#searchInput");
    const categorySelect = qs("#categoryFilter");
    const title = qs(".products-page-title");
    if (searchInput) searchInput.value = search;
    if (categorySelect) {
      categorySelect.innerHTML = `<option value="">Tất cả danh mục</option>` + appCategories.map(c => `<option value="${c.slug}">${escapeHtml(c.name)}</option>`).join("");
      categorySelect.value = selectedCategory;
    }

    function render() {
      const keyword = (searchInput?.value || "").trim().toLowerCase();
      const cat = categorySelect?.value || "";
      const list = appProducts.filter(p => {
        const matchText = !keyword || [p.name, p.author, p.categoryName].join(" ").toLowerCase().includes(keyword);
        const matchCat = !cat || p.category === cat;
        return matchText && matchCat;
      });
      if (title) title.textContent = cat ? (appCategories.find(c => c.slug === cat)?.name || "Sản phẩm") : "Tất cả sản phẩm";
      container.innerHTML = list.length ? list.map(p => productCard(p)).join("") : `<p class="empty-state">Không tìm thấy sản phẩm phù hợp.</p>`;
      bindProductClicks(container);
    }
    searchInput?.addEventListener("input", render);
    categorySelect?.addEventListener("change", render);
    render();
  }

  function initProductDetailPage() {
    const box = qs("#productDetailRoot");
    if (!box) return;
    const id = Number(new URLSearchParams(location.search).get("id")) || 1;
    const product = appProducts.find(p => Number(p.id) === id) || appProducts[0];
    if (!product) return;
    box.innerHTML = `
      <div class="product-detail-card">
        <div class="detail-image"><img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.src='assets/images/Mangan.png'"></div>
        <div class="detail-info">
          <p class="breadcrumb"><a href="index.html">Trang chủ</a> / <a href="products.html">Sản phẩm</a> / ${escapeHtml(product.name)}</p>
          <h1>${escapeHtml(product.name)}</h1>
          <p class="detail-author">Tác giả: ${escapeHtml(product.author || "MOT Manga")}</p>
          <p class="detail-category">Danh mục: ${escapeHtml(product.categoryName || appCategories.find(c => c.slug === product.category)?.name || "Manga")}</p>
          <div class="detail-price"><span>${money(product.price)}</span><del>${money(product.originalPrice)}</del><b>-${product.discount || 20}%</b></div>
          <p class="detail-desc">${escapeHtml(product.description || "Sản phẩm manga đang được bán tại MOT.vn.")}</p>
          <div class="detail-actions">
            <button class="btn-add-cart" data-add-cart="${product.id}"><i class="fa-solid fa-cart-shopping"></i> Thêm giỏ</button>
            <button class="btn-buy-now detail-buy" data-buy="${product.id}">Mua ngay</button>
          </div>
        </div>
      </div>`;
    bindProductClicks(box);

    const related = qs("#relatedProducts");
    if (related) {
      related.innerHTML = appProducts.filter(p => p.id !== product.id).slice(0, 5).map(p => productCard(p, { compact: true })).join("");
      bindProductClicks(related);
    }
  }

  function initCartPage() {
    const root = qs("#cartRoot");
    if (!root) return;
    function render() {
      const cart = getCart();
      const items = Object.entries(cart)
        .map(([id, qty]) => ({ product: appProducts.find(p => Number(p.id) === Number(id)), qty: Number(qty) }))
        .filter(item => item.product && item.qty > 0);
      const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
      root.innerHTML = `
        <div class="cart-layout">
          <section class="cart-list-card">
            <h1>Giỏ hàng <span>(${items.length} sản phẩm)</span></h1>
            ${items.length ? items.map(item => `
              <div class="cart-row" data-cart-id="${item.product.id}">
                <img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" onerror="this.src='assets/images/Mangan.png'">
                <div class="cart-row-info">
                  <h3>${escapeHtml(item.product.name)}</h3>
                  <p>${escapeHtml(item.product.author || "MOT Manga")}</p>
                  <strong>${money(item.product.price)}</strong> <del>${money(item.product.originalPrice)}</del>
                </div>
                <div class="qty-control">
                  <button data-cart-minus="${item.product.id}">-</button>
                  <input value="${item.qty}" data-cart-qty="${item.product.id}" inputmode="numeric">
                  <button data-cart-plus="${item.product.id}">+</button>
                </div>
                <strong class="cart-subtotal">${money(item.product.price * item.qty)}</strong>
                <button class="item-remove" data-cart-remove="${item.product.id}"><i class="fa-solid fa-trash"></i></button>
              </div>`).join("") : `<div class="empty-cart"><p>Giỏ hàng đang trống.</p><a href="products.html">Mua manga ngay</a></div>`}
          </section>
          <aside class="cart-summary-card">
            <h2>Thanh toán</h2>
            <div><span>Tạm tính</span><strong>${money(total)}</strong></div>
            <div><span>Phí vận chuyển</span><strong>Miễn phí</strong></div>
            <div class="summary-total"><span>Tổng tiền</span><strong>${money(total)}</strong></div>
            <button class="btn-checkout" ${items.length ? "" : "disabled"}>Thanh Toán</button>
          </aside>
        </div>`;
      bindCartEvents();
      updateCartBadge();
    }

    function bindCartEvents() {
      qsa("[data-cart-minus]").forEach(btn => btn.addEventListener("click", () => changeQty(btn.dataset.cartMinus, -1)));
      qsa("[data-cart-plus]").forEach(btn => btn.addEventListener("click", () => changeQty(btn.dataset.cartPlus, 1)));
      qsa("[data-cart-remove]").forEach(btn => btn.addEventListener("click", () => removeItem(btn.dataset.cartRemove)));
      qsa("[data-cart-qty]").forEach(input => input.addEventListener("change", () => setQty(input.dataset.cartQty, Number(input.value || 1))));
      qs(".btn-checkout")?.addEventListener("click", () => { window.location.href = "pay.html"; });
    }

    function changeQty(id, delta) {
      const cart = getCart();
      cart[id] = Math.max(1, Number(cart[id] || 1) + delta);
      setCart(cart);
      render();
    }
    function setQty(id, qty) {
      const cart = getCart();
      cart[id] = Math.max(1, qty || 1);
      setCart(cart);
      render();
    }
    function removeItem(id) {
      const cart = getCart();
      delete cart[id];
      setCart(cart);
      render();
    }
    render();
  }



  function initPayPage() {
    const orderList = qs(".order-items-list");
    const confirmBtn = qs("#btn-confirm-checkout");
    if (!orderList || !confirmBtn) return;

    const addressForm = qs("#address-form");
    const paymentForm = qs("#payment-form");
    const promoInput = qs("#promo-input");
    const promoButton = qs("#btn-apply-promo");
    const user = getCurrentUser();
    let appliedVoucher = null;

    const requiredMap = {
      firstName: "Vui lòng nhập họ.",
      lastName: "Vui lòng nhập tên.",
      phone: "Vui lòng nhập số điện thoại.",
      city: "Vui lòng chọn tỉnh/thành phố.",
      district: "Vui lòng nhập quận/huyện.",
      ward: "Vui lòng nhập xã/phường.",
      address: "Vui lòng nhập địa chỉ cụ thể."
    };

    function setInlineError(message) {
      let box = qs("#checkoutErrorBox");
      if (!box) {
        box = document.createElement("div");
        box.id = "checkoutErrorBox";
        box.className = "checkout-error-box";
        confirmBtn.parentElement?.prepend(box);
      }
      box.textContent = message || "";
      box.style.display = message ? "block" : "none";
    }

    function cartItems() {
      return Object.entries(getCart())
        .map(([id, qty]) => ({ product: appProducts.find(p => Number(p.id) === Number(id)), qty: Math.max(1, Number(qty || 1)) }))
        .filter(item => item.product);
    }

    function subtotal() {
      return cartItems().reduce((sum, item) => sum + item.product.price * item.qty, 0);
    }

    function totalAfterVoucher() {
      return Math.max(0, subtotal() - Number(appliedVoucher?.discount || 0));
    }

    function renderOrder() {
      const items = cartItems();
      const beforeDiscount = subtotal();
      const discount = Number(appliedVoucher?.discount || 0);
      const finalTotal = totalAfterVoucher();
      if (!items.length) {
        orderList.innerHTML = `<div class="checkout-empty"><p>Chưa có sản phẩm nào trong giỏ hàng.</p><a href="products.html">Chọn sản phẩm</a></div>`;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "GIỎ HÀNG ĐANG TRỐNG";
        return;
      }
      confirmBtn.disabled = false;
      confirmBtn.textContent = "XÁC NHẬN THANH TOÁN";
      orderList.innerHTML = items.map(item => `
        <div class="order-item checkout-item" data-product-id="${item.product.id}">
          <div class="item-image"><img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" onerror="this.src='assets/images/placeholder-cover.svg'"></div>
          <div class="item-info">
            <h3 class="item-title">${escapeHtml(item.product.name)}</h3>
            <p>${escapeHtml(item.product.author || 'MOT.vn')}</p>
          </div>
          <div class="item-price-block"><span class="current-price">${money(item.product.price)}</span><span class="old-price">${money(item.product.originalPrice)}</span></div>
          <div class="item-quantity">x${item.qty}</div>
          <div class="item-total">${money(item.product.price * item.qty)}</div>
        </div>`).join("") + `
        <div class="checkout-total-row"><span>Tạm tính</span><strong>${money(beforeDiscount)}</strong></div>
        ${discount ? `<div class="checkout-total-row voucher-row"><span>Voucher ${escapeHtml(appliedVoucher.code)}</span><strong>-${money(discount)}</strong></div>` : ""}
        <div class="checkout-total-row final-total"><span>Tổng thanh toán</span><strong>${money(finalTotal)}</strong></div>`;
    }

    function field(name) {
      return addressForm?.querySelector(`[name="${name}"]`) || addressForm?.querySelector(`#${name}`);
    }

    function validateCustomerForm() {
      setInlineError("");
      const values = {};
      for (const key of Object.keys(requiredMap)) {
        const input = field(key);
        values[key] = (input?.value || "").trim();
        input?.classList.remove("field-invalid");
        if (!values[key]) {
          input?.classList.add("field-invalid");
          input?.focus();
          setInlineError(requiredMap[key]);
          addressForm?.reportValidity?.();
          return null;
        }
      }
      if (!/^[0-9]{9,11}$/.test(values.phone.replace(/\s+/g, ""))) {
        const input = field("phone");
        input?.classList.add("field-invalid");
        input?.focus();
        setInlineError("Số điện thoại phải gồm 9-11 chữ số.");
        return null;
      }
      const emailInput = field("email");
      const email = (emailInput?.value || user?.email || "").trim();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        emailInput?.classList.add("field-invalid");
        emailInput?.focus();
        setInlineError("Email không hợp lệ.");
        return null;
      }
      return {
        name: `${values.firstName} ${values.lastName}`.trim(),
        phone: values.phone,
        email,
        address: [values.address, values.ward, values.district, values.city, "Việt Nam"].filter(Boolean).join(", ")
      };
    }

    async function applyPromo() {
      const code = (promoInput?.value || "").trim();
      if (!code) return toast("Vui lòng nhập mã khuyến mãi.");
      try {
        appliedVoucher = await api("/vouchers/apply", { method: "POST", body: JSON.stringify({ code, total: subtotal() }) });
        toast(`Đã áp dụng mã ${appliedVoucher.code}`);
        renderOrder();
      } catch (error) {
        appliedVoucher = null;
        renderOrder();
        alert(error.message);
      }
    }

    async function submitOrder() {
      const items = cartItems();
      if (!items.length) return toast("Giỏ hàng đang trống.");
      const customer = validateCustomerForm();
      if (!customer) return;
      const paymentMethod = paymentForm?.querySelector("input[name='payment']:checked")?.value || "cod";
      confirmBtn.disabled = true;
      confirmBtn.textContent = "ĐANG TẠO ĐƠN...";
      const payload = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        shippingAddress: customer.address,
        paymentMethod,
        voucherCode: appliedVoucher?.code || "",
        items: items.map(item => ({ productId: item.product.id, quantity: item.qty }))
      };
      try {
        let order;
        try {
          order = await api("/orders", { method: "POST", body: JSON.stringify(payload) });
          if (user?.id) api(`/cart/by-user/${user.id}`, { method: "DELETE" }).catch(() => {});
        } catch (backendError) {
          const localOrders = JSON.parse(localStorage.getItem("motOrders") || "[]");
          order = { id: Date.now(), ...payload, total: totalAfterVoucher(), status: "pending" };
          localOrders.unshift(order);
          localStorage.setItem("motOrders", JSON.stringify(localOrders));
        }
        setCart({});
        localStorage.setItem("lastOrderId", String(order.id));
        alert(`Đặt hàng thành công! Mã đơn: #${order.id}. Bạn có thể in hóa đơn điện tử ở trang tiếp theo.`);
        window.location.href = `invoice.html?orderId=${order.id}`;
      } catch (error) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "XÁC NHẬN THANH TOÁN";
        alert(error.message || "Không thể tạo đơn hàng.");
      }
    }

    addressForm?.addEventListener("submit", e => { e.preventDefault(); if (validateCustomerForm()) toast("Đã lưu địa chỉ giao hàng."); });
    paymentForm?.addEventListener("submit", e => { e.preventDefault(); toast("Đã lưu phương thức thanh toán."); });
    promoButton?.addEventListener("click", applyPromo);
    confirmBtn.addEventListener("click", submitOrder);

    if (user) {
      const parts = String(user.fullName || "").split(" ");
      if (field("firstName") && parts.length > 1) field("firstName").value = parts.slice(0, -1).join(" ");
      if (field("lastName")) field("lastName").value = parts.length > 1 ? parts.slice(-1).join(" ") : (user.fullName || "");
      if (field("phone") && user.phone) field("phone").value = user.phone;
      if (field("email") && user.email) field("email").value = user.email;
    }
    renderOrder();
  }

  function initSliderAndCountdown() {
    let slideIndex = 0;
    setInterval(() => {
      const slides = qsa(".slide");
      if (!slides.length) return;
      slides.forEach(s => s.classList.remove("active"));
      slideIndex = (slideIndex + 1) % slides.length;
      slides[slideIndex].classList.add("active");
    }, 3000);

    setInterval(() => {
      qsa(".countdown-timer").forEach(timer => {
        const boxes = qsa(".time-box", timer);
        if (boxes.length !== 3) return;
        let h = Number(boxes[0].textContent) || 0;
        let m = Number(boxes[1].textContent) || 0;
        let s = Number(boxes[2].textContent) || 0;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) h = 23;
        boxes[0].textContent = String(h).padStart(2, "0");
        boxes[1].textContent = String(m).padStart(2, "0");
        boxes[2].textContent = String(s).padStart(2, "0");
      });
    }, 1000);
  }

  window.redirectToDetail = goProduct;
  window.addToCart = addToCart;
  window.updateCartBadge = updateCartBadge;
  window.refreshAuthUI = updateAuthUI;

  document.addEventListener("click", e => {
    if (!e.target.closest(".user-menu-popover") && !e.target.closest(".user-circle") && !e.target.closest(".fa-user")) {
      qs(".user-menu-popover")?.remove();
    }
    if (!e.target.closest(".dropdown-wrapper")) {
      qsa(".dropdown-wrapper.open").forEach(el => el.classList.remove("open"));
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await fetchData();
    initHeader();
    initHomePage();
    initProductsPage();
    initProductDetailPage();
    initCartPage();
    initPayPage();
    bindProductClicks(document);
  });
})();
