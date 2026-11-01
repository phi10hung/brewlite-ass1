# User Story – Task 7: Màn hình đăng ký, đăng nhập

**Người viết:** Khoa · **Issue:** #11 · **Sprint:** 2

**Là** khách hàng,
**tôi muốn** đăng ký tài khoản và đăng nhập ngay trên trang web,
**để** đặt món, thanh toán và xem lại đơn hàng của mình.

**Tiêu chí chấp nhận**
- [x] Trang Đăng ký (`/register`): nhập họ tên, email, mật khẩu; báo lỗi ngay nếu thiếu họ tên, email sai định dạng hoặc mật khẩu dưới 6 ký tự
- [x] Email đã được đăng ký thì hiện thông báo lỗi từ hệ thống
- [x] Trang Đăng nhập (`/login`): sai email hoặc mật khẩu thì báo "Email hoặc mật khẩu không đúng"
- [x] Đăng ký hoặc đăng nhập thành công thì lưu token, tải lại trang vẫn còn đăng nhập
- [x] Mọi lần gọi API đều tự gửi kèm token đăng nhập
- [x] Token hết hạn thì tự đăng xuất và chuyển sang trang đăng nhập, đăng nhập xong quay lại đúng trang đang xem
- [x] Navbar: chưa đăng nhập hiện nút "Đăng nhập"; đã đăng nhập hiện tên và nút "Đăng xuất"
- [x] Chưa đăng nhập mà bấm thanh toán thì chuyển sang trang đăng nhập