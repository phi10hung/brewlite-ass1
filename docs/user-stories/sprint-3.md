# User Story – Sprint 3 (Task 8–10)

**Mục tiêu Sprint:** Thanh toán, bàn giao và nghiệp vụ nâng cao.

Mẫu: **Là** [ai], **tôi muốn** [làm gì], **để** [được gì].
Mỗi story kèm 2–4 tiêu chí chấp nhận chính và tên người viết; tiêu chí đầy đủ nằm trong file chi tiết.

## US-10 – Thanh toán không tiền mặt

**Người viết:** Triệu · **Issue:** #13, #76 · **Chi tiết:** [task-08-thanh-toan.md](task-08-thanh-toan.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** thanh toán đơn hàng bằng ví điện tử hoặc thẻ, **để** đơn hàng được ghi nhận đã thanh toán và quán bắt đầu chuẩn bị.

**Tiêu chí chấp nhận chính**
- `POST /payments` yêu cầu đăng nhập, chỉ thanh toán đơn của chính mình, trả về link thanh toán VNPay Sandbox có chữ ký
- Trả thành công thì đơn `PENDING → PAID`; hủy hoặc lỗi thì đơn `PENDING → PAYMENT_FAILED`
- Kết quả từ VNPay được kiểm tra chữ ký trước khi cập nhật đơn
- Hủy đơn đã thanh toán thì hoàn tiền qua VNPay; lỗi thì ghi "Đang hoàn tiền" và hệ thống tự thử lại

## US-11 – Checkout

**Người viết:** Linh · **Issue:** #14, #79 · **Chi tiết:** [task-14-checkout.md](task-14-checkout.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** thực hiện thanh toán đơn hàng, **để** đơn hàng được xử lý và ghi nhận chính xác.

**Tiêu chí chấp nhận chính**
- Chưa đăng nhập thì chuyển sang màn hình đăng nhập, đăng nhập xong quay lại Checkout
- Tạo đơn kèm phương thức Ví/Thẻ rồi chuyển thẳng sang trang thanh toán VNPay Sandbox
- Giỏ hàng giữ nguyên ở Checkout, chỉ bị xoá khi đơn thanh toán thành công
- Thiếu nguyên liệu khi tạo đơn thì báo lỗi rõ ràng, giữ nguyên giỏ

## US-12 – Kết quả thanh toán VNPay và tự hủy đơn quá hạn

**Người viết:** Hùng · **Issue:** #78 · **Chi tiết:** [task-08-ket-qua-thanh-toan.md](task-08-ket-qua-thanh-toan.md)

**Là** khách hàng vừa thanh toán trên VNPay, **tôi muốn** biết ngay thanh toán thành công hay chưa và được chọn bước tiếp theo, **để** không phải đoán đơn của mình đã được ghi nhận chưa, và không bị giữ đơn mãi khi bỏ dở.

**Tiêu chí chấp nhận chính**
- Thành công: hiện "Thanh toán thành công", xoá giỏ, cập nhật điểm, 3 giây sau tự sang trang đơn hàng
- Không thành công: hiện lý do, giữ nguyên giỏ, có nút "Thanh toán lại", "Hủy đơn", "Về giỏ hàng"
- Đơn chưa trả quá hạn 5 phút thì tự hủy và trả nguyên liệu về kho
- Tác vụ nền thử lại các lần hoàn tiền VNPay bị lỗi

## US-13 – API lịch sử đơn

**Người viết:** Quang · **Issue:** #15 · **Chi tiết:** [task-09-api-lich-su-don.md](task-09-api-lich-su-don.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** xem danh sách các đơn đã đặt và chi tiết từng đơn, **để** theo dõi trạng thái và tra cứu lại những lần mình đã mua.

**Tiêu chí chấp nhận chính**
- GET /orders/me trả về đơn của chính người đăng nhập, đơn mới nhất đứng đầu
- GET /orders/:id trả về chi tiết một đơn của mình
- Đơn không tồn tại hoặc thuộc người khác trả về 404; chưa đăng nhập trả về 401

## US-14 – Màn hình xác nhận đơn và lịch sử đơn

