// Cac ham dinh dang/chuoi dung chung (truoc day bi lap o nhieu file).

export const money = (value) => Number(value || 0).toLocaleString('vi-VN') + 'đ';

export const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Chuan hoa duong dan anh: ho tro http(s)/data/assets san co, ten file sach-*, con lai coi la o assets/images.
export function assetPath(value, fallback = 'assets/images/placeholder-cover.svg') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:|data:|assets\/)/i.test(raw)) return raw;
  if (/^sach-\d+\./i.test(raw)) return `assets/products/${raw}`;
  return `assets/images/${raw}`;
}

export function slugify(value) {
  return (
    String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `item-${Date.now()}`
  );
}
