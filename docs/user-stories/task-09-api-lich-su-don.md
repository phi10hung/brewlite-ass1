# Task 9 – API lịch sử đơn

Người thực hiện: Quang

## User Story

Là khách hàng đã đăng nhập, tôi muốn xem danh sách các đơn đã đặt và chi tiết từng đơn, để theo dõi trạng thái và tra cứu lại những lần mình đã mua.

## Tiêu chí chấp nhận

1. GET /orders/me trả về danh sách đơn của chính người đăng nhập, đơn mới nhất đứng đầu, mỗi đơn có id, code, status, total, createdAt và các món trong đơn.
2. GET /orders/:id trả về chi tiết một đơn của mình gồm subtotal, discount, total, promotionCode và các món kèm unitPrice, lineTotal.
3. Đơn không tồn tại hoặc thuộc người khác trả về 404 kèm thông báo "Không tìm thấy đơn hàng".
4. Chưa đăng nhập gọi hai API trên trả về 401; id không phải số trả về 400.