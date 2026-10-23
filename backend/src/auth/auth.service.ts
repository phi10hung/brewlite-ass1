import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type UserRecord = {
  id: number;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF';
  loyaltyPoints: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existed = await this.prisma.user.findUnique({ where: { email } });
    if (existed) {
      throw new ConflictException('Email đã được đăng ký');
    }
    // Không lưu mật khẩu gốc, chỉ lưu bản đã băm bằng bcrypt
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email, password, name: dto.name },
    });
    return this.buildResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Báo chung một lỗi để không lộ email nào đã đăng ký
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.buildResponse(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return this.publicUser(user);
  }

  private async buildResponse(user: UserRecord) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: this.publicUser(user),
    };
  }

  // Không bao giờ trả mật khẩu về cho client
  private publicUser(user: UserRecord) {
    const { id, name, email, role, loyaltyPoints } = user;
    return { id, name, email, role, loyaltyPoints };
  }
}
