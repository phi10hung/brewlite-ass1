# User Story – Task 9: Docker và bàn giao

**Người viết:** Hùng · **Issue:** #17 · **Sprint:** 3

**Là** người nhận bàn giao sản phẩm,
**tôi muốn** bật toàn bộ hệ thống bằng một lệnh và có hướng dẫn rõ ràng,
**để** chạy thử được ngay mà không phải cài Node.js hay cấu hình từng phần.

**Tiêu chí chấp nhận**
- [x] Có Dockerfile cho frontend và backend
- [x] `docker compose --profile app up --build -d` bật đủ database, backend, frontend
- [x] Database trống thì backend tự tạo bảng và nạp dữ liệu mẫu
- [x] Tắt bằng `docker compose --profile app stop`, lần sau bật lại vẫn còn dữ liệu
- [x] Chưa có khoá VNPay thì hệ thống vẫn chạy, chỉ phần thanh toán báo "Chưa cấu hình thanh toán VNPay"
- [x] README hướng dẫn chạy local, chạy bằng Docker và cấu hình VNPay Sandbox
- [ ] Demo end-to-end: menu, giỏ hàng, thanh toán, xác nhận đơn (làm ở buổi Sprint Review)
