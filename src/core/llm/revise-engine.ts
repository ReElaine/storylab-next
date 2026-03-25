import type {
  BlockingGateStatus,
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  IssueResolution,
  PostRewriteAssessment,
  RevisionComparisonReport,
  RevisionResult,
  RevisionTrace,
  SceneAuditIssue,
  SceneAuditReport,
  SceneBlueprintItem,
  SceneRevisionExplanation,
  StyleGuide,
  TextualChangeEvidenceItem,
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
  revise(input: RevisionInput): Promise<RevisionResult>;
}

function dedupeNumbers(values: ReadonlyArray<number>): ReadonlyArray<number> {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function dedupeStrings(values: ReadonlyArray<string>): ReadonlyArray<string> {
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
    return dedupeNumbers(input.targetSceneNumbers);
  }
  return dedupeNumbers(input.sceneAudit.issues.map((issue) => issue.sceneNumber));
}

function buildSceneRewriteStrategy(scene: SceneBlueprintItem, issues: ReadonlyArray<SceneAuditIssue>): ReadonlyArray<string> {
  return dedupeStrings([
    `让 ${scene.drivingCharacter} 主动推进：${scene.decision}`,
    `兑现代价：${scene.cost}`,
    `在行为或对白中体现关系变化：${scene.relationshipChange}`,
    `把价值冲突写进动作与对话：${scene.valuePositionA} vs ${scene.valuePositionB}`,
    `遵循风格指令：${scene.styleDirective}`,
    ...issues.map((issue) => issue.recommendation),
  ]);
}

function buildSceneRewriteReason(issues: ReadonlyArray<SceneAuditIssue>): ReadonlyArray<string> {
  if (issues.length === 0) {
    return ["目标 scene 被选中，需要局部重写"];
  }
  return dedupeStrings(issues.map((issue) => issue.problem));
}

function pickSupportName(input: RevisionInput, scene: SceneBlueprintItem): string {
  const byName = input.characterHistory.find((entry) => entry.name !== scene.drivingCharacter)?.name;
  return byName ?? scene.opposingForce;
}

function buildHeuristicSceneRewrite(
  marker: string,
  scene: SceneBlueprintItem,
  issues: ReadonlyArray<SceneAuditIssue>,
  supportName: string,
): string {
  const hasThemeProblem = issues.some((issue) => issue.problem.includes("主题"));
  const styleTexture = scene.styleDirective.includes("对白")
    ? `${supportName}的回应更锋利，${scene.drivingCharacter}的回答更短、更硬。`
    : `${scene.drivingCharacter}的动作先于解释，环境细节只在情绪拐点处被点亮。`;
  const thematicLine = hasThemeProblem
    ? `这一次，冲突不只是事情做不做，而是 ${scene.valuePositionA} 和 ${scene.valuePositionB} 到底该向哪边倾斜。`
    : `${scene.thematicTension} 在这一刻变成了必须选边站的压力。`;

  return [
    marker,
    `${scene.drivingCharacter}没有退路。${scene.goal}。真正推动这个场景的，不是信息自己出现，而是 ${scene.drivingCharacter} 必须做出决定：${scene.decision}。`,
    `${scene.opposingForce} 立刻构成阻力。${scene.conflict}。${styleTexture}`,
    `${thematicLine} 于是这次选择不再只是剧情动作，而是公开的价值站队。`,
    `${scene.turn}。一旦决定落地，代价马上跟上：${scene.cost}。`,
    `${scene.result}。关系也因此发生位移：${scene.relationshipChange}。`,
    `新的信息随之浮出：${scene.newInformation.join("；") || "暂无额外信息"}。情绪从 ${scene.emotionalShift}，并把场景立场压向 ${scene.sceneStance}。`,
  ].join("\n\n");
}

