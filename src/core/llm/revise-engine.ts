import type {
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  RevisionComparisonReport,
  SceneAuditReport,
  StyleGuide,
  ThemeHistory,
} from "../types.js";
import { createOpenAIClient, resolveOpenAIConfig } from "./openai-shared.js";

export interface RevisionInput {
  readonly draft: ChapterDraft;
  readonly plan: ChapterPlan;
  readonly analysis: ChapterAnalysisBundle;
  readonly sceneAudit: SceneAuditReport;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
  readonly styleGuide: StyleGuide;
}

export interface ReviseEngine {
  readonly name: string;
  revise(input: RevisionInput): Promise<ChapterDraft>;
}

function appendRevisionParagraphs(input: RevisionInput): string {
  const additions: string[] = [];

  for (const issue of input.sceneAudit.issues.slice(0, 3)) {
    additions.push(
      `【修订补强场景 ${issue.sceneNumber}】${issue.problem}。${issue.recommendation}`,
    );
  }

  for (const suggestion of input.analysis.readerReport.revisionSuggestions.slice(0, 2)) {
    additions.push(`【读者体验修订】${suggestion}`);
  }

  const activeCharacter = input.characterHistory.find((entry) => entry.latestState.presentInChapter);
  if (activeCharacter) {
    additions.push(
      `【角色代价补强】${activeCharacter.name}继续被其选择拖入代价，当前压力是：${activeCharacter.latestState.decisionCost}。`,
    );
  }

  return additions.join("\n\n");
}

export class HeuristicReviseEngine implements ReviseEngine {
  readonly name = "heuristic";

  async revise(input: RevisionInput): Promise<ChapterDraft> {
    const revisedContent = [
      input.draft.content,
      "",
      appendRevisionParagraphs(input),
    ]
      .join("\n\n")
      .trim();

    return {
      ...input.draft,
      content: revisedContent,
      summary: `${input.draft.summary} 本版已根据 revision brief 与 scene audit 做局部修订。`,
    };
  }
}

function buildPrompt(input: RevisionInput): string {
  return [
    "请根据以下内容修订小说章节草稿，输出完整修订后正文。",
    "",
    "要求：",
    "1. 保留章节主任务与主题方向。",
    "2. 优先修补场景目标、冲突、转折、结果、POV 漂移等问题。",
    "3. 必须强化角色选择与代价，而不是只改句子。",
    "4. 必须考虑风格约束与读者体验建议。",
    "5. 只输出正文，不输出解释。",
    "",
    "章节计划：",
    JSON.stringify(input.plan, null, 2),
    "",
    "分析结果：",
    JSON.stringify(
      {
        readerReport: input.analysis.readerReport,
        styleReport: input.analysis.styleReport,
        themeReport: input.analysis.themeReport,
        characterStates: input.analysis.characterStates,
      },
      null,
      2,
    ),
    "",
    "场景审计：",
    JSON.stringify(input.sceneAudit, null, 2),
    "",
    "角色历史：",
    JSON.stringify(input.characterHistory, null, 2),
    "",
    "主题历史：",
    JSON.stringify(input.themeHistory, null, 2),
    "",
    "风格约束：",
    JSON.stringify(input.styleGuide, null, 2),
    "",
    "原始草稿：",
    input.draft.content,
  ].join("\n");
}

export class OpenAIReviseEngine implements ReviseEngine {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async revise(input: RevisionInput): Promise<ChapterDraft> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "你是中文小说修订器。你的任务是根据批评意见重写章节，而不是解释批评。",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("LLM returned empty revised draft");
    }

    return {
      ...input.draft,
      content,
      summary: `${input.draft.summary} 本版由 LLM 根据 revision brief 与 scene audit 修订。`,
    };
  }
}

export function createReviseEngineFromEnv(): ReviseEngine {
  const provider = process.env.STORYLAB_REVISE_PROVIDER?.trim().toLowerCase() ?? "heuristic";
  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_REVISE");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_REVISE_PROVIDER=openai 时，必须提供 STORYLAB_REVISE_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIReviseEngine(config);
  }

  return new HeuristicReviseEngine();
}

export function buildRevisionComparisonReport(params: {
  readonly chapterNumber: number;
  readonly before: ChapterAnalysisBundle;
  readonly after: ChapterAnalysisBundle;
  readonly beforeSceneAudit: SceneAuditReport;
  readonly afterSceneAudit: SceneAuditReport;
}): RevisionComparisonReport {
  const delta = {
    hook: params.after.readerReport.scores.hook - params.before.readerReport.scores.hook,
    momentum: params.after.readerReport.scores.momentum - params.before.readerReport.scores.momentum,
    emotionalPeak: params.after.readerReport.scores.emotionalPeak - params.before.readerReport.scores.emotionalPeak,
    suspense: params.after.readerReport.scores.suspense - params.before.readerReport.scores.suspense,
    memorability: params.after.readerReport.scores.memorability - params.before.readerReport.scores.memorability,
  };
  const sceneIssueDelta = params.beforeSceneAudit.issues.length - params.afterSceneAudit.issues.length;

  const improved: string[] = [];
  if (delta.hook > 0) improved.push("开场或结尾钩子更强");
  if (delta.momentum > 0) improved.push("章节推进感增强");
  if (delta.emotionalPeak > 0) improved.push("情绪峰值更明显");
  if (sceneIssueDelta > 0) improved.push("场景结构问题减少");

  const unresolved: string[] = [];
  if (params.afterSceneAudit.issues.length > 0) unresolved.push("仍存在未完全解决的场景问题");
  if (delta.emotionalPeak <= 0) unresolved.push("情绪峰值仍未明显提升");
  if (delta.memorability <= 0) unresolved.push("记忆点仍可继续强化");

  return {
    chapterNumber: params.chapterNumber,
    readerScoreDelta: delta,
    sceneIssueDelta,
    summary:
      improved.length > 0
        ? `本轮修订后共有 ${improved.length} 项关键指标改善。`
        : "本轮修订没有带来明显指标提升，需要重新审视 revise brief。",
    improved,
    unresolved,
  };
}
