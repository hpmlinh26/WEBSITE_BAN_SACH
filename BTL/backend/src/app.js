const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { DIST_DIR } = require('./config');
const apiRoutes = require('./routes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Toan bo API duoi prefix /api.
  app.use('/api', apiRoutes);

  // Chan truy cap truc tiep vao /backend.
  app.use((req, res, next) => {
    if (req.path.startsWith('/backend')) return res.status(403).send('Forbidden');
    next();
  });

  // Phuc vu frontend da build (no-op neu thu muc dist chua ton tai).
  // Asset (anh, JS/CSS da hash) cache lau de bot tai lai; HTML luon revalidate.
  app.use(
    express.static(DIST_DIR, {
      maxAge: '1d',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  app.get('/', (req, res) => {
    const indexFile = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    res
      .status(200)
      .send(
        '<h1>MOT backend đang chạy</h1>' +
          '<p>Frontend chưa được build. Khi phát triển: chạy <code>npm run dev</code> trong thư mục BTL ' +
          '(Vite tại <a href="http://localhost:5173">http://localhost:5173</a>). ' +
          'Khi triển khai: chạy <code>npm run build</code> rồi mở <a href="/">http://localhost:3000</a>.</p>'
      );
  });

  // Middleware xu ly loi tap trung.
  app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const message = status === 500 ? 'Lỗi server. Vui lòng kiểm tra terminal.' : err.message;
    res.status(status).json({ message });
  });

  return app;
}

module.exports = { createApp };
