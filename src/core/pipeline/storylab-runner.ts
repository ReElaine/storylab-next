import { HistoryBuilder } from "../modules/history-builder.js";
import { SceneAuditor } from "../modules/scene-auditor.js";
import { ProjectStore } from "../project/project-store.js";
import type {
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  DraftReviewArtifacts,
  DraftReviewArtifacts as RevisionArtifacts,
  SceneAuditReport,
  StorylabDraftCycleResult,
  StorylabDraftResult,
  StorylabPlanResult,
  StorylabRevisionCycleResult,
  StorylabRunResult,
} from "../types.js";
import { createAnalysisEngineFromEnv, type AnalysisEngine } from "../llm/analysis-engine.js";
import { createDraftWriterFromEnv, type DraftWriter } from "../llm/draft-engine.js";
import {
  buildBlockingGateStatus,
  buildRevisionComparisonReport,
  createReviseEngineFromEnv,
  type ReviseEngine,
} from "../llm/revise-engine.js";
import { createPlanningEngineFromEnv, type PlanningEngine } from "../llm/planning-engine.js";

export class StorylabRunner {
  private readonly store: ProjectStore;
  private readonly historyBuilder = new HistoryBuilder();
  private readonly draftWriter: DraftWriter;
  private readonly reviseEngine: ReviseEngine;
  private readonly analysisEngine: AnalysisEngine;
  private readonly planningEngine: PlanningEngine;
  private readonly sceneAuditor = new SceneAuditor();

  constructor(workspaceRoot: string) {
    this.store = new ProjectStore(workspaceRoot);
    this.draftWriter = createDraftWriterFromEnv();
    this.reviseEngine = createReviseEngineFromEnv();
    this.analysisEngine = createAnalysisEngineFromEnv();
    this.planningEngine = createPlanningEngineFromEnv();
  }

