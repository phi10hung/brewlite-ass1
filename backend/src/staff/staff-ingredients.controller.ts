import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestockDto } from './dto/restock.dto';
import { StaffGuard } from './staff.guard';
import { StaffService } from './staff.service';

@Controller('staff/ingredients')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffIngredientsController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.listIngredients();
  }

  @Post(':id/restock')
  restock(@Param('id', ParseIntPipe) id: number, @Body() dto: RestockDto) {
    return this.staff.restockIngredient(id, dto.amount);
  }
}