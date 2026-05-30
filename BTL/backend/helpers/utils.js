function makeSlug(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
}

function normalizeAssetPath(value, fallback = 'assets/images/placeholder-cover.svg') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:|data:|assets\/)/i.test(raw)) return raw;
  if (/^sach-\d+\./i.test(raw)) return `assets/products/${raw}`;
  return `assets/images/${raw}`;
}

function assertRequired(value, message) {
  if (!String(value || '').trim()) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

module.exports = {
  makeSlug,
  normalizeAssetPath,
  assertRequired
};
