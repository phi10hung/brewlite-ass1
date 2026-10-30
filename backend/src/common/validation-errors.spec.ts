import type { ValidationError } from 'class-validator';
import { collectValidationMessages } from './validation-errors';

describe('collectValidationMessages', () => {
  it('trường lạ: đổi câu tiếng Anh sang tiếng Việt', () => {
    const errors = [
      {
        property: 'price',
        constraints: { whitelistValidation: 'property price should not exist' },
        children: [],
      },
    ] as ValidationError[];

    expect(collectValidationMessages(errors)).toEqual([
      'Trường "price" không hợp lệ',
    ]);
  });

  it('lấy câu báo lỗi của trường lồng nhau, không kèm tiền tố', () => {
    const errors = [
      {
        property: 'items',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'quantity',
                constraints: { max: 'Số lượng tối đa là 20' },
                children: [],
              },
            ],
          },
        ],
      },
    ] as ValidationError[];

    expect(collectValidationMessages(errors)).toEqual([
      'Số lượng tối đa là 20',
    ]);
  });

  it('bỏ câu trùng khi nhiều món cùng lỗi', () => {
    const itemError = (index: string) => ({
      property: index,
      children: [
        {
          property: 'size',
          constraints: { isIn: 'Size phải là S, M hoặc L' },
          children: [],
        },
      ],
    });
    const errors = [
      { property: 'items', children: [itemError('0'), itemError('1')] },
    ] as ValidationError[];

    expect(collectValidationMessages(errors)).toEqual([
      'Size phải là S, M hoặc L',
    ]);
  });

  it('giữ lỗi của trường thường', () => {
    const errors = [
      {
        property: 'email',
        constraints: { isEmail: 'Email không hợp lệ' },
        children: [],
      },
    ] as ValidationError[];

    expect(collectValidationMessages(errors)).toEqual(['Email không hợp lệ']);
  });
});