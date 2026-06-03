import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Checkout and create a new order invoice' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  async createOrder(
    @CurrentUser() user: RequestUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user order history' })
  async findMyOrders(@CurrentUser() user: RequestUser) {
    return this.ordersService.findUserOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by order ID' })
  async findOrderById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const order = await this.ordersService.findOrderById(id);

    // Security check: Only the owner of the order or an administrative agent can access it
    const isStaff = ['admin', 'super_admin', 'support_agent'].includes(
      user.role,
    );
    if (order.userId !== user.id && !isStaff) {
      throw new ForbiddenException(
        'Access denied. You cannot view this order.',
      );
    }

    return order;
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support_agent')
  @ApiOperation({
    summary:
      'Update order shipping/fulfillment status (Admin & Support Agent only)',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.ordersService.updateOrderStatus(id, status, notes);
  }

  @Patch(':id/tracking')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support_agent')
  @ApiOperation({
    summary: 'Register shipping tracking information and mark order as shipped',
  })
  async updateTracking(
    @Param('id') id: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('carrier') carrier: string,
    @Body('estimatedDeliveryDays') estimatedDeliveryDays?: number,
  ) {
    return this.ordersService.updateOrderTracking(
      id,
      trackingNumber,
      carrier,
      estimatedDeliveryDays,
    );
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support_agent')
  @ApiOperation({
    summary: 'Cancel order and release reserved stock',
  })
  async cancelOrder(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.ordersService.cancelOrder(id, notes);
  }

  @Post(':id/refund')
  @UseGuards(RolesGuard)
  @Roles('admin', 'support_agent')
  @ApiOperation({
    summary: 'Refund order amount and return items to warehouse catalog',
  })
  async processRefund(
    @Param('id') id: string,
    @Body('amount') amount?: number,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.processRefund(id, amount, reason);
  }
}
