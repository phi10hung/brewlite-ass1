# Quy trình làm việc

## Nhánh
- `main`: bản ổn định để nộp, demo. Không push trực tiếp.
- `develop`: nơi gộp code hằng ngày. Không push trực tiếp.
- Mỗi phần việc làm trên nhánh riêng tạo từ `develop`:
  - `feature/<ten-chuc-nang>` – ví dụ `feature/menu-page`
  - `fix/<ten-loi>` – ví dụ `fix/cart-total`
  - `docs/<ten-tai-lieu>` – ví dụ `docs/user-story-sprint1`

## Quy ước commit
`<loại>: <mô tả ngắn>`

| Loại | Dùng khi |
|---|---|
| `feat` | Thêm chức năng |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu |
| `test` | Thêm/sửa test |
| `refactor` | Sửa code không đổi chức năng |
| `style` | Giao diện, định dạng |
| `chore` | Cấu hình, cài thư viện |

Ví dụ: `feat: add GET /products API`, `fix: tính sai tổng tiền giỏ hàng`.

## Pull Request
1. Tạo nhánh từ `develop`, code, commit nhỏ và đều.
2. Tự chạy `npm run lint`, `npm test`, `npm run build` không lỗi.
3. Push nhánh, mở PR vào `develop`, mô tả ghi `Closes #<số issue>`.
4. Cần ít nhất 1 thành viên khác review và Approve.
5. Merge bằng "Create a merge commit", xoá nhánh.

## Definition of Done
Một task được xem là hoàn thành khi:
- [ ] Code chạy được, không lỗi build, đạt tiêu chí chấp nhận của task.
- [ ] API có validate đầu vào; UI xử lý loading/empty/error.
- [ ] Có commit với mô tả rõ ràng và PR đã được review trong nhóm.
- [ ] Có hướng dẫn chạy trong README (nếu thêm bước mới).
