
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
