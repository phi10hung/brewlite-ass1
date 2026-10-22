# User Story – Task 3: Trang Menu

**Người viết:** Búp · **Issue:** #5 · **Sprint:** 1

**Là** khách hàng,
**tôi muốn** xem danh sách đồ uống kèm hình và giá, lọc được theo loại đồ uống,
**để** chọn món nhanh mà không phải xếp hàng hỏi nhân viên.

**Tiêu chí chấp nhận**
- [x] Hiển thị lưới đồ uống, mỗi món có hình, tên, giá (định dạng 29.000đ)
- [x] Lọc theo danh mục: Tất cả, Cà phê, Trà, Đá xay
- [x] Đang tải dữ liệu thì hiện "Đang tải..."
- [x] Không có món nào thì báo "Chưa có món nào"; lỗi kết nối thì báo lỗi kèm nút "Thử lại"
- [x] Xem tốt trên điện thoại (2 cột) và máy tính (3–4 cột)
- [x] Bấm vào một món thì chuyển sang trang chi tiết món đó

**Ghi chú:** hiện dùng dữ liệu giả khớp với dữ liệu mẫu trong database (14 món, sau khi PR thêm món được merge). Khi API `GET /products` hoàn thành sẽ chuyển sang dữ liệu thật.
