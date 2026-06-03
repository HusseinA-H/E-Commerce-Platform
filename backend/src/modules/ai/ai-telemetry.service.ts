import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as client from 'prom-client';

// Prometheus metrics for AI Monitoring
const aiRequestsTotal = new client.Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI queries executed.',
  labelNames: ['model', 'action', 'status'],
});

const aiRequestDuration = new client.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Latency of AI API request executions in seconds.',
  labelNames: ['model', 'action', 'status'],
  buckets: [0.1, 0.5, 1, 2, 4, 8, 15, 30],
});

const aiTokensTotal = new client.Counter({
  name: 'ai_tokens_total',
  help: 'Total input/output tokens consumed by AI services.',
  labelNames: ['model', 'action', 'token_type'],
});

const aiCostTotal = new client.Counter({
  name: 'ai_cost_usd_total',
  help: 'Total estimated USD cost of AI requests.',
  labelNames: ['model', 'action'],
});

@Injectable()
export class AiTelemetryService {
  private readonly logger = new Logger(AiTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tracks and stores metrics from an AI query invocation.
   */
  async logQuery(params: {
    modelName: string;
    action: string;
    promptTokens: number;
    completionTokens: number;
    latencySeconds: number;
    status: 'success' | 'failed';
    errorMessage?: string;
    cacheHit?: boolean;
  }) {
    const {
      modelName,
      action,
      promptTokens,
      completionTokens,
      latencySeconds,
      status,
      errorMessage = null,
      cacheHit = false,
    } = params;

    const totalTokens = promptTokens + completionTokens;
    const costUsd = cacheHit
      ? 0
      : this.calculateCost(modelName, promptTokens, completionTokens);

    // 1. Log to database
    try {
      await this.prisma.aiTelemetry.create({
        data: {
          modelName,
          action,
          promptTokens,
          completionTokens,
          totalTokens,
          latencySeconds,
          costUsd,
          status,
          errorMessage,
          cacheHit,
        },
      });
    } catch (e: any) {
      this.logger.error(
        `Failed to write AI telemetry log to Database: ${e.message}`,
      );
    }

    // 2. Increment Prometheus stats
    try {
      aiRequestsTotal.inc({ model: modelName, action, status });
      aiRequestDuration.observe(
        { model: modelName, action, status },
        latencySeconds,
      );

      aiTokensTotal.inc(
        { model: modelName, action, token_type: 'prompt' },
        promptTokens,
      );
      aiTokensTotal.inc(
        { model: modelName, action, token_type: 'completion' },
        completionTokens,
      );
      aiCostTotal.inc({ model: modelName, action }, costUsd);
    } catch (e: any) {
      this.logger.error(
        `Failed to register AI telemetry metrics in Prometheus: ${e.message}`,
      );
    }
  }

  /**
   * Estimated pricing rules for Groq LLMs (per 1 Million tokens)
   */
  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const lowercaseModel = model.toLowerCase();

    let promptRate = 0.05; // $0.05 / 1M tokens default (Llama3 8B)
    let completionRate = 0.08; // $0.08 / 1M tokens default (Llama3 8B)

    if (
      lowercaseModel.includes('70b') ||
      lowercaseModel.includes('llama3-70b')
    ) {
      promptRate = 0.59; // $0.59 / 1M tokens
      completionRate = 0.79; // $0.79 / 1M tokens
    } else if (
      lowercaseModel.includes('vision') ||
      lowercaseModel.includes('11b')
    ) {
      promptRate = 0.15; // $0.15 / 1M tokens
      completionRate = 0.15; // $0.15 / 1M tokens
    } else if (
      lowercaseModel.includes('mixtral') ||
      lowercaseModel.includes('8x7b')
    ) {
      promptRate = 0.24;
      completionRate = 0.24;
    }

    const promptCost = (promptTokens / 1_000_000) * promptRate;
    const completionCost = (completionTokens / 1_000_000) * completionRate;

    return parseFloat((promptCost + completionCost).toFixed(6));
  }

  /**
   * Aggregates AI stats for admin dashboards
   */
  async getAiMetricsSummary() {
    const totalRequests = await this.prisma.aiTelemetry.count();
    const successes = await this.prisma.aiTelemetry.count({
      where: { status: 'success' },
    });
    const failures = await this.prisma.aiTelemetry.count({
      where: { status: 'failed' },
    });

    const totalSum = await this.prisma.aiTelemetry.aggregate({
      _sum: {
        totalTokens: true,
        costUsd: true,
      },
      _avg: {
        latencySeconds: true,
      },
    });

    // Grouping by action to see which features consume most tokens/budget
    const usageByAction = await this.prisma.aiTelemetry.groupBy({
      by: ['action'],
      _count: { id: true },
      _sum: { totalTokens: true, costUsd: true },
      _avg: { latencySeconds: true },
    });

    // Grouping by status to monitor health
    const usageByModel = await this.prisma.aiTelemetry.groupBy({
      by: ['modelName'],
      _count: { id: true },
      _sum: { totalTokens: true, costUsd: true },
    });

    const cacheHitsCount = await this.prisma.aiTelemetry.count({
      where: { cacheHit: true },
    });

    return {
      totalRequests,
      successRate:
        totalRequests > 0
          ? parseFloat(((successes / totalRequests) * 100).toFixed(2))
          : 100,
      failureCount: failures,
      totalTokens: totalSum._sum.totalTokens || 0,
      totalCostUsd: parseFloat((totalSum._sum.costUsd || 0).toFixed(4)),
      averageLatencySeconds: parseFloat(
        (totalSum._avg.latencySeconds || 0).toFixed(2),
      ),
      cacheHits: cacheHitsCount,
      cacheHitRate:
        totalRequests > 0
          ? parseFloat(((cacheHitsCount / totalRequests) * 100).toFixed(2))
          : 0,
      metricsByAction: usageByAction.map((u) => ({
        action: u.action,
        count: u._count.id,
        tokens: u._sum.totalTokens || 0,
        cost: parseFloat((u._sum.costUsd || 0).toFixed(4)),
        latency: parseFloat((u._avg.latencySeconds || 0).toFixed(2)),
      })),
      metricsByModel: usageByModel.map((m) => ({
        model: m.modelName,
        count: m._count.id,
        tokens: m._sum.totalTokens || 0,
        cost: parseFloat((m._sum.costUsd || 0).toFixed(4)),
      })),
    };
  }
}
