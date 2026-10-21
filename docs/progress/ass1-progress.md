# Bảng phân công và tiến độ – Assignment 1

**Loại công việc:** Meet (họp nhóm) · Phân công (giao việc) · Bổ sung (làm thêm, hoàn thiện) · Chỉnh sửa (sửa theo góp ý)

> Ghi ngay sau mỗi buổi họp hoặc mỗi lần làm. Ngày ghi phải khớp ngày commit. Cột Link ghi số issue (#5) hoặc PR.

**Thành viên:** Hùng (Trưởng nhóm) · Quang (Product Owner) · Triệu · Khoa · Búp (Scrum Master) · Linh

## Task 1 – Khởi tạo dự án và cấu trúc

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Meet | Thống nhất làm lại repo theo đúng phạm vi Assignment 1, chốt phân công 6 thành viên | Cả nhóm |  |
|  |  | Phân công | Tạo repo, khởi tạo monorepo frontend (Next.js) + backend (NestJS), README, .env.example | Hùng | #1 |
|  |  | Bổ sung | Tạo repo GitHub, mời thành viên, khởi tạo frontend + backend chạy được Hello, docker-compose PostgreSQL | Hùng | #1 |
|  |  | Phân công | Prisma, DB Schema và dữ liệu seed | Hùng | #2 |

## Task 2 – API danh sách sản phẩm

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API GET /products, GET /products/:id | Quang | #3 |

## Task 3 – Trang Menu

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Layout chung (Navbar, Footer, badge giỏ hàng) | Khoa | #4 |
|  |  | Phân công | Trang Menu (lưới sản phẩm, loading/empty/error) | Búp | #5 |

## Task 4 – Chi tiết và tùy chọn sản phẩm

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Màn hình chi tiết: size, topping, tính giá | Búp | #6 |

## Task 5 – Giỏ hàng

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Giỏ hàng Cart UI + Zustand state | Linh | #8 |

## Task 6 – API tạo đơn hàng

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API POST /orders (validate DTO, lưu PENDING) | Quang | #9 |

## Task 7 – Đăng ký / Đăng nhập (JWT)

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API đăng ký/đăng nhập, bcrypt, JWT Guard | Hùng | #10 |
|  |  | Phân công | Màn hình Đăng ký/Đăng nhập | Khoa | #11 |

## Task 8 – Thanh toán không tiền mặt

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Mock Payment Service, POST /payments | Triệu | #13 |
|  |  | Phân công | Màn hình Checkout, chọn Ví/Thẻ | Linh | #14 |

## Task 9 – Xác nhận, lịch sử đơn và bàn giao

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API GET /orders/me, GET /orders/:id | Quang | #15 |
|  |  | Phân công | Màn hình xác nhận đơn và lịch sử đơn | Khoa | #16 |
|  |  | Phân công | Docker hoá frontend + backend, README, demo end-to-end | Hùng | #17 |

## Task 10 – Nghiệp vụ backend nâng cao

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Order State Machine + test (a) | Triệu | #18 |
|  |  | Phân công | Thanh toán idempotent (Idempotency-Key) + test (b) | Triệu | #19 |
|  |  | Phân công | Kiểm soát tồn kho khi đặt đồng thời + test (c) | Quang | #20 |
|  |  | Phân công | Khuyến mãi và điểm thưởng (backend) | Triệu | #21 |
|  |  | Phân công | Giao diện mã giảm giá, điểm thưởng | Linh | #23 |

## Tài liệu – User Story và bảng tiến độ

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Tổng hợp User Story và ghi bảng tiến độ các Sprint | Búp | #7, #12, #22 |
|  |  | Phân công | Mỗi người viết User Story cho phần mình code | Cả nhóm |  |
