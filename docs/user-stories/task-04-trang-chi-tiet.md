# User Story – Task 4: Chi tiết và tùy chọn sản phẩm

**Người viết:** Búp · **Issue:** #6 · **Sprint:** 1

**Là** khách hàng,
**tôi muốn** xem chi tiết một món, chọn size, topping, số lượng và thấy ngay giá tiền,
**để** đặt đúng ly đồ uống theo ý mình và biết trước phải trả bao nhiêu.

**Tiêu chí chấp nhận**
- [x] Hiển thị hình, tên, mô tả và giá gốc của món
- [x] Chọn size S, M (+5.000đ), L (+10.000đ)
- [x] Chọn một hoặc nhiều topping, mỗi topping hiện giá cộng thêm
- [x] Tăng, giảm số lượng (từ 1 đến 20)
- [x] Tổng tiền cập nhật ngay khi đổi lựa chọn: (giá gốc + size + topping) × số lượng
      Ví dụ: Latte size L + Kem cheese, số lượng 2 = 134.000đ
- [x] Bấm "Thêm vào giỏ" thì món (kèm size, topping, số lượng, giá) được thêm vào giỏ hàng, hiện "Đã thêm vào giỏ hàng" và số trên thanh menu tăng
- [x] Đang tải thì hiện thông báo; lỗi thì có nút "Thử lại"; món không tồn tại thì báo "Không tìm thấy món này"
- [x] Dữ liệu món, size, topping lấy từ API `GET /products/:id`

**Ghi chú:** nút "Thêm vào giỏ" gọi `addItem` của giỏ hàng (Task 5 của Linh). Đã bỏ dữ liệu giả.