function buildPrompt(params: {
  readonly scene: SceneBlueprintItem;
  readonly originalScene: string;
  readonly issues: ReadonlyArray<SceneAuditIssue>;
  readonly styleProfile: ChapterPlan["styleProfile"];
  readonly styleGuide: StyleGuide;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
}): string {
  return [
    "请只重写下面这个小说 scene，不要改其他 scene。",
    "",
    "要求：",
    "1. 只输出修订后的该 scene 文本。",
    "2. 必须围绕 drivingCharacter 的 decision 展开。",
    "3. 必须让 cost 在 scene 内兑现。",
    "4. 必须让主题冲突通过动作或对话体现，不要只用旁白解释。",
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
    "character history（辅助参考，不要机械复述）：",
    JSON.stringify(params.characterHistory, null, 2),
    "",
    "theme history（辅助参考，不要机械复述）：",
    JSON.stringify(params.themeHistory, null, 2),
    "",
    "原 scene：",
    params.originalScene,
  ].join("\n");
}

function buildTrace(params: {
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly reviewedSceneNumbers: ReadonlyArray<number>;
  readonly allSceneNumbers: ReadonlyArray<number>;
  readonly sceneRewriteMetadata: RevisionTrace["sceneRewriteMetadata"];
}): RevisionTrace {
  const actual = dedupeNumbers(params.actualRewrittenSceneNumbers);
  const target = dedupeNumbers(params.targetSceneNumbers);
  const reviewed = dedupeNumbers(params.reviewedSceneNumbers);
  const all = dedupeNumbers(params.allSceneNumbers);

  return {
    targetSceneNumbers: target,
    actualRewrittenSceneNumbers: actual,
    comparisonSceneNumbers: actual,
    unchangedSceneNumbers: all.filter((sceneNumber) => !actual.includes(sceneNumber)),
    reviewedButNotRewrittenSceneNumbers: reviewed.filter((sceneNumber) => !actual.includes(sceneNumber)),
    sceneRewriteMetadata: params.sceneRewriteMetadata,
  };
}

function splitSceneParagraphs(content: string): ReadonlyArray<string> {
  return content
    .split(/\n\s*\n/gu)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith("【场景"));
}

function resolveLocationHint(index: number, total: number): TextualChangeEvidenceItem["locationHint"] {
  if (total <= 1) return "full_scene";
  if (index <= 0) return "opening";
  if (index >= total - 1) return "closing";
  return "middle";
}

function firstChangedParagraphIndex(beforeParagraphs: ReadonlyArray<string>, afterParagraphs: ReadonlyArray<string>): number {
  const max = Math.max(beforeParagraphs.length, afterParagraphs.length);
  for (let index = 0; index < max; index += 1) {
    if ((beforeParagraphs[index] ?? "") !== (afterParagraphs[index] ?? "")) {
      return index;
    }
  }
  return 0;
}

function findRelevantSnippet(content: string, candidates: ReadonlyArray<string>): string {
  const paragraphs = splitSceneParagraphs(content);
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (normalized.length === 0) continue;
    const found = paragraphs.find((paragraph) => paragraph.includes(normalized));
    if (found) return found;
  }
  return paragraphs[0] ?? shortenSceneExcerpt(content, 120);
}

