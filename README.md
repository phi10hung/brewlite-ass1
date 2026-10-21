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
| `frontend` | Giao diện Next.js |
| `backend` | API NestJS |
| `docs/progress` | Bảng phân công và tiến độ |
| `docs/user-stories` | User Story theo từng Sprint |

## Yêu cầu
- Node.js 24 trở lên
- Docker Desktop

## Chạy local
1. Sao chép file môi trường: `copy .env.example .env` (Git Bash/macOS: `cp .env.example .env`)
2. Bật database: `docker compose up -d`
3. Backend: `cd backend` → `npm install` → `npm run start:dev` (http://localhost:4000)
4. Frontend: `cd frontend` → `npm install` → `npm run dev` (http://localhost:3000)

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
