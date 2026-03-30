import { buildRevisionBrief } from "../modules/revision-brief.js";
import { HistoryBuilder } from "../modules/history-builder.js";
import { HumanReviewGatekeeper } from "../modules/human-review-gates.js";
import { SettlementAgent } from "../modules/settlement-agent.js";
import { ContinuityAgent } from "../modules/continuity-agent.js";
import { SceneAuditor } from "../modules/scene-auditor.js";
import { ContextAssembler } from "../modules/context-assembler.js";
import { createAnalysisEngineFromEnv, type AnalysisEngine } from "../llm/analysis-engine.js";
import { createPlanningEngineFromEnv, type PlanningEngine } from "../llm/planning-engine.js";
import { createReaderCriticEngineFromEnv, type ReaderCriticEngine } from "../llm/reader-engine.js";
import {
  buildBlockingGateStatus,
  buildRevisionComparisonReport,
  createReviseEngineFromEnv,
  type ReviseEngine,
} from "../llm/revise-engine.js";
import { createWriterAgentFromEnv, type WriterAgent } from "../llm/writer-engine.js";
import { ProjectStore } from "../project/project-store.js";
import type {
  BlockingGateStatus,
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  ContinuityReport,
  ContinuityFinalizeResult,
  SettlementBundle,
  StorylabWriterCycleResult,
  StorylabWriterResult,
  WriterReviewArtifacts,
  WriterReviewArtifacts as RevisionArtifacts,
  SceneAuditReport,
  SettlementOutputPaths,
  StorylabPlanResult,
  StorylabRevisionCycleResult,
  StorylabRevisionLoopIteration,
  StorylabRevisionLoopResult,
  StorylabRunResult,
} from "../types.js";

