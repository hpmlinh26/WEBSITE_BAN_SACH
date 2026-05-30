// Du lieu fallback khi chua chay backend.
// Thay cho data.js cu (3299 dong trung lap): nay import truc tiep tu nguon duy nhat
// backend/seed-data.json - cung bo du lieu ma backend dung de seed database.
import seed from '../../../backend/seed-data.json';

window.categories = seed.categories;
window.products = seed.products;
window.trendingProducts = seed.products.slice(0, 12);
window.orders = window.orders || [];

export { seed };
