import { env } from '@/lib/env';
import { claudeExtractProvider } from './claude';
import { ruleExtractProvider } from './rule';
import type { ExtractProvider, ExtractResult } from './types';

export type { ExtractProvider, ExtractResult };
export { extractWithRules } from './rule';

/** ANTHROPIC_API_KEY があれば Claude、無ければルールベース。 */
export function getExtractProvider(): ExtractProvider {
  return env.anthropicKey ? claudeExtractProvider : ruleExtractProvider;
}

export async function extractSpots(text: string): Promise<ExtractResult> {
  return getExtractProvider().extract(text);
}
