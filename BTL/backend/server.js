const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDatabase, DB_PATH } = require('./db');
const denyBackend = require('./middleware/deny-backend');
const errorHandler = require('./middleware/error-handler');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

app.use(denyBackend);
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

app.use(errorHandler);

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('========================================');
    console.log(`MOT.vn backend is running: http://localhost:${PORT}`);
    console.log(`API health check:        http://localhost:${PORT}/api/health`);
    console.log(`Products API:            http://localhost:${PORT}/api/products`);
    console.log(`SQLite database:         ${DB_PATH}`);
    console.log('========================================');
  });
}).catch(error => {
  console.error('Không khởi động được database:', error);
  process.exit(1);
});
