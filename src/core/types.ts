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

export interface WorldRuleEntry {
  readonly ruleId: string;
  readonly description: string;
  readonly severity: "medium" | "high";
  readonly forbiddenPhrases: ReadonlyArray<string>;
  readonly appliesWhenAnyPhrases: ReadonlyArray<string>;
  readonly requiredPhrases: ReadonlyArray<string>;
}

export interface WorldRulesConfig {
  readonly rules: ReadonlyArray<WorldRuleEntry>;
}

export interface ChapterSummaryRecord {
  readonly chapterNumber: number;
  readonly title: string;
  readonly summary: string;
  readonly keyEvents: ReadonlyArray<string>;
  readonly changedCharacters: ReadonlyArray<{
    readonly name: string;
    readonly summary: string;
    readonly recentDecision: string;
    readonly decisionCost: string;
  }>;
  readonly openedLoopIds: ReadonlyArray<string>;
  readonly advancedLoopIds: ReadonlyArray<string>;
  readonly closedLoopIds: ReadonlyArray<string>;
}

export interface BookPhaseState {
  readonly phaseKey: "opening" | "early-rise" | "mid-escalation" | "late-crisis" | "endgame";
  readonly label: string;
  readonly rationale: string;
  readonly tensionGoal: string;
}

export interface ChronologyEvent {
  readonly eventId: string;
  readonly chapterNumber: number;
  readonly sceneNumber: number | null;
  readonly sceneId?: string;
  readonly actors: ReadonlyArray<string>;
  readonly summary: string;
  readonly consequence: string;
}

export interface ChronologyLedger {
  readonly events: ReadonlyArray<ChronologyEvent>;
}

export interface OpenLoopEntry {
  readonly loopId: string;
  readonly type: "foreshadow" | "promise" | "question" | "debt" | "threat" | "mystery";
  readonly introducedInChapter: number;
  readonly owner: string;
  readonly description: string;
  readonly expectedPayoffWindow: "soon" | "mid" | "long";
  readonly urgency: "low" | "medium" | "high";
  readonly status: "open" | "advanced" | "closed";
  readonly payoffConstraints: ReadonlyArray<string>;
  readonly relatedEntities: ReadonlyArray<string>;
  readonly evidenceRefs: ReadonlyArray<string>;
  readonly lastUpdatedChapter: number;
}

export interface OpenLoopsLedger {
  readonly loops: ReadonlyArray<OpenLoopEntry>;
}

export interface RevealEntry {
  readonly revealId: string;
  readonly chapterNumber: number;
  readonly sceneNumber: number | null;
  readonly sceneId?: string;
  readonly sourceLoopId: string | null;
  readonly category: "mystery" | "question" | "promise";
  readonly subject: string;
  readonly revealedTruth: string;
  readonly revealStrength: "hinted" | "partial" | "explicit";
  readonly knownByReader: boolean;
  readonly knownByCharacters: ReadonlyArray<string>;
  readonly evidenceRefs: ReadonlyArray<string>;
}

export interface RevealsLedger {
  readonly entries: ReadonlyArray<RevealEntry>;
}

export interface RelationshipLedgerEntry {
  readonly relationshipId: string;
  readonly characters: readonly [string, string];
  readonly status: string;
  readonly polarity: "allied" | "hostile" | "strained" | "neutral";
  readonly tension: "low" | "medium" | "high";
  readonly lastChange: string;
  readonly lastUpdatedChapter: number;
  readonly evidenceRefs: ReadonlyArray<string>;
}

export interface RelationshipLedger {
  readonly entries: ReadonlyArray<RelationshipLedgerEntry>;
}

export interface ThemeProgressionEntry {
  readonly chapterNumber: number;
  readonly primaryTheme: string;
  readonly antiTheme: string;
  readonly thematicQuestion: string;
  readonly movementSummary: string;
  readonly stance: "toward_theme" | "toward_anti_theme" | "mixed";
  readonly pressurePoint: string;
  readonly carrierCharacters: ReadonlyArray<string>;
  readonly supportingSceneNumbers: ReadonlyArray<number>;
  readonly evidenceRefs: ReadonlyArray<string>;
}

export interface ThemeProgressionLedger {
  readonly entries: ReadonlyArray<ThemeProgressionEntry>;
}

export interface SceneStateDelta {
  readonly sceneNumber: number;
  readonly sceneId?: string;
  readonly sceneAnchor?: string;
  readonly actors: ReadonlyArray<string>;
  readonly summary: string;
  readonly consequence: string;
  readonly stateHighlights: ReadonlyArray<string>;
  readonly loopIds: ReadonlyArray<string>;
  readonly revealIds: ReadonlyArray<string>;
  readonly relationshipIds: ReadonlyArray<string>;
  readonly themeBeat: string;
}

