// Entry point: khoi tao DB roi mo HTTP server.
// Cau truc chi tiet nam trong thu muc src/.
const { createApp } = require('./src/app');
const { initDatabase, DB_PATH } = require('./src/db');
const { PORT } = require('./src/config');

const app = createApp();

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`MOT.vn backend is running: http://localhost:${PORT}`);
      console.log(`API health check:        http://localhost:${PORT}/api/health`);
      console.log(`Products API:            http://localhost:${PORT}/api/products`);
      console.log(`SQLite database:         ${DB_PATH}`);
      console.log('========================================');
    });
  })
  .catch(error => {
    console.error('Không khởi động được database:', error);
    process.exit(1);
  });
