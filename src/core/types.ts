export interface BookRecord {
  readonly id: string;
  readonly title: string;
  readonly authorVision: string;
  readonly targetReaders: ReadonlyArray<string>;
  readonly targetLength: number;
  readonly language: "zh" | "en";
}

export interface CharacterSeed {
  readonly name: string;
  readonly role: string;
  readonly baselineDesire: string;
  readonly baselineFear: string;
  readonly baselineMisbelief: string;
  readonly voiceNotes: string;
  readonly relationshipMap: ReadonlyArray<{
    readonly target: string;
    readonly status: string;
  }>;
}

export interface ThemeSeed {
  readonly theme: string;
  readonly antiTheme: string;
  readonly valueConflict: string;
  readonly keywords: ReadonlyArray<string>;
  readonly antiKeywords: ReadonlyArray<string>;
}

export interface StyleGuide {
  readonly narrativeVoice: string;
  readonly dialogueRule: string;
  readonly sentenceRhythm: string;
  readonly descriptionDensity: string;
  readonly paragraphStrategy: string;
}

export interface StyleProfile {
  readonly narrationStyle: string;
  readonly dialogueStyle: string;
  readonly pacingProfile: string;
  readonly descriptionDensity: string;
  readonly toneConstraints: ReadonlyArray<string>;
}

export interface HumanGate {
  readonly key: string;
  readonly label: string;
  readonly triggerChapter: number;
  readonly purpose: string;
}

export interface ScenePlanItem {
  readonly sceneId: string;
  readonly sceneAnchor: string;
  readonly sceneNumber: number;
  readonly pov: string;
  readonly goal: string;
  readonly conflict: string;
  readonly turn: string;
  readonly result: string;
  readonly newInformation: ReadonlyArray<string>;
  readonly emotionalShift: string;
  readonly sourceParagraphs: ReadonlyArray<string>;
}

export interface CharacterState {
  readonly name: string;
  readonly desire: string;
  readonly fear: string;
  readonly misbelief: string;
  readonly recentDecision: string;
  readonly decisionCost: string;
  readonly relationshipShift: ReadonlyArray<string>;
  readonly arcProgress: string;
  readonly presentInChapter: boolean;
}

export interface ThemeReport {
  readonly chapterNumber: number;
  readonly activeThemes: ReadonlyArray<{
    readonly theme: string;
    readonly antiTheme: string;
    readonly valueConflict: string;
    readonly themeSignalCount: number;
    readonly antiSignalCount: number;
    readonly interpretation: string;
  }>;
}

export interface StyleReport {
  readonly averageSentenceLength: number;
  readonly dialogueRatio: number;
  readonly descriptionRatio: number;
  readonly rhythmNote: string;
  readonly adherenceNote: string;
  readonly styleDriftPoints: ReadonlyArray<string>;
  readonly dialogueHomogeneitySpots: ReadonlyArray<string>;
  readonly descriptionBalanceNote: string;
}

export interface ReaderExperienceReport {
  readonly chapterNumber: number;
  readonly scores: {
    readonly hook: number;
    readonly momentum: number;
    readonly emotionalPeak: number;
    readonly suspense: number;
    readonly memorability: number;
  };
  readonly summary: string;
  readonly strengths: ReadonlyArray<string>;
  readonly risks: ReadonlyArray<string>;
  readonly revisionSuggestions: ReadonlyArray<string>;
}

export interface GateDecision {
  readonly chapterNumber: number;
  readonly gate: HumanGate | null;
  readonly required: boolean;
  readonly rationale: string;
}

export interface CharacterHistoryEntry {
  readonly chapterNumber: number;
  readonly desire: string;
  readonly fear: string;
  readonly recentDecision: string;
  readonly decisionCost: string;
  readonly arcProgress: string;
}

export interface CharacterHistory {
  readonly name: string;
  readonly latestState: CharacterState;
  readonly timeline: ReadonlyArray<CharacterHistoryEntry>;
}

export interface ThemeHistoryEntry {
  readonly chapterNumber: number;
  readonly theme: string;
  readonly antiTheme: string;
  readonly themeSignalCount: number;
  readonly antiSignalCount: number;
  readonly interpretation: string;
}

export interface ThemeHistory {
  readonly timeline: ReadonlyArray<ThemeHistoryEntry>;
}

