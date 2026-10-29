# BrewLite – Assignment 1

Ứng dụng đặt cà phê không dùng tiền mặt – Đồ án giữa kỳ môn Công nghệ Phần mềm, Trường Đại học Sài Gòn (HK I, 2026–2027).

## Công nghệ
- Frontend: Next.js (TypeScript, TailwindCSS)
- Backend: NestJS (TypeScript), JWT
- Database: PostgreSQL + Prisma
- Docker Compose

## Cấu trúc thư mục
| Thư mục | Nội dung |
|---|---|
| `frontend` | Giao diện Next.js (ảnh đồ uống: `public/images/drinks`) |
| `backend` | API NestJS (database: `prisma/schema.prisma`, dữ liệu mẫu: `prisma/seed.ts`) |
| `docs/progress` | Bảng phân công và tiến độ |
| `docs/user-stories` | User Story theo từng Sprint |

## Yêu cầu
- Node.js 24 trở lên
- Docker Desktop

## Chạy local

### 1. Chuẩn bị
```
copy .env.example .env
docker compose up -d
```
(Git Bash/macOS dùng `cp` thay cho `copy`. Mở Docker Desktop trước khi chạy.)

### 2. Backend – http://localhost:4000
```
cd backend
copy ..\.env .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```
- `npx prisma migrate dev`: tạo các bảng trong database
- `npx prisma db seed`: thêm dữ liệu mẫu (14 đồ uống, 9 topping, 22 nguyên liệu kèm công thức pha chế, 2 mã giảm giá, 2 tài khoản test)
- Kiểm tra kết nối database: http://localhost:4000/health → `{"status":"ok","database":"up"}`
- Xem dữ liệu trực quan: `npx prisma studio`

### 3. Frontend – http://localhost:3000
```
cd frontend
npm install
npm run dev
```

### Tài khoản test
| Email | Mật khẩu | Vai trò |
|---|---|---|
| `khach@brewlite.vn` | `123456` | Khách hàng |
| `staff@brewlite.vn` | `123456` | Nhân viên |

Mã giảm giá mẫu: `GIAM10` (giảm 10%, đơn từ 50.000đ), `BREW20K` (giảm 20.000đ, đơn từ 100.000đ).

### Lỗi thường gặp
- `Can't reach database server`: chưa mở Docker Desktop hoặc chưa chạy `docker compose up -d`.
- `Cannot find module '.../generated/prisma'`: chạy `npx prisma generate` trong thư mục `backend`.
- Muốn làm mới dữ liệu mẫu: chạy lại `npx prisma db seed`.
- `port is already allocated` khi chạy Docker: đang có backend/frontend chạy bằng `npm` (hoặc chương trình khác) dùng cổng 3000/4000 → tắt đi rồi chạy lại.

## Chạy toàn bộ bằng Docker (demo / bàn giao)
Không cần cài Node.js, chỉ cần **Docker Desktop**. Một lệnh bật cả database, backend và frontend:
```
copy .env.example .env
docker compose --profile app up --build -d
```
- Lần đầu mất vài phút để tải và build. Khi xong mở **http://localhost:3000** (API ở http://localhost:4000).
- Backend tự tạo bảng và tự nạp dữ liệu mẫu nếu database còn trống.
- Xem log: `docker compose --profile app logs -f backend`
- Tắt: `docker compose --profile app down` (thêm `-v` nếu muốn xoá luôn dữ liệu)
- Nạp lại dữ liệu mẫu: `docker compose exec backend npx prisma db seed`
- Sửa code xong muốn cập nhật: chạy lại `docker compose --profile app up --build -d`

> Khi code hằng ngày vẫn dùng `docker compose up -d` (chỉ bật database) và chạy backend, frontend bằng `npm` như phần **Chạy local**. Không bật hai cách cùng lúc vì trùng cổng 3000, 4000.

## Thanh toán VNPay Sandbox
Thanh toán qua cổng **VNPay môi trường thử nghiệm** (Sandbox): trang thanh toán thật của VNPay nhưng dùng tiền ảo, không trừ tiền thật.

