import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistIntelligenceService } from './wishlist-intelligence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';

class SetAlertDto {
  productId: string;
  alertType: 'restock' | 'price_drop';
  priceThreshold?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly intelligence: WishlistIntelligenceService,
  ) {}

  /** GET /wishlist — Get current user's saved products */
  @Get()
  findUserWishlist(@CurrentUser() user: RequestUser) {
    return this.wishlistService.findUserWishlist(user.id);
  }

  /** POST /wishlist/toggle — Save or unsave a product */
  @Post('toggle')
  toggleItem(
    @CurrentUser() user: RequestUser,
    @Body('productId') productId: string,
  ) {
    return this.wishlistService.toggleItem(user.id, productId);
  }

  /** GET /wishlist/alerts — Get user's active wishlist alerts */
  @Get('alerts')
  getAlerts(@CurrentUser() user: RequestUser) {
    return this.intelligence.getUserAlerts(user.id);
  }

  /** POST /wishlist/alerts — Set a restock or price-drop alert */
  @Post('alerts')
  setAlert(@CurrentUser() user: RequestUser, @Body() dto: SetAlertDto) {
    return this.intelligence.setAlert(
      user.id,
      dto.productId,
      dto.alertType,
      dto.priceThreshold,
    );
  }

  /** DELETE /wishlist/alerts/:productId/:alertType — Remove an alert */
  @Delete('alerts/:productId/:alertType')
  removeAlert(
    @CurrentUser() user: RequestUser,
    @Param('productId') productId: string,
    @Param('alertType') alertType: 'restock' | 'price_drop',
  ) {
    return this.intelligence.removeAlert(user.id, productId, alertType);
  }

  /** GET /wishlist/ai-suggestions — AI product suggestions based on wishlist */
  @Get('ai-suggestions')
  getAISuggestions(@CurrentUser() user: RequestUser) {
    return this.intelligence.generateAISuggestions(user.id);
  }
}