export interface StoryMemory {
  readonly lastAnalyzedChapter: number;
  readonly activeHooks: ReadonlyArray<string>;
  readonly unresolvedRisks: ReadonlyArray<string>;
  readonly readerTrajectory: {
    readonly averageHookScore: number;
    readonly averageMomentumScore: number;
    readonly averageEmotionalPeakScore: number;
  };
}

export interface SceneBlueprintItem {
  readonly sceneId: string;
  readonly sceneAnchor: string;
  readonly sceneNumber: number;
  readonly pov: string;
  readonly goal: string;
  readonly conflict: string;
  readonly turn: string;
  readonly result: string;
  readonly newInformation: ReadonlyArray<string>;
  readonly emotionalShift: string;
  readonly drivingCharacter: string;
  readonly opposingForce: string;
  readonly decision: string;
  readonly cost: string;
  readonly relationshipChange: string;
  readonly thematicTension: string;
  readonly valuePositionA: string;
  readonly valuePositionB: string;
  readonly sceneStance: string;
  readonly styleDirective: string;
}

export interface ChapterPlan {
  readonly targetChapterNumber: number;
  readonly chapterMission: string;
  readonly readerGoal: string;
  readonly sceneBlueprint: ReadonlyArray<SceneBlueprintItem>;
  readonly characterIntent: ReadonlyArray<{
    readonly name: string;
    readonly desiredMovement: string;
    readonly costPressure: string;
  }>;
  readonly themeIntent: string;
  readonly thematicQuestion: string;
  readonly styleProfile: StyleProfile;
  readonly gateNote: string;
}

export interface ChapterDraft {
  readonly chapterNumber: number;
  readonly title: string;
  readonly content: string;
  readonly summary: string;
  readonly basedOnPlan: number;
}

export interface ChapterAnalysisBundle {
  readonly scenes: ReadonlyArray<ScenePlanItem>;
  readonly characterStates: ReadonlyArray<CharacterState>;
  readonly themeReport: ThemeReport;
  readonly styleReport: StyleReport;
  readonly readerReport: ReaderExperienceReport;
  readonly gateDecision: GateDecision;
  readonly revisionBrief: string;
}

export interface StorylabRunResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly outputs: ReadonlyArray<string>;
  readonly provider: string;
}

export interface StorylabPlanResult {
  readonly bookId: string;
  readonly targetChapterNumber: number;
  readonly outputPath: string;
  readonly provider: string;
}

export interface StorylabDraftResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly outputPath: string;
  readonly provider: string;
}

export interface DraftReviewArtifacts {
  readonly reviewPath: string;
  readonly revisionBriefPath: string;
}

export interface SceneAuditIssue {
  readonly sceneNumber: number;
  readonly severity: "low" | "medium" | "high";
  readonly problem: string;
  readonly recommendation: string;
}

export interface SceneAuditReport {
  readonly sceneCoverageOk: boolean;
  readonly issues: ReadonlyArray<SceneAuditIssue>;
}

export interface BlockingGateStatus {
  readonly blocking: boolean;
  readonly reasons: ReadonlyArray<string>;
  readonly blockingScenes: ReadonlyArray<{
    readonly sceneNumber: number;
    readonly issueTypes: ReadonlyArray<string>;
  }>;
}

export interface SceneRewriteMetadata {
  readonly reason: ReadonlyArray<string>;
  readonly strategy: ReadonlyArray<string>;
}

export interface TextualChangeEvidenceItem {
  readonly evidenceLayer: "structural" | "textual" | "localized";
  readonly changeType:
    | "decision_added"
    | "cost_clarified"
    | "conflict_strengthened"
    | "thematic_tension_inserted"
    | "dialogue_differentiated"
    | "pacing_compressed"
    | "style_tightened"
    | "general_rewrite";
  readonly locationHint: "opening" | "middle" | "closing" | "full_scene";
  readonly beforeSnippet: string;
  readonly afterSnippet: string;
  readonly functionOfChange: string;
}

export interface IssueResolution {
  readonly issue: string;
  readonly status: "resolved" | "partially_resolved" | "unresolved" | "regressed";
  readonly evidence: string;
}