function buildTextualChangeEvidence(params: {
  readonly beforeContent: string;
  readonly afterContent: string;
  readonly beforeIssues: ReadonlyArray<SceneAuditIssue>;
  readonly scene?: SceneBlueprintItem;
}): ReadonlyArray<TextualChangeEvidenceItem> {
  const beforeParagraphs = splitSceneParagraphs(params.beforeContent);
  const afterParagraphs = splitSceneParagraphs(params.afterContent);
  const changedIndex = firstChangedParagraphIndex(beforeParagraphs, afterParagraphs);
  const locationHint = resolveLocationHint(changedIndex, Math.max(beforeParagraphs.length, afterParagraphs.length));
  const beforeChangedSnippet = beforeParagraphs[changedIndex] ?? shortenSceneExcerpt(params.beforeContent, 120);
  const afterChangedSnippet = afterParagraphs[changedIndex] ?? shortenSceneExcerpt(params.afterContent, 120);
  const evidence: TextualChangeEvidenceItem[] = [
    {
      evidenceLayer: "textual",
      changeType: "general_rewrite",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: afterChangedSnippet,
      functionOfChange: "定位这次 scene 改写实际发生在哪一段正文。",
    },
  ];

  if (params.beforeIssues.some((issue) => issue.problem.includes("决策")) && params.scene) {
    evidence.push({
      evidenceLayer: "structural",
      changeType: "decision_added",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: findRelevantSnippet(params.afterContent, [params.scene.decision, "决定", "选择"]),
      functionOfChange: "让 drivingCharacter 的关键选择从缺失变成可见。",
    });
  }

  if (params.beforeIssues.some((issue) => issue.problem.includes("代价")) && params.scene) {
    evidence.push({
      evidenceLayer: "structural",
      changeType: "cost_clarified",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: findRelevantSnippet(params.afterContent, [params.scene.cost, "代价", "后果"]),
      functionOfChange: "把选择后的代价落到 scene 内，而不是停留在抽象说明。",
    });
  }

  if (params.beforeIssues.some((issue) => issue.problem.includes("冲突"))) {
    evidence.push({
      evidenceLayer: "localized",
      changeType: "conflict_strengthened",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: afterChangedSnippet,
      functionOfChange: "让场景阻力和对抗更集中，而不是仅靠气氛推进。",
    });
  }

  if (params.beforeIssues.some((issue) => issue.problem.includes("主题")) && params.scene) {
    evidence.push({
      evidenceLayer: "structural",
      changeType: "thematic_tension_inserted",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: findRelevantSnippet(params.afterContent, [params.scene.valuePositionA, params.scene.valuePositionB]),
      functionOfChange: "把价值冲突写进动作或对白，而不是只做剧情连接。",
    });
  }

  if (params.scene?.styleDirective.includes("对白")) {
    evidence.push({
      evidenceLayer: "localized",
      changeType: "dialogue_differentiated",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: afterChangedSnippet,
      functionOfChange: "让对白承担角色策略差异，而不是所有人说同一种话。",
    });
  }

  const beforeLength = params.beforeContent.replace(/\s+/gu, "").length;
  const afterLength = params.afterContent.replace(/\s+/gu, "").length;
  if (afterLength < beforeLength) {
    evidence.push({
      evidenceLayer: "localized",
      changeType: "pacing_compressed",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: afterChangedSnippet,
      functionOfChange: "压缩赘余表达，让冲突推进更直接。",
    });
  } else if (afterLength !== beforeLength) {
    evidence.push({
      evidenceLayer: "localized",
      changeType: "style_tightened",
      locationHint,
      beforeSnippet: beforeChangedSnippet,
      afterSnippet: afterChangedSnippet,
      functionOfChange: "重整句式与段落密度，使文本执行风格约束。",
    });
  }

  return evidence;
}

function buildIssueResolution(params: {
  readonly beforeIssues: ReadonlyArray<SceneAuditIssue>;
  readonly afterIssues: ReadonlyArray<SceneAuditIssue>;
  readonly textChanged: boolean;
}): ReadonlyArray<IssueResolution> {
  return params.beforeIssues.map((issue) => {
    const stillExists = params.afterIssues.some((afterIssue) => afterIssue.problem === issue.problem);
    if (!stillExists) {
      return {
        issue: issue.problem,
        status: "resolved",
        evidence: "该问题在 revise 后的 scene audit 中不再出现。",
      };
    }

    return {
      issue: issue.problem,
      status: params.textChanged ? "partially_resolved" : "unresolved",
      evidence: params.textChanged ? "文本已改写，但同类问题仍在 re-analysis 中出现。" : "文本未形成有效变化。",
    };
  });
}

