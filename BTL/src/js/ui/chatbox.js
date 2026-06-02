// chatbox.js - MOT AI tu van rule-based, khong can API ngoai (truoc o enhancements.js).
function norm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
function money(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}
function isAdminPage() {
  const p = location.pathname.toLowerCase();
  return p.includes('/admin/') || /manager|admin-dashboard|api-test/.test(p);
}
function getProducts() {
  const list = window.products || window.appProducts || [];
  return Array.isArray(list) ? list : [];
}
function productLink(p) {
  return `/pages/product-detail.html?id=${encodeURIComponent(p.id)}`;
}
function findProducts(text, limit = 4) {
  const q = norm(text)
    .replace(/\b(tim|kiem|sach|truyen|tu van|chon|mua|goi y|de xuat|toi|muon|doc|cho|minh|ban)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const products = getProducts();
  if (!q) return products.slice(0, limit);
  const direct = products.filter((p) =>
    norm([p.name, p.title, p.author, p.categoryName, p.category, p.description].join(' ')).includes(q)
  );
  if (direct.length) return direct.slice(0, limit);
  const words = q.split(' ').filter((w) => w.length > 1);
  return products
    .map((p) => ({
      p,
      score: words.reduce(
        (s, w) => s + (norm([p.name, p.title, p.author, p.categoryName, p.category, p.description].join(' ')).includes(w) ? 1 : 0),
        0
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}
function productCards(list) {
  if (!list.length) return '';
  return `<div class="mot-ai-products">${list
    .map(
      (p) => `
      <a class="mot-ai-product" href="${productLink(p)}">
        <img src="${esc(p.image || p.img || '/assets/images/logo.png')}" alt="${esc(p.name || p.title)}">
        <div><strong>${esc(p.name || p.title)}</strong><small>${money(p.price || p.salePrice)} · ${esc(p.author || 'MOT Store')}</small></div>
      </a>`
    )
    .join('')}</div>`;
}
function buildReply(text) {
  const q = norm(text);
  if (!q || /^(hi|hello|chao|xin chao|alo)$/.test(q)) {
    return `Chào bạn, mình là <b>MOT AI</b>. Mình có thể gợi ý truyện theo tên, tác giả, thể loại, khoảng giá hoặc hướng dẫn đặt hàng.`;
  }
  if (/voucher|ma giam|khuyen mai|freeship|giam gia/.test(q)) {
    return `Bạn có thể thử các mã demo như <b>FREESHIP</b>, <b>MOT10K</b> hoặc <b>MOT20K</b> ở trang thanh toán. Mỗi mã sẽ kiểm tra điều kiện đơn tối thiểu trước khi áp dụng.`;
  }
  if (/thanh toan|momo|shopee|zalopay|vnpay|qr|quet/.test(q)) {
    return `Ở trang thanh toán, bạn chọn ZaloPay, VNPay, ShopeePay hoặc MoMo thì hệ thống sẽ hiện mã QR demo để quét. Nếu muốn đơn giản, chọn thanh toán khi nhận hàng.`;
  }
  if (/dat hang|mua hang|gio hang|checkout|ship|giao hang/.test(q)) {
    return `Quy trình mua hàng: chọn sản phẩm → thêm vào giỏ → kiểm tra số lượng tồn kho → nhập đủ địa chỉ giao hàng → chọn phương thức thanh toán → xác nhận thanh toán → xem hóa đơn.`;
  }
  if (/admin|quan tri|quan ly/.test(q)) {
    return `Admin có thể quản lý sách, danh mục, tài khoản, đơn hàng, voucher và phản hồi. Tài khoản demo: <b>admin@mot.vn / 123456</b>.`;
  }
  let max = null;
  const priceMatch = q.match(/(?:duoi|dưới|nho hon|nho hơn|<=?)\s*(\d+)/) || q.match(/(\d+)\s*k/);
  if (priceMatch) {
    max = Number(priceMatch[1]) * (q.includes('k') || Number(priceMatch[1]) < 1000 ? 1000 : 1);
    const list = getProducts()
      .filter((p) => Number(p.price || p.salePrice || 0) <= max)
      .slice(0, 4);
    return list.length
      ? `Một vài sản phẩm dưới <b>${money(max)}</b> nè:${productCards(list)}`
      : `Hiện chưa thấy sản phẩm nào dưới ${money(max)}.`;
  }
  const list = findProducts(text, 4);
  if (list.length) {
    return `Mình tìm được vài gợi ý phù hợp với “<b>${esc(text)}</b>”:${productCards(list)}`;
  }
  return `Mình chưa tìm thấy sản phẩm thật khớp với “<b>${esc(text)}</b>”. Bạn có thể thử gõ tên ngắn hơn như <b>Conan</b>, <b>Thỏ Bảy Màu</b>, <b>One Piece</b>, <b>Lão Hạc</b>.`;
}
function addMsg(body, html, who = 'bot') {
  const row = document.createElement('div');
  row.className = `mot-ai-msg ${who}`;
  row.innerHTML = `<div class="mot-ai-bubble">${html}</div>`;
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
  return row;
}
function loadSocketClient() {
  if (window.io) return Promise.resolve(window.io);

  return new Promise((resolve, reject) => {
    const existed = document.querySelector('script[data-mot-socket-client]');
    if (existed) {
      existed.addEventListener('load', () => resolve(window.io), { once: true });
      existed.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;
    script.dataset.motSocketClient = '1';
    script.onload = () => (window.io ? resolve(window.io) : reject(new Error('Socket.IO client chưa sẵn sàng.')));
    script.onerror = () => reject(new Error('Không tải được Socket.IO client.'));
    document.head.appendChild(script);
  });
}
function visitorSessionId() {
  const key = 'motSupportSessionId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}
function visitorName() {
  try {
    const user = JSON.parse(localStorage.getItem('motCurrentUser') || 'null');
    return user?.fullName || user?.name || user?.email || 'Khách hàng';
  } catch (_) {
    return 'Khách hàng';
  }
}
function initAI() {
  if (isAdminPage() || document.querySelector('.mot-ai-button')) return;
  const renderedSupportMessages = new Set();
  let socket = null;
  let supportMode = false;
  let supportReady = false;
  let adminOnline = false;
  const sessionId = visitorSessionId();

  const btn = document.createElement('button');
  btn.className = 'mot-ai-button';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Mở MOT Support');
  btn.innerHTML = '<span class="mot-ai-face">AI</span>';
  const panel = document.createElement('section');
  panel.className = 'mot-ai-panel';
  panel.innerHTML = `
    <div class="mot-ai-head">
      <div class="mot-ai-title"><div class="mot-ai-avatar">AI</div><div><strong>MOT Support</strong><span class="mot-ai-status">AI tư vấn nhanh</span></div></div>
      <button class="mot-ai-close" type="button" aria-label="Đóng">×</button>
    </div>
    <div class="mot-ai-body"></div>
    <div class="mot-ai-quick">
      <button type="button" data-live="1">Gặp hỗ trợ</button>
      <button type="button" data-q="Gợi ý sách dễ đọc">Gợi ý dễ đọc</button>
      <button type="button" data-q="Sách dưới 100k">Dưới 100k</button>
      <button type="button" data-q="Cách đặt hàng">Cách đặt hàng</button>
      <button type="button" data-q="Mã voucher">Voucher</button>
    </div>
    <form class="mot-ai-form">
      <input class="mot-ai-input" placeholder="Nhập câu hỏi, ví dụ: tư vấn Conan..." autocomplete="off">
      <button class="mot-ai-send" type="submit">➤</button>
    </form>`;
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  const body = panel.querySelector('.mot-ai-body');
  const input = panel.querySelector('.mot-ai-input');
  const status = panel.querySelector('.mot-ai-status');
  const setStatus = (text) => {
    status.textContent = text;
    input.placeholder = supportMode ? 'Nhắn cho quản trị viên...' : 'Nhập câu hỏi, ví dụ: tư vấn Conan...';
  };
  const renderSupportMessage = (message) => {
    if (!message || renderedSupportMessages.has(message.id)) return;
    renderedSupportMessages.add(message.id);
    addMsg(body, esc(message.text), message.role === 'admin' ? 'bot support' : 'user support');
  };
  const joinSupport = async () => {
    supportMode = true;
    setStatus(supportReady ? (adminOnline ? 'Đang chat với hỗ trợ' : 'Đã gửi tới đội hỗ trợ') : 'Đang kết nối hỗ trợ...');
    if (socket) return socket;

    try {
      const io = await loadSocketClient();
      socket = io({
        transports: ['websocket', 'polling'],
      });
      socket.on('connect', () => {
        socket.emit('support:visitor_join', {
          sessionId,
          name: visitorName(),
          page: location.pathname,
        });
      });
      socket.on('support:ready', (payload = {}) => {
        supportReady = true;
        adminOnline = Boolean(payload.adminOnline);
        setStatus(adminOnline ? 'Đang chat với hỗ trợ' : 'Đã gửi tới đội hỗ trợ');
        (payload.session?.messages || []).forEach(renderSupportMessage);
        if (!body.dataset.supportStarted) {
          addMsg(
            body,
            adminOnline
              ? 'Bạn đang được nối với đội hỗ trợ MOT. Mình sẽ chuyển tin nhắn của bạn ngay.'
              : 'Bạn cứ để lại tin nhắn, admin sẽ thấy trong trang quản trị khi online.',
            'bot'
          );
          body.dataset.supportStarted = '1';
        }
        socket.emit('support:visitor_read', { sessionId });
      });
      socket.on('support:presence', (payload = {}) => {
        adminOnline = Boolean(payload.adminOnline);
        if (supportMode) setStatus(adminOnline ? 'Đang chat với hỗ trợ' : 'Đã gửi tới đội hỗ trợ');
      });
      socket.on('support:message', (message) => {
        renderSupportMessage(message);
        if (message.role === 'admin') socket.emit('support:visitor_read', { sessionId });
      });
      socket.on('disconnect', () => {
        if (supportMode) setStatus('Mất kết nối, đang thử lại...');
      });
      socket.on('connect_error', () => {
        setStatus('Chưa kết nối được hỗ trợ');
      });
      return socket;
    } catch (error) {
      console.warn(error);
      setStatus('Chưa kết nối được hỗ trợ');
      addMsg(body, 'Hiện chưa tải được kênh hỗ trợ realtime. Bạn thử mở backend ở cổng 3000 rồi nhắn lại nhé.', 'bot');
      return null;
    }
  };
  const sendSupport = async (messageText) => {
    const activeSocket = await joinSupport();
    addMsg(body, esc(messageText), 'user support');
    if (!activeSocket) return;
    activeSocket.emit('support:visitor_message', {
      sessionId,
      name: visitorName(),
      page: location.pathname,
      text: messageText,
    });
  };
  const open = () => {
    panel.classList.add('open');
    if (!body.dataset.started) {
      addMsg(body, buildReply(''), 'bot');
      body.dataset.started = '1';
    }
    setTimeout(() => input.focus(), 80);
  };
  btn.addEventListener('click', () => (panel.classList.contains('open') ? panel.classList.remove('open') : open()));
  panel.querySelector('.mot-ai-close').addEventListener('click', () => panel.classList.remove('open'));
  panel.querySelector('.mot-ai-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (supportMode || /(?:gap|gặp|nhan vien|nhân viên|ho tro|hỗ trợ|admin|quan tri|quản trị|tu van vien|tư vấn viên)/i.test(norm(text))) {
      sendSupport(text);
      return;
    }
    addMsg(body, esc(text), 'user');
    setTimeout(() => addMsg(body, buildReply(text), 'bot'), 180);
  });
  panel.querySelectorAll('.mot-ai-quick button').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.live) {
        open();
        joinSupport();
        return;
      }
      const text = b.dataset.q;
      open();
      addMsg(body, esc(text), 'user');
      setTimeout(() => addMsg(body, buildReply(text), 'bot'), 180);
    })
  );
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAI);
else initAI();
