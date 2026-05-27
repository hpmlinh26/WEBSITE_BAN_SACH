Cách chạy dự án MOT.vn v4

1. Giải nén ZIP.
2. Mở VS Code vào thư mục BTL.
3. Mở Terminal:

cd backend
npm.cmd install
npm.cmd start

Nếu đang dùng PowerShell và bị lỗi npm.ps1, luôn dùng npm.cmd.

Link test:
http://localhost:3000
http://localhost:3000/api/health
http://localhost:3000/api/products
http://localhost:3000/products-manager.html
http://localhost:3000/orders-manager.html

Tài khoản demo:
Admin: admin@mot.vn / 123456
User:  user@mot.vn / 123456

Lưu ý:
- Bản v4 tự reset catalog về bộ 100 sản phẩm từ 100_TP khi seed_version đổi.
- Không cần xóa database.sqlite thủ công như bản v3.
