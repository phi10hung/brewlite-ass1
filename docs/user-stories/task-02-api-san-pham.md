# Task 2 – API danh sách sản phẩm

Người thực hiện: Quang

## User Story

Là khách hàng, tôi muốn xem danh sách đồ uống và chi tiết từng món (kèm size và topping), để chọn được món phù hợp trước khi đặt.

## Tiêu chí chấp nhận

1. GET /products trả về danh sách đồ uống gồm id, name, description, category, price, imageUrl, stock; có thể lọc theo category.
2. GET /products/:id trả về chi tiết món kèm sizes (S +0đ, M +5.000đ, L +10.000đ) và danh sách toppings.
3. GET /products/999 (món không tồn tại) trả về 404 kèm thông báo; id không phải số trả về 400.
4. Phản hồi dưới 500ms với dữ liệu mẫu; có unit test cho 3 trường hợp: có danh sách, có chi tiết, 404.