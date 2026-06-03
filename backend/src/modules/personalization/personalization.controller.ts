import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalizationService } from './personalization.service';
import { StyleDnaService } from './style-dna.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/user.decorator';

@ApiTags('personalization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('personalization')
export class PersonalizationController {
  constructor(
    private readonly personalizationService: PersonalizationService,
    private readonly styleDnaService: StyleDnaService,
  ) {}

  @Get('style-dna')
  @ApiOperation({ summary: 'Get the logged-in user Style DNA profile' })
  async getStyleDna(@CurrentUser() user: RequestUser) {
    return this.styleDnaService.getOrComputeStyleDna(user.id);
  }

  @Get('banners')
  @ApiOperation({
    summary: 'Get personalized AI-generated taglines for homepage',
  })
  async getPersonalizedBanners(@CurrentUser() user: RequestUser) {
    return this.personalizationService.getPersonalizedBanners(user.id);
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get personalized products based on Style DNA category weights',
  })
  async getPersonalizedProducts(@CurrentUser() user: RequestUser) {
    return this.personalizationService.getPersonalizedProducts(user.id);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get user preferences (theme, locale, sizes, fits)',
  })
  async getPreferences(@CurrentUser() user: RequestUser) {
    return this.styleDnaService.getOrInitializePreference(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preference details' })
  async updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      locale?: string;
      theme?: string;
      preferredSizes?: string;
      preferredFits?: string;
      notificationsEnabled?: boolean;
    },
  ) {
    return this.styleDnaService.updatePreference(user.id, body);
  }

  @Post('behavior/click')
  @ApiOperation({
    summary: 'Record click action to behavior snapshot telemetry',
  })
  async recordClick(
    @CurrentUser() user: RequestUser,
    @Body('productId') productId: string,
  ) {
    await this.styleDnaService.recordProductClick(user.id, productId);
    return { success: true };
  }

  @Post('behavior/search')
  @ApiOperation({ summary: 'Record search term to behavior snapshot' })
  async recordSearch(@CurrentUser() user: RequestUser, @Body('q') q: string) {
    await this.styleDnaService.recordSearch(user.id, q);
    return { success: true };
  }
}
