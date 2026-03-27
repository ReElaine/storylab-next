import type {
  ChapterAnalysisBundle,
  ReaderExperienceReport,
  ScenePlanItem,
  StyleReport,
  ThemeReport,
} from "../types.js";
import { ReaderExperienceCritic } from "../modules/reader-experience-critic.js";
import { createChatCompletionWithRetry, createOpenAIClient, parseJsonObjectWithRepair, resolveOpenAIConfig } from "./openai-shared.js";

export interface ReaderCriticInput {
  readonly chapterNumber: number;
  readonly chapterText: string;
  readonly scenes: ReadonlyArray<ScenePlanItem>;
  readonly characterStates: ChapterAnalysisBundle["characterStates"];
  readonly themeReport: ThemeReport;
  readonly styleReport: StyleReport;
}

export interface ReaderCriticEngine {
  readonly name: string;
  review(input: ReaderCriticInput): Promise<ReaderExperienceReport>;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown, fallback: ReadonlyArray<string>): ReadonlyArray<string> {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeReaderReport(
  value: unknown,
  fallback: ReaderExperienceReport,
): ReaderExperienceReport {
  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const report = value as Record<string, unknown>;
  const scores = typeof report.scores === "object" && report.scores !== null
    ? report.scores as Record<string, unknown>
    : {};

  return {
    chapterNumber: asNumber(report.chapterNumber, fallback.chapterNumber),
    scores: {
      hook: asNumber(scores.hook, fallback.scores.hook),
      momentum: asNumber(scores.momentum, fallback.scores.momentum),
      emotionalPeak: asNumber(scores.emotionalPeak, fallback.scores.emotionalPeak),
      suspense: asNumber(scores.suspense, fallback.scores.suspense),
      memorability: asNumber(scores.memorability, fallback.scores.memorability),
    },
    summary: asString(report.summary, fallback.summary),
    strengths: asStringArray(report.strengths, fallback.strengths),
    risks: asStringArray(report.risks, fallback.risks),
    revisionSuggestions: asStringArray(report.revisionSuggestions, fallback.revisionSuggestions),
  };
}

function buildReaderSchemaPrompt(): string {
  return [
    "你是 Storylab 的 Reader Experience Critic。",
    "你的职责不是分析设定完整性，而是像小说编辑一样评估读者体验。",
    "你必须只返回一个合法 JSON 对象，不要输出 markdown、解释、注释或代码块。",
    "",
    "返回格式：",
    "{",
    '  "chapterNumber": 1,',
    '  "scores": {',
    '    "hook": 6,',
    '    "momentum": 6,',
    '    "emotionalPeak": 6,',
    '    "suspense": 6,',
    '    "memorability": 6',
    "  },",
    '  "summary": "一句话总结读者体验",',
    '  "strengths": ["优点1", "优点2"],',
    '  "risks": ["问题1", "问题2"],',
    '  "revisionSuggestions": ["建议1", "建议2", "建议3"]',
    "}",
    "",
    "评分规则：",
    "1. 评分范围是 1-10，6 分代表最低及格线，7 分以上才算明显成立。",
    "2. hook 评估开篇抓力和结尾追读钩子。",
    "3. momentum 评估是否持续推进，是否有拖滞或说明腔。",
    "4. emotionalPeak 评估高潮是否真正击中读者，而不是只有信息变化。",
    "5. suspense 评估是否留下继续读下去的压力或疑问。",
    "6. memorability 评估是否有足够鲜明的画面、动作、对白或意象让人记住。",
    "7. strengths/risks/revisionSuggestions 必须是数组，不允许返回 null。",
    "8. revisionSuggestions 要尽量指出具体 scene 或问题类型，而不是空泛建议。",
  ].join("\n");
}

function buildReaderPrompt(input: ReaderCriticInput): string {
  return [
    `章节号: ${input.chapterNumber}`,
    "",
    "场景摘要：",
    JSON.stringify(input.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      pov: scene.pov,
      goal: scene.goal,
      conflict: scene.conflict,
      turn: scene.turn,
      result: scene.result,
      emotionalShift: scene.emotionalShift,
    })), null, 2),
    "",
    "人物状态：",
    JSON.stringify(input.characterStates, null, 2),
    "",
    "主题报告：",
    JSON.stringify(input.themeReport, null, 2),
    "",
    "风格报告：",
    JSON.stringify(input.styleReport, null, 2),
    "",
    "正文：",
    input.chapterText,
  ].join("\n");
}

export class HeuristicReaderCriticEngine implements ReaderCriticEngine {
  readonly name = "heuristic";
  private readonly critic = new ReaderExperienceCritic();

  async review(input: ReaderCriticInput): Promise<ReaderExperienceReport> {
    return this.critic.review(input.chapterNumber, input.chapterText, input.scenes);
  }
}

export class OpenAIReaderCriticEngine implements ReaderCriticEngine {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;
  private readonly heuristic = new HeuristicReaderCriticEngine();

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async review(input: ReaderCriticInput): Promise<ReaderExperienceReport> {
    const fallback = await this.heuristic.review(input);
    const response = await createChatCompletionWithRetry(this.client, {
      model: this.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildReaderSchemaPrompt(),
        },
        {
          role: "user",
          content: buildReaderPrompt(input),
        },
      ],
    }, {
      label: "reader",
      maxAttempts: 3,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      return fallback;
    }

    try {
      const parsed = parseJsonObjectWithRepair<unknown>(raw);
      return normalizeReaderReport(parsed, fallback);
    } catch {
      return fallback;
    }
  }
}

export function createReaderCriticEngineFromEnv(): ReaderCriticEngine {
  const provider = process.env.STORYLAB_READER_PROVIDER?.trim().toLowerCase()
    ?? process.env.STORYLAB_ANALYSIS_PROVIDER?.trim().toLowerCase()
    ?? "heuristic";

  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_READER") ?? resolveOpenAIConfig("STORYLAB_ANALYSIS");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_READER_PROVIDER=openai 时，必须提供 STORYLAB_READER_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIReaderCriticEngine(config);
  }

  return new HeuristicReaderCriticEngine();
}
