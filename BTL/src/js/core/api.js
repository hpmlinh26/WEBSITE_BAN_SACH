// Lop goi API dung chung cho toan bo frontend.
// Khi dev: Vite proxy /api -> http://localhost:3000 (xem vite.config.js).
// Khi production: Express phuc vu ca dist/ va /api tren cung mot cong.
const API_BASE = '/api';

// 502/503/504: gateway loi tam thoi (vd host free dang "thuc day"). Thu lai vai lan.
const TRANSIENT_STATUS = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function api(path, options = {}) {
  // retry=false de tat thu lai (vd backendReady can tra ket qua nhanh).
  const { retry = true, ...fetchOptions } = options;
  const maxAttempts = retry ? 3 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let response;
    try {
      response = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...(fetchOptions.headers || {}) },
        ...fetchOptions,
      });
    } catch (networkError) {
      // fetch nem loi = request chua toi server (mat mang / server dang day) -> an toan thu lai.
      if (attempt < maxAttempts - 1) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw new Error('Không kết nối được máy chủ. Server có thể đang khởi động lại, vui lòng thử lại sau giây lát.');
    }

    if (TRANSIENT_STATUS.has(response.status) && attempt < maxAttempts - 1) {
      await sleep(700 * (attempt + 1));
      continue;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Lỗi kết nối máy chủ.');
    return data;
  }
}

export async function backendReady() {
  try {
    await api('/health', { retry: false });
    return true;
  } catch (_) {
    return false;
  }
}

export { API_BASE };
