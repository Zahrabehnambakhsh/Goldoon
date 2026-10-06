import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

// Google's OpenAI-compatible endpoint; works with a Gemini API key from aistudio.google.com.
const DEFAULT_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_AI_MODEL = "gemini-2.5-flash";

/**
 * Picks the AI model from the environment.
 * - AI_API_KEY set: any OpenAI-compatible provider (AI_BASE_URL / AI_MODEL override the Gemini defaults).
 * - otherwise LOVABLE_API_KEY: Lovable's AI gateway (only available when hosted on Lovable).
 */
export function getAiModel() {
  const apiKey = process.env.AI_API_KEY;
  if (apiKey) {
    const provider = createOpenAICompatible({
      name: "custom",
      baseURL: process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL,
      apiKey,
    });
    return provider(process.env.AI_MODEL || DEFAULT_AI_MODEL);
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return createLovableAiGatewayProvider(lovableKey)("google/gemini-3.6-flash");
  }

  throw new Error("کلید هوش مصنوعی تنظیم نشده (AI_API_KEY یا LOVABLE_API_KEY)");
}
