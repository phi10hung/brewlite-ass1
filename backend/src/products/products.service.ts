import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SIZE_EXTRA } from '../common/pricing';
import {
  groupBy,
  ingredientsForLine,
  maxCups,
  type RecipeSize,
} from '../common/recipe';
import type { AvailabilityDto } from './dto/availability.dto';

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  imageUrl: true,
} as const;

const RECIPE_SELECT = {
  productId: true,
  ingredientId: true,
  amount: true,
} as const;

const TOPPING_RECIPE_SELECT = {
  toppingId: true,
  ingredientId: true,
  amount: true,
} as const;

// Đủ nguyên liệu cho 1 phần (dùng cho topping)
function canMake(stock: Map<number, number>, needs: Map<number, number>) {
  for (const [ingredientId, amount] of needs) {
    if ((stock.get(ingredientId) ?? 0) < amount) return false;
  }
  return true;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tồn kho nguyên liệu: ingredientId -> lượng còn
  private async loadStock() {
    const rows = await this.prisma.ingredient.findMany({
      select: { id: true, stock: true },
    });
    return new Map(rows.map((r) => [r.id, r.stock]));
  }

  // stock của món = số ly size S, không topping còn pha được
  async findAll(category?: string) {
    const [products, recipes, stock] = await Promise.all([
      this.prisma.product.findMany({
        where: category ? { category } : undefined,
        orderBy: { id: 'asc' },
        select: PRODUCT_SELECT,
      }),
      this.prisma.recipe.findMany({ select: RECIPE_SELECT }),
      this.loadStock(),
    ]);
    const recipesByProduct = groupBy(recipes, (r) => r.productId);

    return products.map((p) => ({
      ...p,
      stock: maxCups(
        stock,
        ingredientsForLine(recipesByProduct.get(p.id) ?? [], [], 'S', 1),
      ),
    }));
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    const [toppings, recipes, toppingRecipes, stock] = await Promise.all([
      this.prisma.topping.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.recipe.findMany({
        where: { productId: id },
        select: RECIPE_SELECT,
      }),
      this.prisma.toppingRecipe.findMany({ select: TOPPING_RECIPE_SELECT }),
      this.loadStock(),
    ]);
    const recipesByTopping = groupBy(toppingRecipes, (r) => r.toppingId);

    const sizes = Object.entries(SIZE_EXTRA).map(([size, extra]) => ({
      size,
      extra,
    }));

    return {
      ...product,
      stock: maxCups(stock, ingredientsForLine(recipes, [], 'S', 1)),
      sizes,
      // available = false khi kho không đủ nguyên liệu cho 1 phần topping
      toppings: toppings.map((t) => ({
        ...t,
        available: canMake(
          stock,
          ingredientsForLine([], [recipesByTopping.get(t.id) ?? []], 'M', 1),
        ),
      })),
    };
  }

  // Còn thêm được tối đa bao nhiêu ly món `add`, sau khi trừ nguyên liệu của giỏ hiện tại
  async availability(dto: AvailabilityDto) {
    const all = [...dto.items, dto.add];
    const productIds = [...new Set(all.map((i) => i.productId))];
    const toppingIds = [...new Set(all.flatMap((i) => i.toppingIds))];

    const [recipes, toppingRecipes, stock] = await Promise.all([
      this.prisma.recipe.findMany({
        where: { productId: { in: productIds } },
        select: RECIPE_SELECT,
      }),
      this.prisma.toppingRecipe.findMany({
        where: { toppingId: { in: toppingIds } },
        select: TOPPING_RECIPE_SELECT,
      }),
      this.loadStock(),
    ]);
    const recipesByProduct = groupBy(recipes, (r) => r.productId);
    const recipesByTopping = groupBy(toppingRecipes, (r) => r.toppingId);

    const needsOf = (
      item: { productId: number; size: RecipeSize; toppingIds: number[] },
      quantity: number,
    ) =>
      ingredientsForLine(
        recipesByProduct.get(item.productId) ?? [],
        [...new Set(item.toppingIds)].map((id) => recipesByTopping.get(id) ?? []),
        item.size,
        quantity,
      );

    // Trừ nguyên liệu của các dòng đang có trong giỏ (không để âm)
    const remaining = new Map(stock);
    for (const item of dto.items) {
      for (const [ingredientId, amount] of needsOf(item, item.quantity)) {
        remaining.set(
          ingredientId,
          Math.max(0, (remaining.get(ingredientId) ?? 0) - amount),
        );
      }
    }

    return { maxQuantity: maxCups(remaining, needsOf(dto.add, 1)) };
  }
}