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
import { createOpenAIClient, parseJsonObjectWithRepair, resolveOpenAIConfig } from "./openai-shared.js";

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function defaultScene(chapterText: string): ScenePlanItem {
  const sourceParagraphs = chapterText.split(/\r?\n/u).filter((line) => line.trim().length > 0).slice(0, 3);
  return {
    sceneId: "scene-1",
    sceneAnchor: "scene-1-anchor",
    sceneNumber: 1,
    pov: "未明",
    goal: "从章节正文中提取场景目标",
    conflict: "从章节正文中提取核心冲突",
    turn: "从章节正文中提取转折",
    result: "从章节正文中提取结果",
    newInformation: [],
    emotionalShift: "待补充",
    sourceParagraphs,
  };
}

function normalizeScenes(raw: unknown, chapterText: string): ReadonlyArray<ScenePlanItem> {
  if (!Array.isArray(raw)) {
    return [defaultScene(chapterText)];
  }

  const fallback = defaultScene(chapterText);
  const normalized = raw
    .filter(isObject)
    .map((entry, index) => ({
      sceneId: asString(entry.sceneId, `scene-${index + 1}`),
      sceneAnchor: asString(entry.sceneAnchor, `scene-${index + 1}-anchor`),
      sceneNumber: asNumber(entry.sceneNumber, index + 1),
      pov: asString(entry.pov, "未明"),
      goal: asString(entry.goal, fallback.goal),
      conflict: asString(entry.conflict, fallback.conflict),
      turn: asString(entry.turn, fallback.turn),
      result: asString(entry.result, fallback.result),
      newInformation: asStringArray(entry.newInformation, []),
      emotionalShift: asString(entry.emotionalShift, "待补充"),
      sourceParagraphs: asStringArray(entry.sourceParagraphs, fallback.sourceParagraphs),
    }));

  return normalized.length > 0 ? normalized : [fallback];
}

function normalizeCharacterStates(
  value: unknown,
  fallback: ChapterAnalysisBundle["characterStates"],
): ChapterAnalysisBundle["characterStates"] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter(isObject)
    .map((entry) => ({
      name: asString(entry.name, "未命名角色"),
      desire: asString(entry.desire, "待补充"),
      fear: asString(entry.fear, "待补充"),
      misbelief: asString(entry.misbelief, "待补充"),
      recentDecision: asString(entry.recentDecision, "未明确决策"),
      decisionCost: asString(entry.decisionCost, "代价未明确"),
      relationshipShift: asStringArray(entry.relationshipShift, []),
      arcProgress: asString(entry.arcProgress, "弧线尚未明确"),
      presentInChapter: typeof entry.presentInChapter === "boolean" ? entry.presentInChapter : true,
    }));

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeThemeReport(
  value: unknown,
  fallback: ChapterAnalysisBundle["themeReport"],
): ChapterAnalysisBundle["themeReport"] {
  if (!isObject(value)) {
    return fallback;
  }

  const rawActiveThemes = Array.isArray(value.activeThemes)
    ? value.activeThemes
    : Array.isArray(value.themes)
      ? value.themes
      : [];

  const activeThemes = rawActiveThemes
    .filter(isObject)
    .map((entry) => ({
      theme: asString(entry.theme, fallback.activeThemes[0]?.theme ?? "主题未明确"),
      antiTheme: asString(entry.antiTheme, fallback.activeThemes[0]?.antiTheme ?? "反主题未明确"),
      valueConflict: asString(entry.valueConflict, fallback.activeThemes[0]?.valueConflict ?? "价值冲突未明确"),
      themeSignalCount: asNumber(entry.themeSignalCount, 0),
      antiSignalCount: asNumber(entry.antiSignalCount, 0),
      interpretation: asString(entry.interpretation, "主题表达尚不稳定"),
    }));

  return activeThemes.length > 0
    ? {
        chapterNumber: asNumber(value.chapterNumber, fallback.chapterNumber),
        activeThemes,
      }
    : fallback;
}

function normalizeStyleReport(
  value: unknown,
  fallback: ChapterAnalysisBundle["styleReport"],
): ChapterAnalysisBundle["styleReport"] {
  if (!isObject(value)) {
    return fallback;
  }

  return {
    averageSentenceLength: asNumber(value.averageSentenceLength, fallback.averageSentenceLength),
    dialogueRatio: asNumber(value.dialogueRatio, fallback.dialogueRatio),
    descriptionRatio: asNumber(value.descriptionRatio, fallback.descriptionRatio),
    rhythmNote: asString(value.rhythmNote, fallback.rhythmNote),
    adherenceNote: asString(value.adherenceNote, fallback.adherenceNote),
    styleDriftPoints: asStringArray(value.styleDriftPoints, fallback.styleDriftPoints),
    dialogueHomogeneitySpots: asStringArray(value.dialogueHomogeneitySpots, fallback.dialogueHomogeneitySpots),
    descriptionBalanceNote: asString(value.descriptionBalanceNote, fallback.descriptionBalanceNote),
  };
}

