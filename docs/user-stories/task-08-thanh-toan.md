# User Story – Task 8: Thanh toán không tiền mặt

**Người viết:** Đỗ Xuân Triệu · **Issue:** #13 · **Sprint:** 3

Là **khách hàng đã đăng nhập**, tôi muốn thanh toán đơn hàng bằng ví điện tử hoặc thẻ, để đơn hàng được ghi nhận đã thanh toán và quán bắt đầu chuẩn bị.

**Tiêu chí chấp nhận**
- [x] `POST /payments` yêu cầu đăng nhập; chỉ được thanh toán đơn hàng của chính mình
- [x] Thanh toán qua cổng bên thứ 3 VNPay Sandbox: `POST /payments` nhận `{ orderId, method }`, tạo Payment `PENDING` và trả `{ id, status, amount, payUrl }` (link trang thanh toán VNPay có chữ ký); số tiền lấy từ `order.total`
- [x] Khách trả bằng Thẻ → mở thẳng trang thẻ ATM của VNPay; chọn Ví → khách chọn cách trả trên trang VNPay
- [x] Khách trả thành công trên VNPay → Payment `SUCCESS`, đơn `PENDING → PAID`; khách hủy hoặc lỗi trên VNPay → Payment `FAILED`, đơn `PENDING → PAYMENT_FAILED`
- [x] Kết quả từ VNPay được kiểm tra chữ ký và hỏi lại VNPay (truy vấn giao dịch) trước khi cập nhật đơn; có thêm đường IPN cho môi trường deploy
- [x] Đơn quá hạn thanh toán (5 phút) không tạo được link: 400 "Đơn đã hết thời gian thanh toán"
- [x] Hủy đơn đã thanh toán → hoàn tiền toàn bộ qua API hoàn tiền của VNPay; lỗi thì ghi "Đang hoàn tiền" và hệ thống tự thử lại
- [x] Khách trả xong nhưng đơn đã bị hủy (quá hạn) → tự hoàn tiền
- [x] Việc đổi trạng thái đơn dùng `assertTransition` của Task 10a; trạng thái không hợp lệ bị chặn với lỗi 400
- [x] Có unit test cho thanh toán thành công và thanh toán thất bại
- [x] Khách đang thanh toán trên VNPay (chưa có kết quả) thì đơn giữ nguyên "Chờ thanh toán", hệ thống hỏi lại sau
- [x] Backend vẫn chạy khi chưa cấu hình khoá VNPay; chỉ chức năng thanh toán báo "Chưa cấu hình thanh toán VNPay"
