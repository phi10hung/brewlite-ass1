# Task 6 – API tạo đơn hàng

Người thực hiện: Quang

## User Story

Là khách hàng đã đăng nhập, tôi muốn gửi giỏ hàng của mình để tạo đơn hàng và nhận mã đơn, để quán bắt đầu chuẩn bị đồ uống và tôi có thể thanh toán sau đó.

## Tiêu chí chấp nhận

1. POST /orders với giỏ hợp lệ và token trả về 201, kèm mã đơn dạng BL-XXXXXX, trạng thái PENDING và tổng tiền đúng.
2. Giá được tính ở backend theo công thức (giá món + phụ thu size + tổng giá topping) × số lượng; giá do client gửi lên không được dùng.
3. Giỏ rỗng, size ngoài S/M/L, số lượng nhỏ hơn 1, hoặc món/topping không tồn tại trả về 400 kèm thông báo tiếng Việt.
4. Gọi API khi chưa đăng nhập trả về 401.
5. Đơn và các món trong đơn được lưu cùng lúc: nếu một món lỗi thì không tạo đơn nào.
6. Body có `paymentMethod` ("WALLET" | "CARD"); đơn lưu hạn thanh toán 5 phút (`expiresAt`).
7. Không giới hạn 20 ly mỗi dòng; giới hạn là số ly còn pha được từ kho nguyên liệu.
8. Khách đặt đơn mới thì đơn đang chờ thanh toán cũ của khách tự bị hủy và trả nguyên liệu.
9. `PATCH /orders/:id/cancel`: khách hủy đơn của chính mình khi đơn đang Chờ thanh toán, Thanh toán lỗi hoặc Đã thanh toán; đơn đã thanh toán được hoàn tiền và trừ điểm; đơn từ Đã nhận trở đi không hủy được (400); đơn vừa đổi trạng thái → 409.
10. `GET /orders/me`, `GET /orders/:id` trả thêm `paymentMethod`, `expiresAt`, `refundStatus`.