function normalizeReaderReport(
  value: unknown,
  fallback: ChapterAnalysisBundle["readerReport"],
): ChapterAnalysisBundle["readerReport"] {
  if (!isObject(value) || !isObject(value.scores)) {
    return fallback;
  }

  return {
    chapterNumber: asNumber(value.chapterNumber, fallback.chapterNumber),
    scores: {
      hook: asNumber(value.scores.hook, fallback.scores.hook),
      momentum: asNumber(value.scores.momentum, fallback.scores.momentum),
      emotionalPeak: asNumber(value.scores.emotionalPeak, fallback.scores.emotionalPeak),
      suspense: asNumber(value.scores.suspense, fallback.scores.suspense),
      memorability: asNumber(value.scores.memorability, fallback.scores.memorability),
    },
    summary: asString(value.summary, fallback.summary),
    strengths: asStringArray(value.strengths, fallback.strengths),
    risks: asStringArray(value.risks, fallback.risks),
    revisionSuggestions: asStringArray(value.revisionSuggestions, fallback.revisionSuggestions),
  };
}

function buildAnalysisSchemaPrompt(): string {
  return [
    "你是 Storylab 的章节分析引擎。",
    "你必须只返回一个合法 JSON 对象，不要输出 markdown、解释、注释或代码块。",
    "如果正文证据不足，也必须保留字段，使用保守措辞，不允许省略顶层字段。",
    "",
    "返回的 JSON 必须包含：",
    "{",
    '  "scenes": [',
    "    {",
    '      "sceneId": "scene-1",',
    '      "sceneAnchor": "scene-1-anchor",',
    '      "sceneNumber": 1,',
    '      "pov": "林凡",',
    '      "goal": "场景目标",',
    '      "conflict": "场景冲突",',
    '      "turn": "场景转折",',
    '      "result": "场景结果",',
    '      "newInformation": ["新信息"],',
    '      "emotionalShift": "情绪变化",',
    '      "sourceParagraphs": ["相关原文段落"]',
    "    }",
    "  ],",
    '  "characterStates": [',
    "    {",
    '      "name": "林凡",',
    '      "desire": "当前欲望",',
    '      "fear": "当前恐惧",',
    '      "misbelief": "当前误判",',
    '      "recentDecision": "最近决策",',
    '      "decisionCost": "决策代价",',
    '      "relationshipShift": ["关系变化"],',
    '      "arcProgress": "弧线进度",',
    '      "presentInChapter": true',
    "    }",
    "  ],",
    '  "themeReport": {',
    '    "chapterNumber": 1,',
    '    "activeThemes": [',
    "      {",
    '        "theme": "主题",',
    '        "antiTheme": "反主题",',
    '        "valueConflict": "价值冲突",',
    '        "themeSignalCount": 1,',
    '        "antiSignalCount": 0,',
    '        "interpretation": "主题推进解释"',
    "      }",
    "    ]",
    "  },",
    '  "styleReport": {',
    '    "averageSentenceLength": 18,',
    '    "dialogueRatio": 0.35,',
    '    "descriptionRatio": 0.25,',
    '    "rhythmNote": "节奏说明",',
    '    "adherenceNote": "风格符合度说明",',
    '    "styleDriftPoints": ["风格漂移点"],',
    '    "dialogueHomogeneitySpots": ["对白同质化位置"],',
    '    "descriptionBalanceNote": "描写密度说明"',
    "  },",
    '  "readerReport": {',
    '    "chapterNumber": 1,',
    '    "scores": {',
    '      "hook": 7,',
    '      "momentum": 8,',
    '      "emotionalPeak": 7,',
    '      "suspense": 6,',
    '      "memorability": 7',
    "    },",
    '    "summary": "一句话总结",',
    '    "strengths": ["优点"],',
    '    "risks": ["风险"],',
    '    "revisionSuggestions": ["修订建议"]',
    "  }",
    "}",
    "",
    "规则：",
    "1. scenes、characterStates、themeReport.activeThemes、readerReport.strengths、readerReport.risks、readerReport.revisionSuggestions 必须是数组。",
    "2. sourceParagraphs 必须摘取原文中的真实段落，不允许编造章节外信息。",
    "3. sceneNumber 必须从 1 开始递增。",
    "4. 如果只能识别一个主题，也必须返回 activeThemes 数组，至少包含 1 项。",
    "5. 如果信息不足，使用“未明确”“待补充”这类保守值，不允许返回 null。",
  ].join("\n");
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
          content: buildAnalysisSchemaPrompt(),
        },
        {
          role: "user",
          content: [
            `章节号: ${input.chapterNumber}`,
            "角色种子:",
            JSON.stringify(input.characterSeeds, null, 2),
            "",
            "主题种子:",
            JSON.stringify(input.themeSeeds, null, 2),
            "",
            "风格指南:",
            JSON.stringify(input.styleGuide, null, 2),
            "",
            "请严格按照 system 中给出的 JSON 结构返回，不允许缺字段，不允许把数组改成对象。",
            "章节正文:",
            input.chapterText,
          ].join("\n"),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error("LLM returned empty analysis");
    }

    let parsed: Partial<ChapterAnalysisBundle> & { themes?: unknown };
    try {
      parsed = parseJsonObjectWithRepair<Partial<ChapterAnalysisBundle> & {
        themes?: unknown;
      }>(raw);
    } catch {
      // Fall back to heuristic analysis when the model returns malformed JSON.
      return heuristic;
    }
    const scenes = normalizeScenes(parsed.scenes, input.chapterText);
    const characterStates = normalizeCharacterStates(parsed.characterStates, heuristic.characterStates);
    const themeReport = normalizeThemeReport(parsed.themeReport ?? parsed.themes, heuristic.themeReport);
    const styleReport = normalizeStyleReport(parsed.styleReport, heuristic.styleReport);
    const readerReport = normalizeReaderReport(parsed.readerReport, heuristic.readerReport);
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
