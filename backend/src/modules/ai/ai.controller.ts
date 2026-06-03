import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiTelemetryService } from './ai-telemetry.service';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiTelemetryService: AiTelemetryService,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Send message thread to the APEX AI Stylist chatbot',
  })
  async chat(@Body() dto: AssistantQueryDto) {
    const text = await this.aiService.getChatbotResponse(dto.messages);
    return { text };
  }

  @Post('outfit')
  @ApiOperation({
    summary: 'Request curated outfit styling recommendation by theme',
  })
  async getOutfit(@Body('theme') theme: string) {
    return this.aiService.generateOutfit(theme || 'training');
  }

  @Get('search-parse')
  @ApiOperation({
    summary: 'Parse natural language search phrases into structured filters',
  })
  async parseSearch(@Query('q') q: string) {
    return this.aiService.parseSemanticSearch(q || '');
  }

  @Get('reviews-summary/:productId')
  @ApiOperation({
    summary: 'Retrieve AI review sentiment summary for a product',
  })
  async summarizeReviews(@Param('productId') productId: string) {
    const summary = await this.aiService.summarizeProductReviews(productId);
    return { summary };
  }

  // --- Phase B.1: Smart Catalog Intelligence Routes ---

  @Post('catalog/enrich')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Trigger background bulk catalog AI metadata enrichment queue',
  })
  async runBulkEnrichment() {
    return this.aiService.runBulkEnrichment();
  }

  @Post('catalog/enrich/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Trigger AI metadata enrichment for a single product',
  })
  async enrichSingle(@Param('id') id: string) {
    return this.aiService.enrichProduct(id);
  }

  @Get('catalog/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Get the catalog AI enrichment statistics and progress status',
  })
  async getEnrichmentStatus() {
    return this.aiService.getEnrichmentStatus();
  }

  @Get('products/semantic-search')
  @ApiOperation({
    summary: 'Perform storefront natural language semantic search',
  })
  async semanticSearch(@Query('q') q: string) {
    return this.aiService.semanticSearch(q || '');
  }

  @Get('products/:id/compatible-outfits')
  @ApiOperation({
    summary: 'Get dynamically recommended compatible outfits for a product',
  })
  async getCompatibleOutfits(@Param('id') id: string) {
    return this.aiService.getCompatibleOutfits(id);
  }

  @Get('telemetry')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Get AI telemetry statistics and budget/cost metrics',
  })
  async getTelemetry() {
    return this.aiTelemetryService.getAiMetricsSummary();
  }
}
