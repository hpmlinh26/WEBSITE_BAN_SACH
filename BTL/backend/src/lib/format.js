const { PLACEHOLDER_IMAGE } = require('../config');
const { createError } = require('./http');

function makeSlug(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `item-${Date.now()}`;
}

// Chuan hoa duong dan anh: giu nguyen URL/data/assets, suy ra thu muc cho file san pham.
function normalizeAssetPath(value, fallback = PLACEHOLDER_IMAGE) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:|data:|assets\/)/i.test(raw)) return raw;
  if (/^sach-\d+\./i.test(raw)) return `assets/products/${raw}`;
  return `assets/images/${raw}`;
}

function assertRequired(value, message) {
  if (!String(value || '').trim()) {
    throw createError(400, message);
  }
}

module.exports = { makeSlug, normalizeAssetPath, assertRequired };
