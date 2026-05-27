BTL_fixed_v4_backend - các phần đã sửa

1. Sửa lỗi login trên trang pay.html:
   - pay.html đã import auth-carousel.css.
   - Viết lại CSS modal login sạch, không còn bung form thô ra ngoài.
   - Đăng nhập demo vẫn dùng: admin@mot.vn / 123456 hoặc user@mot.vn / 123456.

2. Sửa nút XÁC NHẬN THANH TOÁN:
   - Trang pay.html tự render đơn hàng từ localStorage cart.
   - Nút xác nhận tạo đơn hàng qua API /api/orders.
   - Tạo đơn xong sẽ xóa giỏ hàng và chuyển về trang chủ.
   - Nếu backend chưa chạy thì vẫn lưu đơn tạm trong localStorage để demo không bị đơ.

3. Dữ liệu sản phẩm:
   - Đã đọc bộ 100_TP.zip thành 100 sản phẩm.
   - Ảnh bìa đã copy vào assets/products/sach-1.jpg ... sach-100.jpg.
   - Backend seed từ backend/seed-data.json.
   - data.js dùng cùng bộ dữ liệu làm fallback.

4. Sắp xếp file:
   - Toàn bộ ảnh giao diện chuyển vào assets/images/.
   - Toàn bộ ảnh sản phẩm chuyển vào assets/products/.
   - Đã bỏ 12 file accounts-manager rời rạc và bỏ product-catalog cũ để project gọn hơn.
   - Admin còn 2 trang chính: products-manager.html và orders-manager.html.

5. Admin:
   - products-manager.html quản lý cả danh mục và sản phẩm.
   - Admin có thể thêm/sửa/xóa danh mục, nhập ảnh bìa danh mục.
   - Sản phẩm đồng bộ theo danh mục.
   - Nếu nhập ảnh dạng sach-38.jpg backend tự hiểu là assets/products/sach-38.jpg.

6. UI/UX:
   - Nút Thêm giỏ / Mua ngay ở chi tiết sản phẩm đã rút ngắn và cân lại.
   - Card sản phẩm dùng object-fit contain để hạn chế lỗi méo/mất ảnh.
   - Checkout hiển thị ảnh thật từ giỏ hàng, không dùng placeholder ngoài mạng.

Cách chạy:
cd backend
npm.cmd install
npm.cmd start

Sau đó mở:
http://localhost:3000