function buildPostRewriteAssessment(params: {
  readonly beforeIssues: ReadonlyArray<SceneAuditIssue>;
  readonly afterIssues: ReadonlyArray<SceneAuditIssue>;
  readonly textChanged: boolean;
  readonly readerScoreDelta: RevisionComparisonReport["readerScoreDelta"];
}): PostRewriteAssessment {
  const issueResolution = buildIssueResolution({
    beforeIssues: params.beforeIssues,
    afterIssues: params.afterIssues,
    textChanged: params.textChanged,
  });
  const newIssuesIntroduced = params.afterIssues
    .map((issue) => issue.problem)
    .filter((problem) => !params.beforeIssues.some((issue) => issue.problem === problem));

  const benefitSummary: Array<PostRewriteAssessment["benefitSummary"][number]> = [];
  if (issueResolution.some((item) => item.issue.includes("决策") && item.status === "resolved")) {
    benefitSummary.push("improved_structure", "improved_clarity");
  }
  if (issueResolution.some((item) => item.issue.includes("冲突") && item.status !== "unresolved")) {
    benefitSummary.push("improved_tension");
  }
  if (params.readerScoreDelta.momentum > 0 || params.readerScoreDelta.hook > 0) {
    benefitSummary.push("improved_tension");
  }
  if (params.readerScoreDelta.memorability > 0 || params.readerScoreDelta.emotionalPeak > 0) {
    benefitSummary.push("improved_style");
  }
  if (benefitSummary.length === 0) {
    benefitSummary.push("no_meaningful_gain");
  }

  const resolvedCount = issueResolution.filter((item) => item.status === "resolved").length;
  const partiallyResolvedCount = issueResolution.filter((item) => item.status === "partially_resolved").length;
  let rewriteOutcome: PostRewriteAssessment["rewriteOutcome"] = "unchanged";

  if (newIssuesIntroduced.length > 0 && resolvedCount === 0) {
    rewriteOutcome = "worse";
  } else if (resolvedCount >= 2 || (resolvedCount >= 1 && params.readerScoreDelta.momentum > 0)) {
    rewriteOutcome = "clearly_better";
  } else if (resolvedCount >= 1 || partiallyResolvedCount >= 1) {
    rewriteOutcome = "slightly_better";
  }

  return {
    issueResolution,
    newIssuesIntroduced,
    rewriteOutcome,
    benefitSummary: dedupeStrings(benefitSummary) as PostRewriteAssessment["benefitSummary"],
  };
}

export class HeuristicReviseEngine implements ReviseEngine {
  readonly name = "heuristic";

