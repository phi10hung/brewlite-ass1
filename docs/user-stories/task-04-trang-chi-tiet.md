# User Story – Task 4: Chi tiết và tùy chọn sản phẩm

**Người viết:** Búp · **Issue:** #6 · **Sprint:** 1 (cập nhật Sprint 3, #80)

**Là** khách hàng,
**tôi muốn** xem chi tiết một món, chọn size, topping, số lượng, thấy ngay giá tiền và số ly còn pha được,
**để** đặt đúng ly đồ uống theo ý mình, biết trước phải trả bao nhiêu và không chọn quá số ly quán còn pha được.

**Tiêu chí chấp nhận**
- [x] Hiển thị hình, tên, mô tả và giá gốc của món
- [x] Chọn size S, M (+5.000đ), L (+10.000đ)
- [x] Chọn một hoặc nhiều topping, mỗi topping hiện giá cộng thêm
- [x] Tăng, giảm số lượng (tối thiểu 1, tối đa bằng số ly còn pha được)
- [x] Tổng tiền cập nhật ngay khi đổi lựa chọn: (giá gốc + size + topping) × số lượng
      Ví dụ: Latte size L + Kem cheese, số lượng 2 = 134.000đ
- [x] Bấm "Thêm vào giỏ" thì món (kèm size, topping, số lượng, giá) được thêm vào giỏ hàng, hiện "Đã thêm vào giỏ hàng" và số trên thanh menu tăng
- [x] Đang tải thì hiện thông báo; lỗi thì có nút "Thử lại"; món không tồn tại thì báo "Không tìm thấy món này"
- [x] Dữ liệu món, size, topping lấy từ API `GET /products/:id`
- [x] Không còn giới hạn cứng 20 ly; số ly tối đa lấy theo tồn kho nguyên liệu thật
- [x] Hiện dòng "Còn X ly" theo size và topping đang chọn, tính lại khi đổi size hoặc topping (API `POST /products/availability`)
- [x] Chọn quá số ly còn lại rồi bấm "Thêm vào giỏ" thì báo "Chỉ còn pha được X ly với lựa chọn này"
- [x] Size nào không đủ nguyên liệu thì khoá và ghi "(hết)"; chọn size hết thì báo "Size L không đủ nguyên liệu với topping đã chọn" (chữ L đổi theo size đang chọn)
- [x] Cả 3 size đều hết thì hiện "Hết món" và khoá nút "Thêm vào giỏ"
- [x] Topping đã hết nguyên liệu thì khoá, không cho chọn
- [x] Đổi size, topping hoặc số lượng thì xoá thông báo cũ (đỏ hoặc xanh)

**Ghi chú:** nút "Thêm vào giỏ" gọi `addItem` của giỏ hàng (Task 5 của Linh). Số ly còn tính trên kho thật, chưa trừ phần đã nằm trong giỏ. Đã bỏ dữ liệu giả.