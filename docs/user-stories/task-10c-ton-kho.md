# Task 10c: Kiểm soát tồn kho khi đặt đồng thời

**Người viết:** Quang · **Issue:** #20, #77 · **Sprint:** 3

## User Story

Là chủ quán, tôi muốn hệ thống tự tính số ly còn pha được từ kho nguyên liệu theo công thức pha chế và trừ nguyên liệu khi khách đặt, để không nhận đơn khi đã hết nguyên liệu, kể cả khi nhiều khách đặt cùng lúc.

## Tiêu chí chấp nhận

1. Mỗi món có công thức pha chế (lượng nguyên liệu cho size M); size S dùng 0,8 lần, L dùng 1,3 lần (làm tròn lên); mỗi topping cũng có công thức riêng.
2. Số ly còn pha được = nhỏ nhất của (tồn kho từng nguyên liệu ÷ lượng cần cho 1 ly); các món dùng chung nguyên liệu ảnh hưởng lẫn nhau.
3. Đặt đơn trừ nguyên liệu và tạo đơn trong cùng một transaction; thiếu nguyên liệu thì không tạo đơn, không trừ gì, trả 400 "Món X không đủ nguyên liệu, chỉ còn pha được N ly".
4. Nhiều đơn đặt đồng thời (kể cả các món dùng chung nguyên liệu) không bao giờ làm âm kho nguyên liệu (test c).
5. Trừ kho bằng optimistic locking theo `version` của từng nguyên liệu, thử lại tối đa 10 lần, quá thì 409 "Hệ thống đang bận, vui lòng đặt lại sau giây lát".
6. Hủy đơn (khách hủy, nhân viên hủy, tự hủy khi quá hạn) trả lại đúng lượng nguyên liệu đã trừ, chỉ trả 1 lần.
7. `GET /products` trả `stock` = số ly size S còn pha được; `POST /products/availability` trả số ly còn thêm được cho món đang chọn, có tính các món trong giỏ.

## Ghi chú kỹ thuật

- Trừ kho bằng `updateMany` với điều kiện `version` khớp lúc đọc, đồng thời tăng `version` lên 1.
- Các món được xử lý theo thứ tự `ingredientId` tăng dần để tránh khóa chéo giữa các đơn.
- Kiểm thử: unit test mô phỏng kho trong bộ nhớ, bắn 2 đơn song song bằng `Promise.allSettled` (test c).