**Người viết:** Khoa · **Issue:** #16, #81 · **Chi tiết:** [task-09-xac-nhan-lich-su-don.md](task-09-xac-nhan-lich-su-don.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** xem màn hình xác nhận ngay sau khi thanh toán và xem lại danh sách các đơn đã đặt, **để** biết đơn của mình đã được ghi nhận, theo dõi trạng thái và tra cứu lại những lần đã mua.

**Tiêu chí chấp nhận chính**
- Trang Xác nhận đơn hiện mã đơn, trạng thái, danh sách món, tạm tính, giảm giá và tổng cộng
- Trang Lịch sử đơn hiện đơn mới nhất trước, có trạng thái đang tải, chưa có đơn và lỗi
- Đơn chờ thanh toán có đồng hồ đếm ngược, nút thanh toán tiếp và nút Hủy đơn
- Đơn Đã thanh toán, quán chưa nhận thì hủy được, hỏi xác nhận số tiền hoàn và điểm bị trừ

## US-15 – Docker và bàn giao

**Người viết:** Hùng · **Issue:** #17 · **Chi tiết:** [task-09-docker-ban-giao.md](task-09-docker-ban-giao.md)

**Là** người nhận bàn giao sản phẩm, **tôi muốn** bật toàn bộ hệ thống bằng một lệnh và có hướng dẫn rõ ràng, **để** chạy thử được ngay mà không phải cài Node.js hay cấu hình từng phần.

**Tiêu chí chấp nhận chính**
- `docker compose --profile app up --build -d` bật đủ database, backend, frontend
- Database trống thì backend tự tạo bảng và nạp dữ liệu mẫu
- README hướng dẫn chạy local, chạy bằng Docker, cấu hình VNPay Sandbox

## US-16 – Order State Machine

**Người viết:** Triệu · **Issue:** #18 · **Chi tiết:** [task-10a-order-state-machine.md](task-10a-order-state-machine.md)

**Là** chủ quán, **tôi muốn** đơn hàng chỉ được chuyển trạng thái chính xác theo quy trình, **để** không có đơn nào bị nhảy sai bước (ví dụ chưa thanh toán đã pha chế, hay đã pha chế rồi lại bị huỷ).

**Tiêu chí chấp nhận chính**
- Luồng chính: PENDING → PAID → PREPARING → READY → COMPLETED
- Thanh toán lỗi thì sang PAYMENT_FAILED, được thử lại (quay về PENDING)
- Được huỷ từ PENDING, PAYMENT_FAILED, PAID; không được huỷ khi đã PREPARING, READY
- Chuyển trạng thái sai thì báo lỗi 400; có test đủ 49 cặp chuyển trạng thái (test a)

## US-17 – Thanh toán idempotent với Idempotency-Key

**Người viết:** Triệu · **Issue:** #19 · **Chi tiết:** [task-10b-thanh-toan-idempotent.md](task-10b-thanh-toan-idempotent.md)

**Là** khách hàng, **tôi muốn** các lần bấm thanh toán hoặc request gửi trùng không tạo thêm giao dịch, **để** không bị trừ tiền hai lần và đơn hàng không bị xử lý sai.

**Tiêu chí chấp nhận chính**
- `POST /payments` bắt buộc header `Idempotency-Key`; thiếu thì báo lỗi 400
- Cùng key, cùng đơn, cùng phương thức thì trả lại Payment cũ; cùng key khác dữ liệu báo lỗi 409
- Hai request đồng thời cùng key chỉ tạo một Payment (test b)
- Kết quả VNPay gửi về nhiều lần chỉ cập nhật đơn và cộng điểm 1 lần

## US-18 – Kiểm soát tồn kho khi đặt đồng thời

**Người viết:** Quang · **Issue:** #20, #77 · **Chi tiết:** [task-10c-ton-kho.md](task-10c-ton-kho.md)

**Là** chủ quán, **tôi muốn** hệ thống tự tính số ly còn pha được từ kho nguyên liệu theo công thức pha chế và trừ nguyên liệu khi khách đặt, **để** không nhận đơn khi đã hết nguyên liệu, kể cả khi nhiều khách đặt cùng lúc.

