// Lop goi API dung chung cho toan bo frontend.
// Khi dev: Vite proxy /api -> http://localhost:3000 (xem vite.config.js).
// Khi production: Express phuc vu ca dist/ va /api tren cung mot cong.
const API_BASE = '/api';

export async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Lỗi kết nối API');
  return data;
}

export async function backendReady() {
  try {
    await api('/health');
    return true;
  } catch (_) {
    return false;
  }
}

export { API_BASE };
