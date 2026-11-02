# Đóng gói backend NestJS + Prisma thành image chạy được ở mọi máy có Docker
FROM node:24-slim

# Prisma cần openssl để kết nối PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# prisma.config.ts đọc DATABASE_URL ngay khi "npm ci" chạy "prisma generate".
# Lúc build chỉ cần một địa chỉ giả, địa chỉ thật do docker-compose truyền vào khi chạy.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Cài thư viện trước (tận dụng cache: code đổi mà package.json không đổi thì không cài lại).
# Chép cả tsconfig để Prisma sinh code đúng kiểu import.
COPY package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
RUN npm ci

# Chép code và build ra thư mục dist
COPY . .
RUN npm run build

EXPOSE 4000

# Khi container chạy: tạo bảng (migrate) → nạp dữ liệu mẫu nếu database còn trống → bật API
CMD ["sh", "./docker-start.sh"]