### Cấu hình
Điền khoá vào `backend/.env` (và `.env` ở thư mục gốc nếu chạy bằng Docker). Khoá xin trưởng nhóm, **không commit, không gửi lên nhóm chung**.

| Biến | Ý nghĩa |
|---|---|
| `VNP_TMN_CODE` | Mã website VNPay cấp |
| `VNP_HASH_SECRET` | Khoá bí mật để ký và kiểm tra chữ ký |
| `VNP_PAY_URL` | Trang thanh toán Sandbox (giữ như `.env.example`) |
| `VNP_API_URL` | API tra cứu, hoàn tiền Sandbox (giữ như `.env.example`) |
| `VNP_RETURN_URL` | Trang VNPay đưa khách về: `http://localhost:3000/payment/result` |
| `ORDER_PAYMENT_MINUTES` | Số phút được giữ đơn chờ thanh toán (mặc định 5) |

Chưa có khoá thì backend vẫn chạy, chỉ phần thanh toán báo "Chưa cấu hình thanh toán VNPay".

### Luồng thanh toán
1. Checkout bấm **Thanh toán** → tạo đơn (giữ nguyên liệu 5 phút) → chuyển sang trang VNPay.
2. Trên VNPay chọn **Thẻ nội địa** → ngân hàng **NCB** → nhập thẻ test (hỏi trưởng nhóm) → nhập OTP.
3. VNPay đưa về `/payment/result`: backend kiểm tra chữ ký, số tiền và hỏi lại VNPay.
   - Thành công: đơn **Đã thanh toán**, xoá giỏ, cộng điểm ⭐, 3 giây sau tự sang trang đơn hàng.
   - Không thành công: chọn **Thanh toán lại**, **Hủy đơn** hoặc **Về giỏ hàng** (giỏ vẫn giữ nguyên).
4. Đơn chưa trả có thể thanh toán tiếp ở trang chi tiết đơn trong 5 phút.

### Tự động
- **Tự hủy đơn quá hạn:** mỗi 30 giây backend tìm đơn Chờ thanh toán / Thanh toán lỗi đã quá hạn, hỏi lại VNPay rồi hủy và trả nguyên liệu về kho.
- **Hoàn tiền:** khách hoặc nhân viên hủy đơn Đã thanh toán thì hoàn tiền qua VNPay và trừ lại điểm. Hoàn tiền lỗi thì đơn hiện "Đang hoàn tiền", mỗi phút backend thử lại.
- Khách trả xong nhưng quay về sau khi đơn đã bị tự hủy: đơn giữ trạng thái Đã hủy và tiền được hoàn lại.

### Lưu ý
- Sandbox **không dùng được VNPAY-QR** (ứng dụng ngân hàng thật không quét mã thử nghiệm), hãy chọn Thẻ nội địa.
- API tra cứu, hoàn tiền của Sandbox đôi khi báo lỗi `99 Unexpected error`: thanh toán vẫn được xác nhận bằng kết quả VNPay gửi về (đã kiểm tra chữ ký và số tiền); hoàn tiền thì được thử lại tự động.

## Thành viên và phân công
| Thành viên | Vai trò | Task đảm nhận |
|---|---|---|
| Hùng | Trưởng nhóm · DevOps & Backend Auth | Task 1, 7 (backend), 9 (Docker) |
| Quang | Backend Products & Orders · Product Owner | Task 2, 6, 9 (API lịch sử), 10 (tồn kho) |
| Triệu | Backend Payment & Advanced | Task 8 (backend), 10 |
| Khoa | Frontend Auth, Layout & History | Task 3 (layout), 7 (UI), 9 (UI) |
| Búp | Frontend Menu & Detail · Scrum Master | Task 3 (Menu), 4, tài liệu |
| Linh | Frontend Cart & Checkout | Task 5, 8 (UI), 10 (UI) |

## Quy trình làm việc
Xem [CONTRIBUTING.md](CONTRIBUTING.md).