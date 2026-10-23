import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  const jwtMock = { signAsync: jest.fn().mockResolvedValue('token-gia') };

  const userInDb = {
    id: 1,
    email: 'khach@brewlite.vn',
    name: 'Khách Demo',
    role: 'CUSTOMER' as const,
    loyaltyPoints: 0,
    password: '',
  };

  beforeAll(async () => {
    userInDb.password = await bcrypt.hash('123456', 10);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('đăng ký: băm mật khẩu bằng bcrypt và trả token, không trả mật khẩu', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...userInDb, ...data, id: 3 }),
    );

    const result = await service.register({
      name: 'Bạn Mới',
      email: 'BanMoi@Gmail.com',
      password: '123456',
    });

    const saved = prismaMock.user.create.mock.calls[0][0].data;
    expect(saved.email).toBe('banmoi@gmail.com');
    expect(saved.password).not.toBe('123456');
    expect(await bcrypt.compare('123456', saved.password)).toBe(true);
    expect(result.accessToken).toBe('token-gia');
    expect(result.user).not.toHaveProperty('password');
  });

  it('đăng ký: trùng email thì báo lỗi 409', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userInDb);

    await expect(
      service.register({
        name: 'A',
        email: 'khach@brewlite.vn',
        password: '123456',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('đăng nhập đúng mật khẩu thì trả token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userInDb);

    const result = await service.login({
      email: 'khach@brewlite.vn',
      password: '123456',
    });

    expect(result.accessToken).toBe('token-gia');
    expect(result.user.email).toBe('khach@brewlite.vn');
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'khach@brewlite.vn',
      role: 'CUSTOMER',
    });
  });

  it('đăng nhập sai mật khẩu thì báo lỗi 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userInDb);

    await expect(
      service.login({ email: 'khach@brewlite.vn', password: 'sai-mat-khau' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('đăng nhập email không tồn tại thì báo lỗi 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'khong-co@brewlite.vn', password: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
