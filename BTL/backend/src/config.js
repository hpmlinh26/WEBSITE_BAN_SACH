const path = require('path');

// backend/ root (file nay nam trong backend/src/).
const ROOT_DIR = path.join(__dirname, '..');

// DATA_DIR co the tro toi persistent disk khi deploy (vd Render: /var/data).
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'database.sqlite');
const SEED_PATH = path.join(ROOT_DIR, 'seed-data.json');

// Frontend production build (Vite): BTL/dist. Khi dev dung `npm run dev` (Vite o cong 5173).
const DIST_DIR = path.join(ROOT_DIR, '..', 'dist');

const PORT = process.env.PORT || 3000;

// Tang gia tri nay moi khi seed-data.json doi de DB tu seed lai catalog.
const SEED_VERSION = 'v16-pagination-extra-books-polish';

const ORDER_STATUSES = ['pending', 'packing', 'shipping', 'completed', 'return', 'cancelled'];
const FEEDBACK_STATUSES = ['new', 'read', 'replied'];
const USER_ROLES = ['admin', 'customer'];

const PLACEHOLDER_IMAGE = '/assets/images/placeholder-cover.svg';

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  DB_PATH,
  SEED_PATH,
  DIST_DIR,
  PORT,
  SEED_VERSION,
  ORDER_STATUSES,
  FEEDBACK_STATUSES,
  USER_ROLES,
  PLACEHOLDER_IMAGE,
};
