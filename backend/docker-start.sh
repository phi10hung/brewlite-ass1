#!/bin/sh
# Chạy mỗi khi container backend khởi động
set -e

echo "▶ Tạo / cập nhật các bảng trong database..."
npx prisma migrate deploy

# Chỉ nạp dữ liệu mẫu khi chưa có món nào (khởi động lại không bị xoá dữ liệu)
if node -e "
  const { PrismaClient } = require('./dist/generated/prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  prisma.product.count()
    .then((n) => process.exit(n > 0 ? 0 : 1))
    .catch(() => process.exit(1));
"; then
  echo "▶ Database đã có dữ liệu, bỏ qua seed."
else
  echo "▶ Database trống, nạp dữ liệu mẫu..."
  npx prisma db seed
fi

echo "▶ Bật API ở cổng ${API_PORT:-4000}"
exec node dist/main.js
