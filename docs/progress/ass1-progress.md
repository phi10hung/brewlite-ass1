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
|  |  | Bổ sung | Prisma schema, migration, dữ liệu seed (10 đồ uống, 4 topping, 2 mã giảm giá, 2 tài khoản), PrismaService, endpoint /health, ảnh đồ uống | Hùng | #2, PR #24 |
|  |  | Bổ sung | README: hướng dẫn chạy database và tài khoản test | Hùng | PR #25 |
|  |  | Phân công | Gửi hướng dẫn cho cả nhóm: đặt tên nhánh, viết commit, tạo PR vào develop, viết User Story | Hùng |  |

## Task 2 – API danh sách sản phẩm

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API GET /products, GET /products/:id | Quang | #3 |
| 2 | 22/10/2026 | Bổ sung | API GET /products (lọc theo danh mục), GET /products/:id (kèm size, topping), unit test ProductsService | Quang | #3 |
| 3 | 23/10/2026 | Chỉnh sửa | Tách lại thành nhiều commit nhỏ theo từng phần, sửa tên thư mục comom → common, tạo PR | Quang | PR #32 |
|  |  | Chỉnh sửa | Review PR #32: yêu cầu sửa import trùng gây lỗi build, dùng chung SIZE_EXTRA, bổ sung User Story | Hùng | PR #32 |
|  |  | Chỉnh sửa | Sửa import trùng, bổ sung User Story API sản phẩm | Quang | PR #32 |
|  |  | Chỉnh sửa | Duyệt và merge PR #32 vào develop | Hùng | PR #32 |

## Task 3 – Trang Menu

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Layout chung (Navbar, Footer, badge giỏ hàng) | Khoa | #4 |
|  |  | Phân công | Trang Menu (lưới sản phẩm, loading/empty/error) | Búp | #5 |
| 2 | 22/10/2026 | Bổ sung | Trang Menu: lưới đồ uống từ dữ liệu giả, trạng thái loading/rỗng/lỗi, icon từng món, lọc theo danh mục | Búp | #5, PR #26 |
|  |  | Chỉnh sửa | Đổi dữ liệu mẫu trang Menu cho khớp dữ liệu seed của nhóm | Búp | PR #26 |
|  |  | Chỉnh sửa | Góp ý PR #26: bổ sung User Story, ảnh đồ uống, thêm các món mới vào seed | Hùng | PR #26 |
|  |  | Chỉnh sửa | Thêm ảnh đồ uống và User Story trang Menu theo góp ý | Búp | PR #26 |
|  |  | Bổ sung | Thêm 4 món, 5 topping vào dữ liệu seed; seed luôn đặt lại id từ 1 | Búp | PR #30 |
|  |  | Bổ sung | Layout chung: Navbar, Footer (bản đầu) | Khoa | #4, PR #31 |
| 3 | 23/10/2026 | Chỉnh sửa | Duyệt và merge PR #30, #26 vào develop | Hùng | PR #26, #30 |
|  |  | Chỉnh sửa | Review PR #31: PR gộp cả đăng nhập, lịch sử đơn và sửa trang Menu/chi tiết gây conflict, yêu cầu tách lại chỉ giữ layout | Hùng | PR #31 |
|  |  | Phân công | Làm lại PR #31 chỉ giữ layout (tách đăng nhập, lịch sử đơn sang nhánh riêng) | Khoa | #4 |
|  |  | Chỉnh sửa | Làm lại PR #31: tách phần đăng nhập, lịch sử đơn sang nhánh feature/khoa-auth-orders, giữ trang của Búp, Navbar có badge số lượng giỏ hàng, User Story layout | Khoa | #4, PR #31 |
|  |  | Chỉnh sửa | Duyệt và merge PR #31 vào develop | Hùng | PR #31 |
|  |  | Phân công | Trang Menu, chi tiết chuyển sang dữ liệu thật từ API, nối nút Thêm vào giỏ | Búp | #5, #6, #8 |
|  |  | Bổ sung | Trang Menu lấy danh sách món từ API GET /products, bỏ dữ liệu giả, cập nhật User Story | Búp | #5, PR #40 |