  async run(bookId: string, chapterNumber: number): Promise<StorylabRunResult> {
    await this.store.ensureStoryDirs(bookId);

    const [book, chapterText, characterSeeds, themeSeeds, styleGuide, gates, previousCharacterHistory, previousThemeHistory, previousMemory] = await Promise.all([
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
    };
  }

  async planNext(bookId: string, targetChapterNumber: number): Promise<StorylabPlanResult> {
    await this.store.ensureStoryDirs(bookId);
    const [styleGuide, characterHistory, themeHistory, storyMemory, gates] = await Promise.all([
      this.store.loadStyleGuide(bookId),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
      this.store.loadStoryMemory(bookId),
      this.store.loadHumanGates(bookId),
    ]);

    const plan = await this.planningEngine.plan({
      targetChapterNumber,
      characterHistory,
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
      provider: this.planningEngine.name,
    };
  }

  async draftFromPlan(bookId: string, targetChapterNumber: number): Promise<StorylabDraftResult> {
    await this.store.ensureStoryDirs(bookId);
    const [plan, characterHistory, themeHistory] = await Promise.all([
      this.store.loadChapterPlan(bookId, targetChapterNumber),
      this.store.loadCharacterHistory(bookId),
      this.store.loadThemeHistory(bookId),
    ]);

    if (!plan) {
      throw new Error(`No chapter plan found for chapter ${targetChapterNumber}. Run plan-next first.`);
    }

    const draft = await this.draftWriter.generate({ plan, characterHistory, themeHistory });
    const outputPath = await this.store.writeDraft(bookId, draft);

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      outputPath,
      provider: this.draftWriter.name,
    };
  }

  async draftCycle(bookId: string, targetChapterNumber: number, override = false): Promise<StorylabDraftCycleResult> {
    await this.store.ensureStoryDirs(bookId);
    const [draftResult, book, plan, characterSeeds, themeSeeds, styleGuide, gates] = await Promise.all([
      this.draftFromPlan(bookId, targetChapterNumber),
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

    const draftContent = await this.store.loadDraftContent(bookId, targetChapterNumber);
    const analysis = await this.analyzeChapterText(
      targetChapterNumber,
      draftContent,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    );
    const sceneAudit = this.sceneAuditor.audit(plan.sceneBlueprint, analysis.scenes);
    const blockingGate = buildBlockingGateStatus({ analysis, sceneAudit });
    if (blockingGate.blocking && !override) {
      throw new Error(`Blocking gate triggered: ${blockingGate.reasons.join("; ")}. Re-run with --override to continue.`);
    }
    const reviewArtifacts = await this.writeDraftReviewArtifacts(bookId, targetChapterNumber, book, analysis, sceneAudit);

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      draftPath: draftResult.outputPath,
      provider: draftResult.provider,
      reviewPath: reviewArtifacts.reviewPath,
      revisionBriefPath: reviewArtifacts.revisionBriefPath,
      blockingGate,
    };
  }

  async reviseCycle(bookId: string, targetChapterNumber: number, override = false): Promise<StorylabRevisionCycleResult> {
    await this.store.ensureStoryDirs(bookId);

    const [book, plan, characterSeeds, themeSeeds, styleGuide, gates, previousCharacterHistory, previousThemeHistory, previousMemory] = await Promise.all([
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

    const draftResult = await this.draftFromPlan(bookId, targetChapterNumber);
    const beforeDraftText = await this.store.loadDraftContent(bookId, targetChapterNumber);
    const beforeDraft: ChapterDraft = {
      chapterNumber: targetChapterNumber,
      title: plan.targetChapterNumber === targetChapterNumber ? "当前草稿" : `第${targetChapterNumber}章`,
      content: beforeDraftText,
      summary: "当前草稿",
      basedOnPlan: targetChapterNumber,
    };

    const beforeAnalysis = await this.analyzeChapterText(
      targetChapterNumber,
      beforeDraft.content,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    );
    const beforeSceneAudit = this.sceneAuditor.audit(plan.sceneBlueprint, beforeAnalysis.scenes);
    const blockingGate = buildBlockingGateStatus({ analysis: beforeAnalysis, sceneAudit: beforeSceneAudit });
    if (blockingGate.blocking && !override) {
      throw new Error(`Blocking gate triggered: ${blockingGate.reasons.join("; ")}. Re-run with --override to continue.`);
    }
    const beforeArtifacts = await this.writeDraftReviewArtifacts(
      bookId,
      targetChapterNumber,
      book,
      beforeAnalysis,
      beforeSceneAudit,
    );

    const revisedDraft = await this.reviseEngine.revise({
      draft: beforeDraft,
      plan,
      analysis: beforeAnalysis,
      sceneAudit: beforeSceneAudit,
      characterHistory: previousCharacterHistory,
      themeHistory: previousThemeHistory,
      styleGuide,
    });
    const revisedDraftPath = await this.store.writeRevisedDraft(bookId, revisedDraft);

    const afterAnalysis = await this.analyzeChapterText(
      targetChapterNumber,
      revisedDraft.content,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    );
    const afterSceneAudit = this.sceneAuditor.audit(plan.sceneBlueprint, afterAnalysis.scenes);
    const revisedArtifacts = await this.writeRevisionArtifacts(
      bookId,
      targetChapterNumber,
      book,
      afterAnalysis,
      afterSceneAudit,
    );

    const comparison = buildRevisionComparisonReport({
      chapterNumber: targetChapterNumber,
      before: beforeAnalysis,
      after: afterAnalysis,
      beforeSceneAudit,
      afterSceneAudit,
    });
    const comparisonPath = await this.store.writeOutput(
      bookId,
      "revisions",
      this.store.chapterFileName(targetChapterNumber, "comparison.json"),
      JSON.stringify(comparison, null, 2),
    );

    await this.persistChapterAnalysis({
      bookId,
      book,
      chapterNumber: targetChapterNumber,
      analysis: afterAnalysis,
      previousCharacterHistory,
      previousThemeHistory,
      previousMemory,
    });

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      initialDraftPath: draftResult.outputPath,
      revisedDraftPath,
      reviewPath: beforeArtifacts.reviewPath,
      revisedReviewPath: revisedArtifacts.reviewPath,
      comparisonPath,
      provider: this.reviseEngine.name,
      blockingGate,
    };
  }

  private analyzeChapterText(
    chapterNumber: number,
    chapterText: string,
    characterSeeds: Awaited<ReturnType<ProjectStore["loadCharacterSeeds"]>>,
    themeSeeds: Awaited<ReturnType<ProjectStore["loadThemeSeeds"]>>,
    styleGuide: Awaited<ReturnType<ProjectStore["loadStyleGuide"]>>,
    gates: Awaited<ReturnType<ProjectStore["loadHumanGates"]>>,
  ): Promise<ChapterAnalysisBundle> {
    return this.analysisEngine.analyze({
      chapterNumber,
      chapterText,
      characterSeeds,
      themeSeeds,
      styleGuide,
      gates,
    });
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

  private async writeDraftReviewArtifacts(
    bookId: string,
    chapterNumber: number,
    book: Awaited<ReturnType<ProjectStore["loadBook"]>>,
    analysis: ChapterAnalysisBundle,
    sceneAudit: SceneAuditReport,
  ): Promise<DraftReviewArtifacts> {
    const reviewPath = await this.store.writeOutput(
      bookId,
      "reviews/drafts",
      this.store.chapterFileName(chapterNumber, "draft-review.json"),
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
      "reviews/drafts",
      this.store.chapterFileName(chapterNumber, "draft-revision-brief.md"),
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
