# User Story – Sprint 2 (Task 5–7)

**Mục tiêu Sprint:** Giỏ hàng, đặt đơn và đăng nhập.

Mẫu: **Là** [ai], **tôi muốn** [làm gì], **để** [được gì].
Mỗi story kèm 2–4 tiêu chí chấp nhận chính và tên người viết; tiêu chí đầy đủ nằm trong file chi tiết.

## US-06 – Giỏ hàng

**Người viết:** Linh · **Issue:** #8, #79 · **Chi tiết:** [task-05-gio-hang.md](task-05-gio-hang.md)

**Là** khách hàng, **tôi muốn** cho đồ uống đã chọn vào giỏ, sửa số lượng hoặc xoá món, và xem tổng tiền, **để** kiểm tra lại đơn trước khi thanh toán.

**Tiêu chí chấp nhận chính**
- Lưu được món kèm size và topping; cùng món, cùng size, cùng topping thì cộng dồn số lượng
- Sửa số lượng, xoá từng món hoặc xoá hết giỏ; tự tính tổng tiền; tải lại trang giỏ vẫn còn
- Các món dùng chung nguyên liệu mà cộng lại vượt kho thì tô đỏ, chưa cho thanh toán
- Bấm Đăng xuất thì giỏ được xoá, người đăng nhập sau không thấy giỏ cũ

## US-07 – API tạo đơn hàng

**Người viết:** Quang · **Issue:** #9, #77 · **Chi tiết:** [task-06-api-tao-don.md](task-06-api-tao-don.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** gửi giỏ hàng của mình để tạo đơn hàng và nhận mã đơn, **để** quán bắt đầu chuẩn bị đồ uống và tôi có thể thanh toán sau đó.

**Tiêu chí chấp nhận chính**
- POST /orders với giỏ hợp lệ và token trả về 201, kèm mã đơn, trạng thái PENDING và tổng tiền đúng
- Giá được tính ở backend; giá do client gửi lên không được dùng
- Dữ liệu sai trả về 400 kèm thông báo tiếng Việt; chưa đăng nhập trả về 401
- Đơn và các món trong đơn được lưu cùng lúc: một món lỗi thì không tạo đơn nào

## US-08 – API đăng ký, đăng nhập (JWT)

**Người viết:** Hùng · **Issue:** #10 · **Chi tiết:** [task-07-api-dang-nhap.md](task-07-api-dang-nhap.md)

**Là** khách hàng, **tôi muốn** tạo tài khoản và đăng nhập bằng email, mật khẩu, **để** đặt món, thanh toán và xem lại các đơn của riêng mình một cách an toàn.

**Tiêu chí chấp nhận chính**
- `POST /auth/register` tạo tài khoản; mật khẩu được băm bằng bcrypt, không lưu mật khẩu gốc
- Email đã đăng ký báo lỗi 409; dữ liệu sai báo lỗi 400 kèm lý do
- `POST /auth/login` đúng thông tin thì trả về JWT; sai thì báo lỗi 401
- Có `JwtAuthGuard` để các API đặt hàng, thanh toán bắt buộc đăng nhập

## US-09 – Màn hình đăng ký, đăng nhập

**Người viết:** Khoa · **Issue:** #11 · **Chi tiết:** [task-07-man-dang-nhap.md](task-07-man-dang-nhap.md)

**Là** khách hàng, **tôi muốn** đăng ký tài khoản và đăng nhập ngay trên trang web, **để** đặt món, thanh toán và xem lại đơn hàng của mình.

**Tiêu chí chấp nhận chính**
- Trang `/register`, `/login` báo lỗi rõ ràng khi nhập thiếu hoặc sai
- Đăng nhập thành công thì lưu token, tải lại trang vẫn còn đăng nhập
- Token hết hạn thì tự đăng xuất, đăng nhập xong quay lại đúng trang đang xem
- Navbar: chưa đăng nhập hiện nút "Đăng nhập"; đã đăng nhập hiện tên và nút "Đăng xuất"
