# Task 10e – Màn hình nhân viên cập nhật trạng thái đơn

## User Story
Là **nhân viên quán**, tôi muốn xem danh sách đơn và chuyển trạng thái từng đơn,
để khách biết đồ uống của mình đang được pha, đã xong hay đã giao.

## Tiêu chí chấp nhận
- Đăng nhập bằng tài khoản nhân viên thì vào được trang `/staff`.
- Danh sách đơn mới nhất trước, có mã đơn, giờ đặt, tên khách, các món, tổng tiền, trạng thái.
- Lọc được đơn theo trạng thái.
- Mỗi đơn có nút sang bước tiếp theo: Bắt đầu pha → Đã xong → Hoàn thành đơn.
- Đơn Đã thanh toán (barista chưa pha) có nút Hủy đơn, hỏi xác nhận trước khi hủy; đơn đang pha trở đi không hủy được.
- Chuyển sai luồng (ví dụ PAID → COMPLETED) bị từ chối với lỗi 400.
- Đơn không tồn tại trả lỗi 404.
- Tài khoản khách hàng gọi API nhân viên bị chặn (403) và trang hiện
  "Bạn không có quyền xem trang này".
- Trang có trạng thái đang tải, chưa có đơn và lỗi (có nút Thử lại).

## API
- `GET /staff/orders?status=PAID`
- `PATCH /staff/orders/:id/status` body `{ "status": "PREPARING" }`