  async revise(input: RevisionInput): Promise<RevisionResult> {
    const document = parseSceneDocument(input.draft.content);
    const targetSceneNumbers = collectTargetSceneNumbers(input);
    const targetSceneSet = new Set(targetSceneNumbers);
    const replacements: SceneTextUnit[] = [];
    const actualRewrittenSceneNumbers: number[] = [];
    const sceneRewriteMetadata: Record<string, { reason: ReadonlyArray<string>; strategy: ReadonlyArray<string> }> = {};

    for (const sceneText of document.scenes) {
      if (!targetSceneSet.has(sceneText.sceneNumber)) continue;

      const scene = input.plan.sceneBlueprint.find((entry) => entry.sceneNumber === sceneText.sceneNumber);
      if (!scene) continue;

      const issues = input.sceneAudit.issues.filter((issue) => issue.sceneNumber === scene.sceneNumber);
      const reason = buildSceneRewriteReason(issues);
      const strategy = buildSceneRewriteStrategy(scene, issues);
      const rewrittenContent = buildHeuristicSceneRewrite(sceneText.marker, scene, issues, pickSupportName(input, scene));

      if (rewrittenContent.trim() !== sceneText.content.trim()) {
        actualRewrittenSceneNumbers.push(scene.sceneNumber);
        sceneRewriteMetadata[String(scene.sceneNumber)] = { reason, strategy };
        replacements.push({
          sceneNumber: scene.sceneNumber,
          marker: sceneText.marker,
          content: rewrittenContent,
        });
      }
    }

    const revisedContent = replacements.length > 0 ? replaceSceneUnits(document, replacements) : input.draft.content;
    const trace = buildTrace({
      targetSceneNumbers,
      actualRewrittenSceneNumbers,
      reviewedSceneNumbers: dedupeNumbers(input.sceneAudit.issues.map((issue) => issue.sceneNumber)),
      allSceneNumbers: document.scenes.map((scene) => scene.sceneNumber),
      sceneRewriteMetadata,
    });

    return {
      draft: {
        ...input.draft,
        content: revisedContent,
        summary: `${input.draft.summary} 本版按 scene 级问题执行了局部重写。`,
      },
      trace,
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

  async revise(input: RevisionInput): Promise<RevisionResult> {
    const document = parseSceneDocument(input.draft.content);
    const targetSceneNumbers = collectTargetSceneNumbers(input);
    const targetSceneSet = new Set(targetSceneNumbers);
    const replacements: SceneTextUnit[] = [];
    const actualRewrittenSceneNumbers: number[] = [];
    const sceneRewriteMetadata: Record<string, { reason: ReadonlyArray<string>; strategy: ReadonlyArray<string> }> = {};

    for (const sceneText of document.scenes) {
      if (!targetSceneSet.has(sceneText.sceneNumber)) continue;

      const scene = input.plan.sceneBlueprint.find((entry) => entry.sceneNumber === sceneText.sceneNumber);
      if (!scene) continue;

      const issues = input.sceneAudit.issues.filter((issue) => issue.sceneNumber === scene.sceneNumber);
      const reason = buildSceneRewriteReason(issues);
      const strategy = buildSceneRewriteStrategy(scene, issues);
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
              characterHistory: input.characterHistory,
              themeHistory: input.themeHistory,
            }),
          },
        ],
      });

      const rewrittenContent = response.choices[0]?.message?.content?.trim();
      if (!rewrittenContent) {
        throw new Error(`LLM returned empty revised scene for scene ${scene.sceneNumber}`);
      }

      if (rewrittenContent !== sceneText.content.trim()) {
        actualRewrittenSceneNumbers.push(scene.sceneNumber);
        sceneRewriteMetadata[String(scene.sceneNumber)] = { reason, strategy };
        replacements.push({
          sceneNumber: scene.sceneNumber,
          marker: sceneText.marker,
          content: rewrittenContent,
        });
      }
    }

    const revisedContent = replacements.length > 0 ? replaceSceneUnits(document, replacements) : input.draft.content;
    const trace = buildTrace({
      targetSceneNumbers,
      actualRewrittenSceneNumbers,
      reviewedSceneNumbers: dedupeNumbers(input.sceneAudit.issues.map((issue) => issue.sceneNumber)),
      allSceneNumbers: document.scenes.map((scene) => scene.sceneNumber),
      sceneRewriteMetadata,
    });

    return {
      draft: {
        ...input.draft,
        content: revisedContent,
        summary: `${input.draft.summary} 本版由 LLM 按 scene 级问题执行了局部重写。`,
      },
      trace,
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

  if (params.analysis.readerReport.scores.hook < 5) reasons.push("hook 分过低");
  if (params.analysis.readerReport.scores.momentum < 6) reasons.push("momentum 分过低");

  for (const issue of params.sceneAudit.issues) {
    if (issue.severity !== "high") continue;
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
  readonly beforeIssues: ReadonlyArray<SceneAuditIssue>;
  readonly afterIssues: ReadonlyArray<SceneAuditIssue>;
  readonly scene: SceneBlueprintItem | undefined;
  readonly trace: RevisionTrace;
  readonly readerScoreDelta: RevisionComparisonReport["readerScoreDelta"];
}): SceneRevisionExplanation {
  const scene = params.scene;
  const metadata = params.trace.sceneRewriteMetadata[String(params.sceneNumber)];
  const textChanged = params.beforeContent.trim() !== params.afterContent.trim();

  return {
    sceneNumber: params.sceneNumber,
    sceneId: scene?.sceneId,
    sceneAnchor: scene?.sceneAnchor,
    beforeProblems: params.beforeIssues.map((issue) => issue.problem),
    appliedRewriteStrategy: metadata?.strategy ?? [],
    textualChangeEvidence: buildTextualChangeEvidence({
      beforeContent: params.beforeContent,
      afterContent: params.afterContent,
      beforeIssues: params.beforeIssues,
      scene,
    }),
    characterChange: scene
      ? `把 ${scene.drivingCharacter} 的决策“${scene.decision}”和代价“${scene.cost}”写进场景动作。`
      : "未捕获到 scene blueprint。",
    themeChange: scene
      ? `把价值冲突“${scene.valuePositionA} vs ${scene.valuePositionB}”通过 ${scene.sceneStance} 压进场景。`
      : "未捕获到主题冲突。",
    styleChange: scene ? `按风格指令执行局部重写：${scene.styleDirective}` : "未捕获到风格指令。",
    postRewriteAssessment: buildPostRewriteAssessment({
      beforeIssues: params.beforeIssues,
      afterIssues: params.afterIssues,
      textChanged,
      readerScoreDelta: params.readerScoreDelta,
    }),
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
  readonly trace: RevisionTrace;
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
  const beforeParsedSceneNumbers = beforeDoc.scenes.map((scene) => scene.sceneNumber);
  const afterParsedSceneNumbers = afterDoc.scenes.map((scene) => scene.sceneNumber);
  const beforeAnalysisSceneNumbers = params.before.scenes.map((scene) => scene.sceneNumber);
  const afterAnalysisSceneNumbers = params.after.scenes.map((scene) => scene.sceneNumber);

  const sceneChanges = params.trace.comparisonSceneNumbers.map((sceneNumber) =>
    buildSceneRevisionExplanation({
      sceneNumber,
      beforeContent: beforeDoc.scenes.find((scene) => scene.sceneNumber === sceneNumber)?.content ?? "",
      afterContent: afterDoc.scenes.find((scene) => scene.sceneNumber === sceneNumber)?.content ?? "",
      beforeIssues: params.beforeSceneAudit.issues.filter((issue) => issue.sceneNumber === sceneNumber),
      afterIssues: params.afterSceneAudit.issues.filter((issue) => issue.sceneNumber === sceneNumber),
      scene: params.plan.sceneBlueprint.find((scene) => scene.sceneNumber === sceneNumber),
      trace: params.trace,
      readerScoreDelta: delta,
    }),
  );

  const benefitSummary = dedupeStrings(sceneChanges.flatMap((scene) => scene.postRewriteAssessment.benefitSummary)) as RevisionComparisonReport["rewriteInterpretation"]["benefitSummary"];

  const rewriteFacts = {
    targetSceneNumbers: params.trace.targetSceneNumbers,
    actualRewrittenSceneNumbers: params.trace.actualRewrittenSceneNumbers,
    comparisonSceneNumbers: params.trace.comparisonSceneNumbers,
    unchangedSceneNumbers: params.trace.unchangedSceneNumbers,
    reviewedButNotRewrittenSceneNumbers: params.trace.reviewedButNotRewrittenSceneNumbers,
    sceneRewriteMetadata: params.trace.sceneRewriteMetadata,
    sceneAlignment: {
      mappingBasis: "comparison 按 draft 文本中的 scene marker 建立映射；re-analysis scene 数量单独记录。",
      beforeParsedSceneNumbers,
      afterParsedSceneNumbers,
      beforeAnalysisSceneNumbers,
      afterAnalysisSceneNumbers,
      stableByParsedScenes: JSON.stringify(beforeParsedSceneNumbers) === JSON.stringify(afterParsedSceneNumbers),
      stableByAnalysisScenes: JSON.stringify(beforeAnalysisSceneNumbers) === JSON.stringify(afterAnalysisSceneNumbers),
    },
  } satisfies RevisionComparisonReport["rewriteFacts"];

  const rewriteInterpretation = {
    summary:
      improved.length > 0
        ? `本轮修订后共有 ${improved.length} 项关键指标改善，并且只对 ${sceneChanges.length} 个实际改写的 scene 生成了解释。`
        : "本轮修订没有带来明显指标提升，需要重新审视 revise brief。",
    improved,
    unresolved,
    benefitSummary,
  } satisfies RevisionComparisonReport["rewriteInterpretation"];

  return {
    chapterNumber: params.chapterNumber,
    readerScoreDelta: delta,
    sceneIssueDelta,
    rewriteFacts,
    rewriteInterpretation,
    summary: rewriteInterpretation.summary,
    improved,
    unresolved,
    targetSceneNumbers: rewriteFacts.targetSceneNumbers,
    actualRewrittenSceneNumbers: rewriteFacts.actualRewrittenSceneNumbers,
    comparisonSceneNumbers: rewriteFacts.comparisonSceneNumbers,
    unchangedSceneNumbers: rewriteFacts.unchangedSceneNumbers,
    reviewedButNotRewrittenSceneNumbers: rewriteFacts.reviewedButNotRewrittenSceneNumbers,
    sceneRewriteMetadata: rewriteFacts.sceneRewriteMetadata,
    sceneAlignment: rewriteFacts.sceneAlignment,
    sceneChanges,
  };
}
