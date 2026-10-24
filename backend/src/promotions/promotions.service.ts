import { BadRequestException, Injectable } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

export type PromotionCalculation = {
  code: string;
  discount: number;
  total: number;
};

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    code: string,
    subtotal: number,
  ): Promise<PromotionCalculation> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Vui lòng nhập mã giảm giá');
    }

    const promotion = await this.prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });
    if (!promotion) {
      throw new BadRequestException('Mã giảm giá không tồn tại');
    }
    if (!promotion.active) {
      throw new BadRequestException('Mã giảm giá đã ngừng áp dụng');
    }
    if (promotion.expiresAt && promotion.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (subtotal < promotion.minOrder) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${promotion.minOrder.toLocaleString('vi-VN')}đ để dùng mã này`,
      );
    }

    const rawDiscount =
      promotion.type === DiscountType.PERCENT
        ? Math.floor((subtotal * promotion.value) / 100)
        : promotion.value;
    const discount = Math.min(Math.max(rawDiscount, 0), subtotal);

    return {
      code: promotion.code,
      discount,
      total: subtotal - discount,
    };
  }
}
