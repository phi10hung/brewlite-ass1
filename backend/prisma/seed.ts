// Dữ liệu mẫu cho BrewLite. Chạy: npx prisma db seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const products = [
  { name: 'Cà phê sữa đá', category: 'Cà phê', price: 29000, slug: 'ca-phe-sua-da', description: 'Cà phê phin đậm đà pha cùng sữa đặc, uống kèm đá.' },
  { name: 'Cà phê đen đá', category: 'Cà phê', price: 25000, slug: 'ca-phe-den-da', description: 'Cà phê phin nguyên chất, vị đắng đậm.' },
  { name: 'Bạc xỉu', category: 'Cà phê', price: 32000, slug: 'bac-xiu', description: 'Nhiều sữa, ít cà phê, ngọt dịu.' },
  { name: 'Cappuccino', category: 'Cà phê', price: 45000, slug: 'cappuccino', description: 'Espresso với lớp bọt sữa mịn.' },
  { name: 'Latte', category: 'Cà phê', price: 45000, slug: 'latte', description: 'Espresso pha nhiều sữa tươi nóng.' },
  { name: 'Trà đào cam sả', category: 'Trà', price: 39000, slug: 'tra-dao-cam-sa', description: 'Trà đen, đào miếng, cam và sả thơm mát.' },
  { name: 'Trà sữa trân châu', category: 'Trà', price: 35000, slug: 'tra-sua-tran-chau', description: 'Trà sữa đậm vị kèm trân châu đường đen.' },
  { name: 'Matcha latte', category: 'Trà', price: 49000, slug: 'matcha-latte', description: 'Bột matcha Nhật pha sữa tươi.' },
  { name: 'Sinh tố bơ', category: 'Đá xay', price: 45000, slug: 'sinh-to-bo', description: 'Bơ sáp xay cùng sữa đặc.' },
  { name: 'Chocolate đá xay', category: 'Đá xay', price: 49000, slug: 'chocolate-da-xay', description: 'Chocolate xay đá, phủ kem tươi.' },
  // Món bổ sung (Búp)
  { name: 'Trà dâu', category: 'Trà', price: 39000, slug: 'tra-dau', description: 'Trà đen, mứt dâu tươi mát, kèm dâu tươi.' },
  { name: 'Trà nho', category: 'Trà', price: 39000, slug: 'tra-nho', description: 'Trà đen, mứt nho tươi mát, kèm nho tươi.' },
  { name: 'Trà xoài', category: 'Trà', price: 39000, slug: 'tra-xoai', description: 'Trà đen, mứt xoài tươi mát, kèm xoài tươi miếng.' },
  { name: 'Cookie đá xay', category: 'Đá xay', price: 55000, slug: 'cookie-da-xay', description: 'Đá xay béo ngậy với bánh cookie, phủ kem tươi.' },
];

const toppings = [
  { name: 'Trân châu đen', price: 8000 },
  { name: 'Thạch cà phê', price: 8000 },
  { name: 'Kem cheese', price: 12000 },
  { name: 'Thêm 1 shot espresso', price: 10000 },
  // Topping bổ sung (Búp)
  { name: 'Trân châu trắng', price: 5000 },
  { name: 'Pudding', price: 10000 },
  { name: 'Thạch trái cây', price: 8000 },
  { name: 'Bánh flan', price: 12000 },
  { name: 'Thạch phô mai', price: 12000 },
];

// Kho nguyên liệu (số liệu bịa cho demo)
const ingredients = [
  { name: 'Cà phê hạt', unit: 'g', stock: 1500 },
  { name: 'Sữa đặc', unit: 'ml', stock: 3000 },
  { name: 'Sữa tươi', unit: 'ml', stock: 8000 },
  { name: 'Đường', unit: 'g', stock: 3000 },
  { name: 'Trà đen', unit: 'g', stock: 600 },
  { name: 'Bột matcha', unit: 'g', stock: 400 },
  { name: 'Bột cacao', unit: 'g', stock: 600 },
  { name: 'Bơ', unit: 'g', stock: 3000 },
  { name: 'Đào ngâm', unit: 'g', stock: 2000 },
  { name: 'Mứt dâu', unit: 'ml', stock: 1500 },
  { name: 'Mứt nho', unit: 'ml', stock: 1500 },
  { name: 'Mứt xoài', unit: 'ml', stock: 1500 },
  { name: 'Bánh cookie', unit: 'cái', stock: 60 },
  { name: 'Kem tươi', unit: 'ml', stock: 2000 },
  { name: 'Trân châu đen', unit: 'g', stock: 1000 },
  { name: 'Trân châu trắng', unit: 'g', stock: 1000 },
  { name: 'Thạch cà phê', unit: 'g', stock: 1000 },
  { name: 'Thạch trái cây', unit: 'g', stock: 1000 },
  { name: 'Thạch phô mai', unit: 'g', stock: 1000 },
  { name: 'Kem cheese', unit: 'ml', stock: 1000 },
  { name: 'Pudding', unit: 'cái', stock: 40 },
  { name: 'Bánh flan', unit: 'cái', stock: 30 },
];

