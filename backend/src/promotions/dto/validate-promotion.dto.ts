import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidatePromotionDto {
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã giảm giá' })
  code!: string;

  @IsInt({ message: 'Tạm tính phải là số nguyên' })
  @Min(0, { message: 'Tạm tính không được âm' })
  subtotal!: number;
}
