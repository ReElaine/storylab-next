import OpenAI from "openai";

export interface OpenAIWriterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
}

export function createOpenAIClient(config: OpenAIWriterConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
}

export function resolveOpenAIConfig(prefix: string): OpenAIWriterConfig | null {
  const normalized = prefix.trim().toUpperCase();
  const apiKey =
    process.env[`${normalized}_OPENAI_API_KEY`]?.trim() ??
    process.env.STORYLAB_OPENAI_API_KEY?.trim();
  const model =
    process.env[`${normalized}_OPENAI_MODEL`]?.trim() ??
    process.env.STORYLAB_OPENAI_MODEL?.trim();
  const baseUrl =
    process.env[`${normalized}_OPENAI_BASE_URL`]?.trim() ??
    process.env.STORYLAB_OPENAI_BASE_URL?.trim();

  if (!apiKey || !model) {
    return null;
  }

  return {
    apiKey,
    model,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end >= start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("No JSON object found in model response");
}
