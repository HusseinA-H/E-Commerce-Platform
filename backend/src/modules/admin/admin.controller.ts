import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'inventory_manager', 'support_agent')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get administrative dashboard metrics summary' })
  async getSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Get chronological activity feed of system events' })
  async getActivityFeed() {
    return this.adminService.getActivityFeed();
  }

  @Get('users')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all user profiles (customer & admin logs)' })
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Change user role parameter (Super Admin only)' })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Delete('users/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete user account profile (Super Admin only)' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('orders')
  @Roles('admin', 'support_agent')
  @ApiOperation({ summary: 'Get all orders submitted in the system' })
  async getOrders() {
    return this.adminService.getAllOrders();
  }

  @Get('audit-logs')
  @Roles('admin')
  @ApiOperation({ summary: 'Get chronological system audit logs (Admin only)' })
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}
