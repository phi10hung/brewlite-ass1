import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums';

export class CreatePaymentDto {
  @IsInt({ message: 'Mã đơn hàng phải là số nguyên' })
  @Min(1, { message: 'Mã đơn hàng không hợp lệ' })
  orderId!: number;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là WALLET hoặc CARD',
  })
  method!: PaymentMethod;
}