## Task 4 – Chi tiết và tùy chọn sản phẩm

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Màn hình chi tiết: size, topping, tính giá | Búp | #6 |
| 2 | 22/10/2026 | Bổ sung | Trang chi tiết: thông tin món, chọn size/topping/số lượng, tính giá động, nút Thêm vào giỏ, trạng thái loading/lỗi/404 | Búp | #6, PR #27 |
|  |  | Chỉnh sửa | Góp ý PR #27: bổ sung User Story và ảnh đồ uống | Hùng | PR #27 |
|  |  | Chỉnh sửa | Thêm ảnh đồ uống ở trang chi tiết theo góp ý | Búp | PR #27 |
| 3 | 23/10/2026 | Chỉnh sửa | Bổ sung User Story trang chi tiết | Búp | PR #27 |
|  |  | Chỉnh sửa | Duyệt và merge PR #27 vào develop | Hùng | PR #27 |
|  |  | Bổ sung | Trang chi tiết lấy món, size, topping từ API GET /products/:id; nút Thêm vào giỏ thêm món vào giỏ hàng thật; cập nhật User Story | Búp | #6, #8, PR #40 |
|  |  | Chỉnh sửa | Duyệt và merge PR #40 vào develop | Hùng | PR #40 |

## Task 5 – Giỏ hàng

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Giỏ hàng Cart UI + Zustand state | Linh | #8 |
| 2 | 22/10/2026 | Bổ sung | Store giỏ hàng Zustand (thêm, sửa số lượng, xoá, tính tổng, lưu khi tải lại) và trang giỏ hàng | Linh | #8, PR #28 |
| 3 | 23/10/2026 | Chỉnh sửa | Duyệt PR #28, sửa tiêu đề và mô tả PR cho đúng quy ước, merge vào develop | Hùng | PR #28 |
|  |  | Bổ sung | User Story giỏ hàng | Linh | #8, PR #36 |
|  |  | Chỉnh sửa | Duyệt và merge PR #36 | Triệu | PR #36 |
|  |  | Phân công | Store giỏ hàng lưu thêm toppingIds để gửi API tạo đơn | Linh | #8, #14 |
|  |  | Bổ sung | Store giỏ hàng lưu toppingIds, Checkout gửi toppingIds theo định dạng API tạo đơn | Linh | PR #37 |
|  |  | Chỉnh sửa | Review PR #37: trang giỏ hàng lỗi biên dịch (vẫn truyền tên topping), yêu cầu sửa | Hùng | PR #37 |
|  |  | Chỉnh sửa | Sửa trang giỏ hàng dùng toppingIds, xoá giỏ cũ chưa có toppingIds | Linh | PR #37 |
|  |  | Chỉnh sửa | Duyệt và merge PR #37 vào develop | Hùng | PR #37 |

## Task 6 – API tạo đơn hàng

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API POST /orders (validate DTO, lưu PENDING) | Quang | #9 |
| 2 | 23/10/2026 | Phân công | API POST /orders: tính giá ở backend, lưu đơn PENDING, yêu cầu đăng nhập | Quang | #9 |
|  |  | Bổ sung | API POST /orders: DTO kiểm tra dữ liệu, tính giá ở backend, lưu Order + OrderItem trạng thái PENDING, sinh mã đơn, yêu cầu đăng nhập, unit test, User Story | Quang | #9, PR #39 |
|  |  | Chỉnh sửa | Duyệt và merge PR #39 vào develop | Hùng | PR #39 |

## Task 7 – Đăng ký / Đăng nhập (JWT)

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API đăng ký/đăng nhập, bcrypt, JWT Guard | Hùng | #10 |
|  |  | Phân công | Màn hình Đăng ký/Đăng nhập | Khoa | #11 |
| 2 | 23/10/2026 | Bổ sung | API đăng ký, đăng nhập: băm mật khẩu bcrypt, trả JWT, JwtAuthGuard, GET /auth/me, ValidationPipe, unit test, User Story | Hùng | #10, PR #35 |
|  |  | Chỉnh sửa | Review và merge PR #35 | Triệu | PR #35 |
|  |  | Bổ sung | Màn hình đăng ký, đăng nhập gọi API /auth, lưu token, tự gửi token khi gọi API; Navbar nút Đăng nhập / Đăng xuất; User Story | Khoa | #11, PR #38 |
|  |  | Chỉnh sửa | Duyệt và merge PR #38 vào develop | Hùng | PR #38 |