export interface ChapterStateDelta {
  readonly chapterNumber: number;
  readonly title: string;
  readonly changedCharacters: ReadonlyArray<{
    readonly name: string;
    readonly currentDecision: string;
    readonly decisionCost: string;
    readonly arcProgress: string;
    readonly summary: string;
  }>;
  readonly sceneDeltas?: ReadonlyArray<SceneStateDelta>;
  readonly chronologyInsertions: ReadonlyArray<ChronologyEvent>;
  readonly updatedLoops: ReadonlyArray<{
    readonly loopId: string;
    readonly action: "opened" | "advanced" | "closed";
    readonly description: string;
    readonly evidence: string;
  }>;
  readonly themeShift?: ThemeProgressionEntry;
  readonly stateHighlights: ReadonlyArray<string>;
}

export interface SettlementBundle {
  readonly chapterSummary: ChapterSummaryRecord;
  readonly chapterStateDelta: ChapterStateDelta;
  readonly chronology: ChronologyLedger;
  readonly openLoops: OpenLoopsLedger;
  readonly reveals: RevealsLedger;
  readonly relationships: RelationshipLedger;
  readonly themeProgression: ThemeProgressionLedger;
}

export interface SettlementOutputPaths {
  readonly chapterSummaryPath: string;
  readonly stateDeltaPath: string;
  readonly chronologyPath: string;
  readonly openLoopsPath: string;
  readonly revealsPath: string;
  readonly relationshipsPath: string;
  readonly themeProgressionPath: string;
}

export interface ContinuityIssue {
  readonly code:
    | "timeline_conflict"
    | "scene_coverage_conflict"
    | "character_state_conflict"
    | "relationship_conflict"
    | "open_loop_conflict"
    | "reveal_conflict"
    | "world_rule_conflict"
    | "world_rule_check_skipped";
  readonly severity: "low" | "medium" | "high";
  readonly scope: "chapter" | "scene" | "state";
  readonly sceneNumber: number | null;
  readonly refs: ReadonlyArray<string>;
  readonly message: string;
  readonly recommendation: string;
}

export interface ContinuityReport {
  readonly chapterNumber: number;
  readonly blocking: boolean;
  readonly summary: string;
  readonly issues: ReadonlyArray<ContinuityIssue>;
  readonly checkedCounts: {
    readonly previousChronologyEvents: number;
    readonly previousOpenLoops: number;
    readonly previousReveals: number;
    readonly previousRelationships: number;
    readonly trackedCharacters: number;
    readonly chronologyInsertions: number;
    readonly worldRules: number;
  };
  readonly skippedChecks: ReadonlyArray<"world_rules">;
}

export interface ContinuityFinalizeResult {
  readonly continuityReportPath: string | null;
  readonly continuityBlocking: boolean;
  readonly settlementPaths: SettlementOutputPaths | null;
  readonly finalProsePath: string | null;
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

export interface ContextPack {
  readonly taskType: "plan-next" | "writer";
  readonly targetChapterNumber: number;
  readonly currentBookPhase: BookPhaseState;
  readonly recentChapterSummaries: ReadonlyArray<ChapterSummaryRecord>;
  readonly activeOpenLoops: ReadonlyArray<OpenLoopEntry>;
  readonly recentReveals: ReadonlyArray<RevealEntry>;
  readonly recentRelationshipChanges: ReadonlyArray<RelationshipLedgerEntry>;
  readonly recentThemeProgression: ReadonlyArray<ThemeProgressionEntry>;
  readonly chronologySlice: ReadonlyArray<ChronologyEvent>;
  readonly relevantCharacterStates: ReadonlyArray<{
    readonly name: string;
    readonly currentDesire: string;
    readonly currentFear: string;
    readonly currentMisbelief: string;
    readonly recentDecision: string;
    readonly decisionCost: string;
    readonly arcProgress: string;
    readonly relationshipShift: ReadonlyArray<string>;
  }>;
  readonly carryForwardFacts: ReadonlyArray<string>;
  readonly planningFocus: ReadonlyArray<string>;
}

export interface ChapterDraft {
  readonly chapterNumber: number;
  readonly title: string;
  readonly content: string;
  readonly summary: string;
  readonly basedOnPlan: number;
}

export type ChapterWriterOutput = ChapterDraft;

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
  readonly analysisProvider?: string;
  readonly readerProvider?: string;
}

export interface StorylabPlanResult {
  readonly bookId: string;
  readonly targetChapterNumber: number;
  readonly outputPath: string;
  readonly contextPackPath?: string;
  readonly provider: string;
}

export interface StorylabWriterResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly writerWorkingPath: string;
  readonly provider: string;
  readonly writerProvider?: string;
}

