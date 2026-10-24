import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from './promotions.service';

type PromotionRow = {
  id: number;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number;
  active: boolean;
  expiresAt: Date | null;
};

const findUnique = jest.fn();

function promotion(overrides: Partial<PromotionRow> = {}): PromotionRow {
  return {
    id: 1,
    code: 'GIAM10',
    type: 'PERCENT',
    value: 10,
    minOrder: 50000,
    active: true,
    expiresAt: null,
    ...overrides,
  };
}

describe('PromotionsService', () => {
  let service: PromotionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PromotionsService({
      promotion: { findUnique },
    } as unknown as PrismaService);
  });

  it('tính mã phần trăm, không phân biệt hoa thường', async () => {
    findUnique.mockResolvedValue(promotion());

    await expect(service.calculate(' giam10 ', 174000)).resolves.toEqual({
      code: 'GIAM10',
      discount: 17400,
      total: 156600,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'GIAM10' } });
  });

  it('tính mã giảm tiền cố định', async () => {
    findUnique.mockResolvedValue(
      promotion({
        code: 'BREW20K',
        type: 'FIXED',
        value: 20000,
        minOrder: 100000,
      }),
    );

    await expect(service.calculate('brew20k', 150000)).resolves.toEqual({
      code: 'BREW20K',
      discount: 20000,
      total: 130000,
    });
  });

  it('không để discount vượt quá subtotal', async () => {
    findUnique.mockResolvedValue(
      promotion({
        code: 'BIG',
        type: 'FIXED',
        value: 50000,
        minOrder: 0,
      }),
    );

    await expect(service.calculate('BIG', 30000)).resolves.toEqual({
      code: 'BIG',
      discount: 30000,
      total: 0,
    });
  });

  it('làm tròn xuống discount phần trăm', async () => {
    findUnique.mockResolvedValue(promotion({ minOrder: 0 }));

    await expect(service.calculate('GIAM10', 999)).resolves.toEqual({
      code: 'GIAM10',
      discount: 99,
      total: 900,
    });
  });

  it('báo lỗi khi mã không tồn tại', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.calculate('KHONGCO', 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('báo lỗi khi mã ngừng áp dụng', async () => {
    findUnique.mockResolvedValue(promotion({ active: false }));

    await expect(service.calculate('GIAM10', 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('báo lỗi khi mã hết hạn', async () => {
    findUnique.mockResolvedValue(
      promotion({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.calculate('GIAM10', 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('báo lỗi khi chưa đạt giá trị tối thiểu', async () => {
    findUnique.mockResolvedValue(promotion({ minOrder: 100000 }));

    await expect(service.calculate('GIAM10', 99999)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('báo lỗi khi mã rỗng', async () => {
    await expect(service.calculate('   ', 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });
});
