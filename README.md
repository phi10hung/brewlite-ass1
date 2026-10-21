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
- `npx prisma db seed`: thêm dữ liệu mẫu (10 đồ uống, 4 topping, 2 mã giảm giá, 2 tài khoản test)
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