import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('validate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  validate(@Body() dto: ValidatePromotionDto) {
    return this.promotionsService.calculate(dto.code, dto.subtotal);
  }
}
