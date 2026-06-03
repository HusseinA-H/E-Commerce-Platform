import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { GroqVisionAdapter } from './interfaces/groq-vision-adapter';
import { PromptRegistry } from './prompt-builders/prompt-registry';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutfitAnalysisService {
  private readonly logger = new Logger(OutfitAnalysisService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly groqVisionAdapter: GroqVisionAdapter,
    private readonly promptRegistry: PromptRegistry,
    private readonly prisma: PrismaService,
  ) {}

  async analyzeOutfit(
    files: Express.Multer.File[],
    userId?: string,
    personaKey?: string,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No outfit files provided for analysis');
    }

    this.logger.log(
      `Analyzing outfit containing ${files.length} image(s) for user ${userId || 'anonymous'}`,
    );

    // 1. Upload files to Cloudinary
    const uploadPromises = files.map((file) =>
      this.cloudinaryService.uploadFile(file, 'apexluxe/stylist'),
    );
    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((res) => res.url);
    const imageUrlStr = imageUrls.join(',');

    // 2. Fetch Prompt from Registry
    const prompt = this.promptRegistry.getAnalysisPrompt(personaKey);

    // 3. Vision Analysis
    const primaryImageUrl = imageUrls[0];
    const rawAnalysis = await this.groqVisionAdapter.analyzeOutfitImage(
      primaryImageUrl,
      prompt,
    );

    // 4. Weighted Scoring (Ensure clapped 0-100)
    const calculatedScore = Math.max(
      0,
      Math.min(100, Number(rawAnalysis.overallScore) || 85),
    );

    // 5. Store in database
    const analysis = await this.prisma.outfitAnalysis.create({
      data: {
        userId: userId || null,
        imageUrl: imageUrlStr,
        overallScore: calculatedScore,
        styleCategory: rawAnalysis.styleCategory || 'Athletic Techwear',
        outfitSummary:
          rawAnalysis.outfitSummary || 'A coordinated active setup.',
        strengths: JSON.stringify(rawAnalysis.strengths || []),
        weaknesses: JSON.stringify(rawAnalysis.weaknesses || []),
        detectedColors: JSON.stringify(rawAnalysis.detectedColors || []),
        fitAnalysis:
          rawAnalysis.fitAnalysis || 'Athletic slim-fit proportioning.',
        confidenceScore: rawAnalysis.confidenceScore || 90,
        aestheticType:
          rawAnalysis.aestheticType || 'Minimalist High-Performance',
        sportwearCompatibility:
          rawAnalysis.sportwearCompatibility || 'Optimized for cross-training.',
        layeringAnalysis:
          rawAnalysis.layeringAnalysis ||
          'Base layers coordinate with shell details.',
        recommendedImprovements: JSON.stringify(
          rawAnalysis.recommendedImprovements || [],
        ),
      },
    });

    return {
      ...rawAnalysis,
      id: analysis.id,
      imageUrls,
      overallScore: calculatedScore,
      createdAt: analysis.createdAt,
    };
  }

  async getUserHistory(userId: string) {
    const list = await this.prisma.outfitAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        recommendations: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return list.map((item) => ({
      ...item,
      strengths: this.safeParseJson(item.strengths),
      weaknesses: this.safeParseJson(item.weaknesses),
      detectedColors: this.safeParseJson(item.detectedColors),
      recommendedImprovements: this.safeParseJson(item.recommendedImprovements),
      imageUrls: item.imageUrl.split(','),
    }));
  }

  async getAnalysisById(id: string) {
    const item = await this.prisma.outfitAnalysis.findUnique({
      where: { id },
      include: {
        recommendations: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!item) return null;

    return {
      ...item,
      strengths: this.safeParseJson(item.strengths),
      weaknesses: this.safeParseJson(item.weaknesses),
      detectedColors: this.safeParseJson(item.detectedColors),
      recommendedImprovements: this.safeParseJson(item.recommendedImprovements),
      imageUrls: item.imageUrl.split(','),
    };
  }

  private safeParseJson(data: string): string[] {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}
