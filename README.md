# BrewLite – Assignment 1

Ứng dụng đặt đồ uống không dùng tiền mặt: khách chọn món, thanh toán qua VNPay Sandbox và theo dõi đơn; nhân viên xử lý đơn và quản lý kho nguyên liệu.

Đồ án môn Công nghệ Phần mềm, Trường Đại học Sài Gòn, học kỳ I năm học 2026–2027, Nhóm 12.

## Chức năng

**Khách hàng**
- Xem Menu, xem chi tiết món, chọn size và topping theo số ly còn pha được.
- Quản lý giỏ hàng, nhập mã giảm giá.
- Đăng ký, đăng nhập, thanh toán bằng Ví hoặc Thẻ qua VNPay Sandbox, tích điểm thưởng theo đơn đã thanh toán.
- Xem xác nhận đơn, lịch sử đơn, tiến trình đơn; hủy đơn khi còn được phép.

**Nhân viên**
- Xem đơn theo trạng thái, cập nhật trạng thái, hủy đơn đã thanh toán và hoàn tiền.
- Xem kho nguyên liệu, nhập thêm kho.
- Xem doanh thu.

**Hệ thống**
- Chặn chuyển trạng thái đơn sai, chống xử lý thanh toán trùng bằng `Idempotency-Key`.
- Trừ kho nguyên liệu theo công thức, dùng optimistic locking để đặt đồng thời không vượt tồn kho.
- Tự hủy đơn quá hạn thanh toán, tự thử lại hoàn tiền bị lỗi.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand |
| Backend | NestJS 12, TypeScript, JWT |
| Database | PostgreSQL 16, Prisma 7 |
| Thanh toán | VNPay Sandbox |
| Kiểm thử | Jest |
| Đóng gói | Docker Compose |

## Chạy nhanh bằng Docker

Chỉ cần cài **Git** và **Docker Desktop**, không cần cài Node.js. Mở Docker Desktop rồi chạy trong PowerShell:

```powershell
git clone https://github.com/phi10hung/brewlite-ass1.git
cd brewlite-ass1
copy .env.example .env
docker compose --profile app up --build -d
```

Lần đầu mất vài phút để tải và build. Backend tự tạo bảng và tự nạp dữ liệu mẫu khi database còn trống.

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:3000 | Ứng dụng |
| http://localhost:4000/health | Kiểm tra API và database, kết quả đúng là `{"status":"ok","database":"up"}` |

