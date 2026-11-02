// Thông tin người dùng gắn vào request sau khi JwtAuthGuard kiểm tra token.
// Trong controller lấy ra bằng: @CurrentUser() user: AuthUser  → user.userId
export interface AuthUser {
  userId: number;
  email: string;
  role: 'CUSTOMER' | 'STAFF';
}

// Nội dung được ký vào JWT
export interface JwtPayload {
  sub: number;
  email: string;
  role: 'CUSTOMER' | 'STAFF';
}
