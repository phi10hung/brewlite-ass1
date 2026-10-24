# User Story – Task 9: Màn hình xác nhận đơn và lịch sử đơn

**Người viết:** Khoa · **Issue:** #16 · **Sprint:** 3

**Là** khách hàng đã đăng nhập,
**tôi muốn** xem màn hình xác nhận ngay sau khi thanh toán và xem lại danh sách các đơn đã đặt,
**để** biết đơn của mình đã được ghi nhận, theo dõi trạng thái và tra cứu lại những lần đã mua.

**Tiêu chí chấp nhận**
- [x] Trang Lịch sử đơn (`/orders`) gọi `GET /orders/me`, hiện đơn mới nhất trước, mỗi đơn có mã đơn (`code`), ngày đặt, trạng thái và tổng tiền
- [x] Bấm vào một đơn thì chuyển sang trang chi tiết `/orders/:id`
- [x] Trang Xác nhận đơn (`/orders/:id`) hiện mã đơn, trạng thái, danh sách món (tên, size, topping, số lượng, thành tiền), tạm tính, giảm giá (kèm mã khuyến mãi nếu có) và tổng cộng
- [x] Sau khi thanh toán xong, hệ thống chuyển sang trang Xác nhận đơn của đơn vừa tạo
- [x] Mỗi trạng thái (`PENDING`, `PAID`, `PAYMENT_FAILED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`) có nhãn tiếng Việt và màu riêng; `PAYMENT_FAILED` hiện "Thanh toán thất bại"
- [x] Cả hai trang có trạng thái đang tải; trang lịch sử có trạng thái chưa có đơn (kèm nút "Khám phá Menu")
- [x] Khi gặp lỗi (mất kết nối, đơn không tồn tại hoặc của người khác trả 404) thì hiện thông báo lỗi; trang lịch sử có nút "Thử lại"
- [x] Chưa đăng nhập hoặc token hết hạn thì tự chuyển sang trang đăng nhập
- [x] Navbar: đã đăng nhập hiện link "Lịch sử đơn" (`/orders`); chỉ tài khoản có `role === "STAFF"` mới thấy link "Quản lý đơn" (`/staff`)
