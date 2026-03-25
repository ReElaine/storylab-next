import type {
  BlockingGateStatus,
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  RevisionComparisonReport,
  SceneAuditIssue,
  SceneAuditReport,
  SceneBlueprintItem,
  SceneRevisionExplanation,
  StyleGuide,
  ThemeHistory,
} from "../types.js";
import { parseSceneDocument, replaceSceneUnits, shortenSceneExcerpt, type SceneTextUnit } from "../utils/scene-text.js";
import { createOpenAIClient, resolveOpenAIConfig } from "./openai-shared.js";

export interface RevisionInput {
  readonly draft: ChapterDraft;
  readonly plan: ChapterPlan;
  readonly analysis: ChapterAnalysisBundle;
  readonly sceneAudit: SceneAuditReport;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
  readonly styleGuide: StyleGuide;
  readonly targetSceneNumbers?: ReadonlyArray<number>;
}

export interface ReviseEngine {
  readonly name: string;
  revise(input: RevisionInput): Promise<ChapterDraft>;
}

function dedupe(values: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function describeSceneIssueType(issue: SceneAuditIssue): string {
  if (issue.problem.includes("决策")) return "无决策";
  if (issue.problem.includes("代价")) return "无代价";
  if (issue.problem.includes("主题")) return "无主题冲突";
  if (issue.problem.includes("POV")) return "POV 漂移";
  if (issue.problem.includes("冲突")) return "冲突不足";
  return issue.problem;
}

function collectTargetSceneNumbers(input: RevisionInput): ReadonlyArray<number> {
  if (input.targetSceneNumbers && input.targetSceneNumbers.length > 0) {
    return dedupe(input.targetSceneNumbers.map((value) => String(value))).map((value) => Number.parseInt(value, 10));
  }

  const fromAudit = input.sceneAudit.issues.map((issue) => issue.sceneNumber);
  if (fromAudit.length > 0) {
    return dedupe(fromAudit.map((value) => String(value))).map((value) => Number.parseInt(value, 10));
  }

  return [];
}

function buildSceneRewriteStrategy(scene: SceneBlueprintItem, issues: ReadonlyArray<SceneAuditIssue>): ReadonlyArray<string> {
  const strategy: string[] = [
    `让 ${scene.drivingCharacter} 主动推进：${scene.decision}`,
    `兑现代价：${scene.cost}`,
    `在行为或对白里显出关系变化：${scene.relationshipChange}`,
    `把价值冲突写进动作与对话：${scene.valuePositionA} vs ${scene.valuePositionB}`,
    `遵循风格指令：${scene.styleDirective}`,
  ];

  for (const issue of issues) {
    strategy.push(issue.recommendation);
  }

  return dedupe(strategy);
}

function buildSceneRewrite(
  marker: string,
  scene: SceneBlueprintItem,
  issues: ReadonlyArray<SceneAuditIssue>,
  supportName: string,
): string {
  const extraTension = issues.some((issue) => issue.problem.includes("主题"))
    ? `这一次，冲突不只是事情做不做，而是 ${scene.valuePositionA} 和 ${scene.valuePositionB} 哪一边值得被承担。`
    : `${scene.thematicTension} 在这一刻变成了必须选边站的压力。`;
  const styleTexture = scene.styleDirective.includes("对白")
    ? `${supportName}说话时明显带着逼问和试探，而 ${scene.drivingCharacter} 的回应更短、更硬。`
    : `${scene.drivingCharacter} 的动作先于解释，环境细节只在情绪拐点处被点亮。`;

  return [
    marker,
    `${scene.drivingCharacter}没有退路。${scene.goal}。他/她真正要做的，不是继续旁观，而是立刻做出决定：${scene.decision}。`,
    `${scene.opposingForce}构成了直接阻力。${scene.conflict}。${styleTexture}`,
    `${extraTension} 于是 ${scene.drivingCharacter} 的选择不再只是剧情动作，而变成对价值立场的公开押注。`,
    `转折来得很快：${scene.turn}。一旦决定落地，代价马上跟上：${scene.cost}。`,
    `结果是 ${scene.result}。关系也因此发生位移：${scene.relationshipChange}。`,
    `新信息随之浮出：${scene.newInformation.join("；") || "暂无额外信息"}。情绪从 ${scene.emotionalShift}，并把场景站位压向 ${scene.sceneStance}。`,
  ].join("\n\n");
}

function buildPrompt(params: {
  readonly scene: SceneBlueprintItem;
  readonly originalScene: string;
  readonly issues: ReadonlyArray<SceneAuditIssue>;
  readonly styleProfile: ChapterPlan["styleProfile"];
  readonly styleGuide: StyleGuide;
}): string {
  return [
    "请只重写下面这个小说 scene，不要改其他 scene。",
    "",
    "要求：",
    "1. 只输出修订后的该 scene 文本。",
    "2. 必须围绕 drivingCharacter 的 decision 展开。",
    "3. 必须让 cost 在 scene 内兑现。",
    "4. 必须让价值冲突通过动作或对白体现，不要用旁白硬解释。",
    "5. 必须执行风格约束，但不要输出显式控制标签。",
    "",
    "scene blueprint：",
    JSON.stringify(params.scene, null, 2),
    "",
    "style profile：",
    JSON.stringify(params.styleProfile, null, 2),
    "",
    "style guide：",
    JSON.stringify(params.styleGuide, null, 2),
    "",
    "scene 问题：",
    JSON.stringify(params.issues, null, 2),
    "",
    "原 scene：",
    params.originalScene,
  ].join("\n");
}

function pickSupportName(input: RevisionInput, scene: SceneBlueprintItem): string {
  const byName = input.characterHistory.find((entry) => entry.name !== scene.drivingCharacter)?.name;
  return byName ?? scene.opposingForce;
}

export class HeuristicReviseEngine implements ReviseEngine {
  readonly name = "heuristic";

  async revise(input: RevisionInput): Promise<ChapterDraft> {
    const document = parseSceneDocument(input.draft.content);
    const targetScenes = new Set(collectTargetSceneNumbers(input));
    const replacements: SceneTextUnit[] = [];

    for (const sceneText of document.scenes) {
      if (!targetScenes.has(sceneText.sceneNumber)) {
        continue;
      }

      const scene = input.plan.sceneBlueprint.find((entry) => entry.sceneNumber === sceneText.sceneNumber);
      if (!scene) {
        continue;
      }

      const issues = input.sceneAudit.issues.filter((issue) => issue.sceneNumber === scene.sceneNumber);
      replacements.push({
        sceneNumber: scene.sceneNumber,
        marker: sceneText.marker,
        content: buildSceneRewrite(sceneText.marker, scene, issues, pickSupportName(input, scene)),
      });
    }

    const revisedContent =
      replacements.length > 0 ? replaceSceneUnits(document, replacements) : input.draft.content;

    return {
      ...input.draft,
      content: revisedContent,
      summary: `${input.draft.summary} 本版按 scene 级问题执行了局部重写。`,
    };
  }
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
    const document = parseSceneDocument(input.draft.content);
    const targetScenes = new Set(collectTargetSceneNumbers(input));
    const replacements: SceneTextUnit[] = [];

    for (const sceneText of document.scenes) {
      if (!targetScenes.has(sceneText.sceneNumber)) {
        continue;
      }

      const scene = input.plan.sceneBlueprint.find((entry) => entry.sceneNumber === sceneText.sceneNumber);
      if (!scene) {
        continue;
      }

      const issues = input.sceneAudit.issues.filter((issue) => issue.sceneNumber === scene.sceneNumber);
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: "你是中文小说 scene 修订器。你的任务是局部重写单个 scene，而不是整章重写。",
          },
          {
            role: "user",
            content: buildPrompt({
              scene,
              originalScene: sceneText.content,
              issues,
              styleProfile: input.plan.styleProfile,
              styleGuide: input.styleGuide,
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error(`LLM returned empty revised scene for scene ${scene.sceneNumber}`);
      }

      replacements.push({
        sceneNumber: scene.sceneNumber,
        marker: sceneText.marker,
        content,
      });
    }

    const revisedContent =
      replacements.length > 0 ? replaceSceneUnits(document, replacements) : input.draft.content;

    return {
      ...input.draft,
      content: revisedContent,
      summary: `${input.draft.summary} 本版由 LLM 按 scene 级问题执行局部重写。`,
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
  const blockingSceneMap = new Map<number, Set<string>>();

  if (params.analysis.readerReport.scores.hook < 5) {
    reasons.push("hook 分过低");
  }
  if (params.analysis.readerReport.scores.momentum < 6) {
    reasons.push("momentum 分过低");
  }

  for (const issue of params.sceneAudit.issues) {
    if (issue.severity !== "high") {
      continue;
    }

    if (!blockingSceneMap.has(issue.sceneNumber)) {
      blockingSceneMap.set(issue.sceneNumber, new Set<string>());
    }
    blockingSceneMap.get(issue.sceneNumber)?.add(describeSceneIssueType(issue));
  }

  if (blockingSceneMap.size > 0) {
    const sceneMessages = Array.from(blockingSceneMap.entries()).map(
      ([sceneNumber, issueTypes]) => `scene ${sceneNumber}: ${Array.from(issueTypes).join(", ")}`,
    );
    reasons.push(`scene audit 存在 high severity 问题 (${sceneMessages.join("; ")})`);
  }

  return {
    blocking: reasons.length > 0,
    reasons,
    blockingScenes: Array.from(blockingSceneMap.entries()).map(([sceneNumber, issueTypes]) => ({
      sceneNumber,
      issueTypes: Array.from(issueTypes),
    })),
  };
}

function buildSceneRevisionExplanation(params: {
  readonly sceneNumber: number;
  readonly beforeContent: string;
  readonly afterContent: string;
  readonly issues: ReadonlyArray<SceneAuditIssue>;
  readonly scene: SceneBlueprintItem | undefined;
}): SceneRevisionExplanation {
  const scene = params.scene;
  const beforeProblems = params.issues.map((issue) => issue.problem);
  const rewriteStrategy = scene ? buildSceneRewriteStrategy(scene, params.issues) : [];

  return {
    sceneNumber: params.sceneNumber,
    beforeProblems,
    rewriteStrategy,
    characterChange: scene
      ? `把 ${scene.drivingCharacter} 的决策“${scene.decision}”和代价“${scene.cost}”写进场景动作。`
      : "未捕获到 scene blueprint。",
    themeChange: scene
      ? `将价值冲突“${scene.valuePositionA} vs ${scene.valuePositionB}”通过 ${scene.sceneStance} 落进场景。`
      : "未捕获到主题冲突。",
    styleChange: scene
      ? `按风格指令执行局部重写：${scene.styleDirective}`
      : "未捕获到风格指令。",
    beforeExcerpt: shortenSceneExcerpt(params.beforeContent),
    afterExcerpt: shortenSceneExcerpt(params.afterContent),
  };
}

export function buildRevisionComparisonReport(params: {
  readonly chapterNumber: number;
  readonly before: ChapterAnalysisBundle;
  readonly after: ChapterAnalysisBundle;
  readonly beforeSceneAudit: SceneAuditReport;
  readonly afterSceneAudit: SceneAuditReport;
  readonly plan: ChapterPlan;
  readonly beforeDraftContent: string;
  readonly afterDraftContent: string;
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

  const beforeDoc = parseSceneDocument(params.beforeDraftContent);
  const afterDoc = parseSceneDocument(params.afterDraftContent);
  const changedSceneNumbers = new Set<number>([
    ...params.beforeSceneAudit.issues.map((issue) => issue.sceneNumber),
    ...params.afterSceneAudit.issues.map((issue) => issue.sceneNumber),
  ]);

  const sceneChanges = Array.from(changedSceneNumbers)
    .sort((left, right) => left - right)
    .map((sceneNumber) =>
      buildSceneRevisionExplanation({
        sceneNumber,
        beforeContent: beforeDoc.scenes.find((scene) => scene.sceneNumber === sceneNumber)?.content ?? "",
        afterContent: afterDoc.scenes.find((scene) => scene.sceneNumber === sceneNumber)?.content ?? "",
        issues: params.beforeSceneAudit.issues.filter((issue) => issue.sceneNumber === sceneNumber),
        scene: params.plan.sceneBlueprint.find((scene) => scene.sceneNumber === sceneNumber),
      }),
    );

  return {
    chapterNumber: params.chapterNumber,
    readerScoreDelta: delta,
    sceneIssueDelta,
    summary:
      improved.length > 0
        ? `本轮修订后共有 ${improved.length} 项关键指标改善，并给出 ${sceneChanges.length} 个 scene 级改写解释。`
        : "本轮修订没有带来明显指标提升，需要重新审视 revise brief。",
    improved,
    unresolved,
    sceneChanges,
  };
}
