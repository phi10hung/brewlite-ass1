# Task 6 – API tạo đơn hàng

Người thực hiện: Quang

## User Story

Là khách hàng đã đăng nhập, tôi muốn gửi giỏ hàng của mình để tạo đơn hàng và nhận mã đơn, để quán bắt đầu chuẩn bị đồ uống và tôi có thể thanh toán sau đó.

## Tiêu chí chấp nhận

1. POST /orders với giỏ hợp lệ và token trả về 201, kèm mã đơn dạng BL-XXXXXX, trạng thái PENDING và tổng tiền đúng.
2. Giá được tính ở backend theo công thức (giá món + phụ thu size + tổng giá topping) × số lượng; giá do client gửi lên không được dùng.
3. Giỏ rỗng, size ngoài S/M/L, số lượng ngoài khoảng 1–20, hoặc món/topping không tồn tại trả về 400 kèm thông báo tiếng Việt.
4. Gọi API khi chưa đăng nhập trả về 401.
5. Đơn và các món trong đơn được lưu cùng lúc: nếu một món lỗi thì không tạo đơn nào.