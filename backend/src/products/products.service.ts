import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_EXTRA } from '../common/pricing';

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  imageUrl: true,
  stock: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.product.findMany({
      where: category ? { category } : undefined,
      orderBy: { id: 'asc' },
      select: PRODUCT_SELECT,
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    const toppings = await this.prisma.topping.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, price: true },
    });

    const sizes = Object.entries(SIZE_EXTRA).map(([size, extra]) => ({
      size,
      extra,
    }));

    return { ...product, sizes, toppings };
  }
}