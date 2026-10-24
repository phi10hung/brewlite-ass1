# Task 10c: Kiểm soát tồn kho khi đặt đồng thời

## User Story

Là chủ quán, tôi muốn hệ thống tự trừ tồn kho khi khách đặt đơn và không bao giờ bán vượt số ly còn lại, để tránh nhận đơn cho món đã hết hàng ngay cả khi nhiều khách đặt cùng lúc.

## Tiêu chí chấp nhận

1. Khi đặt đơn thành công, tồn kho của từng món giảm đúng bằng tổng số lượng đã đặt (cộng dồn nếu cùng món xuất hiện ở nhiều dòng).
2. Việc trừ kho và tạo đơn nằm trong cùng một transaction: nếu một món hết hàng thì toàn bộ đơn bị hủy, không món nào bị trừ kho.
3. Khi không đủ hàng, API trả về lỗi 400 với thông báo rõ ràng, ví dụ "Món Latte chỉ còn 0 ly".
4. Hai đơn đặt đồng thời cho món chỉ còn 1 ly: đúng một đơn thành công, đơn còn lại bị từ chối, tồn kho không bao giờ âm.
5. Hệ thống dùng cột `version` (optimistic locking) để phát hiện xung đột và tự thử lại tối đa 3 lần; nếu vẫn xung đột thì trả lỗi 409 "Hệ thống đang bận, vui lòng đặt lại sau giây lát".

## Ghi chú kỹ thuật

- Trừ kho bằng `updateMany` với điều kiện `version` khớp lúc đọc, đồng thời tăng `version` lên 1.
- Các món được xử lý theo thứ tự `productId` tăng dần để tránh khóa chéo giữa các đơn.
- Kiểm thử: unit test mô phỏng kho trong bộ nhớ, bắn 2 đơn song song bằng `Promise.allSettled` (test c).