Đăng nhập bằng [tài khoản mẫu](#tài-khoản-và-dữ-liệu-mẫu). Muốn thanh toán được, cần điền khoá theo mục [Thanh toán VNPay Sandbox](#thanh-toán-vnpay-sandbox).

| Việc | Lệnh |
|---|---|
| Xem log backend | `docker compose --profile app logs -f backend` |
| Tắt, giữ nguyên dữ liệu | `docker compose --profile app stop` |
| Bật lại | `docker compose --profile app up -d` |
| Cập nhật sau khi sửa code | `docker compose --profile app up --build -d` |

## Chạy khi phát triển

Cần **Node.js 24** trở lên và **Docker Desktop**. Không chạy song song với cách trên vì trùng cổng 3000 và 4000.

**1. Bật database** (ở thư mục gốc của repo)

```powershell
copy .env.example .env
docker compose up -d
```

**2. Chạy backend** tại http://localhost:4000

```powershell
cd backend
copy ..\.env .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

**3. Chạy frontend** tại http://localhost:3000 (mở thêm một cửa sổ PowerShell, từ thư mục gốc của repo)

```powershell
cd frontend
npm install
npm run dev
```

Xem dữ liệu trực quan: chạy `npx prisma studio` trong thư mục `backend`.

## Tài khoản và dữ liệu mẫu

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `khach@brewlite.vn` | `123456` | Khách hàng |
| `staff@brewlite.vn` | `123456` | Nhân viên |

| Mã giảm giá | Mức giảm | Đơn tối thiểu |
|---|---|---|
| `GIAM10` | 10% | 50.000đ |
| `BREW20K` | 20.000đ | 100.000đ |

Dữ liệu mẫu còn có 14 đồ uống, 9 topping, 22 nguyên liệu kèm công thức pha chế.

Nạp lại dữ liệu mẫu:

| Cách chạy | Lệnh |
|---|---|
| Docker | `docker compose exec backend npx prisma db seed` |
| Phát triển | `npx prisma db seed` trong thư mục `backend` |

> **Lưu ý:** lệnh này xoá toàn bộ dữ liệu hiện có, gồm cả đơn hàng và tài khoản đã đăng ký, rồi tạo lại dữ liệu mẫu.

## Thanh toán VNPay Sandbox

Sandbox là môi trường thử nghiệm của VNPay: dùng trang thanh toán của VNPay nhưng là tiền ảo, không trừ tiền thật.

### Cấu hình

Chưa có khoá thì ứng dụng vẫn chạy, chỉ phần thanh toán báo "Chưa cấu hình thanh toán VNPay". Khoá xin trưởng nhóm, điền vào:

- `.env` ở thư mục gốc nếu chạy bằng Docker, rồi chạy lại `docker compose --profile app up -d`.
- `backend/.env` nếu chạy khi phát triển.

**Không commit khoá thật và không gửi khoá lên nhóm chung.**

| Biến | Ý nghĩa |
|---|---|
| `VNP_TMN_CODE` | Mã website VNPay cấp |
| `VNP_HASH_SECRET` | Khoá bí mật để ký và kiểm tra chữ ký |
| `VNP_PAY_URL` | Trang thanh toán Sandbox, giữ như `.env.example` |
| `VNP_API_URL` | API tra cứu và hoàn tiền Sandbox, giữ như `.env.example` |
| `VNP_RETURN_URL` | Trang VNPay đưa khách về: `http://localhost:3000/payment/result` |
| `ORDER_PAYMENT_MINUTES` | Số phút giữ đơn chờ thanh toán, mặc định 5 |

### Luồng thanh toán

1. Ở Checkout bấm **Thanh toán**: hệ thống tạo đơn, giữ nguyên liệu 5 phút rồi chuyển sang trang VNPay.
2. Trên VNPay chọn **Thẻ nội địa**, ngân hàng **NCB**, nhập thẻ test (hỏi trưởng nhóm) và OTP.
3. VNPay đưa về `/payment/result`, backend kiểm tra chữ ký, số tiền và hỏi lại VNPay.
   - Thành công: đơn **Đã thanh toán**, xoá giỏ, cộng điểm, 3 giây sau tự sang trang đơn hàng.
   - Không thành công: chọn **Thanh toán lại**, **Hủy đơn** hoặc **Về giỏ hàng**, giỏ vẫn giữ nguyên.
4. Đơn chưa trả có thể thanh toán tiếp ở trang chi tiết đơn trong thời gian giữ đơn.

### Xử lý tự động

- **Đơn quá hạn:** mỗi 30 giây backend tìm đơn quá hạn, hỏi lại VNPay rồi hủy đơn và trả nguyên liệu về kho.
- **Hoàn tiền:** hủy đơn đã thanh toán thì hoàn tiền qua VNPay và trừ lại điểm. Hoàn tiền lỗi thì đơn hiện "Đang hoàn tiền", mỗi phút backend thử lại.
- **Trả tiền sau khi đơn đã hủy:** đơn giữ trạng thái Đã hủy và tiền được hoàn lại.

### Lưu ý

- Sandbox không dùng được VNPAY-QR vì ứng dụng ngân hàng thật không quét mã thử nghiệm. Hãy chọn Thẻ nội địa.
- API tra cứu của Sandbox có lúc báo lỗi `99 Unexpected error`. Khi đó thanh toán được xác nhận bằng kết quả VNPay gửi về, sau khi đã kiểm tra chữ ký và số tiền.
- Lần kiểm tra gần nhất (01/11/2026), API hoàn tiền của Sandbox báo lỗi `99`, nên đơn dừng ở "Đang hoàn tiền" và được thử lại tự động. Bản sửa tham số hoàn tiền trong PR #104 chưa được VNPay xác nhận thành công.

## Trạng thái đơn hàng

```
PENDING → PAID → PREPARING → READY → COMPLETED
PENDING → PAYMENT_FAILED → PENDING
PENDING, PAYMENT_FAILED, PAID → CANCELLED
```

Đơn ở PREPARING hoặc READY không hủy được. COMPLETED và CANCELLED là trạng thái cuối.

## API chính

Backend chạy ở cổng 4000. Quyền **Đăng nhập** cần header `Authorization: Bearer <token>`.

| Phương thức | Đường dẫn | Chức năng | Quyền |
|---|---|---|---|
| GET | `/health` | Kiểm tra API và database | Công khai |
| POST | `/auth/register` | Đăng ký | Công khai |
| POST | `/auth/login` | Đăng nhập | Công khai |
| GET | `/auth/me` | Thông tin tài khoản | Đăng nhập |
| GET | `/products` | Danh sách món | Công khai |
| GET | `/products/:id` | Chi tiết món, size, topping | Công khai |
| POST | `/products/availability` | Số ly còn thêm được theo giỏ hàng | Công khai |
| POST | `/orders` | Tạo đơn | Đăng nhập |
| GET | `/orders/me` | Lịch sử đơn | Đăng nhập |
| GET | `/orders/:id` | Chi tiết đơn của mình | Đăng nhập |
| PATCH | `/orders/:id/cancel` | Hủy đơn | Đăng nhập |
| POST | `/payments` | Tạo thanh toán, cần header `Idempotency-Key` | Đăng nhập |
| GET | `/payments/vnpay-return` | Xử lý kết quả VNPay gửi về | Công khai, kiểm tra chữ ký |
| GET | `/payments/vnpay-ipn` | Nhận thông báo từ VNPay | Công khai, kiểm tra chữ ký |
| POST | `/payments/:orderId/sync` | Hỏi lại VNPay trạng thái đơn | Đăng nhập |
| POST | `/promotions/validate` | Kiểm tra mã giảm giá | Đăng nhập |
| GET | `/staff/orders?status=` | Danh sách đơn | Nhân viên |
| PATCH | `/staff/orders/:id/status` | Đổi trạng thái đơn | Nhân viên |
| GET | `/staff/ingredients` | Kho nguyên liệu | Nhân viên |
| POST | `/staff/ingredients/:id/restock` | Nhập thêm kho | Nhân viên |
| GET | `/staff/revenue` | Doanh thu | Nhân viên |

## Kiểm thử

Unit test backend không cần bật database:

```powershell
cd backend
npm install
npm test
```

Kết quả ngày 02/11/2026: 208/208 test đạt. Ba tiêu chí chính nằm ở các file sau:

| Tiêu chí | File test |
|---|---|
| (a) Chặn chuyển trạng thái sai, đủ 49 cặp trạng thái | `backend/src/orders/order-status.spec.ts` |
| (b) Gửi 2 lần cùng `Idempotency-Key` chỉ tạo 1 giao dịch | `backend/src/payments/payments.service.spec.ts` |
| (c) Đặt đồng thời không vượt tồn kho, mô phỏng 30 đơn song song | `backend/src/orders/orders.service.spec.ts` |

## Cấu trúc thư mục

```
brewlite-ass1/
├─ frontend/
│  ├─ public/images/drinks/      Ảnh đồ uống
│  └─ src/
│     ├─ app/
│     │  ├─ page.tsx             Trang Menu
│     │  ├─ products/[id]/       Chi tiết món
│     │  ├─ cart/, checkout/     Giỏ hàng, thanh toán
│     │  ├─ payment/result/      Kết quả thanh toán
│     │  ├─ login/, register/    Đăng nhập, đăng ký
│     │  ├─ orders/              Lịch sử, chi tiết đơn
│     │  └─ staff/               Nhân viên, kho, doanh thu
│     ├─ components/             Navbar, Footer
│     ├─ lib/                    Gọi API, định dạng tiền, tên trạng thái
│     └─ store/                  Giỏ hàng, đăng nhập (Zustand)
├─ backend/
│  ├─ src/
│  │  ├─ auth/                   Đăng ký, đăng nhập, JWT
│  │  ├─ products/               API sản phẩm, số ly còn pha
│  │  ├─ orders/                 Tạo đơn, hủy đơn, trạng thái đơn, tự hủy
│  │  ├─ payments/               VNPay, idempotent, hoàn tiền, điểm thưởng
│  │  ├─ promotions/             Mã giảm giá
│  │  ├─ staff/                  API nhân viên, kho, doanh thu
│  │  └─ common/                 Giá theo size, công thức pha chế
│  └─ prisma/                    Schema, migration, dữ liệu mẫu
├─ docs/
│  ├─ user-stories/              User Story theo Sprint và theo từng task
│  └─ progress/                  Bảng tiến độ
├─ docker-compose.yml            Chạy database, backend, frontend
├─ .env.example                  Biến môi trường mẫu, không chứa khoá thật
├─ CONTRIBUTING.md               Quy trình làm việc của nhóm
└─ README.md
```

## Thành viên

| Họ tên | GitHub | Phần phụ trách |
|---|---|---|
| Huỳnh Tấn Phi Hùng (Trưởng nhóm) | `phi10hung` | Database, API đăng nhập, trang kết quả thanh toán, Docker, bảng tiến độ |
| Lương Tùng Quang | `quang-2703` | API sản phẩm, API đơn hàng, tồn kho đồng thời |
| Đỗ Xuân Triệu | `10tothepowerof6` | Thanh toán VNPay, hoàn tiền, trạng thái đơn, chống trùng, khuyến mãi, điểm thưởng |
| Huỳnh Nguyễn Đình Khoa | `dinhkhoa-lgtm` | Navbar, Footer, màn đăng nhập và đăng ký, xác nhận đơn, lịch sử đơn |
| Nguyễn Lương Hồng Búp | `bupnguyen-19` | Trang Menu, trang chi tiết món |
| Hồ Văn Linh | `linhho201006-bit` | Giỏ hàng, Checkout, giao diện mã giảm giá |

Phần mở rộng ngoài đề: trang nhân viên và trang Kho nguyên liệu do Búp làm, API nhập kho và trang Doanh thu do Hùng làm.

## Tài liệu

- [User Story](docs/user-stories)
- [Bảng tiến độ](docs/progress/ass1-progress.md)
- [Quy trình làm việc](CONTRIBUTING.md)

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Can't reach database server` | Mở Docker Desktop, chạy `docker compose up -d` |
| `Cannot find module '.../generated/prisma'` | Chạy `npx prisma generate` trong thư mục `backend` |
| `port is already allocated` | Tắt chương trình đang dùng cổng 3000, 4000 hoặc 5432 rồi chạy lại |
| Thanh toán báo "Chưa cấu hình thanh toán VNPay" | Điền khoá theo mục [Cấu hình](#cấu-hình) |
