import type {
  ChapterPlan,
  CharacterHistory,
  HumanGate,
  StoryMemory,
  ThemeHistory,
} from "../types.js";
import { ChapterPlanner } from "../modules/chapter-planner.js";
import { createOpenAIClient, extractJsonObject, resolveOpenAIConfig } from "./openai-shared.js";

export interface PlanningInput {
  readonly targetChapterNumber: number;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
  readonly memory: StoryMemory;
  readonly gates: ReadonlyArray<HumanGate>;
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
      input.gates,
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
    const response = await this.client.chat.completions.create({
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
            "human gates：",
            JSON.stringify(input.gates, null, 2),
            "",
            "请输出符合 ChapterPlan 的 JSON，必须包含：",
            "targetChapterNumber, chapterMission, readerGoal, sceneBlueprint, characterIntent, themeIntent, gateNote",
          ].join("\n"),
        },
      ],
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
