import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderStatus } from '../generated/prisma/enums';
import { StaffGuard } from './staff.guard';
import { StaffService } from './staff.service';

function parseStatus(value: unknown): OrderStatus {
  if (
    typeof value !== 'string' ||
    !Object.values(OrderStatus).includes(value as OrderStatus)
  ) {
    throw new BadRequestException('Trạng thái đơn hàng không hợp lệ');
  }
  return value as OrderStatus;
}

@Controller('staff/orders')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.staff.listOrders(status ? parseStatus(status) : undefined);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: unknown },
  ) {
    return this.staff.updateStatus(id, parseStatus(body?.status));
  }
}