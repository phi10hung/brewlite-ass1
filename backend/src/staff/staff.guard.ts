import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';

// Dùng SAU JwtAuthGuard: @UseGuards(JwtAuthGuard, StaffGuard)
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (req.user?.role !== 'STAFF') {
      throw new ForbiddenException('Chỉ nhân viên được truy cập');
    }
    return true;
  }
}