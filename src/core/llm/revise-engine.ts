import type {
  BlockingGateStatus,
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

function splitScenes(content: string): ReadonlyArray<string> {
  return content
    .split(/(?=【场景\s*\d+\s*\/\s*POV[:：])/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildSceneRevisionBlock(input: RevisionInput, sceneNumber: number): string {
  const scene = input.plan.sceneBlueprint.find((entry) => entry.sceneNumber === sceneNumber);
  if (!scene) {
    return "";
  }

  return [
    `【场景 ${scene.sceneNumber} 修订锚点】`,
    `驱动角色：${scene.drivingCharacter}`,
    `必须发生的决定：${scene.decision}`,
    `必须兑现的代价：${scene.cost}`,
    `关系变化：${scene.relationshipChange}`,
    `主题冲突：${scene.thematicTension}`,
    `价值对立：${scene.valuePositionA} vs ${scene.valuePositionB}`,
    `风格执行：${scene.styleDirective}`,
  ].join(" ");
}

export class HeuristicReviseEngine implements ReviseEngine {
  readonly name = "heuristic";

  async revise(input: RevisionInput): Promise<ChapterDraft> {
    const sections = splitScenes(input.draft.content);
    const revisedSections = sections.map((section, index) => {
      const sceneNumber = index + 1;
      const auditIssues = input.sceneAudit.issues.filter((issue) => issue.sceneNumber === sceneNumber);
      const revisionNotes = [
        buildSceneRevisionBlock(input, sceneNumber),
        ...auditIssues.map((issue) => `【场景问题】${issue.problem}。${issue.recommendation}`),
      ]
        .filter((entry) => entry.length > 0)
        .join("\n");

      return [section, revisionNotes].filter((entry) => entry.length > 0).join("\n");
    });

    const styleControl = `【风格控制】叙述风格：${input.plan.styleProfile.narrationStyle}。对白风格：${input.plan.styleProfile.dialogueStyle}。节奏：${input.plan.styleProfile.pacingProfile}。描写密度：${input.plan.styleProfile.descriptionDensity}。语气约束：${input.plan.styleProfile.toneConstraints.join("，")}。`;
    const readerFixes = input.analysis.readerReport.revisionSuggestions
      .slice(0, 2)
      .map((suggestion) => `【读者体验修订】${suggestion}`)
      .join("\n");

    const revisedContent = [styleControl, ...revisedSections, readerFixes].filter((entry) => entry.length > 0).join("\n\n");

    return {
      ...input.draft,
      content: revisedContent,
      summary: `${input.draft.summary} 本版已按角色决策、主题冲突与风格控制执行场景级修订。`,
    };
  }
}

function buildPrompt(input: RevisionInput): string {
  return [
    "请根据以下内容修订小说章节草稿，输出完整修订后正文。",
    "",
    "要求：",
    "1. 每个 scene 必须围绕 driving character 的 decision 展开。",
    "2. 每个 decision 必须兑现 cost，不能只有事件没有后果。",
    "3. theme conflict 必须通过行为和对话体现，不能只用旁白解释。",
    "4. 必须执行 style profile，尤其要控制对白差异、节奏和描写密度。",
    "5. 如果某个 scene 只是信息搬运，必须重写为真正的选择场景。",
    "6. 只输出正文，不输出解释。",
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
      summary: `${input.draft.summary} 本版由 LLM 根据角色/主题/风格约束执行修订。`,
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

export function buildBlockingGateStatus(params: {
  readonly analysis: ChapterAnalysisBundle;
  readonly sceneAudit: SceneAuditReport;
}): BlockingGateStatus {
  const reasons: string[] = [];
  if (params.analysis.readerReport.scores.hook < 5) {
    reasons.push("hook 分过低");
  }
  if (params.analysis.readerReport.scores.momentum < 6) {
    reasons.push("momentum 分过低");
  }
  if (params.sceneAudit.issues.some((issue) => issue.severity === "high")) {
    reasons.push("scene audit 存在 high severity 问题");
  }

  return {
    blocking: reasons.length > 0,
    reasons,
  };
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
