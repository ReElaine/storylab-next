import { ProjectStore } from "../project/project-store.js";
import { HistoryBuilder } from "../modules/history-builder.js";
import type {
  ChapterAnalysisBundle,
  DraftReviewArtifacts,
  StorylabDraftCycleResult,
  StorylabDraftResult,
  StorylabPlanResult,
  StorylabRunResult,
} from "../types.js";
import { createDraftWriterFromEnv, type DraftWriter } from "../llm/draft-engine.js";
import { createAnalysisEngineFromEnv, type AnalysisEngine } from "../llm/analysis-engine.js";
import { createPlanningEngineFromEnv, type PlanningEngine } from "../llm/planning-engine.js";

export class StorylabRunner {
  private readonly store: ProjectStore;
  private readonly historyBuilder = new HistoryBuilder();
  private readonly draftWriter: DraftWriter;
  private readonly analysisEngine: AnalysisEngine;
  private readonly planningEngine: PlanningEngine;

  constructor(workspaceRoot: string) {
    this.store = new ProjectStore(workspaceRoot);
    this.draftWriter = createDraftWriterFromEnv();
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
    const characterHistory = this.historyBuilder.mergeCharacterHistory(
      previousCharacterHistory,
      analysis.characterStates,
      chapterNumber,
    );
    const themeHistory = this.historyBuilder.mergeThemeHistory(previousThemeHistory, analysis.themeReport);
    const storyMemory = this.historyBuilder.buildStoryMemory(
      chapterNumber,
      analysis.readerReport,
      characterHistory,
      themeHistory,
      previousMemory,
    );

    const outputs = await Promise.all([
      this.store.writeOutput(
        bookId,
        "scenes",
        this.store.chapterFileName(chapterNumber, "scene-plan.json"),
        JSON.stringify({ book, chapterNumber, scenes: analysis.scenes }, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "characters",
        this.store.chapterFileName(chapterNumber, "character-state.json"),
        JSON.stringify({ chapterNumber, characterStates: analysis.characterStates }, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "themes",
        this.store.chapterFileName(chapterNumber, "theme-report.json"),
        JSON.stringify(analysis.themeReport, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "style",
        this.store.chapterFileName(chapterNumber, "style-report.json"),
        JSON.stringify(analysis.styleReport, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "reviews",
        this.store.chapterFileName(chapterNumber, "reader-experience.json"),
        JSON.stringify(analysis.readerReport, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "reviews",
        this.store.chapterFileName(chapterNumber, "revision-brief.md"),
        analysis.revisionBrief,
      ),
      this.store.writeOutput(
        bookId,
        "human-gates",
        this.store.chapterFileName(chapterNumber, "gate.json"),
        JSON.stringify(analysis.gateDecision, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "characters",
        "character-history.json",
        JSON.stringify(characterHistory, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "themes",
        "theme-history.json",
        JSON.stringify(themeHistory, null, 2),
      ),
      this.store.writeOutput(
        bookId,
        "memory",
        "story-memory.json",
        JSON.stringify(storyMemory, null, 2),
      ),
    ]);

    return {
      bookId,
      chapterNumber,
      outputs,
      provider: this.analysisEngine.name,
    };
  }

  async planNext(bookId: string, targetChapterNumber: number): Promise<StorylabPlanResult> {
    await this.store.ensureStoryDirs(bookId);
    const [characterHistory, themeHistory, storyMemory, gates] = await Promise.all([
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

  async draftCycle(bookId: string, targetChapterNumber: number): Promise<StorylabDraftCycleResult> {
    await this.store.ensureStoryDirs(bookId);
    const [draftResult, book, characterSeeds, themeSeeds, styleGuide, gates] = await Promise.all([
      this.draftFromPlan(bookId, targetChapterNumber),
      this.store.loadBook(bookId),
      this.store.loadCharacterSeeds(bookId),
      this.store.loadThemeSeeds(bookId),
      this.store.loadStyleGuide(bookId),
      this.store.loadHumanGates(bookId),
    ]);

    const plan = await this.store.loadChapterPlan(bookId, targetChapterNumber);
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

    const reviewArtifacts = await this.writeDraftReviewArtifacts(
      bookId,
      targetChapterNumber,
      book,
      analysis,
    );

    return {
      bookId,
      chapterNumber: targetChapterNumber,
      draftPath: draftResult.outputPath,
      provider: draftResult.provider,
      reviewPath: reviewArtifacts.reviewPath,
      revisionBriefPath: reviewArtifacts.revisionBriefPath,
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

  private async writeDraftReviewArtifacts(
    bookId: string,
    chapterNumber: number,
    book: Awaited<ReturnType<ProjectStore["loadBook"]>>,
    analysis: ChapterAnalysisBundle,
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

    return {
      reviewPath,
      revisionBriefPath,
    };
  }
}
