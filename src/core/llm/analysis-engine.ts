import type {
  ChapterAnalysisBundle,
  CharacterSeed,
  HumanGate,
  ScenePlanItem,
  StyleGuide,
  ThemeSeed,
} from "../types.js";
import { CharacterEngine } from "../modules/character-engine.js";
import { HumanReviewGatekeeper } from "../modules/human-review-gates.js";
import { ReaderExperienceCritic } from "../modules/reader-experience-critic.js";
import { ScenePlanner } from "../modules/scene-planner.js";
import { StyleEngine } from "../modules/style-engine.js";
import { ThemeTracker } from "../modules/theme-tracker.js";
import { buildRevisionBrief } from "../modules/revision-brief.js";
import { createOpenAIClient, extractJsonObject, resolveOpenAIConfig } from "./openai-shared.js";

export interface AnalysisInput {
  readonly chapterNumber: number;
  readonly chapterText: string;
  readonly characterSeeds: ReadonlyArray<CharacterSeed>;
  readonly themeSeeds: ReadonlyArray<ThemeSeed>;
  readonly styleGuide: StyleGuide;
  readonly gates: ReadonlyArray<HumanGate>;
}

export interface AnalysisEngine {
  readonly name: string;
  analyze(input: AnalysisInput): Promise<ChapterAnalysisBundle>;
}

export class HeuristicAnalysisEngine implements AnalysisEngine {
  readonly name = "heuristic";
  private readonly scenePlanner = new ScenePlanner();
  private readonly characterEngine = new CharacterEngine();
  private readonly themeTracker = new ThemeTracker();
  private readonly styleEngine = new StyleEngine();
  private readonly readerCritic = new ReaderExperienceCritic();
  private readonly gatekeeper = new HumanReviewGatekeeper();

  async analyze(input: AnalysisInput): Promise<ChapterAnalysisBundle> {
    const scenes = this.scenePlanner.plan(input.chapterText);
    const characterStates = this.characterEngine.update(input.chapterText, input.characterSeeds);
    const themeReport = this.themeTracker.evaluate(input.chapterNumber, input.chapterText, input.themeSeeds);
    const styleReport = this.styleEngine.inspect(input.chapterText, input.styleGuide);
    const readerReport = this.readerCritic.review(input.chapterNumber, input.chapterText, scenes);
    const gateDecision = this.gatekeeper.decide(input.chapterNumber, input.gates);
    const revisionBrief = buildRevisionBrief({
      chapterNumber: input.chapterNumber,
      readerReport,
      characterStates,
      themeReport,
    });

    return {
      scenes,
      characterStates,
      themeReport,
      styleReport,
      readerReport,
      gateDecision,
      revisionBrief,
    };
  }
}

function normalizeScenes(raw: ReadonlyArray<ScenePlanItem>, chapterText: string): ReadonlyArray<ScenePlanItem> {
  if (raw.length > 0) {
    return raw;
  }

  return [
    {
      sceneId: "scene-1",
      sceneAnchor: "scene-1-未明",
      sceneNumber: 1,
      pov: "未明",
      goal: "从章节正文中提取场景目标",
      conflict: "从章节正文中提取核心冲突",
      turn: "从章节正文中提取转折",
      result: "从章节正文中提取结果",
      newInformation: [],
      emotionalShift: "待补充",
      sourceParagraphs: chapterText.split(/\r?\n/u).filter((line) => line.trim().length > 0).slice(0, 3),
    },
  ];
}

export class OpenAIAnalysisEngine implements AnalysisEngine {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;
  private readonly heuristic = new HeuristicAnalysisEngine();
  private readonly gatekeeper = new HumanReviewGatekeeper();

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async analyze(input: AnalysisInput): Promise<ChapterAnalysisBundle> {
    const heuristic = await this.heuristic.analyze(input);
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是小说章节分析器。请基于章节正文输出 JSON，关注场景结构、人物状态、主题推进、风格表现、读者体验，不要输出解释性文本。",
        },
        {
          role: "user",
          content: [
            `章节号: ${input.chapterNumber}`,
            "角色种子：",
            JSON.stringify(input.characterSeeds, null, 2),
            "",
            "主题种子：",
            JSON.stringify(input.themeSeeds, null, 2),
            "",
            "风格指南：",
            JSON.stringify(input.styleGuide, null, 2),
            "",
            "请输出 JSON，字段必须包含：",
            "scenes, characterStates, themeReport, styleReport, readerReport",
            "章节正文：",
            input.chapterText,
          ].join("\n"),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error("LLM returned empty analysis");
    }

    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<ChapterAnalysisBundle>;
    const scenes = normalizeScenes((parsed.scenes as ReadonlyArray<ScenePlanItem> | undefined) ?? [], input.chapterText);
    const characterStates = parsed.characterStates ?? heuristic.characterStates;
    const themeReport = parsed.themeReport ?? heuristic.themeReport;
    const styleReport = parsed.styleReport ?? heuristic.styleReport;
    const readerReport = parsed.readerReport ?? heuristic.readerReport;
    const gateDecision = this.gatekeeper.decide(input.chapterNumber, input.gates);
    const revisionBrief = buildRevisionBrief({
      chapterNumber: input.chapterNumber,
      readerReport,
      characterStates,
      themeReport,
    });

    return {
      scenes,
      characterStates,
      themeReport,
      styleReport,
      readerReport,
      gateDecision,
      revisionBrief,
    };
  }
}

export function createAnalysisEngineFromEnv(): AnalysisEngine {
  const provider = process.env.STORYLAB_ANALYSIS_PROVIDER?.trim().toLowerCase() ?? "heuristic";
  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_ANALYSIS");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_ANALYSIS_PROVIDER=openai 时，必须提供 STORYLAB_ANALYSIS_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIAnalysisEngine(config);
  }

  return new HeuristicAnalysisEngine();
}
