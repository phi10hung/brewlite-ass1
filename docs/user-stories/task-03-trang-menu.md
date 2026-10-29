# User Story – Task 3: Trang Menu

**Người viết:** Búp · **Issue:** #5 · **Sprint:** 1 (cập nhật Sprint 3, #80)

**Là** khách hàng,
**tôi muốn** xem danh sách đồ uống kèm hình và giá, lọc được theo loại đồ uống, biết món nào đã hết,
**để** chọn món nhanh mà không phải xếp hàng hỏi nhân viên.

**Tiêu chí chấp nhận**
- [x] Hiển thị lưới đồ uống, mỗi món có hình, tên, giá (định dạng 29.000đ)
- [x] Lọc theo danh mục: Tất cả, Cà phê, Trà, Đá xay
- [x] Đang tải dữ liệu thì hiện "Đang tải..."
- [x] Không có món nào thì báo "Chưa có món nào"; lỗi kết nối thì báo lỗi kèm nút "Thử lại"
- [x] Xem tốt trên điện thoại (2 cột) và máy tính (3–4 cột)
- [x] Bấm vào một món thì chuyển sang trang chi tiết món đó
- [x] Dữ liệu món (tên, giá, hình, danh mục) lấy từ API `GET /products`
- [x] Món không còn đủ nguyên liệu để pha thì hiện nhãn "Hết món" trên thẻ món

**Ghi chú:** dữ liệu lấy từ API `GET /products` (14 món trong dữ liệu mẫu), hình lấy từ `imageUrl` do API trả về. Đã bỏ dữ liệu giả. Nhãn "Hết món" dựa trên tồn kho nguyên liệu thật.