## Task 8 – Thanh toán không tiền mặt

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Mock Payment Service, POST /payments | Triệu | #13 |
|  |  | Phân công | Màn hình Checkout, chọn Ví/Thẻ | Linh | #14 |
| 2 | 22/10/2026 | Bổ sung | Giao diện Checkout: chọn Ví/Thẻ, gửi Idempotency-Key, ô nhập mã giảm giá (chưa nối API) | Linh | #14, PR #28 |
| 2 | 23/10/2026 | Phân công | Mock Payment, POST /payments chuyển đơn PAID/PAYMENT_FAILED qua assertTransition | Triệu | #13 |
|  |  | Bổ sung | Mock Payment Service (Ví/Thẻ, giả lập lỗi), API POST /payments yêu cầu đăng nhập, chỉ thanh toán đơn của mình, chuyển đơn PAID/PAYMENT_FAILED qua assertTransition, cho thanh toán lại sau lỗi, unit test, User Story | Triệu | #13, PR #41 |
|  |  | Chỉnh sửa | Duyệt và merge PR #41 vào develop | Hùng | PR #41 |
|  |  | Phân công | Đợt 3: ráp hẳn Checkout (gửi token đăng nhập, chưa đăng nhập thì chuyển sang trang đăng nhập), sửa hiển thị tên topping | Linh | #14 |

## Task 9 – Xác nhận, lịch sử đơn và bàn giao

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | API GET /orders/me, GET /orders/:id | Quang | #15 |
|  |  | Phân công | Màn hình xác nhận đơn và lịch sử đơn | Khoa | #16 |
|  |  | Phân công | Docker hoá frontend + backend, README, demo end-to-end | Hùng | #17 |
| 2 | 23/10/2026 | Phân công | Đợt 3: API GET /orders/me, GET /orders/:id (làm trước để Khoa dùng) | Quang | #15 |
|  |  | Phân công | Đợt 3: màn hình xác nhận đơn và lịch sử đơn | Khoa | #16 |
|  |  | Phân công | Đợt 3: Docker hoá frontend, backend, demo trọn luồng | Hùng | #17 |

## Task 10 – Nghiệp vụ backend nâng cao

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Order State Machine + test (a) | Triệu | #18 |
|  |  | Phân công | Thanh toán idempotent (Idempotency-Key) + test (b) | Triệu | #19 |
|  |  | Phân công | Kiểm soát tồn kho khi đặt đồng thời + test (c) | Quang | #20 |
|  |  | Phân công | Khuyến mãi và điểm thưởng (backend) | Triệu | #21 |
|  |  | Phân công | Giao diện mã giảm giá, điểm thưởng | Linh | #23 |
| 2 | 22/10/2026 | Bổ sung | Order State Machine, hàm assertTransition chặn chuyển trạng thái sai, test đủ 49 cặp trạng thái | Triệu | #18, PR #29 |
| 3 | 23/10/2026 | Chỉnh sửa | Duyệt và merge PR #29 vào develop | Hùng | PR #29 |
|  |  | Bổ sung | User Story Order State Machine | Triệu | PR #33 |
|  |  | Chỉnh sửa | Duyệt và merge PR #33 vào develop | Hùng | PR #33 |
|  |  | Bổ sung | Thanh toán idempotent: lưu Idempotency-Key, cùng key trả lại kết quả cũ không tạo thanh toán mới, khác dữ liệu báo 409, xử lý 2 yêu cầu đồng thời; test (b), User Story Task 10b | Triệu | #19, PR #41 |
|  |  | Phân công | Đợt 3: kiểm soát tồn kho khi đặt đồng thời + test (c) | Quang | #20 |
|  |  | Phân công | Đợt 3: khuyến mãi và điểm thưởng (backend) | Triệu | #21 |
|  |  | Phân công | Đợt 3: giao diện mã giảm giá, điểm thưởng | Linh | #23 |
|  |  | Phân công | Đợt 3: màn hình nhân viên cập nhật trạng thái đơn | Búp | #43 |

## Tài liệu – User Story và bảng tiến độ

| STT | Thời gian | Loại | Nội dung | Thành viên | Link |
|---|---|---|---|---|---|
| 1 | 21/10/2026 | Phân công | Tổng hợp User Story và ghi bảng tiến độ các Sprint | Búp | #7, #12, #22 |
|  |  | Phân công | Mỗi người viết User Story cho phần mình code | Cả nhóm |  |
| 2 | 23/10/2026 | Phân công | Đổi người phụ trách: Hùng nhận tổng hợp User Story và cập nhật bảng tiến độ (thay Búp) | Hùng | #7 |
|  |  | Bổ sung | Ghi bảng tiến độ 21/10–23/10, User Story Task 1 | Hùng | PR #34 |
|  |  | Chỉnh sửa | Review và merge PR #34 | Quang | PR #34 |
|  |  | Chỉnh sửa | Rà soát issue, PR: gán người phụ trách, Milestone theo Sprint (Sprint 2 = Task 5–7) | Hùng |  |
