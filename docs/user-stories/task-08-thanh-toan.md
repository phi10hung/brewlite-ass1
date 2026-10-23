# User Story – Task 8: Thanh toán không tiền mặt

**Người viết:** Đỗ Xuân Triệu · **Issue:** #13 · **Sprint:** 3

Là **khách hàng đã đăng nhập**, tôi muốn thanh toán đơn hàng bằng ví điện tử hoặc thẻ, để đơn hàng được ghi nhận đã thanh toán và quán bắt đầu chuẩn bị.

**Tiêu chí chấp nhận**
- [x] `POST /payments` yêu cầu đăng nhập; chỉ được thanh toán đơn hàng của chính mình
- [x] Nhận body `{ orderId, method: "WALLET" | "CARD", simulate?: "fail" }`; số tiền lấy từ `order.total`, không tin số tiền client gửi
- [x] Thanh toán thành công tạo Payment `SUCCESS` và chuyển đơn `PENDING → PAID`
- [x] Gửi `simulate: "fail"` tạo Payment `FAILED` và chuyển đơn `PENDING → PAYMENT_FAILED`
- [x] Response trả `201 { id, status: "SUCCESS" | "FAILED", amount }` cho cả thanh toán thành công và thất bại
- [x] Việc đổi trạng thái đơn dùng `assertTransition` của Task 10a; trạng thái không hợp lệ bị chặn với lỗi 400
- [x] Có unit test cho thanh toán thành công và thanh toán thất bại
