import type { ThemeReport, ThemeSeed } from "../types.js";
import { countOccurrences } from "../utils/text.js";

export class ThemeTracker {
  evaluate(chapterNumber: number, chapterText: string, themes: ReadonlyArray<ThemeSeed>): ThemeReport {
    return {
      chapterNumber,
      activeThemes: themes.map((seed) => {
        const themeSignalCount = seed.keywords.reduce(
          (sum, keyword) => sum + countOccurrences(chapterText, keyword),
          0,
        );
        const antiSignalCount = seed.antiKeywords.reduce(
          (sum, keyword) => sum + countOccurrences(chapterText, keyword),
          0,
        );
        const interpretation =
          themeSignalCount > antiSignalCount
            ? "本章让主题方向先于事件被读者感知"
            : "本章事件存在，但主题表达仍偏弱";

        return {
          theme: seed.theme,
          antiTheme: seed.antiTheme,
          valueConflict: seed.valueConflict,
          themeSignalCount,
          antiSignalCount,
          interpretation,
        };
      }),
    };
  }
}
