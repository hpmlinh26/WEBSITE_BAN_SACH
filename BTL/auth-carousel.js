// auth-carousel.js - modal đăng nhập/đăng ký tự gắn vào mọi trang.
(function () {
  const API_BASE = window.location.port === "3000" ? "/api" : "http://localhost:3000/api";

  function ensureAuthModal() {
    if (document.getElementById("authModal")) return;
    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className = "modal-overlay-bg";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="auth-modal">
        <button class="auth-close" type="button" onclick="closeAuth()">&times;</button>
        <div class="auth-tabs">
          <button class="tab-item active" id="tab-login" type="button" onclick="switchTab('login',0)">Đăng nhập</button>
          <button class="tab-item" id="tab-register" type="button" onclick="switchTab('register',1)">Đăng ký</button>
        </div>
        <div class="auth-window">
          <div class="auth-carousel" id="authCarousel">
            <section class="auth-slide">
              <label>Số điện thoại/Email</label>
              <input type="text" id="loginEmail" placeholder="admin@mot.vn hoặc user@mot.vn">
              <label>Mật khẩu</label>
              <div class="password-line"><input type="password" id="loginPassword" placeholder="123456"><button type="button" onclick="togglePassword(this)">Hiện</button></div>
              <div id="errorBox" class="error-box" style="display:none"><b>Tài khoản hoặc mật khẩu không đúng!</b></div>
              <button class="auth-primary" type="button" onclick="handleLogin()">Đăng nhập</button>
              <button class="auth-secondary" type="button" onclick="switchTab('forgot',2)">Quên mật khẩu?</button>
              <p class="auth-hint">Admin demo: admin@mot.vn / 123456</p>
            </section>
            <section class="auth-slide">
              <label>Họ tên</label>
              <input type="text" id="regName" placeholder="Nhập họ tên">
              <label>Số điện thoại</label>
              <input type="text" id="regPhone" placeholder="Nhập số điện thoại">
              <label>Email</label>
              <input type="email" id="regEmail" placeholder="Nhập email">
              <label>Mật khẩu</label>
              <div class="password-line"><input type="password" id="regPassword" placeholder="Nhập mật khẩu"><button type="button" onclick="togglePassword(this)">Hiện</button></div>
              <label>Nhập lại mật khẩu</label>
              <div class="password-line"><input type="password" id="regPasswordConfirm" placeholder="Nhập lại mật khẩu"><button type="button" onclick="togglePassword(this)">Hiện</button></div>
              <button class="auth-primary" type="button" onclick="handleRegister()">Đăng ký</button>
            </section>
            <section class="auth-slide">
              <h3>Khôi phục mật khẩu</h3>
              <label>Số điện thoại/Email</label>
              <input type="text" id="forgotAccount" placeholder="Nhập tài khoản">
              <label>Mật khẩu mới</label>
              <input type="password" id="forgotPassword" placeholder="Mật khẩu mới">
              <label>Nhập lại mật khẩu mới</label>
              <input type="password" id="forgotPasswordConfirm" placeholder="Nhập lại mật khẩu mới">
              <button class="auth-primary" type="button" onclick="handleForgotPassword()">Xác nhận</button>
              <button class="auth-secondary" type="button" onclick="switchTab('login',0)">Quay lại đăng nhập</button>
            </section>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Lỗi kết nối API");
    return data;
  }

  async function backendReady() {
    try { await api("/health"); return true; } catch (_) { return false; }
  }

  window.openAuth = function () {
    ensureAuthModal();
    const modal = document.getElementById("authModal");
    modal.classList.add("show");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    switchTab("login", 0);
  };

  window.closeAuth = function () {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  };

  window.switchTab = function (type, index) {
    ensureAuthModal();
    const carousel = document.getElementById("authCarousel");
    if (carousel) carousel.style.transform = `translateX(-${index * 33.333}%)`;
    document.querySelectorAll(".auth-tabs .tab-item").forEach(tab => tab.classList.remove("active"));
    const active = type === "register" ? document.getElementById("tab-register") : document.getElementById("tab-login");
    active?.classList.add("active");
    const error = document.getElementById("errorBox");
    if (error) error.style.display = "none";
  };

  window.togglePassword = function (button) {
    const input = button?.previousElementSibling;
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "Hiện" : "Ẩn";
  };

  window.handleLogin = async function () {
    const account = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();
    if (!account || !password) return alert("Vui lòng nhập tài khoản và mật khẩu.");
    try {
      let user;
      if (await backendReady()) {
        user = await api("/auth/login", { method: "POST", body: JSON.stringify({ account, password }) });
      } else if ((account === "admin@mot.vn" || account === "0337448886") && password === "123456") {
        user = { id: 1, fullName: "Admin MOT", email: "admin@mot.vn", role: "admin" };
      } else if ((account === "user@mot.vn" || account === "0987654321") && password === "123456") {
        user = { id: 2, fullName: "Khách hàng Demo", email: "user@mot.vn", role: "customer" };
      } else {
        throw new Error("Tài khoản hoặc mật khẩu không đúng.");
      }
      localStorage.setItem("currentUser", JSON.stringify(user));
      closeAuth();
      window.refreshAuthUI?.();
      alert("Đăng nhập thành công.");
    } catch (error) {
      const box = document.getElementById("errorBox");
      if (box) { box.textContent = error.message; box.style.display = "block"; }
    }
  };

  window.handleRegister = async function () {
    const fullName = document.getElementById("regName")?.value.trim() || "Khách hàng mới";
    const phone = document.getElementById("regPhone")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const password = document.getElementById("regPassword")?.value.trim();
    const confirm = document.getElementById("regPasswordConfirm")?.value.trim();
    if (!phone && !email) return alert("Vui lòng nhập số điện thoại hoặc email.");
    if (!password || password !== confirm) return alert("Mật khẩu chưa hợp lệ hoặc chưa khớp.");
    try {
      if (await backendReady()) {
        await api("/auth/register", { method: "POST", body: JSON.stringify({ fullName, phone, email, password }) });
        alert("Đăng ký thành công. Bạn có thể đăng nhập ngay.");
      } else {
        alert("Đăng ký demo thành công. Muốn lưu thật thì hãy chạy backend.");
      }
      switchTab("login", 0);
    } catch (error) {
      alert(error.message);
    }
  };

  window.handleForgotPassword = function () {
    alert("Chức năng quên mật khẩu đang để demo. Bạn có thể dùng tài khoản admin@mot.vn / 123456 để test.");
    switchTab("login", 0);
  };

  document.addEventListener("click", function (event) {
    const modal = document.getElementById("authModal");
    if (modal && event.target === modal) closeAuth();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeAuth(); });
  document.addEventListener("DOMContentLoaded", ensureAuthModal);
})();