export interface PostRewriteAssessment {
  readonly issueResolution: ReadonlyArray<IssueResolution>;
  readonly newIssuesIntroduced: ReadonlyArray<string>;
  readonly rewriteOutcome: "worse" | "unchanged" | "slightly_better" | "clearly_better";
  readonly benefitSummary: ReadonlyArray<
    "improved_structure" | "improved_clarity" | "improved_tension" | "improved_style" | "no_meaningful_gain"
  >;
}

export interface RevisionTrace {
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly unchangedSceneNumbers: ReadonlyArray<number>;
  readonly reviewedButNotRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
  readonly sceneRewriteMetadata: Readonly<Record<string, SceneRewriteMetadata>>;
}

export interface SceneRevisionExplanation {
  readonly sceneNumber: number;
  readonly sceneId?: string;
  readonly sceneAnchor?: string;
  readonly beforeProblems: ReadonlyArray<string>;
  readonly appliedRewriteStrategy: ReadonlyArray<string>;
  readonly textualChangeEvidence: ReadonlyArray<TextualChangeEvidenceItem>;
  readonly characterChange: string;
  readonly themeChange: string;
  readonly styleChange: string;
  readonly postRewriteAssessment: PostRewriteAssessment;
  readonly beforeExcerpt: string;
  readonly afterExcerpt: string;
}

export interface RewriteFacts {
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
  readonly unchangedSceneNumbers: ReadonlyArray<number>;
  readonly reviewedButNotRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly sceneRewriteMetadata: Readonly<Record<string, SceneRewriteMetadata>>;
  readonly sceneAlignment: {
    readonly mappingBasis: string;
    readonly beforeParsedSceneNumbers: ReadonlyArray<number>;
    readonly afterParsedSceneNumbers: ReadonlyArray<number>;
    readonly beforeAnalysisSceneNumbers: ReadonlyArray<number>;
    readonly afterAnalysisSceneNumbers: ReadonlyArray<number>;
    readonly stableByParsedScenes: boolean;
    readonly stableByAnalysisScenes: boolean;
  };
}

export interface RewriteInterpretation {
  readonly summary: string;
  readonly improved: ReadonlyArray<string>;
  readonly unresolved: ReadonlyArray<string>;
  readonly benefitSummary: ReadonlyArray<
    "improved_structure" | "improved_clarity" | "improved_tension" | "improved_style" | "no_meaningful_gain"
  >;
}

export interface RevisionComparisonReport {
  readonly chapterNumber: number;
  readonly readerScoreDelta: {
    readonly hook: number;
    readonly momentum: number;
    readonly emotionalPeak: number;
    readonly suspense: number;
    readonly memorability: number;
  };
  readonly sceneIssueDelta: number;
  readonly rewriteFacts: RewriteFacts;
  readonly rewriteInterpretation: RewriteInterpretation;
  readonly summary: string;
  readonly improved: ReadonlyArray<string>;
  readonly unresolved: ReadonlyArray<string>;
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
  readonly unchangedSceneNumbers: ReadonlyArray<number>;
  readonly reviewedButNotRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly sceneRewriteMetadata: Readonly<Record<string, SceneRewriteMetadata>>;
  readonly sceneAlignment: {
    readonly mappingBasis: string;
    readonly beforeParsedSceneNumbers: ReadonlyArray<number>;
    readonly afterParsedSceneNumbers: ReadonlyArray<number>;
    readonly beforeAnalysisSceneNumbers: ReadonlyArray<number>;
    readonly afterAnalysisSceneNumbers: ReadonlyArray<number>;
    readonly stableByParsedScenes: boolean;
    readonly stableByAnalysisScenes: boolean;
  };
  readonly sceneChanges: ReadonlyArray<SceneRevisionExplanation>;
}

export interface RevisionResult {
  readonly draft: ChapterDraft;
  readonly trace: RevisionTrace;
}

export interface StorylabDraftCycleResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly draftPath: string;
  readonly provider: string;
  readonly reviewPath: string;
  readonly revisionBriefPath: string;
  readonly blockingGate: BlockingGateStatus;
}

export interface StorylabRevisionCycleResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly initialDraftPath: string;
  readonly revisedDraftPath: string;
  readonly reviewPath: string;
  readonly revisedReviewPath: string;
  readonly comparisonPath: string;
  readonly provider: string;
  readonly blockingGate: BlockingGateStatus;
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
}
