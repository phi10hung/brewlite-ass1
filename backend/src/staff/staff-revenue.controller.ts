import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from './staff.guard';
import { StaffService } from './staff.service';

@Controller('staff/revenue')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffRevenueController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  get() {
    return this.staff.getRevenue();
  }
}
