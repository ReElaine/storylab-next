import type { ChapterDraft, ChapterPlan, CharacterHistory, ThemeHistory } from "../types.js";
import { DraftGenerator } from "../modules/draft-generator.js";
import { createOpenAIClient, resolveOpenAIConfig } from "./openai-shared.js";

export interface DraftGenerationInput {
  readonly plan: ChapterPlan;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
}

export interface DraftWriter {
  readonly name: string;
  generate(input: DraftGenerationInput): Promise<ChapterDraft>;
}

export class HeuristicDraftWriter implements DraftWriter {
  readonly name = "heuristic";
  private readonly generator = new DraftGenerator();

  async generate(input: DraftGenerationInput): Promise<ChapterDraft> {
    return this.generator.generate(input.plan, input.characterHistory, input.themeHistory);
  }
}

function buildPrompt(input: DraftGenerationInput): string {
  const latestTheme = input.themeHistory.timeline.slice(-3);
  const latestCharacters = input.characterHistory.map((entry) => ({
    name: entry.name,
    latestState: entry.latestState,
    recentTimeline: entry.timeline.slice(-3),
  }));

  return [
    "请根据以下章节计划直接写出小说章节草稿。",
    "",
    "要求：",
    "1. 输出中文正文。",
    "2. 不要输出分析说明。",
    "3. 章节必须像小说正文，而不是提纲。",
    "4. 必须体现人物欲望、代价和关系压力。",
    "5. 必须体现主题推进。",
    "6. 保留明显的章节结尾钩子。",
    "",
    `目标章节: ${input.plan.targetChapterNumber}`,
    `章节任务: ${input.plan.chapterMission}`,
    `读者目标: ${input.plan.readerGoal}`,
    `主题意图: ${input.plan.themeIntent}`,
    `Gate 提示: ${input.plan.gateNote}`,
    "",
    "场景蓝图：",
    JSON.stringify(input.plan.sceneBlueprint, null, 2),
    "",
    "人物意图：",
    JSON.stringify(input.plan.characterIntent, null, 2),
    "",
    "最近主题历史：",
    JSON.stringify(latestTheme, null, 2),
    "",
    "最近人物历史：",
    JSON.stringify(latestCharacters, null, 2),
    "",
    "请输出格式：",
    "TITLE: <章节标题>",
    "CONTENT:",
    "<正文>",
  ].join("\n");
}

function parseLlmDraft(raw: string, fallbackChapterNumber: number): ChapterDraft {
  const titleMatch = raw.match(/TITLE:\s*(.+)/);
  const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/);
  const title = titleMatch?.[1]?.trim() || `第${fallbackChapterNumber}章`;
  const content = contentMatch?.[1]?.trim() || raw.trim();

  return {
    chapterNumber: fallbackChapterNumber,
    title,
    content,
    summary: `由 LLM 根据章节规划直接生成的第 ${fallbackChapterNumber} 章草稿。`,
    basedOnPlan: fallbackChapterNumber,
  };
}

export class OpenAIDraftWriter implements DraftWriter {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async generate(input: DraftGenerationInput): Promise<ChapterDraft> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            "你是一个中文小说章节生成器。你的任务不是解释计划，而是把计划写成具有场景感、人物张力和悬念的小说正文。",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error("LLM returned empty chapter draft");
    }

    return parseLlmDraft(raw, input.plan.targetChapterNumber);
  }
}

export function createDraftWriterFromEnv(): DraftWriter {
  const provider = process.env.STORYLAB_DRAFT_PROVIDER?.trim().toLowerCase() ?? "heuristic";
  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_DRAFT");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_DRAFT_PROVIDER=openai 时，必须提供 STORYLAB_DRAFT_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIDraftWriter(config);
  }

  return new HeuristicDraftWriter();
}
