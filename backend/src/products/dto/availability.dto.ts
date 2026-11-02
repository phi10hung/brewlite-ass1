import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, ValidateNested } from 'class-validator';
import { SIZE_EXTRA } from '../../common/pricing';
import type { Size } from '../../common/pricing';
import { OrderItemDto } from '../../orders/dto/create-order.dto';

// Món đang muốn thêm vào giỏ (chưa có số lượng)
export class AddItemDto {
  @IsInt({ message: 'Mã món phải là số nguyên' })
  productId!: number;

  @IsIn(Object.keys(SIZE_EXTRA), { message: 'Size phải là S, M hoặc L' })
  size!: Size;

  @IsArray({ message: 'Danh sách topping phải là mảng' })
  @IsInt({ each: true, message: 'Mã topping phải là số nguyên' })
  toppingIds!: number[];
}

export class AvailabilityDto {
  // Các dòng đang có trong giỏ (giỏ trống thì là mảng rỗng)
  @IsArray({ message: 'Giỏ hàng phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => AddItemDto)
  add!: AddItemDto;
}