import type {
  CharacterHistory,
  CharacterState,
  ReaderExperienceReport,
  StoryMemory,
  ThemeHistory,
  ThemeReport,
} from "../types.js";

export class HistoryBuilder {
  mergeCharacterHistory(
    previous: ReadonlyArray<CharacterHistory>,
    currentStates: ReadonlyArray<CharacterState>,
    chapterNumber: number,
  ): ReadonlyArray<CharacterHistory> {
    return currentStates.map((state) => {
      const previousEntry = previous.find((entry) => entry.name === state.name);
      const timeline = previousEntry?.timeline ?? [];
      return {
        name: state.name,
        latestState: state,
        timeline: [
          ...timeline,
          {
            chapterNumber,
            desire: state.desire,
            fear: state.fear,
            recentDecision: state.recentDecision,
            decisionCost: state.decisionCost,
            arcProgress: state.arcProgress,
          },
        ],
      };
    });
  }

  mergeThemeHistory(previous: ThemeHistory, report: ThemeReport): ThemeHistory {
    const nextEntries = report.activeThemes.map((entry) => ({
      chapterNumber: report.chapterNumber,
      theme: entry.theme,
      antiTheme: entry.antiTheme,
      themeSignalCount: entry.themeSignalCount,
      antiSignalCount: entry.antiSignalCount,
      interpretation: entry.interpretation,
    }));

    return {
      timeline: [...previous.timeline, ...nextEntries],
    };
  }

  buildStoryMemory(
    chapterNumber: number,
    readerReport: ReaderExperienceReport,
    characterHistory: ReadonlyArray<CharacterHistory>,
    themeHistory: ThemeHistory,
    previousMemory?: StoryMemory,
  ): StoryMemory {
    const previousCount = previousMemory?.lastAnalyzedChapter ?? 0;
    const nextCount = previousCount + 1;

    const averageHookScore =
      ((previousMemory?.readerTrajectory.averageHookScore ?? 0) * previousCount + readerReport.scores.hook) / nextCount;
    const averageMomentumScore =
      ((previousMemory?.readerTrajectory.averageMomentumScore ?? 0) * previousCount + readerReport.scores.momentum) / nextCount;
    const averageEmotionalPeakScore =
      ((previousMemory?.readerTrajectory.averageEmotionalPeakScore ?? 0) * previousCount + readerReport.scores.emotionalPeak) / nextCount;

    const activeHooks = [
      ...new Set(
        themeHistory.timeline
          .filter((entry) => entry.themeSignalCount > entry.antiSignalCount)
          .map((entry) => `${entry.theme}仍在推进`),
      ),
    ];

    const unresolvedRisks = [
      ...new Set([...(previousMemory?.unresolvedRisks ?? []), ...readerReport.risks]),
      ...characterHistory
        .filter((entry) => entry.latestState.presentInChapter)
        .map((entry) => `${entry.name}: ${entry.latestState.decisionCost}`),
    ];

    return {
      lastAnalyzedChapter: chapterNumber,
      activeHooks,
      unresolvedRisks,
      readerTrajectory: {
        averageHookScore,
        averageMomentumScore,
        averageEmotionalPeakScore,
      },
    };
  }
}
