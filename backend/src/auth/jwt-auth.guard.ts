import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser, JwtPayload } from './auth.types';

// Đặt @UseGuards(JwtAuthGuard) lên route nào thì route đó bắt buộc đăng nhập.
// Token gửi kèm header: Authorization: Bearer <accessToken>
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Vui lòng đăng nhập');
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      req.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
  }
}
