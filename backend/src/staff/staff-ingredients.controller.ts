import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
}