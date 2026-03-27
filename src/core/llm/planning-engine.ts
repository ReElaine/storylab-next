import type {
  ChapterPlan,
  ChapterSummaryRecord,
  CharacterHistory,
  ChronologyLedger,
  HumanGate,
  OpenLoopsLedger,
  StoryMemory,
  StyleGuide,
  ThemeHistory,
} from "../types.js";
import { ChapterPlanner } from "../modules/chapter-planner.js";
import { createChatCompletionWithRetry, createOpenAIClient, extractJsonObject, resolveOpenAIConfig } from "./openai-shared.js";

export interface PlanningInput {
  readonly targetChapterNumber: number;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
  readonly memory: StoryMemory;
  readonly chapterSummaries: ReadonlyArray<ChapterSummaryRecord>;
  readonly chronology: ChronologyLedger;
  readonly openLoops: OpenLoopsLedger;
  readonly gates: ReadonlyArray<HumanGate>;
  readonly styleGuide: StyleGuide;
}

export interface PlanningEngine {
  readonly name: string;
  plan(input: PlanningInput): Promise<ChapterPlan>;
}

export class HeuristicPlanningEngine implements PlanningEngine {
  readonly name = "heuristic";
  private readonly planner = new ChapterPlanner();

  async plan(input: PlanningInput): Promise<ChapterPlan> {
    return this.planner.planNextChapter(
      input.targetChapterNumber,
      input.characterHistory,
      input.themeHistory,
      input.memory,
      input.chapterSummaries,
      input.chronology,
      input.openLoops,
      input.gates,
      input.styleGuide,
    );
  }
}

export class OpenAIPlanningEngine implements PlanningEngine {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;
  private readonly heuristic = new HeuristicPlanningEngine();

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async plan(input: PlanningInput): Promise<ChapterPlan> {
    const fallback = await this.heuristic.plan(input);
    const response = await createChatCompletionWithRetry(this.client, {
      model: this.model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是小说章节规划器。请根据跨章状态生成下一章计划，只输出 JSON，不要解释。",
        },
        {
          role: "user",
          content: [
            `目标章节: ${input.targetChapterNumber}`,
            "人物历史：",
            JSON.stringify(input.characterHistory, null, 2),
            "",
            "主题历史：",
            JSON.stringify(input.themeHistory, null, 2),
            "",
            "story memory：",
            JSON.stringify(input.memory, null, 2),
            "",
            "recent chapter summaries：",
            JSON.stringify(input.chapterSummaries, null, 2),
            "",
            "chronology：",
            JSON.stringify(input.chronology, null, 2),
            "",
            "open loops：",
            JSON.stringify(input.openLoops, null, 2),
            "",
            "human gates：",
            JSON.stringify(input.gates, null, 2),
            "",
            "style guide：",
            JSON.stringify(input.styleGuide, null, 2),
            "",
            "请输出符合 ChapterPlan 的 JSON，必须包含：",
            "targetChapterNumber, chapterMission, readerGoal, sceneBlueprint, characterIntent, themeIntent, thematicQuestion, styleProfile, gateNote",
          ].join("\n"),
        },
      ],
    }, {
      label: "planner",
      maxAttempts: 3,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error("LLM returned empty chapter plan");
    }

    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<ChapterPlan>;
    return {
      targetChapterNumber: parsed.targetChapterNumber ?? fallback.targetChapterNumber,
      chapterMission: parsed.chapterMission ?? fallback.chapterMission,
      readerGoal: parsed.readerGoal ?? fallback.readerGoal,
      sceneBlueprint: parsed.sceneBlueprint ?? fallback.sceneBlueprint,
      characterIntent: parsed.characterIntent ?? fallback.characterIntent,
      themeIntent: parsed.themeIntent ?? fallback.themeIntent,
      thematicQuestion: parsed.thematicQuestion ?? fallback.thematicQuestion,
      styleProfile: parsed.styleProfile ?? fallback.styleProfile,
      gateNote: parsed.gateNote ?? fallback.gateNote,
    };
  }
}

export function createPlanningEngineFromEnv(): PlanningEngine {
  const provider = process.env.STORYLAB_PLANNER_PROVIDER?.trim().toLowerCase() ?? "heuristic";
  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_PLANNER");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_PLANNER_PROVIDER=openai 时，必须提供 STORYLAB_PLANNER_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIPlanningEngine(config);
  }

  return new HeuristicPlanningEngine();
}
