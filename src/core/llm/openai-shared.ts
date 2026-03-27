import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

export interface OpenAIWriterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
}

interface LocalLLMConfig {
  readonly provider?: string;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly models?: Partial<Record<"analysis" | "reader" | "planner" | "draft" | "writer" | "revise", ReadonlyArray<string>>>;
}

export function createOpenAIClient(config: OpenAIWriterConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs ?? 120_000,
    maxRetries: 0,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
}

function loadLocalLLMConfig(): LocalLLMConfig | null {
  const configPath = join(process.cwd(), "config", "llm.local.json");
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as LocalLLMConfig;
  } catch {
    return null;
  }
}

function resolveLocalModel(normalizedPrefix: string, config: LocalLLMConfig | null): string | undefined {
  const key = normalizedPrefix.replace(/^STORYLAB_/, "").replace(/_OPENAI$/, "").toLowerCase();
  const bucket = key === "analysis" || key === "reader" || key === "planner" || key === "draft" || key === "writer" || key === "revise"
    ? config?.models?.[key]
    : undefined;

  return (
    bucket?.[0]?.trim() ||
    config?.models?.writer?.[0]?.trim() ||
    config?.models?.reader?.[0]?.trim() ||
    config?.models?.draft?.[0]?.trim() ||
    config?.models?.revise?.[0]?.trim() ||
    config?.models?.analysis?.[0]?.trim()
  );
}

export function resolveOpenAIConfig(prefix: string): OpenAIWriterConfig | null {
  const normalized = prefix.trim().toUpperCase();
  const localConfig = loadLocalLLMConfig();
  const apiKey =
    process.env[`${normalized}_OPENAI_API_KEY`]?.trim() ??
    process.env.STORYLAB_OPENAI_API_KEY?.trim() ??
    localConfig?.apiKey?.trim();
  const model =
    process.env[`${normalized}_OPENAI_MODEL`]?.trim() ??
    process.env.STORYLAB_OPENAI_MODEL?.trim() ??
    resolveLocalModel(normalized, localConfig);
  const baseUrl =
    process.env[`${normalized}_OPENAI_BASE_URL`]?.trim() ??
    process.env.STORYLAB_OPENAI_BASE_URL?.trim() ??
    localConfig?.baseUrl?.trim();
  const timeoutMsRaw =
    process.env[`${normalized}_OPENAI_TIMEOUT_MS`]?.trim() ??
    process.env.STORYLAB_OPENAI_TIMEOUT_MS?.trim() ??
    (typeof localConfig?.timeoutMs === "number" ? String(localConfig.timeoutMs) : undefined);
  const maxAttemptsRaw =
    process.env[`${normalized}_OPENAI_MAX_ATTEMPTS`]?.trim() ??
    process.env.STORYLAB_OPENAI_MAX_ATTEMPTS?.trim() ??
    (typeof localConfig?.maxAttempts === "number" ? String(localConfig.maxAttempts) : undefined);

  if (!apiKey || !model) {
    return null;
  }

  const timeoutMs = timeoutMsRaw ? Number.parseInt(timeoutMsRaw, 10) : 120_000;
  const maxAttempts = maxAttemptsRaw ? Number.parseInt(maxAttemptsRaw, 10) : 3;

  return {
    apiKey,
    model,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 120_000,
    maxAttempts: Number.isFinite(maxAttempts) ? Math.max(1, maxAttempts) : 3,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientOpenAIError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = Number((error as { status?: unknown }).status);
  const code = String((error as { code?: unknown }).code ?? "");
  const name = error.name ?? "";
  const message = error.message ?? "";

  if (Number.isFinite(status) && (status === 408 || status === 409 || status === 429 || status >= 500)) {
    return true;
  }

  return (
    /timeout/i.test(name) ||
    /timed out/i.test(message) ||
    /ECONNRESET/i.test(code) ||
    /ETIMEDOUT/i.test(code) ||
    /connection/i.test(message)
  );
}

export async function createChatCompletionWithRetry(
  client: OpenAI,
  request: ChatCompletionCreateParamsNonStreaming,
  options?: { label?: string; maxAttempts?: number },
): Promise<ChatCompletion> {
  const label = options?.label ?? "llm";
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await client.chat.completions.create(request);
    } catch (error) {
      lastError = error;
      const retryable = isTransientOpenAIError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const delayMs = 1_500 * attempt;
      process.stderr.write(`[storylab][retry] ${label} 第 ${attempt} 次失败，${delayMs}ms 后重试：${error instanceof Error ? error.message : String(error)}\n`);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI request failed");
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

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu, "");
}

function removeTrailingCommas(value: string): string {
  return value.replace(/,\s*([}\]])/gu, "$1");
}

function insertMissingPropertyCommas(value: string): string {
  return value
    .replace(/("|\]|\})\s*\n\s*(")([^"]+?)"\s*:/gu, '$1,\n  $2$3":')
    .replace(/("|\]|\})\s*(")([^"]+?)"\s*:/gu, '$1, $2$3":');
}

function normalizeCommonPunctuation(value: string): string {
  return value
    .replace(/\u201c|\u201d/gu, '"')
    .replace(/\u2018|\u2019/gu, "'");
}

function buildJsonRepairCandidates(raw: string): ReadonlyArray<string> {
  const extracted = extractJsonObject(raw);
  const base = stripControlCharacters(normalizeCommonPunctuation(extracted)).trim();
  const candidates = new Set<string>([base]);
  candidates.add(removeTrailingCommas(base));
  candidates.add(insertMissingPropertyCommas(base));
  candidates.add(removeTrailingCommas(insertMissingPropertyCommas(base)));
  return Array.from(candidates).filter((entry) => entry.length > 0);
}

export function parseJsonObjectWithRepair<T>(raw: string): T {
  const candidates = buildJsonRepairCandidates(raw);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to parse JSON model response");
}
