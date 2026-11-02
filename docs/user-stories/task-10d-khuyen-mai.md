# User Story – Task 10d: Khuyến mãi và điểm thưởng

**Người viết:** Đỗ Xuân Triệu · **Issue:** #21 · **Sprint:** 3

Là **khách hàng**, tôi muốn áp dụng mã giảm giá khi đặt hàng và nhận điểm thưởng sau khi thanh toán, để được giảm giá và tích điểm cho lần mua sau.

**Tiêu chí chấp nhận**
- [x] `POST /promotions/validate` yêu cầu đăng nhập, nhận `{ code, subtotal }` và trả `{ code, discount, total }`
- [x] Mã không tồn tại, hết hạn, không active hoặc chưa đủ `minOrder` → báo lỗi 400 kèm lý do tiếng Việt
- [x] Mã không phân biệt hoa thường; discount không vượt quá `subtotal`
- [x] Khi tạo đơn có `promotionCode`, backend tự tính discount và lưu `promotionCode`, `discount`, `total = subtotal - discount`; mã sai → 400 và không tạo đơn
- [x] Thanh toán `SUCCESS` cộng `loyaltyPoints += Math.floor(total / 10000)` và tạo `LoyaltyTransaction` trong cùng transaction
- [x] Mỗi đơn chỉ cộng điểm một lần (LoyaltyTransaction loại EARN); gửi lại cùng Idempotency-Key không cộng điểm lần hai
- [x] `GET /auth/me` trả `loyaltyPoints` để frontend hiển thị
- [x] Có unit test cho mã giảm giá, áp mã khi tạo đơn và cộng điểm thưởng
- [x] Hủy đơn đã thanh toán → trừ lại đúng số điểm đã cộng (LoyaltyTransaction loại REVOKE, số âm), không trừ 2 lần, điểm không bị âm
- [x] Đơn chưa thanh toán bị hủy thì không trừ điểm