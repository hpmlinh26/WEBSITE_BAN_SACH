// invoice.js - render hoa don dien tu tu backend.
import { api } from '../core/api.js';
import { money, escapeHtml, assetPath as img } from '../core/format.js';

const root = document.getElementById('invoiceRoot');
const id = new URLSearchParams(location.search).get('orderId') || localStorage.getItem('lastOrderId');

async function render() {
  if (!id) {
    root.innerHTML = `<p>Không tìm thấy mã đơn hàng.</p>`;
    return;
  }
  try {
    const order = await api(`/orders/${id}`);
    const items = order.items || [];
    const itemSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal || item.price * item.quantity || 0), 0);
    const discount = Math.max(0, itemSubtotal - Number(order.total || 0));
    root.innerHTML = `
      <div class="invoice-head">
        <div class="brand"><img src="assets/images/logo.png" alt="MOT"><div><h1>MOT Store</h1><p>Phòng B706, Tầng 7, Tòa A, Trường Đại học Thăng Long, Hà Nội</p></div></div>
        <div class="invoice-code"><h2>HÓA ĐƠN ĐIỆN TỬ</h2><p>Mã đơn: <b>#${order.id}</b></p><p>Ngày lập: ${order.date || String(order.createdAt || '').slice(0, 10)}</p></div>
      </div>
      <div class="invoice-grid">
        <div class="info-box"><h3>Thông tin khách hàng</h3><p><b>Họ tên:</b> ${escapeHtml(order.customerName || order.customer)}</p><p><b>SĐT:</b> ${escapeHtml(order.phone || '')}</p><p><b>Email:</b> ${escapeHtml(order.email || '')}</p></div>
        <div class="info-box"><h3>Giao hàng & thanh toán</h3><p><b>Địa chỉ:</b> ${escapeHtml(order.shippingAddress || '')}</p><p><b>Phương thức:</b> ${escapeHtml(order.paymentMethod || 'COD')}</p><p><b>Trạng thái:</b> ${escapeHtml(order.status || 'pending')}</p></div>
      </div>
      <table class="invoice-table"><thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr></thead><tbody>
        ${items
          .map(
            (item) =>
              `<tr><td><div class="product-cell"><img src="${img(item.image)}" onerror="this.src='assets/images/placeholder-cover.svg'" alt="${escapeHtml(item.productName || item.name)}"><span>${escapeHtml(item.productName || item.name)}</span></div></td><td>${money(item.price)}</td><td>${item.quantity}</td><td>${money(item.subtotal || item.price * item.quantity)}</td></tr>`
          )
          .join('')}
      </tbody></table>
      <div class="invoice-total"><div><span>Tạm tính</span><b>${money(itemSubtotal)}</b></div>${discount ? `<div><span>Ưu đãi</span><b>-${money(discount)}</b></div>` : ''}<div><span>Phí vận chuyển</span><b>0đ</b></div><div class="grand"><span>Tổng cộng</span><b>${money(order.total)}</b></div></div>
      <p class="invoice-note">Cảm ơn bạn đã mua hàng tại MOT Store. Hóa đơn này dùng cho demo bài tập lớn Công nghệ Web.</p>`;
  } catch (error) {
    root.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

render();
