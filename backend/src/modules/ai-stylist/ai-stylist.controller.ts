import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AiStylistService } from './ai-stylist.service';
import { OutfitAnalysisService } from './outfit-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/user.decorator';

@ApiTags('ai-stylist')
@Controller('ai-stylist')
export class AiStylistController {
  constructor(
    private readonly stylistService: AiStylistService,
    private readonly analysisService: OutfitAnalysisService,
  ) {}

  @Post('analyze')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiOperation({
    summary:
      'Upload outfit images and get full AI analysis & product recommendations',
  })
  async analyzeOutfit(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit per file
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|webp|gif)' }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body('personaKey') personaKey?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.stylistService.orchestrateAnalysis(files, user?.id, personaKey);
  }

  @Post('generate-outfit')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Generate a complete new sportswear outfit from the catalog',
  })
  async generateOutfit(
    @Body('outfitType') outfitType: string,
    @Body('personaKey') personaKey?: string,
  ) {
    return this.stylistService.generateOutfitWithCache(outfitType, personaKey);
  }

  @Post('chat')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Send a conversational message to the AI Stylist Assistant',
  })
  async sendMessage(
    @Body('sessionId') sessionId: string,
    @Body('content') content: string,
    @Body('personaKey') personaKey?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.stylistService.sendMessageToChatSession(
      sessionId,
      content,
      user?.id,
      personaKey,
    );
  }

  @Get('chat/:sessionId')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Fetch message history for an AI Stylist chat session',
  })
  async getChatHistory(@Param('sessionId') sessionId: string) {
    return this.stylistService.getChatHistory(sessionId);
  }

  @Post('save')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save an outfit analysis to profile' })
  async saveOutfit(
    @Body('analysisId') analysisId: string,
    @Body('name') name: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.stylistService.saveOutfit(user.id, analysisId, name);
  }

  @Get('saved')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve user saved outfits' })
  async getSavedOutfits(@CurrentUser() user: RequestUser) {
    return this.stylistService.getSavedOutfits(user.id);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve user outfit analysis history' })
  async getUserHistory(@CurrentUser() user: RequestUser) {
    return this.analysisService.getUserHistory(user.id);
  }

  @Get('analysis/:id')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get details of a single outfit analysis' })
  async getAnalysisById(@Param('id') id: string) {
    return this.analysisService.getAnalysisById(id);
  }

  @Get('admin/analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Fetch AI Stylist platform usage analytics' })
  async getAdminAnalytics() {
    return this.stylistService.getAdminAnalytics();
  }
}
