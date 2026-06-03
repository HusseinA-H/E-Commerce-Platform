import { Logger } from '@nestjs/common';

const logger = new Logger('JsonCleaner');

/**
 * Safely removes markdown JSON wrappers and backticks from LLM output.
 */
export function cleanJsonString(raw: string): string {
  if (!raw) return '';
  const rawLength = raw.length;
  let cleaned = raw.trim();

  // Strip Markdown Code Blocks
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/```\s*$/, '');

  // Strip single backticks
  cleaned = cleaned.replace(/^`json\s*/i, '');
  cleaned = cleaned.replace(/^`\s*/, '');
  cleaned = cleaned.replace(/`\s*$/, '');

  cleaned = cleaned.trim();
  logger.log(
    `Sanitized LLM output. Raw length: ${rawLength} | Cleaned length: ${cleaned.length}`,
  );
  return cleaned;
}