**Tiêu chí chấp nhận chính**
- Đặt đơn trừ nguyên liệu và tạo đơn trong cùng một transaction; thiếu thì không tạo đơn, không trừ gì
- Trừ kho bằng optimistic locking theo `version` của từng nguyên liệu
- Nhiều đơn đặt đồng thời không bao giờ làm âm kho nguyên liệu (test c)
- Hủy đơn trả lại đúng lượng nguyên liệu đã trừ, chỉ trả 1 lần

## US-19 – Khuyến mãi và điểm thưởng

**Người viết:** Triệu · **Issue:** #21 · **Chi tiết:** [task-10d-khuyen-mai.md](task-10d-khuyen-mai.md)

**Là** khách hàng, **tôi muốn** áp dụng mã giảm giá khi đặt hàng và nhận điểm thưởng sau khi thanh toán, **để** được giảm giá và tích điểm cho lần mua sau.

**Tiêu chí chấp nhận chính**
- `POST /promotions/validate` kiểm tra mã; mã sai, hết hạn hoặc chưa đủ giá trị đơn thì báo lỗi 400
- Tạo đơn có mã thì backend tự tính giảm giá và tổng tiền
- Thanh toán thành công cộng `floor(total / 10000)` điểm, mỗi đơn 1 lần
- Hủy đơn đã thanh toán thì trừ lại đúng số điểm đã cộng

## US-20 – Giao diện mã giảm giá và điểm thưởng

**Người viết:** Linh · **Issue:** #23 · **Chi tiết:** [task-23-ma-giam-gia-diem-thuong.md](task-23-ma-giam-gia-diem-thuong.md)

**Là** khách hàng đã đăng nhập, **tôi muốn** áp dụng mã giảm giá và xem số điểm thưởng hiện có, **để** biết chính xác số tiền cần thanh toán và quyền lợi của mình.

**Tiêu chí chấp nhận chính**
- Nhập mã giảm giá, hiển thị số tiền được giảm và tổng tiền sau giảm giá
- Hiển thị thông báo khi mã không hợp lệ
- Gửi promotionCode khi tạo đơn hàng; hiển thị điểm thưởng hiện có

## US-21 – Màn hình nhân viên và kho nguyên liệu (làm thêm)

**Người viết:** Búp, Hùng · **Issue:** #43, #80, #97, #98 · **Chi tiết:** [task-10e-nhan-vien.md](task-10e-nhan-vien.md)

**Là** nhân viên quán, **tôi muốn** xem danh sách đơn, chuyển trạng thái từng đơn và xem kho nguyên liệu, **để** khách biết đồ uống của mình đang được pha, đã xong hay đã giao, và tôi biết nguyên liệu nào sắp hết.

**Tiêu chí chấp nhận chính**
- Trang `/staff` có danh sách đơn, lọc theo trạng thái, nút Nhận đơn → Pha xong → Giao khách
- Đơn Đã thanh toán có nút Hủy đơn; hủy thì trả nguyên liệu, trừ điểm, hoàn tiền
- Trang `/staff/ingredients` có bảng kho và nút Nhập kho
- Tài khoản khách gọi API nhân viên bị chặn 403

## US-22 – Trang Doanh thu cho nhân viên (làm thêm)

**Người viết:** Hùng · **Issue:** #101 · **Chi tiết:** [task-10f-doanh-thu.md](task-10f-doanh-thu.md)

**Là** nhân viên quán, **tôi muốn** xem tổng tiền đã vào và danh sách giao dịch thanh toán, **để** biết quán đã thu được bao nhiêu, giao dịch nào đang chờ, thất bại hoặc cần hoàn tiền.

**Tiêu chí chấp nhận chính**
- Ô "Tiền đã vào" chỉ cộng giao dịch VNPay đã xác nhận thành công của đơn không bị hủy
- Có 4 ô đếm Thành công, Hoàn tiền, Đang chờ, Thất bại và nút lọc theo nhóm
- Bấm vào giao dịch thì xổ chi tiết đơn ngay bên dưới
- Chỉ nhân viên xem được; trang chỉ để xem, không hủy đơn hay hoàn tiền tại đây
