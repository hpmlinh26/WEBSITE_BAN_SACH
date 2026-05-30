
// enhancements.js - toast thông báo dùng chung cho public/admin.
(function(){
  const nativeAlert = window.alert.bind(window);
  function iconFor(type){
    if(type === 'success') return 'fa-circle-check';
    if(type === 'error') return 'fa-circle-xmark';
    if(type === 'warning') return 'fa-triangle-exclamation';
    return 'fa-circle-info';
  }
  function showToast(message, type='info', duration=2400){
    if(!message) return;
    let wrap = document.querySelector('.mot-toast-container');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'mot-toast-container';
      document.body.appendChild(wrap);
    }
    const item = document.createElement('div');
    item.className = `mot-toast-item ${type}`;
    item.innerHTML = `<i class="fa-solid ${iconFor(type)}"></i><div>${String(message)}</div>`;
    wrap.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => item.remove(), 280);
    }, duration);
  }
  window.showToast = showToast;
  window.notify = showToast;
  window.alert = function(message){
    if(document.body) showToast(message, /lỗi|không|sai|hủy|fail|error/i.test(String(message)) ? 'error' : 'info');
    else nativeAlert(message);
  };
})();

// V22 - MOT AI chatbox tư vấn rule-based, không cần API ngoài.
(function(){
  function norm(str){
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toLowerCase().trim();
  }
  function money(n){ return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function isAdminPage(){
    const p = location.pathname.toLowerCase();
    return /manager|admin-dashboard|api-test/.test(p);
  }
  function getProducts(){
    const list = window.products || window.appProducts || [];
    return Array.isArray(list) ? list : [];
  }
  function productLink(p){ return `product-detail.html?id=${encodeURIComponent(p.id)}`; }
  function findProducts(text, limit=4){
    const q = norm(text).replace(/\b(tim|kiem|sach|truyen|tu van|chon|mua|goi y|de xuat|toi|muon|doc|cho|minh|ban)\b/g,' ').replace(/\s+/g,' ').trim();
    const products = getProducts();
    if(!q) return products.slice(0, limit);
    const direct = products.filter(p => norm([p.name,p.title,p.author,p.categoryName,p.category,p.description].join(' ')).includes(q));
    if(direct.length) return direct.slice(0, limit);
    const words = q.split(' ').filter(w => w.length > 1);
    return products
      .map(p => ({p, score: words.reduce((s,w) => s + (norm([p.name,p.title,p.author,p.categoryName,p.category,p.description].join(' ')).includes(w) ? 1 : 0), 0)}))
      .filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.p);
  }
  function productCards(list){
    if(!list.length) return '';
    return `<div class="mot-ai-products">${list.map(p => `
      <a class="mot-ai-product" href="${productLink(p)}">
        <img src="${esc(p.image || p.img || 'assets/images/logo.png')}" alt="${esc(p.name || p.title)}">
        <div><strong>${esc(p.name || p.title)}</strong><small>${money(p.price || p.salePrice)} · ${esc(p.author || 'MOT Store')}</small></div>
      </a>`).join('')}</div>`;
  }
  function buildReply(text){
    const q = norm(text);
    if(!q || /^(hi|hello|chao|xin chao|alo)$/.test(q)){
      return `Chào bạn, mình là <b>MOT AI</b>. Mình có thể gợi ý truyện theo tên, tác giả, thể loại, khoảng giá hoặc hướng dẫn đặt hàng.`;
    }
    if(/voucher|ma giam|khuyen mai|freeship|giam gia/.test(q)){
      return `Bạn có thể thử các mã demo như <b>FREESHIP</b>, <b>MOT10K</b> hoặc <b>MOT20K</b> ở trang thanh toán. Mỗi mã sẽ kiểm tra điều kiện đơn tối thiểu trước khi áp dụng.`;
    }
    if(/thanh toan|momo|shopee|zalopay|vnpay|qr|quet/.test(q)){
      return `Ở trang thanh toán, bạn chọn ZaloPay, VNPay, ShopeePay hoặc MoMo thì hệ thống sẽ hiện mã QR demo để quét. Nếu muốn đơn giản, chọn thanh toán khi nhận hàng.`;
    }
    if(/dat hang|mua hang|gio hang|checkout|ship|giao hang/.test(q)){
      return `Quy trình mua hàng: chọn sản phẩm → thêm vào giỏ → kiểm tra số lượng tồn kho → nhập đủ địa chỉ giao hàng → chọn phương thức thanh toán → xác nhận thanh toán → xem hóa đơn.`;
    }
    if(/admin|quan tri|quan ly/.test(q)){
      return `Admin có thể quản lý sách, danh mục, tài khoản, đơn hàng, voucher và phản hồi. Tài khoản demo: <b>admin@mot.vn / 123456</b>.`;
    }
    let max = null;
    const priceMatch = q.match(/(?:duoi|dưới|nho hon|nho hơn|<=?)\s*(\d+)/) || q.match(/(\d+)\s*k/);
    if(priceMatch){
      max = Number(priceMatch[1]) * (q.includes('k') || Number(priceMatch[1]) < 1000 ? 1000 : 1);
      const list = getProducts().filter(p => Number(p.price || p.salePrice || 0) <= max).slice(0,4);
      return list.length ? `Một vài sản phẩm dưới <b>${money(max)}</b> nè:${productCards(list)}` : `Hiện chưa thấy sản phẩm nào dưới ${money(max)}.`;
    }
    const list = findProducts(text, 4);
    if(list.length){
      return `Mình tìm được vài gợi ý phù hợp với “<b>${esc(text)}</b>”:${productCards(list)}`;
    }
    return `Mình chưa tìm thấy sản phẩm thật khớp với “<b>${esc(text)}</b>”. Bạn có thể thử gõ tên ngắn hơn như <b>Conan</b>, <b>Thỏ Bảy Màu</b>, <b>One Piece</b>, <b>Lão Hạc</b>.`;
  }
  function addMsg(body, html, who='bot'){
    const row = document.createElement('div');
    row.className = `mot-ai-msg ${who}`;
    row.innerHTML = `<div class="mot-ai-bubble">${html}</div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }
  function initAI(){
    if(isAdminPage() || document.querySelector('.mot-ai-button')) return;
    const btn = document.createElement('button');
    btn.className = 'mot-ai-button';
    btn.type = 'button';
    btn.setAttribute('aria-label','Mở MOT AI');
    btn.innerHTML = '<span class="mot-ai-face">AI</span>';
    const panel = document.createElement('section');
    panel.className = 'mot-ai-panel';
    panel.innerHTML = `
      <div class="mot-ai-head">
        <div class="mot-ai-title"><div class="mot-ai-avatar">AI</div><div><strong>MOT AI</strong><span>Tư vấn chọn sách nhanh</span></div></div>
        <button class="mot-ai-close" type="button" aria-label="Đóng">×</button>
      </div>
      <div class="mot-ai-body"></div>
      <div class="mot-ai-quick">
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
    const open = () => { panel.classList.add('open'); if(!body.dataset.started){ addMsg(body, buildReply(''), 'bot'); body.dataset.started='1'; } setTimeout(()=>input.focus(),80); };
    btn.addEventListener('click', () => panel.classList.contains('open') ? panel.classList.remove('open') : open());
    panel.querySelector('.mot-ai-close').addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelector('.mot-ai-form').addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if(!text) return;
      addMsg(body, esc(text), 'user');
      input.value = '';
      setTimeout(() => addMsg(body, buildReply(text), 'bot'), 180);
    });
    panel.querySelectorAll('.mot-ai-quick button').forEach(b => b.addEventListener('click', () => {
      const text = b.dataset.q;
      open();
      addMsg(body, esc(text), 'user');
      setTimeout(() => addMsg(body, buildReply(text), 'bot'), 180);
    }));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAI);
  else initAI();
})();
