import { ingredientsForLine, maxCups } from './recipe';

const CA_PHE = 1;
const SUA = 2;
const KEM = 3;
const latte = [
  { ingredientId: CA_PHE, amount: 18 },
  { ingredientId: SUA, amount: 200 },
];
const kemCheese = [{ ingredientId: KEM, amount: 30 }];

describe('ingredientsForLine', () => {
  it('size M dùng đúng công thức', () => {
    const r = ingredientsForLine(latte, [], 'M', 1);
    expect(r.get(CA_PHE)).toBe(18);
    expect(r.get(SUA)).toBe(200);
  });

  it('size S dùng 0,8 lần và làm tròn lên', () => {
    const r = ingredientsForLine(latte, [], 'S', 1);
    expect(r.get(CA_PHE)).toBe(15); // 14,4 làm tròn lên
    expect(r.get(SUA)).toBe(160);
  });

  it('size L dùng 1,3 lần và không bị lỗi số thực', () => {
    const r = ingredientsForLine(
      [{ ingredientId: CA_PHE, amount: 10 }],
      [],
      'L',
      1,
    );
    expect(r.get(CA_PHE)).toBe(13); // không phải 14
    expect(ingredientsForLine(latte, [], 'L', 1).get(CA_PHE)).toBe(24); // 23,4
  });

  it('topping giữ nguyên lượng, không nhân hệ số size', () => {
    const r = ingredientsForLine(latte, [kemCheese], 'L', 1);
    expect(r.get(KEM)).toBe(30);
  });

  it('nhân với số ly (cả món lẫn topping)', () => {
    const r = ingredientsForLine(latte, [kemCheese], 'M', 3);
    expect(r.get(CA_PHE)).toBe(54);
    expect(r.get(SUA)).toBe(600);
    expect(r.get(KEM)).toBe(90);
  });

  it('cộng dồn khi topping dùng chung nguyên liệu với món', () => {
    const r = ingredientsForLine(latte, [[{ ingredientId: SUA, amount: 50 }]], 'M', 1);
    expect(r.get(SUA)).toBe(250);
  });
});

describe('maxCups', () => {
  const stock = new Map([
    [CA_PHE, 1000],
    [SUA, 5000],
  ]);

  it('ví dụ của đề: Latte M còn 25 ly', () => {
    const perCup = ingredientsForLine(latte, [], 'M', 1);
    expect(maxCups(stock, perCup)).toBe(25); // min(55, 25)
  });

  it('size S pha được nhiều ly hơn size L', () => {
    const s = maxCups(stock, ingredientsForLine(latte, [], 'S', 1));
    const l = maxCups(stock, ingredientsForLine(latte, [], 'L', 1));
    expect(s).toBe(31);
    expect(l).toBe(19);
    expect(s).toBeGreaterThan(l);
  });

  it('thiếu nguyên liệu (không có trong kho) thì 0 ly', () => {
    const perCup = ingredientsForLine(latte, [kemCheese], 'M', 1);
    expect(maxCups(stock, perCup)).toBe(0);
  });

  it('không có công thức thì 0 ly', () => {
    expect(maxCups(stock, new Map())).toBe(0);
  });
});