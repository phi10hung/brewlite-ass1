# User Story – Task 7: API đăng ký, đăng nhập (JWT)

**Người viết:** Hùng · **Issue:** #10 · **Sprint:** 2

**Là** khách hàng,
**tôi muốn** tạo tài khoản và đăng nhập bằng email, mật khẩu,
**để** đặt món, thanh toán và xem lại các đơn của riêng mình một cách an toàn.

**Tiêu chí chấp nhận**
- [x] `POST /auth/register` tạo tài khoản; mật khẩu được băm bằng bcrypt, không lưu mật khẩu gốc
- [x] Email sai định dạng, mật khẩu dưới 6 ký tự, thiếu họ tên → báo lỗi 400 kèm lý do
- [x] Email đã đăng ký → báo lỗi 409 "Email đã được đăng ký"
- [x] `POST /auth/login` đúng thông tin thì trả về accessToken (JWT) và thông tin người dùng; sai thì báo lỗi 401
- [x] Không bao giờ trả mật khẩu về cho frontend
- [x] `GET /auth/me` cần gửi kèm token; không có hoặc token hết hạn → báo lỗi 401
- [x] Có `JwtAuthGuard` để các API khác (đặt hàng, thanh toán) bắt buộc đăng nhập
- [x] Có unit test cho đăng ký, đăng nhập
