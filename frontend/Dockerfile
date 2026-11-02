# Đóng gói frontend Next.js thành image chạy được ở mọi máy có Docker
FROM node:24-slim

WORKDIR /app

# Địa chỉ API mà TRÌNH DUYỆT gọi tới. Next.js gắn giá trị này vào code lúc build,
# nên phải truyền vào khi build (docker-compose truyền qua "args").
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
