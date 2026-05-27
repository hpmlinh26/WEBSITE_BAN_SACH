# MOT Manga Store - Website Bán Manga

## 1. Giới thiệu dự án

**MOT Manga Store** là website bán manga được xây dựng phục vụ bài tập lớn môn Công nghệ Web.  
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

```text
BTL/
│
├── backend/
│   ├── data/
│   │   └── database.sqlite
│   ├── db.js
│   ├── package.json
│   └── server.js
│
├── assets/
│   ├── images/
│   └── products/
│
├── index.html
├── products.html
├── product-detail.html
├── cart.html
├── pay.html
├── invoice.html
├── blog.html
├── contact.html
├── accounts.html
│
├── products-manager.html
├── accounts-manager.html
├── orders-manager.html
├── vouchers-manager.html
│
├── style.css
├── admin.css
├── script.js
├── data.js
├── accounts.js
└── README.md