export interface WriterReviewArtifacts {
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
  readonly advisoryReasons?: ReadonlyArray<string>;
  readonly readerPassed?: boolean;
  readonly blockingScenes: ReadonlyArray<{
    readonly sceneNumber: number;
    readonly issueTypes: ReadonlyArray<string>;
  }>;
  readonly advisoryScenes?: ReadonlyArray<{
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

export interface StorylabWriterCycleResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly writerWorkingPath: string;
  readonly provider: string;
  readonly writerProvider: string;
  readonly analysisProvider: string;
  readonly readerProvider?: string;
  readonly reviewPath: string;
  readonly revisionBriefPath: string;
  readonly blockingGate: BlockingGateStatus;
  readonly finalProsePath: string | null;
  readonly debug: {
    readonly readerScores: ReaderExperienceReport["scores"];
    readonly readerSummary: string;
    readonly readerSuggestions: ReadonlyArray<string>;
    readonly sceneAuditIssues: ReadonlyArray<SceneAuditIssue>;
    readonly blockingReasons: ReadonlyArray<string>;
  };
}

export type StorylabDraftResult = StorylabWriterResult;
export type DraftReviewArtifacts = WriterReviewArtifacts;
export type StorylabDraftCycleResult = StorylabWriterCycleResult;

export interface StorylabRevisionCycleResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly initialWriterWorkingPath: string;
  readonly revisedWriterWorkingPath: string;
  readonly reviewPath: string;
  readonly revisedReviewPath: string;
  readonly comparisonPath: string;
  readonly provider: string;
  readonly writerProvider: string;
  readonly analysisProvider: string;
  readonly readerProvider?: string;
  readonly reviseProvider: string;
  readonly blockingGate: BlockingGateStatus;
  readonly postRevisionGate: BlockingGateStatus;
  readonly finalProsePath: string | null;
  readonly settlementPaths: SettlementOutputPaths | null;
  readonly continuityReportPath: string | null;
  readonly continuityBlocking: boolean;
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
  readonly debug: {
    readonly beforeScores: ReaderExperienceReport["scores"];
    readonly afterScores: ReaderExperienceReport["scores"];
    readonly beforeSummary: string;
    readonly afterSummary: string;
    readonly beforeContinuitySummary: string;
    readonly afterContinuitySummary: string;
    readonly beforeContinuityIssueCount: number;
    readonly afterContinuityIssueCount: number;
    readonly beforeSuggestions: ReadonlyArray<string>;
    readonly afterSuggestions: ReadonlyArray<string>;
    readonly beforeSceneAuditIssues: ReadonlyArray<SceneAuditIssue>;
    readonly afterSceneAuditIssues: ReadonlyArray<SceneAuditIssue>;
    readonly blockingReasons: ReadonlyArray<string>;
    readonly postRevisionReasons: ReadonlyArray<string>;
  };
}

export interface StorylabRevisionLoopIteration {
  readonly iteration: number;
  readonly beforeScores: ReaderExperienceReport["scores"];
  readonly afterScores: ReaderExperienceReport["scores"];
  readonly beforeSummary: string;
  readonly afterSummary: string;
  readonly beforeContinuityBlocking: boolean;
  readonly afterContinuityBlocking: boolean;
  readonly beforeContinuitySummary: string;
  readonly afterContinuitySummary: string;
  readonly beforeContinuityIssueCount: number;
  readonly afterContinuityIssueCount: number;
  readonly blockingGate: BlockingGateStatus;
  readonly postRevisionGate: BlockingGateStatus;
  readonly targetSceneNumbers: ReadonlyArray<number>;
  readonly actualRewrittenSceneNumbers: ReadonlyArray<number>;
  readonly comparisonSceneNumbers: ReadonlyArray<number>;
  readonly beforeSuggestions: ReadonlyArray<string>;
  readonly afterSuggestions: ReadonlyArray<string>;
  readonly beforeSceneAuditIssues: ReadonlyArray<SceneAuditIssue>;
  readonly afterSceneAuditIssues: ReadonlyArray<SceneAuditIssue>;
}

export interface StorylabRevisionLoopResult {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly initialWriterWorkingPath: string;
  readonly latestWriterWorkingPath: string;
  readonly finalProsePath: string | null;
  readonly settlementPaths: SettlementOutputPaths | null;
  readonly continuityReportPath: string | null;
  readonly continuityBlocking: boolean;
  readonly passed: boolean;
  readonly iterations: ReadonlyArray<StorylabRevisionLoopIteration>;
  readonly stopReason: string;
  readonly maxIterations: number;
  readonly writerProvider: string;
  readonly analysisProvider: string;
  readonly readerProvider?: string;
  readonly reviseProvider: string;
}
