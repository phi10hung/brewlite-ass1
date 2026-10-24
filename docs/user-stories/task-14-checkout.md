# User Story – Checkout

**Người viết:** Hồ Văn Linh · **Issue:** #14 · **Sprint:** 3

Là khách hàng đã đăng nhập,
tôi muốn thực hiện thanh toán đơn hàng,
để đơn hàng được xử lý và ghi nhận chính xác.

## Tiêu chí chấp nhận

- [x] Checkout gọi API bằng apiFetch
- [x] Tự gửi token xác thực
- [x] Chưa đăng nhập thì chuyển sang màn hình đăng nhập
- [x] Đăng nhập xong quay lại Checkout
- [x] Tạo đơn hàng qua POST /orders
- [x] Thanh toán qua POST /payments
- [x] Thanh toán thành công thì xoá giỏ hàng
- [x] Thanh toán thất bại thì giữ nguyên giỏ hàng
- [x] Chuyển đến trang đơn hàng sau khi thanh toán thành công