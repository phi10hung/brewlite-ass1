import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums';
import { assertTransition, canTransition } from './order-status';

type Transition = [OrderStatus, OrderStatus];

const ALL_STATUSES: OrderStatus[] = Object.values(OrderStatus);

const ALLOWED_TRANSITIONS: Transition[] = [
  [OrderStatus.PENDING, OrderStatus.PAID],
  [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED],
  [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING],
  [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID, OrderStatus.PREPARING],
  [OrderStatus.PREPARING, OrderStatus.READY],
  [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.READY, OrderStatus.COMPLETED],
  [OrderStatus.READY, OrderStatus.CANCELLED],
];

const allowedKeys = new Set(
  ALLOWED_TRANSITIONS.map(([from, to]) => `${from}->${to}`),
);

const INVALID_TRANSITIONS: Transition[] = ALL_STATUSES.flatMap((from) =>
  ALL_STATUSES.filter((to) => !allowedKeys.has(`${from}->${to}`)).map(
    (to): Transition => [from, to],
  ),
);

describe('OrderStatus transitions', () => {
  describe('hợp lệ', () => {
    it.each(ALLOWED_TRANSITIONS)('cho phép %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    });

    it('cho phép đi hết luồng chính', () => {
      const mainFlow = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
      ];

      for (let index = 0; index < mainFlow.length - 1; index += 1) {
        expect(() =>
          assertTransition(mainFlow[index], mainFlow[index + 1]),
        ).not.toThrow();
      }
    });

    it('cho phép thử lại thanh toán từ PAYMENT_FAILED về PENDING', () => {
      expect(
        canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING),
      ).toBe(true);
      expect(() =>
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING),
      ).not.toThrow();
    });
  });

  describe('không hợp lệ', () => {
    it.each(INVALID_TRANSITIONS)('chặn %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(BadRequestException);
    });

    it('tuyệt đối không cho hủy đơn đã PAID', () => {
      expect(canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(
        false,
      );
      expect(() =>
        assertTransition(OrderStatus.PAID, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
    });

    it.each([OrderStatus.COMPLETED, OrderStatus.CANCELLED])(
      'không cho chuyển tiếp từ trạng thái cuối %s',
      (status) => {
        for (const next of ALL_STATUSES) {
          expect(canTransition(status, next)).toBe(false);
        }
      },
    );

    it('trả lỗi 400 kèm trạng thái nguồn và đích', () => {
      let error: unknown;

      try {
        assertTransition(OrderStatus.PENDING, OrderStatus.COMPLETED);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(BadRequestException);

      const exception = error as BadRequestException;
      expect(exception.getStatus()).toBe(400);
      expect(exception.message).toContain(OrderStatus.PENDING);
      expect(exception.message).toContain(OrderStatus.COMPLETED);
    });
  });
});
