# Task 10f – Trang Doanh thu cho nhân viên

## User Story
Là **nhân viên quán**, tôi muốn xem tổng tiền đã vào và danh sách giao dịch thanh toán,
để biết quán đã thu được bao nhiêu, giao dịch nào đang chờ, thất bại hoặc cần hoàn tiền.

## Tiêu chí chấp nhận
- Navbar của nhân viên có mục "Doanh thu", mở trang `/staff/revenue`. Khách không thấy mục này; khách vào link thấy "Bạn không có quyền xem trang này".
- Ô "Tiền đã vào" chỉ cộng giao dịch VNPay đã xác nhận thành công của đơn không bị hủy.
- Có 4 ô đếm giao dịch: Thành công, Hoàn tiền (kèm tổng tiền), Đang chờ, Thất bại.
- Có nút lọc Tất cả và 4 nhóm trên. Đổi bộ lọc thì danh sách đổi theo, ô tổng và 4 ô đếm giữ nguyên.
- Giao dịch mới nhất trước. Mỗi dòng có mã giao dịch, mã đơn, tên khách, thời gian, Ví/Thẻ, số tiền, trạng thái.
- Bấm vào dòng thì xổ chi tiết ngay bên dưới: các món, size, topping, tiền từng món, tạm tính, giảm giá, tổng, giờ đặt và thông tin theo nhóm. Bấm lại thì thu lại; mỗi lúc chỉ mở 1 dòng.
- Giao dịch đang chờ mà đơn đã hủy, hoặc khách đã trả bằng link khác, được tính vào nhóm Thất bại.
- Đã trả tiền mà đơn bị hủy thì vào nhóm Hoàn tiền, nhãn "Đang hoàn tiền" hoặc "Đã hoàn tiền", không tính vào doanh thu.
- Nút "Tải lại" lấy số liệu mới và giữ bộ lọc đang chọn. Trang có trạng thái đang tải, chưa có giao dịch và lỗi (có nút Thử lại).
- Trang chỉ để xem, không hủy đơn hay hoàn tiền tại đây.
- Từ màn hình 360px trở lên Navbar của nhân viên vẫn gọn 1 dòng: dưới 1024px ẩn Lịch sử đơn, "Quản lý đơn" ghi "Đơn", "Kho nguyên liệu" ghi "Kho".

## API
- `GET /staff/revenue` chỉ nhân viên gọi được (chưa đăng nhập 401, khách 403). Trả về `totalRevenue`, `refundAmount`, `counts` theo 4 nhóm và `transactions`.
