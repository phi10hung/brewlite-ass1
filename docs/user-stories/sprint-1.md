# User Story – Sprint 1 (Task 1–4)

**Mục tiêu Sprint:** Nền tảng và hiển thị menu.

Mẫu: **Là** [ai], **tôi muốn** [làm gì], **để** [được gì].
Mỗi story kèm 2–4 tiêu chí chấp nhận chính và tên người viết; tiêu chí đầy đủ nằm trong file chi tiết.

## US-01 – Khởi tạo dự án và cơ sở dữ liệu

**Người viết:** Hùng · **Issue:** #1, #2, #75 · **Chi tiết:** [task-01-khoi-tao-du-an.md](task-01-khoi-tao-du-an.md)

**Là** thành viên nhóm phát triển, **tôi muốn** có sẵn khung dự án frontend, backend và cơ sở dữ liệu với dữ liệu mẫu, **để** mọi người tải về là chạy được ngay và bắt tay vào làm chức năng của mình.

**Tiêu chí chấp nhận chính**
- Một repo chứa frontend (Next.js) và backend (NestJS), cả hai chạy được
- README hướng dẫn cài đặt, chạy database và tài khoản test; có .env.example, .gitignore
- Chạy `npx prisma db seed` tạo được dữ liệu mẫu: 14 đồ uống, 9 topping, 2 mã giảm giá, 2 tài khoản
- Có endpoint /health để kiểm tra backend và database đang chạy

## US-02 – API danh sách sản phẩm

**Người viết:** Quang · **Issue:** #3 · **Chi tiết:** [task-02-api-san-pham.md](task-02-api-san-pham.md)

**Là** khách hàng, **tôi muốn** xem danh sách đồ uống và chi tiết từng món (kèm size và topping), **để** chọn được món phù hợp trước khi đặt.

**Tiêu chí chấp nhận chính**
- GET /products trả về danh sách đồ uống gồm id, name, description, category, price, imageUrl, stock; lọc được theo category
- GET /products/:id trả về chi tiết món kèm sizes và danh sách toppings
- Món không tồn tại trả về 404 kèm thông báo; id không phải số trả về 400
- Phản hồi dưới 500ms với dữ liệu mẫu

## US-03 – Layout chung

**Người viết:** Khoa · **Issue:** #4 · **Chi tiết:** [task-03-layout.md](task-03-layout.md)

**Là** khách hàng, **tôi muốn** ở trang nào cũng thấy thanh điều hướng và số món đang có trong giỏ hàng, **để** dễ chuyển giữa các trang và biết mình đã chọn bao nhiêu món.

**Tiêu chí chấp nhận chính**
- Mọi trang đều có Navbar (logo BrewLite, link Menu, icon giỏ hàng) và Footer
- Icon giỏ hàng có badge số lượng, tự cập nhật theo giỏ hàng; giỏ trống thì ẩn badge
- Navbar luôn nằm trên cùng khi cuộn trang, hiển thị gọn trên điện thoại và máy tính

## US-04 – Trang Menu

**Người viết:** Búp · **Issue:** #5, #80 · **Chi tiết:** [task-03-trang-menu.md](task-03-trang-menu.md)

**Là** khách hàng, **tôi muốn** xem danh sách đồ uống kèm hình và giá, lọc được theo loại đồ uống, biết món nào đã hết, **để** chọn món nhanh mà không phải xếp hàng hỏi nhân viên.

**Tiêu chí chấp nhận chính**
- Hiển thị lưới đồ uống từ API `GET /products`, mỗi món có hình, tên, giá
- Lọc theo danh mục: Tất cả, Cà phê, Trà, Đá xay
- Có trạng thái đang tải, chưa có món, lỗi kết nối (có nút "Thử lại")
- Món không còn đủ nguyên liệu để pha thì hiện nhãn "Hết món"

## US-05 – Chi tiết và tùy chọn sản phẩm

**Người viết:** Búp · **Issue:** #6, #80 · **Chi tiết:** [task-04-trang-chi-tiet.md](task-04-trang-chi-tiet.md)

**Là** khách hàng, **tôi muốn** xem chi tiết một món, chọn size, topping, số lượng, thấy ngay giá tiền và số ly còn pha được, **để** đặt đúng ly đồ uống theo ý mình, biết trước phải trả bao nhiêu và không chọn quá số ly quán còn pha được.

**Tiêu chí chấp nhận chính**
- Chọn size S, M (+5.000đ), L (+10.000đ) và một hoặc nhiều topping
- Tổng tiền cập nhật ngay khi đổi lựa chọn: (giá gốc + size + topping) × số lượng
- Hiện dòng "Còn X ly" theo size và topping đang chọn; size hoặc topping hết thì khoá
- Bấm "Thêm vào giỏ" thì món được thêm vào giỏ hàng và số trên thanh menu tăng
