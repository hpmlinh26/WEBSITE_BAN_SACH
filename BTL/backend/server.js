// Entry point: khoi tao DB roi mo HTTP server.
// Cau truc chi tiet nam trong thu muc src/.
const http = require('http');
const { createApp } = require('./src/app');
const { initDatabase, DB_PATH } = require('./src/db');
const { PORT } = require('./src/config');
const { attachSupportChat } = require('./src/realtime/chat');

const app = createApp();
const server = http.createServer(app);
attachSupportChat(server);

initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log('========================================');
      console.log(`MOT.vn backend is running: http://localhost:${PORT}`);
      console.log(`API health check:        http://localhost:${PORT}/api/health`);
      console.log(`Products API:            http://localhost:${PORT}/api/products`);
      console.log(`Support chat socket:     ws://localhost:${PORT}/socket.io`);
      console.log(`SQLite database:         ${DB_PATH}`);
      console.log('========================================');
    });
  })
  .catch(error => {
    console.error('Không khởi động được database:', error);
    process.exit(1);
  });
