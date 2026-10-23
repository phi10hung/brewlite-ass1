# User Story – Task 1: Khởi tạo dự án và cơ sở dữ liệu

**Người viết:** Hùng · **Issue:** #1, #2 · **Sprint:** 1

**Là** thành viên nhóm phát triển,
**tôi muốn** có sẵn khung dự án frontend, backend và cơ sở dữ liệu với dữ liệu mẫu,
**để** mọi người tải về là chạy được ngay và bắt tay vào làm chức năng của mình.

**Tiêu chí chấp nhận**
- [x] Một repo chứa frontend (Next.js) và backend (NestJS), cả hai chạy được
- [x] README hướng dẫn cài đặt, chạy database và tài khoản test; có .env.example, .gitignore
- [x] docker-compose chạy PostgreSQL
- [x] Prisma schema đủ các bảng: Product, Topping, User, Order, OrderItem, Payment, Promotion, LoyaltyTransaction
- [x] Tính trước cho Task 10: Product.version, Payment.idempotencyKey (không trùng), User.loyaltyPoints
- [x] Chạy npx prisma db seed tạo được dữ liệu mẫu: 14 đồ uống có ảnh, giá, tồn kho; 9 topping; 2 mã giảm giá; 2 tài khoản
- [x] Có endpoint /health để kiểm tra backend và database đang chạy
