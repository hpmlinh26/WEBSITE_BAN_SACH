# MOT Store

Website bán sách/manga dùng Vite, Express, SQLite và Socket.IO.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | HTML, CSS, JavaScript ES modules, Vite |
| Backend | Node.js, Express |
| Database | SQLite |
| Realtime | Socket.IO |

## Features

- Trang chủ, danh sách sách, chi tiết sản phẩm, tìm kiếm và lọc danh mục.
- Giỏ hàng, thanh toán, voucher, hóa đơn.
- Đăng nhập/đăng ký demo, trang tài khoản và lịch sử đơn hàng.
- Admin quản lý sản phẩm, danh mục, tài khoản, đơn hàng, voucher, phản hồi.
- Quản lý vai trò & phân quyền theo từng module (xem/thêm/sửa/xóa), tách riêng quản lý khách hàng và người quản trị.
- Chat tư vấn nhanh và live support qua Socket.IO.

## Project Structure

```text
BTL/
├── backend/              # Express API, SQLite, Socket.IO
│   ├── src/
│   ├── data/
│   ├── seed-data.json
│   └── server.js
├── public/               # static assets
├── src/
│   ├── css/
│   └── js/
├── pages/
├── index.html
├── package.json          # frontend tooling
└── vite.config.js
```

## Requirements

- Node.js 20+
- npm

## Quick Start

Install dependencies:

```bash
cd BTL/backend
npm install

cd ..
npm install
```

Run in development:

```bash
# terminal 1
cd BTL/backend
npm start

# terminal 2
cd BTL
npm run dev
```

Open:

- Storefront: `http://localhost:5173`
- Admin: `http://localhost:5173/pages/admin/dashboard.html`
- API health: `http://localhost:3000/api/health`
- Socket.IO client: `http://localhost:3000/socket.io/socket.io.js`

If port `5173` is busy, Vite will print the next available URL.

## Production Build

```bash
cd BTL
npm run build

cd backend
npm start
```

Open `http://localhost:3000`.

## Demo Accounts

| Role | Account | Password |
| --- | --- | --- |
| Admin (toàn quyền) | `admin@mot.vn` | `123456` |
| Manager (người quản lý) | `manager@mot.vn` | `123456` |
| Staff (nhân viên) | `staff@mot.vn` | `123456` |
| Customer (khách hàng) | `user@mot.vn` | `123456` |

> Các tài khoản `manager`/`staff` chỉ được tạo khi seed trên database trống. Nếu `backend/data/database.sqlite` đã có sẵn dữ liệu, hãy tạo chúng qua giao diện admin hoặc xóa file DB để seed lại.

## Roles & Permissions

- Vai trò cố định: `admin`, `manager`, `staff`, `customer`. `admin` luôn toàn quyền và không chỉnh sửa được; `manager`/`staff` cấu hình được; `customer` không truy cập khu vực quản trị.
- Phân quyền theo từng module (Tổng quan, Sách & danh mục, Đơn hàng, Voucher, Phản hồi, Khách hàng, Người quản trị, Vai trò) với 4 hành động: xem/thêm/sửa/xóa. Dữ liệu lưu ở bảng `role_permissions`.
- Cấu hình tại trang **Vai trò & phân quyền** (`pages/admin/roles.html`); thay đổi có hiệu lực ngay không cần đăng nhập lại.
- Trang **Quản lý tài khoản** tách 2 tab: Khách hàng và Người quản trị.
- Backend chặn bằng middleware `requirePermission(module, action)`; frontend ẩn/hiện menu và nút theo quyền (chỉ là lớp UX, bảo mật thật nằm ở backend).

## Deploy

The repo includes `render.yaml` for Render Blueprint deploy.

Render build command:

```bash
npm install --include=dev && npm run build && npm install --prefix backend
```

Render start command:

```bash
node backend/server.js
```

On Render free plan, SQLite data is stored on temporary disk. Product seed data is restored on startup; newly created orders/users can reset after redeploy or service sleep.
