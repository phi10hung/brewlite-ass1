# User Story – Task 1: Khởi tạo dự án và cơ sở dữ liệu

**Người viết:** Hùng · **Issue:** #1, #2, #75 · **Sprint:** 1, 3

**Là** thành viên nhóm phát triển,
**tôi muốn** có sẵn khung dự án frontend, backend và cơ sở dữ liệu với dữ liệu mẫu,
**để** mọi người tải về là chạy được ngay và bắt tay vào làm chức năng của mình.

**Tiêu chí chấp nhận**
- [x] Một repo chứa frontend (Next.js) và backend (NestJS), cả hai chạy được
- [x] README hướng dẫn cài đặt, chạy database và tài khoản test; có .env.example, .gitignore
- [x] docker-compose chạy PostgreSQL
- [x] Prisma schema đủ các bảng: Product, Topping, User, Order, OrderItem, Payment, Promotion, LoyaltyTransaction
- [x] Tính trước cho Task 10: Payment.idempotencyKey (không trùng), User.loyaltyPoints; optimistic locking dùng `version` của bảng Ingredient
- [x] Chạy npx prisma db seed tạo được dữ liệu mẫu: 14 đồ uống có ảnh, giá; 9 topping; 2 mã giảm giá; 2 tài khoản
- [x] Có endpoint /health để kiểm tra backend và database đang chạy
- [x] Kho nguyên liệu theo công thức pha chế: bảng Ingredient (tồn kho, version), Recipe (công thức món, size M), ToppingRecipe (công thức topping), OrderIngredient (lượng nguyên liệu đã trừ của từng đơn)
- [x] Thanh toán VNPay: Order có paymentMethod, expiresAt (hạn thanh toán); Payment có trạng thái PENDING, mã giao dịch VNPay, trạng thái hoàn tiền
- [x] Điểm thưởng: LoyaltyTransaction có loại EARN (cộng) và REVOKE (trừ khi hủy), mỗi đơn mỗi loại 1 lần
- [x] Seed có kho nguyên liệu và công thức cho 14 món, 9 topping
- [x] .env.example có các biến VNPay Sandbox (không chứa khoá thật)
