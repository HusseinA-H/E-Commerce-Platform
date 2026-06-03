import { Injectable } from '@nestjs/common';
import { EmbeddingProvider } from './embedding.provider';

/**
 * TextEmbeddingProvider — In-process text embedding using TF-IDF-style weighted hashing.
 *
 * Produces a 128-dimensional vector from text without any external API calls.
 * Deterministic: same text always produces the same vector.
 * Suitable for cosine similarity ranking over product metadata fields.
 *
 * Future migration path:
 *   - Replace embed() body with OpenAI text-embedding-3-small API call
 *   - Or swap to Groq embedding endpoint when available
 *   - Vector dimension stays configurable via VECTOR_DIM env var
 */
@Injectable()
export class TextEmbeddingProvider implements EmbeddingProvider {
  private readonly DIM = 128;

  // Commerce-domain vocabulary weights — terms that are more discriminative
  // in sportswear commerce get higher base weight amplification
  private readonly DOMAIN_WEIGHTS: Record<string, number> = {
    compression: 3.0,
    thermal: 2.5,
    waterproof: 2.5,
    windproof: 2.5,
    breathable: 2.0,
    lightweight: 2.0,
    moisture: 2.0,
    wicking: 2.0,
    athletic: 1.8,
    performance: 1.8,
    minimalist: 1.8,
    luxury: 1.8,
    running: 1.6,
    training: 1.6,
    outerwear: 1.6,
    slim: 1.5,
    tapered: 1.5,
    boxy: 1.5,
    oversized: 1.5,
    black: 1.3,
    onyx: 1.3,
    slate: 1.3,
    volt: 1.3,
    monochrome: 1.3,
    hoodie: 1.2,
    jacket: 1.2,
    jogger: 1.2,
    sneaker: 1.2,
    top: 1.1,
    bottom: 1.1,
  };

  /**
   * Embed a text string into a 128-dimensional float vector using:
   * 1. Tokenization (lowercase + split on non-alphanumeric)
   * 2. Per-token domain-weighted hash projection into vector space
   * 3. L2 normalization (unit vector for cosine similarity)
   */
  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const vector = new Float64Array(this.DIM).fill(0);

    for (const token of tokens) {
      const weight = this.DOMAIN_WEIGHTS[token] ?? 1.0;
      const positions = this.hashToken(token);
      for (const [pos, val] of positions) {
        vector[pos] += val * weight;
      }
    }

    return this.l2Normalize(Array.from(vector));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  /**
   * Projects a token into multiple vector positions using two independent
   * polynomial rolling hash functions to minimize collisions.
   */
  private hashToken(token: string): [number, number][] {
    const results: [number, number][] = [];
    let h1 = 5381;
    let h2 = 0;

    for (let i = 0; i < token.length; i++) {
      const c = token.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c) & 0xffffffff;
      h2 = ((h2 << 7) ^ c ^ (h2 >> 3)) & 0xffffffff;
    }

    const pos1 = Math.abs(h1) % this.DIM;
    const pos2 = Math.abs(h2) % this.DIM;
    const val1 = ((h1 & 0x1) === 0 ? 1 : -1) * (1 + (Math.abs(h1) % 3) * 0.5);
    const val2 = ((h2 & 0x1) === 0 ? 1 : -1) * (1 + (Math.abs(h2) % 3) * 0.5);

    results.push([pos1, val1]);
    if (pos1 !== pos2) {
      results.push([pos2, val2]);
    }

    return results;
  }

  private l2Normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }
}
