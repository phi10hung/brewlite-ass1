# Task 10e – Màn hình nhân viên cập nhật trạng thái đơn

## User Story
Là **nhân viên quán**, tôi muốn xem danh sách đơn, chuyển trạng thái từng đơn và xem kho nguyên liệu,
để khách biết đồ uống của mình đang được pha, đã xong hay đã giao, và tôi biết nguyên liệu nào sắp hết.

## Tiêu chí chấp nhận
- Đăng nhập bằng tài khoản nhân viên thì vào được trang `/staff`.
- Danh sách đơn mới nhất trước, có mã đơn, giờ đặt, tên khách, các món, tổng tiền, trạng thái.
- Lọc được đơn theo trạng thái.
- Mỗi đơn có nút sang bước tiếp theo: Nhận đơn → Pha xong → Giao khách.
- Đơn Đã thanh toán (barista chưa pha) có nút Hủy đơn, hỏi xác nhận trước khi hủy.
- Khi hủy đơn, nguyên liệu của đơn được trả lại kho. Nếu đơn đã thanh toán thì hệ thống thu hồi điểm tích lũy và hoàn tiền cho khách qua VNPay; nếu hoàn tiền chưa xong thì đơn hiển thị "Đang hoàn tiền".
- Đơn đang pha trở đi không hủy được (lỗi 400).
- Chuyển sai luồng (ví dụ PAID → COMPLETED) bị từ chối với lỗi 400.
- Đơn không tồn tại trả lỗi 404.
- Tài khoản khách hàng gọi API nhân viên bị chặn (403) và trang hiện
  "Bạn không có quyền xem trang này".
- Trang có trạng thái đang tải, chưa có đơn và lỗi (có nút Thử lại).
- API nhập kho: chỉ nhân viên gọi được, chỉ cộng thêm, số lượng là số nguyên dương (sai trả 400), nguyên liệu không tồn tại trả 404; nhập xong số ly còn pha tăng theo.
- Navbar của nhân viên có mục "Kho nguyên liệu" (điện thoại ghi "Kho"), mở trang `/staff/ingredients`; trang `/staff` chỉ còn quản lý đơn. Khách vào trang kho thấy "Bạn không có quyền xem trang này".
- Bảng kho có các cột: Tên, Tồn kho, Đơn vị, Nhập kho. Nguyên liệu hết (tồn kho bằng 0) được tô đỏ.
- Mỗi dòng có ô nhập số và nút "Nhập kho": nhập xong số tồn cập nhật ngay và hiện "Đã nhập 2.000 ml"; nhập sai thì báo lỗi ngay tại dòng đó, kho không đổi.
- Bảng kho có nút "Tải lại" để cập nhật số liệu, và có trạng thái đang tải, chưa có nguyên liệu, lỗi.

## API
- `GET /staff/orders?status=PAID`
- `PATCH /staff/orders/:id/status` body `{ "status": "PREPARING" }`
- `GET /staff/ingredients` xem kho nguyên liệu
- `POST /staff/ingredients/:id/restock` body `{ "amount": 2000 }` nhập thêm nguyên liệu