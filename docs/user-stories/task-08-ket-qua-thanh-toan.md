# User Story – Task 8: Kết quả thanh toán VNPay và tự hủy đơn quá hạn

**Người viết:** Hùng · **Issue:** #78 · **Sprint:** 3

**Là** khách hàng vừa thanh toán trên VNPay,
**tôi muốn** biết ngay thanh toán thành công hay chưa và được chọn bước tiếp theo,
**để** không phải đoán đơn của mình đã được ghi nhận chưa, và không bị giữ đơn mãi khi bỏ dở.

**Tiêu chí chấp nhận**
- [x] Trang `/payment/result` nhận kết quả VNPay đưa về, gửi cho backend (`GET /payments/vnpay-return`) kiểm tra chữ ký, số tiền và hỏi lại VNPay; trong lúc chờ hiện "Đang xác nhận thanh toán…"
- [x] Thành công: hiện "Thanh toán thành công", xoá giỏ hàng, cập nhật điểm ⭐ trên Navbar, 3 giây sau tự chuyển sang trang đơn hàng (có nút "Xem đơn hàng")
- [x] Không thành công: hiện lý do theo mã VNPay (ví dụ "Bạn đã hủy giao dịch trên VNPay"), giữ nguyên giỏ, có nút "Thanh toán lại" (tạo link VNPay mới cho đúng đơn cũ), "Hủy đơn", "Về giỏ hàng"
- [x] VNPay chưa xác nhận xong: báo "Đang chờ VNPay xác nhận", xem lại ở trang đơn hàng
- [x] Trả xong nhưng quay về khi đơn đã bị tự hủy: báo đơn đã hủy và tiền sẽ được hoàn, không xoá giỏ, không cộng điểm
- [x] Mở trang khi không có kết quả VNPay, hoặc kết quả sai chữ ký / sai số tiền: báo lỗi, có nút về lịch sử đơn
- [x] Tác vụ nền mỗi 30 giây: đơn Chờ thanh toán / Thanh toán lỗi quá hạn (5 phút, `ORDER_PAYMENT_MINUTES`) được hỏi lại VNPay; chưa trả thì tự hủy và trả nguyên liệu về kho
- [x] Lần chạy trước chưa xong thì bỏ qua lần sau; một đơn hủy lỗi không làm dừng các đơn khác
- [x] Tác vụ nền mỗi phút: thử lại các lần hoàn tiền VNPay bị lỗi
- [x] Unit test tác vụ tự hủy; README có hướng dẫn cấu hình và chạy thử VNPay Sandbox

**Ghi chú:** dùng `@nestjs/schedule`. Hàm hủy đơn dùng chung `OrdersService.cancel` (Quang), hỏi lại VNPay và hoàn tiền dùng `PaymentsService.syncOrder`, `retryRefunds` (Triệu).