function dedupeNumbers(values: ReadonlyArray<number>): ReadonlyArray<number> {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function formatScores(scores: ChapterAnalysisBundle["readerReport"]["scores"]): string {
  return `hook=${scores.hook}, momentum=${scores.momentum}, emotionalPeak=${scores.emotionalPeak}, suspense=${scores.suspense}, memorability=${scores.memorability}`;
}

function formatSceneIssues(issues: ReadonlyArray<SceneAuditReport["issues"][number]>): string {
  if (issues.length === 0) {
    return "无 scene audit 问题";
  }

  return issues
    .map((issue) => `场景${issue.sceneNumber}[${issue.severity}] ${issue.problem}`)
    .join("；");
}

function formatReasons(reasons: ReadonlyArray<string> | undefined): string {
  return reasons && reasons.length > 0 ? reasons.join("；") : "无";
}

function collectSceneNumbersFromText(lines: ReadonlyArray<string>): ReadonlyArray<number> {
  const values = new Set<number>();
  for (const line of lines) {
    const matches = line.matchAll(/场景\s*(\d+)/gu);
    for (const match of matches) {
      const sceneNumber = Number.parseInt(match[1] ?? "", 10);
      if (Number.isFinite(sceneNumber)) {
        values.add(sceneNumber);
      }
    }
  }
  return Array.from(values);
}

function collectSceneNumbersFromContinuity(report: ContinuityReport): ReadonlyArray<number> {
  const values = new Set<number>();
  for (const issue of report.issues) {
    if (issue.sceneNumber !== null) {
      values.add(issue.sceneNumber);
    }
    for (const ref of issue.refs) {
      const match = ref.match(/^scene-(\d+)$/u);
      if (!match) {
        continue;
      }
      const sceneNumber = Number.parseInt(match[1] ?? "", 10);
      if (Number.isFinite(sceneNumber)) {
        values.add(sceneNumber);
      }
    }
  }
  return Array.from(values);
}

function selectRevisionTargetScenes(
  plan: ChapterPlan,
  sceneAudit: SceneAuditReport,
  analysis: Pick<ChapterAnalysisBundle, "readerReport">,
  continuityReport?: ContinuityReport,
): ReadonlyArray<number> {
  const severityWeight = (severity: SceneAuditReport["issues"][number]["severity"]): number => {
    if (severity === "high") return 3;
    if (severity === "medium") return 2;
    return 1;
  };

  const importanceWeight = (scene: ChapterPlan["sceneBlueprint"][number] | undefined): number => {
    if (!scene) return 0;
    const text = [
      scene.goal,
      scene.conflict,
      scene.turn,
      scene.result,
      scene.decision,
      scene.cost,
      scene.thematicTension,
      scene.styleDirective,
    ].join(" ");

    let score = 0;
    if (/爆发|反击|反抗|夺回|决策|代价|高潮|最强冲突/u.test(text)) score += 3;
    if (/转折|后果|记恨|危险|断供/u.test(text)) score += 2;
    return score;
  };

  const costLandingWeight = (scene: ChapterPlan["sceneBlueprint"][number] | undefined): number => {
    if (!scene) return 0;
    const text = [scene.cost, scene.result, scene.thematicTension, scene.styleDirective, scene.sceneStance].join(" ");
    let score = 0;
    if (/代价|后果|断供|危险|记恨|打压|阴影/u.test(text)) score += 4;
    if (/收束|隐患|更冷|后续/u.test(text)) score += 2;
    return score;
  };

  const strongestConflictScene = plan.sceneBlueprint
    .slice()
    .sort((left, right) => importanceWeight(right) - importanceWeight(left) || left.sceneNumber - right.sceneNumber)[0];
  const strongestCostScene = plan.sceneBlueprint
    .slice()
    .sort((left, right) => costLandingWeight(right) - costLandingWeight(left) || right.sceneNumber - left.sceneNumber)[0];

  const scoreByScene = new Map<number, number>();
  for (const issue of sceneAudit.issues) {
    scoreByScene.set(issue.sceneNumber, (scoreByScene.get(issue.sceneNumber) ?? 0) + severityWeight(issue.severity));
  }

  const readerMentionedScenes = collectSceneNumbersFromText([
    ...analysis.readerReport.risks,
    ...analysis.readerReport.revisionSuggestions,
  ]);
  for (const sceneNumber of readerMentionedScenes) {
    scoreByScene.set(sceneNumber, (scoreByScene.get(sceneNumber) ?? 0) + 4);
  }

  for (const sceneNumber of continuityReport ? collectSceneNumbersFromContinuity(continuityReport) : []) {
    scoreByScene.set(sceneNumber, (scoreByScene.get(sceneNumber) ?? 0) + 5);
  }

  if (scoreByScene.size === 0 && analysis.readerReport.scores.emotionalPeak <= 8 && strongestConflictScene) {
    scoreByScene.set(strongestConflictScene.sceneNumber, importanceWeight(strongestConflictScene) + 1);
  }

  if (scoreByScene.size === 0) {
    return [];
  }

  const ranked = Array.from(scoreByScene.entries())
    .map(([sceneNumber, score]) => ({
      sceneNumber,
      score: score + importanceWeight(plan.sceneBlueprint.find((scene) => scene.sceneNumber === sceneNumber)),
    }))
    .sort((left, right) => right.score - left.score || left.sceneNumber - right.sceneNumber);

  const topScore = ranked[0]?.score ?? 0;
  const selected = ranked
    .filter((entry) => entry.score >= topScore - 1)
    .map((entry) => entry.sceneNumber)
    .slice(0, 2);

  if (
    analysis.readerReport.scores.emotionalPeak <= 8 &&
    strongestConflictScene &&
    !selected.includes(strongestConflictScene.sceneNumber)
  ) {
    selected.push(strongestConflictScene.sceneNumber);
  }

  if (
    strongestCostScene &&
    !selected.includes(strongestCostScene.sceneNumber) &&
    (selected.length === 1 || analysis.readerReport.risks.some((risk) => /代价|隐患|后续|断供|危险/u.test(risk)))
  ) {
    selected.push(strongestCostScene.sceneNumber);
  }

  return dedupeNumbers(selected).slice(0, 2);
}

interface RevisionPassContext {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly book: Awaited<ReturnType<ProjectStore["loadBook"]>>;
  readonly plan: ChapterPlan;
  readonly characterSeeds: Awaited<ReturnType<ProjectStore["loadCharacterSeeds"]>>;
  readonly themeSeeds: Awaited<ReturnType<ProjectStore["loadThemeSeeds"]>>;
  readonly styleGuide: Awaited<ReturnType<ProjectStore["loadStyleGuide"]>>;
  readonly gates: Awaited<ReturnType<ProjectStore["loadHumanGates"]>>;
  readonly previousCharacterHistory: Awaited<ReturnType<ProjectStore["loadCharacterHistory"]>>;
  readonly previousThemeHistory: Awaited<ReturnType<ProjectStore["loadThemeHistory"]>>;
  readonly previousMemory: Awaited<ReturnType<ProjectStore["loadStoryMemory"]>>;
}

interface RevisionPassArtifacts {
  readonly beforeAnalysis: ChapterAnalysisBundle;
  readonly beforeSceneAudit: SceneAuditReport;
  readonly beforeContinuity: ContinuityReport;
  readonly blockingGate: BlockingGateStatus;
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly revisedDraft: ChapterDraft;
  readonly revisedWorkingPath: string;
  readonly afterAnalysis: ChapterAnalysisBundle;
  readonly afterSceneAudit: SceneAuditReport;
  readonly afterSettlement: SettlementBundle;
  readonly afterContinuity: ContinuityReport;
  readonly afterContinuityReportPath: string;
  readonly postRevisionGate: BlockingGateStatus;
  readonly comparisonPath: string;
  readonly reviewPath: string;
  readonly revisedReviewPath: string;
  readonly revisionTrace: StorylabRevisionCycleResult["targetSceneNumbers"] extends ReadonlyArray<number> ? Awaited<ReturnType<ReviseEngine["revise"]>>["trace"] : never;
}

interface PrecomputedRevisionState {
  readonly analysis: ChapterAnalysisBundle;
  readonly sceneAudit: SceneAuditReport;
  readonly settlement: SettlementBundle;
  readonly continuityReport: ContinuityReport;
  readonly continuityReportPath: string;
  readonly blockingGate: BlockingGateStatus;
}

interface CanonicalCandidateArtifacts {
  readonly settlement: SettlementBundle;
  readonly continuityReport: ContinuityReport;
  readonly continuityReportPath: string;
}

export interface StorylabProgressEvent {
  readonly stage: "plan" | "writer" | "analysis" | "reader" | "revise" | "gate" | "persist" | "continuity" | "loop";
  readonly detail: string;
  readonly iteration?: number;
}

export class StorylabRunner {
  private readonly store: ProjectStore;
  private readonly historyBuilder = new HistoryBuilder();
  private readonly writerAgent: WriterAgent;
  private readonly reviseEngine: ReviseEngine;
  private readonly analysisEngine: AnalysisEngine;
  private readonly readerEngine: ReaderCriticEngine;
  private readonly planningEngine: PlanningEngine;
  private readonly sceneAuditor = new SceneAuditor();
  private readonly gatekeeper = new HumanReviewGatekeeper();
  private readonly settlementAgent = new SettlementAgent();
  private readonly continuityAgent = new ContinuityAgent();
  private readonly contextAssembler = new ContextAssembler();
  private readonly progressReporter?: (event: StorylabProgressEvent) => void;

  constructor(workspaceRoot: string, options?: { progressReporter?: (event: StorylabProgressEvent) => void }) {
    this.store = new ProjectStore(workspaceRoot);
    this.writerAgent = createWriterAgentFromEnv();
    this.reviseEngine = createReviseEngineFromEnv();
    this.analysisEngine = createAnalysisEngineFromEnv();
    this.readerEngine = createReaderCriticEngineFromEnv();
    this.planningEngine = createPlanningEngineFromEnv();
    this.progressReporter = options?.progressReporter;
  }

  private report(stage: StorylabProgressEvent["stage"], detail: string, iteration?: number): void {
    this.progressReporter?.({ stage, detail, iteration });
  }

  async run(bookId: string, chapterNumber: number): Promise<StorylabRunResult> {
    await this.store.ensureStoryDirs(bookId);

    const [
      book,
      chapterText,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
      previousCharacterHistory,
      previousThemeHistory,
      previousMemory,
    ] = await Promise.all([
      this.store.loadBook(bookId),
      this.store.loadChapter(bookId, chapterNumber),
      this.store.loadCharacterSeeds(bookId),
      this.store.loadThemeSeeds(bookId),
      this.store.loadStyleGuide(bookId),
      this.store.loadHumanGates(bookId),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
      this.store.loadStoryMemory(bookId),
    ]);

    const analysis = await this.analyzeChapterText(chapterNumber, chapterText, characterSeeds, themeSeeds, styleGuide, gates);
    const outputs = await this.persistChapterAnalysis({
      bookId,
      book,
      chapterNumber,
      analysis,
      previousCharacterHistory,
      previousThemeHistory,
      previousMemory,
    });

    return {
      bookId,
      chapterNumber,
      outputs,
      provider: this.analysisEngine.name,
      analysisProvider: this.analysisEngine.name,
      readerProvider: this.readerEngine.name,
    };
  }

  async planNext(bookId: string, targetChapterNumber: number): Promise<StorylabPlanResult> {
    await this.store.ensureStoryDirs(bookId);
    this.report("plan", `开始规划第 ${targetChapterNumber} 章`);
    const [book, styleGuide, characterHistory, themeHistory, storyMemory, chapterSummaries, chronology, openLoops, reveals, relationships, gates] = await Promise.all([
      this.store.loadBook(bookId),
      this.store.loadStyleGuide(bookId),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
      this.store.loadStoryMemory(bookId),
      this.store.loadRecentChapterSummaries(bookId, 3),
      this.store.loadChronology(bookId),
      this.store.loadOpenLoops(bookId),
      this.store.loadReveals(bookId),
      this.store.loadRelationships(bookId),
      this.store.loadHumanGates(bookId),
    ]);

    const contextPack = this.contextAssembler.assemblePlanContext({
      book,
      targetChapterNumber,
      chapterSummaries,
      characterHistory,
      chronology,
      openLoops,
      reveals,
      relationships,
    });

    const contextPackPath = await this.store.writeOutput(
      bookId,
      "context",
      this.store.chapterFileName(targetChapterNumber, "context-pack.json"),
      JSON.stringify(contextPack, null, 2),
    );

    const plan = await this.planningEngine.plan({
      targetChapterNumber,
      characterHistory,
      contextPack,
      themeHistory,
      memory: storyMemory,
      gates,
      styleGuide,
    });

    const outputPath = await this.store.writeOutput(
      bookId,
      "planning",
      this.store.chapterFileName(targetChapterNumber, "chapter-plan.json"),
      JSON.stringify(plan, null, 2),
    );

    return {
      bookId,
      targetChapterNumber,
      outputPath,
      contextPackPath,
      provider: this.planningEngine.name,
    };
  }

  async writerFromPlan(bookId: string, targetChapterNumber: number): Promise<StorylabWriterResult> {
    await this.store.ensureStoryDirs(bookId);
    this.report("writer", `开始生成第 ${targetChapterNumber} 章工作稿`);
    const [plan, contextPack, characterHistory, themeHistory] = await Promise.all([
      this.store.loadChapterPlan(bookId, targetChapterNumber),
      this.store.loadContextPack(bookId, targetChapterNumber),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
    ]);

    if (!plan) {
      throw new Error(`No chapter plan found for chapter ${targetChapterNumber}. Run plan-next first.`);
    }

    const draft = await this.writerAgent.generate({ plan, contextPack: contextPack ?? undefined, characterHistory, themeHistory });
    const writerWorkingPath = await this.store.writeWriterWorking(bookId, draft);
    this.report("writer", `第 ${targetChapterNumber} 章工作稿已写入`);

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      writerWorkingPath,
      provider: this.writerAgent.name,
      writerProvider: this.writerAgent.name,
    };
  }

  async writeFromPlan(bookId: string, targetChapterNumber: number): Promise<StorylabWriterResult> {
    return this.writerFromPlan(bookId, targetChapterNumber);
  }

  async draftFromPlan(bookId: string, targetChapterNumber: number): Promise<StorylabWriterResult> {
    return this.writerFromPlan(bookId, targetChapterNumber);
  }

  async writerCycle(bookId: string, targetChapterNumber: number, override = false): Promise<StorylabWriterCycleResult> {
    await this.store.ensureStoryDirs(bookId);
    this.report("loop", `启动 writer-cycle，第 ${targetChapterNumber} 章`);
    const [writerResult, book, plan, characterSeeds, themeSeeds, styleGuide, gates] = await Promise.all([
      this.writerFromPlan(bookId, targetChapterNumber),
      this.store.loadBook(bookId),
      this.store.loadChapterPlan(bookId, targetChapterNumber),
      this.store.loadCharacterSeeds(bookId),
      this.store.loadThemeSeeds(bookId),
      this.store.loadStyleGuide(bookId),
      this.store.loadHumanGates(bookId),
    ]);

    if (!plan) {
      throw new Error(`No chapter plan found for chapter ${targetChapterNumber}.`);
    }

    const writerText = await this.store.loadWriterWorkingContent(bookId, targetChapterNumber);
    const analysis = await this.analyzeChapterText(
      targetChapterNumber,
      writerText,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    );
    const sceneAudit = this.sceneAuditor.audit(plan.sceneBlueprint, analysis.scenes, writerText);
    const blockingGate = buildBlockingGateStatus({ analysis, sceneAudit });
    this.report("gate", `writer-cycle gate blocking=${blockingGate.blocking}`);
    this.report("gate", `writer-cycle reasons=${formatReasons(blockingGate.reasons)}`);
    this.report("gate", `writer-cycle advisory=${formatReasons(blockingGate.advisoryReasons)}`);
    if (blockingGate.blocking && !override) {
      throw new Error(
        `Blocking gate triggered: ${blockingGate.reasons.join("; ")}. Blocking scenes: ${blockingGate.blockingScenes.map((entry) => `${entry.sceneNumber}(${entry.issueTypes.join(", ")})`).join("; ")}. Re-run with --override to continue.`,
      );
    }

    const reviewArtifacts = await this.writeWriterReviewArtifacts(bookId, targetChapterNumber, book, analysis, sceneAudit);

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      writerWorkingPath: writerResult.writerWorkingPath,
      provider: writerResult.provider,
      writerProvider: this.writerAgent.name,
      analysisProvider: this.analysisEngine.name,
      readerProvider: this.readerEngine.name,
      reviewPath: reviewArtifacts.reviewPath,
      revisionBriefPath: reviewArtifacts.revisionBriefPath,
      blockingGate,
      finalProsePath: null,
      debug: {
        readerScores: analysis.readerReport.scores,
        readerSummary: analysis.readerReport.summary,
        readerSuggestions: analysis.readerReport.revisionSuggestions,
        sceneAuditIssues: sceneAudit.issues,
        blockingReasons: blockingGate.reasons,
      },
    };
  }

  async draftCycle(bookId: string, targetChapterNumber: number, override = false): Promise<StorylabWriterCycleResult> {
    return this.writerCycle(bookId, targetChapterNumber, override);
  }

  async reviseCycle(bookId: string, targetChapterNumber: number, override = false): Promise<StorylabRevisionCycleResult> {
    await this.store.ensureStoryDirs(bookId);
    this.report("loop", `启动 revise-cycle，第 ${targetChapterNumber} 章`);
    const ctx = await this.loadRevisionPassContext(bookId, targetChapterNumber);
    const writerResult = await this.writerFromPlan(bookId, targetChapterNumber);
    const initialWriterText = await this.store.loadWriterWorkingContent(bookId, targetChapterNumber);
    const initialWriterDraft: ChapterDraft = {
      chapterNumber: targetChapterNumber,
      title: `第${targetChapterNumber}章工作稿`,
      content: initialWriterText,
      summary: "当前工作稿",
      basedOnPlan: targetChapterNumber,
    };

    const pass = await this.executeRevisionPass(ctx, initialWriterDraft, override);
    const finalized: ContinuityFinalizeResult = pass.postRevisionGate.blocking || pass.afterContinuity.blocking
      ? {
          finalProsePath: null,
          settlementPaths: null,
          continuityReportPath: pass.afterContinuityReportPath,
          continuityBlocking: pass.afterContinuity.blocking,
        }
      : await this.finalizeAcceptedChapter(ctx, pass.revisedDraft, pass.afterAnalysis, {
          settlement: pass.afterSettlement,
          continuityReport: pass.afterContinuity,
          continuityReportPath: pass.afterContinuityReportPath,
        });

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      initialWriterWorkingPath: writerResult.writerWorkingPath,
      revisedWriterWorkingPath: pass.revisedWorkingPath,
      reviewPath: pass.reviewPath,
      revisedReviewPath: pass.revisedReviewPath,
      comparisonPath: pass.comparisonPath,
      provider: this.reviseEngine.name,
      writerProvider: this.writerAgent.name,
      analysisProvider: this.analysisEngine.name,
      readerProvider: this.readerEngine.name,
      reviseProvider: this.reviseEngine.name,
      blockingGate: pass.blockingGate,
      postRevisionGate: pass.postRevisionGate,
      finalProsePath: finalized.finalProsePath,
      settlementPaths: finalized.settlementPaths,
      continuityReportPath: finalized.continuityReportPath,
      continuityBlocking: finalized.continuityBlocking,
      targetSceneNumbers: pass.revisionTrace.targetSceneNumbers,
      actualRewrittenSceneNumbers: pass.revisionTrace.actualRewrittenSceneNumbers,
      comparisonSceneNumbers: pass.revisionTrace.comparisonSceneNumbers,
      debug: {
        beforeScores: pass.beforeAnalysis.readerReport.scores,
        afterScores: pass.afterAnalysis.readerReport.scores,
        beforeSummary: pass.beforeAnalysis.readerReport.summary,
        afterSummary: pass.afterAnalysis.readerReport.summary,
        beforeContinuitySummary: pass.beforeContinuity.summary,
        afterContinuitySummary: pass.afterContinuity.summary,
        beforeContinuityIssueCount: pass.beforeContinuity.issues.length,
        afterContinuityIssueCount: pass.afterContinuity.issues.length,
        beforeSuggestions: pass.beforeAnalysis.readerReport.revisionSuggestions,
        afterSuggestions: pass.afterAnalysis.readerReport.revisionSuggestions,
        beforeSceneAuditIssues: pass.beforeSceneAudit.issues,
        afterSceneAuditIssues: pass.afterSceneAudit.issues,
        blockingReasons: pass.blockingGate.reasons,
        postRevisionReasons: pass.postRevisionGate.reasons,
      },
    };
  }

  async reviseUntilPass(
    bookId: string,
    targetChapterNumber: number,
    options?: { override?: boolean; maxIterations?: number },
  ): Promise<StorylabRevisionLoopResult> {
    await this.store.ensureStoryDirs(bookId);
    this.report("loop", `启动 revise-until-pass，第 ${targetChapterNumber} 章，最多 ${options?.maxIterations ?? 3} 轮`);
    const maxIterations = options?.maxIterations ?? 3;
    const override = options?.override ?? false;
    const ctx = await this.loadRevisionPassContext(bookId, targetChapterNumber);
    const writerResult = await this.writerFromPlan(bookId, targetChapterNumber);
    let currentText = await this.store.loadWriterWorkingContent(bookId, targetChapterNumber);
    let currentDraft: ChapterDraft = {
      chapterNumber: targetChapterNumber,
      title: `第${targetChapterNumber}章工作稿`,
      content: currentText,
      summary: "当前工作稿",
      basedOnPlan: targetChapterNumber,
    };

    const iterations: StorylabRevisionLoopIteration[] = [];
    let latestWriterWorkingPath = writerResult.writerWorkingPath;
    let finalProsePath: string | null = null;
    let continuityReportPath: string | null = null;
    let continuityBlocking = false;
    let stopReason = "达到最大迭代次数仍未过线";
    let cachedBefore: PrecomputedRevisionState | null = null;

      for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      this.report("loop", `开始第 ${iteration} 轮修订`, iteration);
      const pass = await this.executeRevisionPass(ctx, currentDraft, override, cachedBefore ?? undefined);
      latestWriterWorkingPath = pass.revisedWorkingPath;

        iterations.push({
          iteration,
          beforeScores: pass.beforeAnalysis.readerReport.scores,
          afterScores: pass.afterAnalysis.readerReport.scores,
          beforeSummary: pass.beforeAnalysis.readerReport.summary,
          afterSummary: pass.afterAnalysis.readerReport.summary,
          beforeContinuityBlocking: pass.beforeContinuity.blocking,
          afterContinuityBlocking: pass.afterContinuity.blocking,
          beforeContinuitySummary: pass.beforeContinuity.summary,
          afterContinuitySummary: pass.afterContinuity.summary,
          beforeContinuityIssueCount: pass.beforeContinuity.issues.length,
          afterContinuityIssueCount: pass.afterContinuity.issues.length,
          blockingGate: pass.blockingGate,
          postRevisionGate: pass.postRevisionGate,
          targetSceneNumbers: pass.revisionTrace.targetSceneNumbers,
          actualRewrittenSceneNumbers: pass.revisionTrace.actualRewrittenSceneNumbers,
          comparisonSceneNumbers: pass.revisionTrace.comparisonSceneNumbers,
          beforeSuggestions: pass.beforeAnalysis.readerReport.revisionSuggestions,
          afterSuggestions: pass.afterAnalysis.readerReport.revisionSuggestions,
          beforeSceneAuditIssues: pass.beforeSceneAudit.issues,
          afterSceneAuditIssues: pass.afterSceneAudit.issues,
        });

        continuityReportPath = pass.afterContinuityReportPath;
        continuityBlocking = pass.afterContinuity.blocking;

        if (!pass.postRevisionGate.blocking && !pass.afterContinuity.blocking) {
          this.report("gate", `第 ${iteration} 轮后所有 gate 已通过`, iteration);
          const finalized = await this.finalizeAcceptedChapter(ctx, pass.revisedDraft, pass.afterAnalysis, {
            settlement: pass.afterSettlement,
            continuityReport: pass.afterContinuity,
            continuityReportPath: pass.afterContinuityReportPath,
          });
          finalProsePath = finalized.finalProsePath;
          continuityReportPath = finalized.continuityReportPath;
          continuityBlocking = finalized.continuityBlocking;
          stopReason = `第 ${iteration} 轮后所有 gate 已通过`;
          return {
            bookId,
            chapterNumber: targetChapterNumber,
            initialWriterWorkingPath: writerResult.writerWorkingPath,
            latestWriterWorkingPath,
            finalProsePath,
            settlementPaths: finalized.settlementPaths,
            continuityReportPath,
            continuityBlocking,
            passed: true,
            iterations,
            stopReason,
            maxIterations,
            writerProvider: this.writerAgent.name,
            analysisProvider: this.analysisEngine.name,
            readerProvider: this.readerEngine.name,
            reviseProvider: this.reviseEngine.name,
          };
        }

      if (pass.afterContinuity.blocking) {
        this.report("continuity", `第 ${iteration} 轮 re-audit 仍未通过`, iteration);
      }

      if (pass.revisionTrace.actualRewrittenSceneNumbers.length === 0) {
        this.report("gate", `第 ${iteration} 轮没有产生有效改写`, iteration);
        stopReason = `第 ${iteration} 轮未产生有效改写，停止继续循环`;
        break;
      }

      const scoreDelta = [
        pass.afterAnalysis.readerReport.scores.hook - pass.beforeAnalysis.readerReport.scores.hook,
        pass.afterAnalysis.readerReport.scores.momentum - pass.beforeAnalysis.readerReport.scores.momentum,
        pass.afterAnalysis.readerReport.scores.emotionalPeak - pass.beforeAnalysis.readerReport.scores.emotionalPeak,
        pass.afterAnalysis.readerReport.scores.suspense - pass.beforeAnalysis.readerReport.scores.suspense,
        pass.afterAnalysis.readerReport.scores.memorability - pass.beforeAnalysis.readerReport.scores.memorability,
      ];
      const anyImproved = scoreDelta.some((delta) => delta > 0);
      const issueReduced = pass.beforeSceneAudit.issues.length > pass.afterSceneAudit.issues.length;
      const continuityIssueReduced = pass.beforeContinuity.issues.length > pass.afterContinuity.issues.length;
      if (!anyImproved && !issueReduced && !continuityIssueReduced) {
        this.report("gate", `第 ${iteration} 轮没有带来有效提升`, iteration);
        stopReason = `第 ${iteration} 轮没有带来有效提升，停止继续循环`;
        break;
      }

      currentDraft = pass.revisedDraft;
      currentText = pass.revisedDraft.content;
      cachedBefore = {
        analysis: pass.afterAnalysis,
        sceneAudit: pass.afterSceneAudit,
        settlement: pass.afterSettlement,
        continuityReport: pass.afterContinuity,
        continuityReportPath: pass.afterContinuityReportPath,
        blockingGate: pass.postRevisionGate,
      };
      void currentText;
    }

      return {
        bookId,
        chapterNumber: targetChapterNumber,
        initialWriterWorkingPath: writerResult.writerWorkingPath,
        latestWriterWorkingPath,
        finalProsePath,
        settlementPaths: null,
        continuityReportPath,
        continuityBlocking,
        passed: false,
        iterations,
        stopReason,
        maxIterations,
        writerProvider: this.writerAgent.name,
        analysisProvider: this.analysisEngine.name,
        readerProvider: this.readerEngine.name,
        reviseProvider: this.reviseEngine.name,
      };
  }

  private async loadRevisionPassContext(bookId: string, targetChapterNumber: number): Promise<RevisionPassContext> {
    const [
      book,
      plan,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
      previousCharacterHistory,
      previousThemeHistory,
      previousMemory,
    ] = await Promise.all([
      this.store.loadBook(bookId),
      this.store.loadChapterPlan(bookId, targetChapterNumber),
      this.store.loadCharacterSeeds(bookId),
      this.store.loadThemeSeeds(bookId),
      this.store.loadStyleGuide(bookId),
      this.store.loadHumanGates(bookId),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
      this.store.loadStoryMemory(bookId),
    ]);

    if (!plan) {
      throw new Error(`No chapter plan found for chapter ${targetChapterNumber}. Run plan-next first.`);
    }

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      book,
      plan,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
      previousCharacterHistory,
      previousThemeHistory,
      previousMemory,
    };
  }

  private async evaluateCanonicalCandidate(
    ctx: RevisionPassContext,
    draft: ChapterDraft,
    analysis: ChapterAnalysisBundle,
  ): Promise<CanonicalCandidateArtifacts> {
    this.report("persist", `开始重结算第 ${ctx.chapterNumber} 章候选正文（基于第 ${ctx.chapterNumber - 1} 章前 canonical 基线）`);

    const [previousChronology, previousOpenLoops, previousRelationships, previousReveals, worldRules] = await Promise.all([
      this.store.loadChronologyBeforeChapter(ctx.bookId, ctx.chapterNumber),
      this.store.loadOpenLoopsBeforeChapter(ctx.bookId, ctx.chapterNumber),
      this.store.loadRelationshipsBeforeChapter(ctx.bookId, ctx.chapterNumber),
      this.store.loadRevealsBeforeChapter(ctx.bookId, ctx.chapterNumber),
      this.store.loadWorldRules(ctx.bookId),
    ]);

    const settlement = this.settlementAgent.settle({
      chapterNumber: ctx.chapterNumber,
      draft,
      plan: ctx.plan,
      analysis,
      previousChronology,
      previousOpenLoops,
      previousRelationships,
    });

    this.report("continuity", `开始跨章连续性审计：第 ${ctx.chapterNumber} 章候选正文`);
    const continuityReport = this.continuityAgent.audit({
      chapterNumber: ctx.chapterNumber,
      draft,
      plan: ctx.plan,
      analysis,
      settlement,
      previousChronology,
      previousOpenLoops,
      previousRelationships,
      previousReveals,
      previousCharacterHistory: ctx.previousCharacterHistory,
      worldRules,
    });
    const continuityReportPath = await this.store.writeOutput(
      ctx.bookId,
      "continuity",
      this.store.chapterFileName(ctx.chapterNumber, "continuity-report.json"),
      JSON.stringify(continuityReport, null, 2),
    );

    return {
      settlement,
      continuityReport,
      continuityReportPath,
    };
  }

  private async executeRevisionPass(
    ctx: RevisionPassContext,
    currentDraft: ChapterDraft,
    override: boolean,
    precomputedBefore?: PrecomputedRevisionState,
  ): Promise<RevisionPassArtifacts> {
    const beforeAnalysis = precomputedBefore?.analysis ?? await this.analyzeChapterText(
      ctx.chapterNumber,
      currentDraft.content,
      ctx.characterSeeds,
      ctx.themeSeeds,
      ctx.styleGuide,
      ctx.gates,
    );
    const beforeSceneAudit = precomputedBefore?.sceneAudit
      ?? this.sceneAuditor.audit(ctx.plan.sceneBlueprint, beforeAnalysis.scenes, currentDraft.content);
    const blockingGate = precomputedBefore?.blockingGate
      ?? buildBlockingGateStatus({ analysis: beforeAnalysis, sceneAudit: beforeSceneAudit });
    const beforeCandidate = precomputedBefore
      ? {
          settlement: precomputedBefore.settlement,
          continuityReport: precomputedBefore.continuityReport,
          continuityReportPath: precomputedBefore.continuityReportPath,
        }
      : await this.evaluateCanonicalCandidate(ctx, currentDraft, beforeAnalysis);
    const beforeContinuity = beforeCandidate.continuityReport;
    this.report("gate", `修订前 gate blocking=${blockingGate.blocking}`);
    this.report("gate", `修订前 blocking reasons=${formatReasons(blockingGate.reasons)}`);
    this.report("gate", `修订前 advisory reasons=${formatReasons(blockingGate.advisoryReasons)}`);
    this.report("reader", `修订前评分：${formatScores(beforeAnalysis.readerReport.scores)}`);
    this.report("reader", `修订前总结：${beforeAnalysis.readerReport.summary}`);
    this.report("reader", `修订前建议：${beforeAnalysis.readerReport.revisionSuggestions.join("；") || "无"}`);
    this.report("analysis", `修订前 scene audit：${formatSceneIssues(beforeSceneAudit.issues)}`);
    this.report("continuity", `修订前 continuity blocking=${beforeContinuity.blocking}`);
    this.report("continuity", `修订前 continuity 摘要：${beforeContinuity.summary}`);
    if (blockingGate.blocking && !override) {
      throw new Error(
        `Blocking gate triggered: ${blockingGate.reasons.join("; ")}. Blocking scenes: ${blockingGate.blockingScenes.map((entry) => `${entry.sceneNumber}(${entry.issueTypes.join(", ")})`).join("; ")}. Re-run with --override to continue.`,
      );
    }

    const beforeArtifacts = await this.writeWriterReviewArtifacts(
      ctx.bookId,
      ctx.chapterNumber,
      ctx.book,
      beforeAnalysis,
      beforeSceneAudit,
    );

    if (!blockingGate.blocking && !beforeContinuity.blocking) {
      const revisedWorkingPath = await this.store.writeRevisedWriterWorking(ctx.bookId, currentDraft);
      const revisedArtifacts = await this.writeRevisionArtifacts(
        ctx.bookId,
        ctx.chapterNumber,
        ctx.book,
        beforeAnalysis,
        beforeSceneAudit,
      );
      const emptyTrace = {
        targetSceneNumbers: [] as ReadonlyArray<number>,
        actualRewrittenSceneNumbers: [] as ReadonlyArray<number>,
        comparisonSceneNumbers: [] as ReadonlyArray<number>,
        unchangedSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
        reviewedButNotRewrittenSceneNumbers: [] as ReadonlyArray<number>,
        sceneRewriteMetadata: {},
        sceneAlignment: {
          mappingBasis: "当前版本已通过 gate，未执行 revise，before/after 共享同一份 scene 映射。",
          beforeParsedSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
          afterParsedSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
          beforeAnalysisSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
          afterAnalysisSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
          stableByParsedScenes: true,
          stableByAnalysisScenes: true,
        },
        summary: "当前版本已满足 pass 条件，未执行 scene-level revise。",
        improved: [],
        unresolved: [],
        benefitSummary: ["no_meaningful_gain"] as const,
        sceneChanges: [],
        readerScoreDelta: {
          hook: 0,
          momentum: 0,
          emotionalPeak: 0,
          suspense: 0,
          memorability: 0,
        },
        sceneIssueDelta: 0,
      };
      const comparisonPath = await this.store.writeOutput(
        ctx.bookId,
        "revisions",
        this.store.chapterFileName(ctx.chapterNumber, "comparison.json"),
        JSON.stringify(emptyTrace, null, 2),
      );

      return {
        beforeAnalysis,
        beforeSceneAudit,
        beforeContinuity,
        blockingGate,
        targetSceneNumbers: [],
        revisedDraft: currentDraft,
        revisedWorkingPath,
        afterAnalysis: beforeAnalysis,
        afterSceneAudit: beforeSceneAudit,
        afterSettlement: beforeCandidate.settlement,
        afterContinuity: beforeContinuity,
        afterContinuityReportPath: beforeCandidate.continuityReportPath,
        postRevisionGate: blockingGate,
        comparisonPath,
        reviewPath: beforeArtifacts.reviewPath,
        revisedReviewPath: revisedArtifacts.reviewPath,
        revisionTrace: {
          targetSceneNumbers: [],
          actualRewrittenSceneNumbers: [],
          unchangedSceneNumbers: beforeAnalysis.scenes.map((scene) => scene.sceneNumber),
          reviewedButNotRewrittenSceneNumbers: [],
          comparisonSceneNumbers: [],
          sceneRewriteMetadata: {},
        },
      };
    }

    const targetSceneNumbers =
      blockingGate.blockingScenes.length > 0
        ? (() => {
            const blockingSet = new Set(blockingGate.blockingScenes.map((entry) => entry.sceneNumber));
            const narrowed = selectRevisionTargetScenes(
              ctx.plan,
              {
                sceneCoverageOk: beforeSceneAudit.sceneCoverageOk,
                issues: beforeSceneAudit.issues.filter((issue) => blockingSet.has(issue.sceneNumber)),
              },
              beforeAnalysis,
              beforeContinuity,
            );
            return narrowed.length > 0 ? narrowed : Array.from(blockingSet).sort((left, right) => left - right).slice(0, 2);
          })()
        : selectRevisionTargetScenes(ctx.plan, beforeSceneAudit, beforeAnalysis, beforeContinuity);
    this.report("revise", `准备重写场景：${targetSceneNumbers.join(", ") || "无"}`);

    const revisionResult = await this.reviseEngine.revise({
      draft: currentDraft,
      plan: ctx.plan,
      analysis: beforeAnalysis,
      sceneAudit: beforeSceneAudit,
      continuityReport: beforeContinuity,
      characterHistory: ctx.previousCharacterHistory,
      themeHistory: ctx.previousThemeHistory,
      styleGuide: ctx.styleGuide,
      targetSceneNumbers,
    });
    const revisedDraft = revisionResult.draft;
    const revisedWorkingPath = await this.store.writeRevisedWriterWorking(ctx.bookId, revisedDraft);
    this.report("revise", `局部重写完成，实际改写场景：${revisionResult.trace.actualRewrittenSceneNumbers.join(", ") || "无"}`);

    const afterAnalysis = await this.analyzeChapterText(
      ctx.chapterNumber,
      revisedDraft.content,
      ctx.characterSeeds,
      ctx.themeSeeds,
      ctx.styleGuide,
      ctx.gates,
    );
    const afterSceneAudit = this.sceneAuditor.audit(ctx.plan.sceneBlueprint, afterAnalysis.scenes, revisedDraft.content);
    const postRevisionGate = buildBlockingGateStatus({ analysis: afterAnalysis, sceneAudit: afterSceneAudit });
    const afterCandidate = await this.evaluateCanonicalCandidate(ctx, revisedDraft, afterAnalysis);
    const afterContinuity = afterCandidate.continuityReport;
    this.report("gate", `修订后 gate blocking=${postRevisionGate.blocking}`);
    this.report("gate", `修订后 blocking reasons=${formatReasons(postRevisionGate.reasons)}`);
    this.report("gate", `修订后 advisory reasons=${formatReasons(postRevisionGate.advisoryReasons)}`);
    this.report("reader", `修订后评分：${formatScores(afterAnalysis.readerReport.scores)}`);
    this.report("reader", `修订后总结：${afterAnalysis.readerReport.summary}`);
    this.report("reader", `修订后建议：${afterAnalysis.readerReport.revisionSuggestions.join("；") || "无"}`);
    this.report("analysis", `修订后 scene audit：${formatSceneIssues(afterSceneAudit.issues)}`);
    this.report("continuity", `修订后 continuity blocking=${afterContinuity.blocking}`);
    this.report("continuity", `修订后 continuity 摘要：${afterContinuity.summary}`);
    const revisedArtifacts = await this.writeRevisionArtifacts(
      ctx.bookId,
      ctx.chapterNumber,
      ctx.book,
      afterAnalysis,
      afterSceneAudit,
    );

    const comparison = buildRevisionComparisonReport({
      chapterNumber: ctx.chapterNumber,
      before: beforeAnalysis,
      after: afterAnalysis,
      beforeSceneAudit,
      afterSceneAudit,
      plan: ctx.plan,
      beforeDraftContent: currentDraft.content,
      afterDraftContent: revisedDraft.content,
      trace: revisionResult.trace,
    });
    const comparisonPath = await this.store.writeOutput(
      ctx.bookId,
      "revisions",
      this.store.chapterFileName(ctx.chapterNumber, "comparison.json"),
      JSON.stringify(comparison, null, 2),
    );

    return {
      beforeAnalysis,
      beforeSceneAudit,
      beforeContinuity,
      blockingGate,
      targetSceneNumbers,
      revisedDraft,
      revisedWorkingPath,
      afterAnalysis,
      afterSceneAudit,
      afterSettlement: afterCandidate.settlement,
      afterContinuity,
      afterContinuityReportPath: afterCandidate.continuityReportPath,
      postRevisionGate,
      comparisonPath,
      reviewPath: beforeArtifacts.reviewPath,
      revisedReviewPath: revisedArtifacts.reviewPath,
      revisionTrace: revisionResult.trace,
    };
  }

  private async analyzeChapterText(
    chapterNumber: number,
    chapterText: string,
    characterSeeds: Awaited<ReturnType<ProjectStore["loadCharacterSeeds"]>>,
    themeSeeds: Awaited<ReturnType<ProjectStore["loadThemeSeeds"]>>,
    styleGuide: Awaited<ReturnType<ProjectStore["loadStyleGuide"]>>,
    gates: Awaited<ReturnType<ProjectStore["loadHumanGates"]>>,
  ): Promise<ChapterAnalysisBundle> {
    this.report("analysis", `开始章节分析：第 ${chapterNumber} 章`);
    const coreAnalysis = await this.analysisEngine.analyze({
      chapterNumber,
      chapterText,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    });

    this.report("reader", `开始 reader 评分：第 ${chapterNumber} 章`);
    const readerReport = await this.readerEngine.review({
      chapterNumber,
      chapterText,
      scenes: coreAnalysis.scenes,
      characterStates: coreAnalysis.characterStates,
      themeReport: coreAnalysis.themeReport,
      styleReport: coreAnalysis.styleReport,
    });
    const gateDecision = this.gatekeeper.decide(chapterNumber, gates);
    const revisionBrief = buildRevisionBrief({
      chapterNumber,
      readerReport,
      characterStates: coreAnalysis.characterStates,
      themeReport: coreAnalysis.themeReport,
    });
    this.report("reader", `reader 评分：${formatScores(readerReport.scores)}`);
    this.report("reader", `reader 总结：${readerReport.summary}`);
    this.report("reader", `reader 建议：${readerReport.revisionSuggestions.join("；") || "无"}`);

    return {
      ...coreAnalysis,
      readerReport,
      gateDecision,
      revisionBrief,
    };
  }

  private async persistChapterAnalysis(params: {
    readonly bookId: string;
    readonly book: Awaited<ReturnType<ProjectStore["loadBook"]>>;
    readonly chapterNumber: number;
    readonly analysis: ChapterAnalysisBundle;
    readonly previousCharacterHistory: Awaited<ReturnType<ProjectStore["loadCharacterHistory"]>>;
    readonly previousThemeHistory: Awaited<ReturnType<ProjectStore["loadThemeHistory"]>>;
    readonly previousMemory: Awaited<ReturnType<ProjectStore["loadStoryMemory"]>>;
  }): Promise<ReadonlyArray<string>> {
    this.report("persist", `写回第 ${params.chapterNumber} 章分析与跨章状态`);
    const characterHistory = this.historyBuilder.mergeCharacterHistory(
      params.previousCharacterHistory,
      params.analysis.characterStates,
      params.chapterNumber,
    );
    const themeHistory = this.historyBuilder.mergeThemeHistory(params.previousThemeHistory, params.analysis.themeReport);
    const storyMemory = this.historyBuilder.buildStoryMemory(
      params.chapterNumber,
      params.analysis.readerReport,
      characterHistory,
      themeHistory,
      params.previousMemory,
    );

    return Promise.all([
      this.store.writeOutput(
        params.bookId,
        "scenes",
        this.store.chapterFileName(params.chapterNumber, "scene-plan.json"),
        JSON.stringify({ book: params.book, chapterNumber: params.chapterNumber, scenes: params.analysis.scenes }, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "characters",
        this.store.chapterFileName(params.chapterNumber, "character-state.json"),
        JSON.stringify({ chapterNumber: params.chapterNumber, characterStates: params.analysis.characterStates }, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "themes",
        this.store.chapterFileName(params.chapterNumber, "theme-report.json"),
        JSON.stringify(params.analysis.themeReport, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "style",
        this.store.chapterFileName(params.chapterNumber, "style-report.json"),
        JSON.stringify(params.analysis.styleReport, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "reviews",
        this.store.chapterFileName(params.chapterNumber, "reader-experience.json"),
        JSON.stringify(params.analysis.readerReport, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "reviews",
        this.store.chapterFileName(params.chapterNumber, "revision-brief.md"),
        params.analysis.revisionBrief,
      ),
      this.store.writeOutput(
        params.bookId,
        "human-gates",
        this.store.chapterFileName(params.chapterNumber, "gate.json"),
        JSON.stringify(params.analysis.gateDecision, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "characters",
        "character-history.json",
        JSON.stringify(characterHistory, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "themes",
        "theme-history.json",
        JSON.stringify(themeHistory, null, 2),
      ),
      this.store.writeOutput(
        params.bookId,
        "memory",
        "story-memory.json",
        JSON.stringify(storyMemory, null, 2),
      ),
    ]);
  }

  private async finalizeAcceptedChapter(
    ctx: RevisionPassContext,
    draft: ChapterDraft,
    analysis: ChapterAnalysisBundle,
    precomputedCandidate?: CanonicalCandidateArtifacts,
  ): Promise<ContinuityFinalizeResult> {
    this.report("persist", `提交第 ${ctx.chapterNumber} 章 canonical state`);
    const candidate = precomputedCandidate ?? await this.evaluateCanonicalCandidate(ctx, draft, analysis);
    const settlement = candidate.settlement;
    const continuityReport = candidate.continuityReport;
    const continuityReportPath = candidate.continuityReportPath;
    this.report("continuity", `continuity blocking=${continuityReport.blocking}`);
    this.report("continuity", continuityReport.summary);

    if (continuityReport.blocking) {
      const continuityReasonSummary = continuityReport.issues
        .map((issue) => `${issue.code}:${issue.message}`)
        .join("; ");
      this.report("continuity", `blocking reasons: ${continuityReasonSummary}`);
      return {
        continuityReportPath,
        continuityBlocking: true,
        settlementPaths: null,
        finalProsePath: null,
      };
    }

    await this.persistChapterAnalysis({
      bookId: ctx.bookId,
      book: ctx.book,
      chapterNumber: ctx.chapterNumber,
      analysis,
      previousCharacterHistory: ctx.previousCharacterHistory,
      previousThemeHistory: ctx.previousThemeHistory,
      previousMemory: ctx.previousMemory,
    });

    const [chapterSummaryPath, stateDeltaPath, chronologyPath, openLoopsPath, revealsPath, relationshipsPath, finalProsePath] = await Promise.all([
      this.store.writeOutput(
        ctx.bookId,
        "settlement",
        this.store.chapterFileName(ctx.chapterNumber, "chapter-summary.json"),
        JSON.stringify(settlement.chapterSummary, null, 2),
      ),
      this.store.writeOutput(
        ctx.bookId,
        "settlement",
        this.store.chapterFileName(ctx.chapterNumber, "chapter-state-delta.json"),
        JSON.stringify(settlement.chapterStateDelta, null, 2),
      ),
      this.store.writeOutput(
        ctx.bookId,
        "plot",
        "chronology.json",
        JSON.stringify(settlement.chronology, null, 2),
      ),
      this.store.writeOutput(
        ctx.bookId,
        "plot",
        "open-loops.json",
        JSON.stringify(settlement.openLoops, null, 2),
      ),
      this.store.writeOutput(
        ctx.bookId,
        "plot",
        "reveals-ledger.json",
        JSON.stringify(settlement.reveals, null, 2),
      ),
      this.store.writeOutput(
        ctx.bookId,
        "characters",
        "relationship-ledger.json",
        JSON.stringify(settlement.relationships, null, 2),
      ),
      this.store.writeFinalProse(ctx.bookId, draft),
    ]);
    this.report("persist", `第 ${ctx.chapterNumber} 章 settlement 已写回 summary/state-delta/chronology/open-loops/reveals/relationships`);

    return {
      continuityReportPath,
      continuityBlocking: false,
      settlementPaths: {
        chapterSummaryPath,
        stateDeltaPath,
        chronologyPath,
        openLoopsPath,
        revealsPath,
        relationshipsPath,
      },
      finalProsePath,
    };
  }

  private async writeWriterReviewArtifacts(
    bookId: string,
    chapterNumber: number,
    book: Awaited<ReturnType<ProjectStore["loadBook"]>>,
    analysis: ChapterAnalysisBundle,
    sceneAudit: SceneAuditReport,
  ): Promise<WriterReviewArtifacts> {
    const reviewPath = await this.store.writeOutput(
      bookId,
      "reviews/writer",
      this.store.chapterFileName(chapterNumber, "writer-review.json"),
      JSON.stringify(
        {
          book,
          chapterNumber,
          scenes: analysis.scenes,
          sceneAudit,
          characterStates: analysis.characterStates,
          themeReport: analysis.themeReport,
          styleReport: analysis.styleReport,
          readerReport: analysis.readerReport,
          gateDecision: analysis.gateDecision,
        },
        null,
        2,
      ),
    );

    const revisionBriefPath = await this.store.writeOutput(
      bookId,
      "reviews/writer",
      this.store.chapterFileName(chapterNumber, "writer-revision-brief.md"),
      analysis.revisionBrief,
    );

    return { reviewPath, revisionBriefPath };
  }

  private async writeRevisionArtifacts(
    bookId: string,
    chapterNumber: number,
    book: Awaited<ReturnType<ProjectStore["loadBook"]>>,
    analysis: ChapterAnalysisBundle,
    sceneAudit: SceneAuditReport,
  ): Promise<RevisionArtifacts> {
    const reviewPath = await this.store.writeOutput(
      bookId,
      "reviews/revisions",
      this.store.chapterFileName(chapterNumber, "revised-review.json"),
      JSON.stringify(
        {
          book,
          chapterNumber,
          scenes: analysis.scenes,
          sceneAudit,
          characterStates: analysis.characterStates,
          themeReport: analysis.themeReport,
          styleReport: analysis.styleReport,
          readerReport: analysis.readerReport,
          gateDecision: analysis.gateDecision,
        },
        null,
        2,
      ),
    );

    const revisionBriefPath = await this.store.writeOutput(
      bookId,
      "reviews/revisions",
      this.store.chapterFileName(chapterNumber, "revised-revision-brief.md"),
      analysis.revisionBrief,
    );

    return { reviewPath, revisionBriefPath };
  }
}
