import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Any OpenAI-compatible API works: OpenAI, OpenRouter, Google Gemini, Groq, a local Ollama, ...
// Configure via environment variables:
//   AI_API_KEY   (required) API key of the provider
//   AI_BASE_URL  (optional) defaults to Google Gemini, which has a free tier
//   AI_MODEL     (optional) defaults to gemini-flash-latest; must support images for the diagnose chat
export function getAiModel() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY missing");

  const provider = createOpenAICompatible({
    name: "ai",
    baseURL: process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
  });
  return provider(process.env.AI_MODEL || "gemini-flash-latest");
}
