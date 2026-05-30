// toast.js - toast thong bao dung chung cho public/admin (truoc o enhancements.js).
function iconFor(type) {
  if (type === 'success') return 'fa-circle-check';
  if (type === 'error') return 'fa-circle-xmark';
  if (type === 'warning') return 'fa-triangle-exclamation';
  return 'fa-circle-info';
}

export function showToast(message, type = 'info', duration = 2400) {
  if (!message) return;
  let wrap = document.querySelector('.mot-toast-container');
  if (!wrap) {
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

// Giu nguyen API toan cuc cho cac inline handler/HTML cu.
const nativeAlert = window.alert.bind(window);
window.showToast = showToast;
window.notify = showToast;
window.alert = function (message) {
  if (document.body) {
    showToast(message, /lỗi|không|sai|hủy|fail|error/i.test(String(message)) ? 'error' : 'info');
  } else {
    nativeAlert(message);
  }
};
