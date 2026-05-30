# MOT Store - Website Bán Manga

## 1. Giới thiệu dự án

**MOT Store** là website bán manga được xây dựng phục vụ bài tập lớn môn Công nghệ Web.  
Hệ thống mô phỏng quy trình mua hàng trực tuyến gồm: xem sản phẩm, tìm kiếm, thêm vào giỏ hàng, thanh toán, xuất hóa đơn và quản lý dữ liệu thông qua trang quản trị dành cho admin.

Dự án được xây dựng theo mô hình **Frontend + Backend + Database**, trong đó frontend sử dụng HTML/CSS/JavaScript, backend sử dụng Node.js và Express, database sử dụng SQLite.

---

## 2. Công nghệ sử dụng

### Frontend
- HTML5
- CSS3
- JavaScript
- Font Awesome
- Responsive layout cơ bản

### Backend
- Node.js
- Express.js
- SQLite
- RESTful API

### Công cụ phát triển
- Visual Studio Code
- GitHub Desktop
- Git/GitHub
- Trình duyệt Chrome/Edge

---

## 3. Chức năng chính

### 3.1. Chức năng người dùng

- Xem trang chủ website
- Xem danh sách manga
- Xem chi tiết sản phẩm
- Tìm kiếm sản phẩm
- Lọc sản phẩm theo danh mục
- Thêm sản phẩm vào giỏ hàng
- Cập nhật số lượng sản phẩm trong giỏ hàng
- Xóa sản phẩm khỏi giỏ hàng
- Thanh toán đơn hàng
- Kiểm tra dữ liệu nhập trước khi đặt hàng
- Áp dụng mã voucher
- Xuất hóa đơn điện tử sau khi đặt hàng
- Đăng nhập/đăng ký tài khoản
- Xem thông tin tài khoản cá nhân
- Xem danh sách đơn hàng đã đặt
- Xem chi tiết đơn hàng
- Gửi phản hồi/liên hệ đến cửa hàng

---

### 3.2. Chức năng admin

#### Quản lý sách
- Hiển thị danh sách sản phẩm
- Thêm mới sản phẩm
- Cập nhật thông tin sản phẩm
- Xóa sản phẩm

#### Quản lý danh mục
- Hiển thị danh sách danh mục
- Thêm mới danh mục
- Cập nhật danh mục
- Xóa danh mục

#### Quản lý tài khoản
- Hiển thị danh sách tài khoản
- Thêm mới tài khoản
- Cập nhật tài khoản
- Xóa tài khoản

#### Quản lý đơn hàng
- Hiển thị danh sách đơn hàng
- Thêm mới đơn hàng
- Xem chi tiết đơn hàng
- Cập nhật trạng thái đơn hàng
- Xóa đơn hàng
- Xuất hóa đơn đơn hàng

#### Quản lý voucher
- Hiển thị danh sách voucher
- Thêm mới voucher
- Cập nhật voucher
- Xóa voucher

#### Quản lý phản hồi
- Hiển thị danh sách phản hồi từ người dùng
- Xem nội dung phản hồi
- Cập nhật trạng thái phản hồi

---

## 4. Cấu trúc thư mục

> Frontend đã được hiện đại hóa bằng **Vite + ES modules** (xem mục 5 để biết cách chạy).

```text
BTL/
│
├── backend/                 # API Express + SQLite (không đổi)
│   ├── data/database.sqlite
│   ├── seed-data.json       # nguồn dữ liệu DUY NHẤT (backend seed + frontend fallback)
│   ├── db.js
│   ├── package.json
│   └── server.js            # phục vụ API + frontend đã build (dist/)
│
├── public/
│   └── assets/              # ảnh, cursor... phục vụ tĩnh tại /assets/
│       ├── images/
│       └── products/
│
├── src/
│   ├── css/                 # toàn bộ stylesheet (style, admin, accounts, pay, ...)
│   └── js/
│       ├── core/            # api.js, format.js, seed-fallback.js (dùng chung)
│       ├── ui/              # toast.js, chatbox.js, auth-modal.js
│       ├── pages/           # storefront.js, accounts.js, admin.js, invoice.js
│       └── entries/         # 1 entry/đặc trưng trang: storefront, pay, accounts, invoice, admin, api-test
│
├── *.html                   # 16 trang (mỗi trang nạp đúng 1 module entry)
│
├── vite.config.js           # cấu hình multi-page + proxy /api -> :3000
├── package.json             # tooling frontend (Vite)
└── dist/                    # output sau khi build (được .gitignore)
```

## 5. Cách chạy

Cần **Node.js 20+**. Backend và frontend là hai package riêng.

### Lần đầu: cài dependencies

```bash
cd BTL/backend && npm install      # express, sqlite3, cors
cd ..             && npm install    # vite (frontend tooling)
```

### Chế độ phát triển (2 terminal)

```bash
# Terminal 1 - backend API (cổng 3000)
cd BTL/backend && npm start

# Terminal 2 - Vite dev server (cổng 5173, tự proxy /api sang :3000)
cd BTL && npm run dev
```

Mở **http://localhost:5173** — sửa code là tự reload.

### Chế độ triển khai (1 cổng)

```bash
cd BTL && npm run build            # tạo BTL/dist
cd backend && npm start            # Express phục vụ cả dist/ lẫn /api
```

Mở **http://localhost:3000**.

Tài khoản demo — Admin: `admin@mot.vn / 123456` · User: `user@mot.vn / 123456`.

## 6. Deploy (Render)

App là **1 server Node chạy liên tục** (Express serve `dist/` + `/api`, DB SQLite ghi ra
file), nên hợp với host long-running như **Render/Railway**, **không** hợp serverless (Vercel)
vì SQLite cần filesystem ghi được lâu dài.

Repo có sẵn `render.yaml` (Blueprint):

1. Push repo lên GitHub.
2. Render Dashboard → **New + → Blueprint** → chọn repo → **Apply**.
3. Mở URL Render cấp (vd `https://mot-store.onrender.com`).

Render tự chạy: `npm install --include=dev && npm run build && npm install --prefix backend`
rồi `node backend/server.js`. Health check: `/api/health`.

**Dữ liệu:** plan `free` dùng ổ đĩa tạm — danh mục/sản phẩm luôn có (seed lại), nhưng
đơn hàng/tài khoản mới sẽ reset khi service ngủ dậy hoặc redeploy (đủ cho demo). Muốn giữ
vĩnh viễn: trong `render.yaml` đổi `plan: starter` (trả phí), bỏ comment khối `disk:` và
envVar `DATA_DIR: /var/data` — SQLite sẽ nằm trên persistent disk.
