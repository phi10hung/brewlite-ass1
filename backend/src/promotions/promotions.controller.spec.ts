import type { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';

describe('PromotionsController', () => {
  const calculate = jest.fn();
  const controller = new PromotionsController({
    calculate,
  } as unknown as PromotionsService);

  beforeEach(() => {
    calculate.mockReset();
  });

  it('trả kết quả tính mã giảm giá', async () => {
    calculate.mockResolvedValue({
      code: 'GIAM10',
      discount: 17400,
      total: 156600,
    });

    await expect(
      controller.validate({ code: 'GIAM10', subtotal: 174000 }),
    ).resolves.toEqual({
      code: 'GIAM10',
      discount: 17400,
      total: 156600,
    });
    expect(calculate).toHaveBeenCalledWith('GIAM10', 174000);
  });
});
