Cách chạy dự án MOT.vn (Vite + Express)

Yêu cầu: Node.js 20+

== Lần đầu: cài dependencies ==
cd backend
npm install
cd ..
npm install

== Chế độ phát triển (2 terminal) ==
Terminal 1 (backend API, cổng 3000):
  cd backend
  npm start

Terminal 2 (Vite dev server, cổng 5173, tự proxy /api -> :3000):
  npm run dev

Mở: http://localhost:5173   (sửa code tự reload)

== Chế độ triển khai (1 cổng) ==
  npm run build      (tạo thư mục dist/)
  cd backend
  npm start
Mở: http://localhost:3000

(PowerShell bị chặn npm.ps1 thì dùng npm.cmd thay cho npm.)

Link test:
  http://localhost:3000/api/health
  http://localhost:3000/api/products
  http://localhost:3000/products-manager.html

Tài khoản demo:
  Admin: admin@mot.vn / 123456
  User:  user@mot.vn / 123456

Lưu ý:
- Catalog tự reset về bộ dữ liệu trong backend/seed-data.json khi seed_version đổi.
- Frontend (data fallback) và backend (seed DB) dùng CHUNG file backend/seed-data.json.
