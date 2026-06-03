export interface VisionAnalysisResult {
  overallScore: number;
  styleCategory: string;
  outfitSummary: string;
  strengths: string[];
  weaknesses: string[];
  detectedColors: string[];
  fitAnalysis: string;
  confidenceScore: number;
  aestheticType: string;
  sportwearCompatibility: string;
  layeringAnalysis: string;
  recommendedImprovements: string[];
}

export interface VisionProviderAdapter {
  analyzeOutfitImage(
    imageUrl: string,
    prompt: string,
  ): Promise<VisionAnalysisResult>;
}
