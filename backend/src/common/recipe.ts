// Hệ số công thức theo size: công thức của món tính cho size M
export const SIZE_FACTOR = { S: 0.8, M: 1, L: 1.3 } as const;
export type RecipeSize = keyof typeof SIZE_FACTOR;

// Một dòng công thức: cần `amount` của nguyên liệu `ingredientId`
export type RecipeLine = { ingredientId: number; amount: number };

// Lượng nguyên liệu cần cho `quantity` ly của 1 dòng giỏ hàng:
// (ceil(lượng món × hệ số size) + tổng lượng topping) × số ly
export function ingredientsForLine(
  recipe: RecipeLine[],
  toppingRecipes: RecipeLine[][],
  size: RecipeSize,
  quantity: number,
): Map<number, number> {
  const result = new Map<number, number>();
  const add = (ingredientId: number, amount: number) =>
    result.set(ingredientId, (result.get(ingredientId) ?? 0) + amount);

  // Món: nhân hệ số size rồi làm tròn lên. Làm tròn trước 2 chữ số thập phân
  // để tránh lỗi số thực (10 × 1.3 = 13.000000000000002 sẽ bị ceil thành 14).
  for (const line of recipe) {
    const scaled = Math.round(line.amount * SIZE_FACTOR[size] * 100) / 100;
    add(line.ingredientId, Math.ceil(scaled));
  }
  // Topping: giữ nguyên lượng, không nhân hệ số size
  for (const topping of toppingRecipes) {
    for (const line of topping) add(line.ingredientId, line.amount);
  }
  // Nhân với số ly
  for (const [ingredientId, amount] of result) {
    result.set(ingredientId, amount * quantity);
  }
  return result;
}

// Số ly tối đa pha được = nhỏ nhất của floor(tồn kho ÷ lượng cần cho 1 ly).
// Không có công thức nào (perCup rỗng) thì trả 0 vì không biết pha thế nào.
export function maxCups(
  stock: Map<number, number>,
  perCup: Map<number, number>,
): number {
  let max = Infinity;
  for (const [ingredientId, amount] of perCup) {
    if (amount <= 0) continue;
    max = Math.min(max, Math.floor((stock.get(ingredientId) ?? 0) / amount));
  }
  return Number.isFinite(max) ? max : 0;
}