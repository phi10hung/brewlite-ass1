# User Story – Task 10a: Order State Machine

**Người viết:** Đỗ Xuân Triệu · **Issue:** #18 · **Sprint:** 1

Là **chủ quán**, tôi muốn đơn hàng chỉ được chuyển trạng thái chính xác theo quy trình, để không có đơn nào bị nhảy sai bước (ví dụ chưa thanh toán đã pha chế, hay đã thanh toán lại bị huỷ)

**Tiêu chí chấp nhận**
- [x] Luồng chính: PENDING → PAID → PREPARING → READY → COMPLETED
- [x] Thanh toán lỗi thì sang PAYMENT_FAILED, được thử lại (quay về PENDING)
- [x] Được huỷ đơn (CANCELLED) khi chưa thanh toán hoặc đang pha chế, sẵn sàng; không được huỷ khi đã PAID
- [x] Chuyển trạng thái sai thì hệ thống chặn và báo lỗi 400
- [x] Có test kiểm tra toàn bộ 49 cặp chuyển trạng thái