// Công thức pha chế cho size M: [nguyên liệu, lượng]. Size S nhân 0,8, size L nhân 1,3
const productRecipes: Record<string, [string, number][]> = {
  'Cà phê sữa đá': [['Cà phê hạt', 20], ['Sữa đặc', 30]],
  'Cà phê đen đá': [['Cà phê hạt', 20], ['Đường', 10]],
  'Bạc xỉu': [['Cà phê hạt', 10], ['Sữa đặc', 30], ['Sữa tươi', 60]],
  Cappuccino: [['Cà phê hạt', 18], ['Sữa tươi', 150]],
  Latte: [['Cà phê hạt', 18], ['Sữa tươi', 200]],
  'Trà đào cam sả': [['Trà đen', 5], ['Đào ngâm', 60], ['Đường', 15]],
  'Trà sữa trân châu': [['Trà đen', 6], ['Sữa tươi', 120], ['Trân châu đen', 40]],
  'Matcha latte': [['Bột matcha', 6], ['Sữa tươi', 200]],
  'Sinh tố bơ': [['Bơ', 150], ['Sữa đặc', 40]],
  'Chocolate đá xay': [['Bột cacao', 25], ['Sữa tươi', 150], ['Kem tươi', 30]],
  'Trà dâu': [['Trà đen', 5], ['Mứt dâu', 40]],
  'Trà nho': [['Trà đen', 5], ['Mứt nho', 40]],
  'Trà xoài': [['Trà đen', 5], ['Mứt xoài', 40]],
  'Cookie đá xay': [['Bánh cookie', 2], ['Sữa tươi', 150], ['Kem tươi', 30]],
};

// Công thức topping: lượng cố định, không nhân theo size
const toppingRecipes: Record<string, [string, number][]> = {
  'Trân châu đen': [['Trân châu đen', 40]],
  'Thạch cà phê': [['Thạch cà phê', 40]],
  'Kem cheese': [['Kem cheese', 30]],
  'Thêm 1 shot espresso': [['Cà phê hạt', 9]],
  'Trân châu trắng': [['Trân châu trắng', 40]],
  Pudding: [['Pudding', 1]],
  'Thạch trái cây': [['Thạch trái cây', 40]],
  'Bánh flan': [['Bánh flan', 1]],
  'Thạch phô mai': [['Thạch phô mai', 40]],
};

// Tra id theo tên, sai tên thì báo lỗi ngay thay vì bỏ qua
function idOf(map: Map<string, number>, name: string): number {
  const id = map.get(name);
  if (id === undefined) throw new Error(`Seed: không tìm thấy "${name}"`);
  return id;
}

async function main() {
  // Xoá dữ liệu cũ và ĐẶT LẠI id về 1, để chạy seed bao nhiêu lần
  // thì Cà phê sữa đá vẫn là id 1, Latte vẫn là id 5...
  await prisma.$executeRawUnsafe(
    'TRUNCATE "OrderIngredient", "ToppingRecipe", "Recipe", "Ingredient", "LoyaltyTransaction", "Payment", "OrderItem", "Order", "Product", "Topping", "Promotion", "User" RESTART IDENTITY CASCADE',
  );

  await prisma.product.createMany({
    data: products.map(({ slug, ...p }) => ({
      ...p,
      imageUrl: `/images/drinks/${slug}.png`,
      stock: 50,
    })),
  });
  await prisma.topping.createMany({ data: toppings });
  await prisma.ingredient.createMany({ data: ingredients });

  const [productRows, toppingRows, ingredientRows] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true } }),
    prisma.topping.findMany({ select: { id: true, name: true } }),
    prisma.ingredient.findMany({ select: { id: true, name: true } }),
  ]);
  const productIds = new Map(productRows.map((p) => [p.name, p.id]));
  const toppingIds = new Map(toppingRows.map((t) => [t.name, t.id]));
  const ingredientIds = new Map(ingredientRows.map((i) => [i.name, i.id]));

  await prisma.recipe.createMany({
    data: Object.entries(productRecipes).flatMap(([product, items]) =>
      items.map(([ingredient, amount]) => ({
        productId: idOf(productIds, product),
        ingredientId: idOf(ingredientIds, ingredient),
        amount,
      })),
    ),
  });
  await prisma.toppingRecipe.createMany({
    data: Object.entries(toppingRecipes).flatMap(([topping, items]) =>
      items.map(([ingredient, amount]) => ({
        toppingId: idOf(toppingIds, topping),
        ingredientId: idOf(ingredientIds, ingredient),
        amount,
      })),
    ),
  });

  await prisma.promotion.createMany({
    data: [
      { code: 'GIAM10', type: 'PERCENT', value: 10, minOrder: 50000 },
      { code: 'BREW20K', type: 'FIXED', value: 20000, minOrder: 100000 },
    ],
  });

  const password = await bcrypt.hash('123456', 10);
  await prisma.user.createMany({
    data: [
      { email: 'khach@brewlite.vn', name: 'Khách Demo', password },
      { email: 'staff@brewlite.vn', name: 'Nhân viên', password, role: 'STAFF' },
    ],
  });

  console.log(
    `Seed xong: ${products.length} đồ uống, ${toppings.length} topping, ${ingredients.length} nguyên liệu kèm công thức, 2 mã giảm giá, 2 tài khoản`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());