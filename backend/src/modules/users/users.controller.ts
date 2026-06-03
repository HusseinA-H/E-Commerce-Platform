import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user details.' })
  async getProfile(@CurrentUser() user: RequestUser) {
    const profile = await this.usersService.findById(user.id);
    // Remove password details before returning to client
    if (profile) {
      const profileData = { ...profile } as Record<string, unknown>;
      delete profileData.passwordHash;
      delete profileData.verificationToken;
      delete profileData.passwordResetToken;
      return profileData;
    }
    return null;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile details' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(user.id, updateUserDto);
    const updatedData = { ...updated } as Record<string, unknown>;
    delete updatedData.passwordHash;
    delete updatedData.verificationToken;
    delete updatedData.passwordResetToken;
    return updatedData;
  }
}
