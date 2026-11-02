import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SIZE_EXTRA } from '../../common/pricing';
import type { Size } from '../../common/pricing';

export class OrderItemDto {
  @IsInt({ message: 'Mã món phải là số nguyên' })
  productId!: number;

  @IsIn(Object.keys(SIZE_EXTRA), { message: 'Size phải là S, M hoặc L' })
  size!: Size;

  @IsArray({ message: 'Danh sách topping phải là mảng' })
  @IsInt({ each: true, message: 'Mã topping phải là số nguyên' })
  toppingIds!: number[];

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray({ message: 'Giỏ hàng phải là mảng' })
  @ArrayNotEmpty({ message: 'Giỏ hàng không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsIn(['WALLET', 'CARD'], {
    message: 'Phương thức thanh toán phải là WALLET hoặc CARD',
  })
  paymentMethod!: 'WALLET' | 'CARD';

  @IsOptional()
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  promotionCode?: string;
}