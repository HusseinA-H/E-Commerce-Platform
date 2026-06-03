import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/user.decorator';

const isAdmin = (role: string) =>
  ['admin', 'super_admin', 'inventory_manager', 'support_agent'].includes(role);

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  /** GET /notifications — Get recent notifications (last 50) */
  @Get()
  getNotifications(@CurrentUser() user: RequestUser) {
    return this.notificationsService.findAll(
      isAdmin(user.role) ? undefined : user.id,
    );
  }

  /** GET /notifications/unread-count — Unread notification count for badge */
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /** PATCH /notifications/:id/read — Mark a single notification as read */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markAsRead(
      id,
      isAdmin(user.role) ? undefined : user.id,
    );
  }

  /** POST /notifications/read-all — Mark all notifications as read */
  @Post('read-all')
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(
      isAdmin(user.role) ? undefined : user.id,
    );
  }

  /** DELETE /notifications/:id — Delete a notification */
  @Delete(':id')
  deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationsService.deleteOne(id, user.id);
  }

  // --- Omnichannel Notification Preferences ---

  /** GET /notifications/preferences — Get channel preferences */
  @Get('preferences')
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  /** PUT /notifications/preferences — Update preference channel for type */
  @Put('preferences')
  updatePreference(
    @CurrentUser() user: RequestUser,
    @Body() body: { channel: string; type: string; isEnabled: boolean },
  ) {
    return this.notificationsService.updatePreference(
      user.id,
      body.channel,
      body.type,
      body.isEnabled,
    );
  }

  // --- Push Token Management ---

  /** POST /notifications/push/register — Register a client FCM token */
  @Post('push/register')
  registerPushToken(
    @CurrentUser() user: RequestUser,
    @Body() body: { token: string; deviceType: string },
  ) {
    return this.pushService.registerToken(
      user.id,
      body.token,
      body.deviceType || 'web',
    );
  }

  /** POST /notifications/push/unregister — Remove a client FCM token */
  @Post('push/unregister')
  unregisterPushToken(@Body() body: { token: string }) {
    return this.pushService.unregisterToken(body.token);
  }
}
