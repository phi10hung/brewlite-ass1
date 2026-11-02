# User Story – Checkout

**Người viết:** Hồ Văn Linh · **Issue:** #14, #79 · **Sprint:** 3

Là khách hàng đã đăng nhập,
tôi muốn thực hiện thanh toán đơn hàng,
để đơn hàng được xử lý và ghi nhận chính xác.

## Tiêu chí chấp nhận

- [x] Checkout gọi API bằng apiFetch
- [x] Tự gửi token xác thực
- [x] Chưa đăng nhập thì chuyển sang màn hình đăng nhập
- [x] Đăng nhập xong quay lại Checkout
- [x] Tạo đơn hàng qua POST /orders, gửi kèm phương thức Ví/Thẻ đã chọn
- [x] Tạo đơn xong gọi POST /payments lấy link VNPay và chuyển thẳng sang trang thanh toán VNPay Sandbox; Checkout không còn ô giả lập thanh toán lỗi
- [x] Giỏ hàng giữ nguyên ở Checkout, chỉ bị xoá khi đơn thanh toán thành công
- [x] Thiếu nguyên liệu khi tạo đơn thì báo lỗi rõ ràng, giữ nguyên giỏ
- [x] Đang có đơn chờ thanh toán thì hiện nhắc nhở, nút "Tiếp tục thanh toán" mở trang chi tiết đơn; đặt đơn mới sẽ hủy đơn cũ
- [x] Giao diện Checkout cùng tông màu với cả web; ghi rõ thanh toán qua VNPay (môi trường thử nghiệm, không trừ tiền thật)