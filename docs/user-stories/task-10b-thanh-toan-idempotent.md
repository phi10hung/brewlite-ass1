# User Story – Task 10b: Thanh toán idempotent với Idempotency-Key

**Người viết:** Đỗ Xuân Triệu · **Issue:** #19 · **Sprint:** 3

Là **khách hàng**, tôi muốn các lần bấm thanh toán hoặc request gửi trùng không tạo thêm giao dịch, để không bị trừ tiền hai lần và đơn hàng không bị xử lý sai.

**Tiêu chí chấp nhận**
- [x] `POST /payments` bắt buộc header `Idempotency-Key`; thiếu hoặc rỗng → báo lỗi 400
- [x] Key được lưu vào cột `Payment.idempotencyKey` (unique)
- [x] Cùng key, cùng `orderId` và cùng `method` → trả lại Payment cũ, không tạo Payment mới và không đổi trạng thái đơn lần nữa
- [x] Cùng key nhưng khác `orderId` hoặc `method` → báo lỗi 409 Conflict
- [x] Hai request đồng thời cùng key → chỉ một Payment được tạo; request còn lại trả về Payment đã thắng
- [x] Thanh toán thất bại vẫn lưu Payment `FAILED`; lần thử lại dùng key mới đi qua `PAYMENT_FAILED → PENDING → PAID/PAYMENT_FAILED`
- [x] Payment và cập nhật trạng thái đơn nằm trong một transaction; không tạo Payment nếu cập nhật đơn thất bại
- [x] Có unit test cho idempotency, key trùng, thiếu key và race condition
- [x] Cùng `Idempotency-Key` → trả lại đúng Payment cũ và cùng link VNPay, không tạo yêu cầu thanh toán mới
- [x] Kết quả VNPay gửi về nhiều lần (trang kết quả, IPN, truy vấn trạng thái) chỉ cập nhật đơn và cộng điểm 1 lần
