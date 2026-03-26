import type { CharacterState, ReaderExperienceReport, ThemeReport } from "../types.js";

export function buildRevisionBrief(params: {
  readonly chapterNumber: number;
  readonly readerReport: ReaderExperienceReport;
  readonly characterStates: ReadonlyArray<CharacterState>;
  readonly themeReport: ThemeReport;
}): string {
  const activeCharacters = params.characterStates.filter((entry) => entry.presentInChapter);
  const activeThemes = Array.isArray(params.themeReport.activeThemes) ? params.themeReport.activeThemes : [];
  const activeTheme = activeThemes[0];

  return [
    `# Chapter ${params.chapterNumber} Revision Brief`,
    "",
    "## Reader Experience",
    `- Summary: ${params.readerReport.summary}`,
    `- Hook: ${params.readerReport.scores.hook}/10`,
    `- Momentum: ${params.readerReport.scores.momentum}/10`,
    `- Emotional Peak: ${params.readerReport.scores.emotionalPeak}/10`,
    `- Suspense: ${params.readerReport.scores.suspense}/10`,
    `- Memorability: ${params.readerReport.scores.memorability}/10`,
    "",
    "## Character Pressure",
    ...activeCharacters.map(
      (entry) => `- ${entry.name}: decision=${entry.recentDecision}; cost=${entry.decisionCost}; arc=${entry.arcProgress}`,
    ),
    "",
    "## Theme Focus",
    activeTheme
      ? `- Theme: ${activeTheme.theme}; anti-theme pressure: ${activeTheme.antiTheme}; note: ${activeTheme.interpretation}`
      : "- No active theme captured",
    "",
    "## Suggested Revisions",
    ...params.readerReport.revisionSuggestions.map((entry) => `- ${entry}`),
    "",
  ].join("\n");
}
