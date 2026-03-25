import type { StyleGuide, StyleReport } from "../types.js";
import { average } from "../utils/text.js";

export class StyleEngine {
  inspect(chapterText: string, guide: StyleGuide): StyleReport {
    const sentences = chapterText
      .split(/[。！？!?]/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const averageSentenceLength = average(sentences.map((entry) => entry.length));
    const lines = chapterText.split("\n").filter((entry) => entry.trim().length > 0);
    const dialogueLines = lines.filter((line) => /[“”"'「」]/u.test(line)).length;
    const descriptionLines = lines.filter((line) => /环境|光|影|热|冷|门|灰|火|风/.test(line)).length;
    const dialogueRatio = lines.length === 0 ? 0 : dialogueLines / lines.length;
    const descriptionRatio = lines.length === 0 ? 0 : descriptionLines / lines.length;

    const styleDriftPoints: string[] = [];
    if (averageSentenceLength > 30) {
      styleDriftPoints.push("句子整体偏长，可能压低冲突推进速度");
    }
    if (dialogueRatio < 0.08) {
      styleDriftPoints.push("对白偏少，人物声音不够显性");
    }
    if (descriptionRatio > 0.45) {
      styleDriftPoints.push("描写密度偏高，可能稀释戏剧推进");
    }

    const dialogueHomogeneitySpots =
      dialogueRatio < 0.12 ? ["需要增加角色间差异化对白，避免所有角色都像同一个叙述者"] : [];

    return {
      averageSentenceLength,
      dialogueRatio,
      descriptionRatio,
      rhythmNote:
        averageSentenceLength < 22
          ? "整体节奏偏紧，适合开篇推进"
          : "句长偏稳，需要注意是否压低了冲突速度",
      adherenceNote: `目标叙述风格为“${guide.narrativeVoice}”，当前对白占比 ${dialogueRatio.toFixed(2)}，描写占比 ${descriptionRatio.toFixed(2)}。`,
      styleDriftPoints,
      dialogueHomogeneitySpots,
      descriptionBalanceNote: `建议按“${guide.descriptionDensity}”控制描写密度，并结合“${guide.paragraphStrategy}”整理段落功能。`,
    };
  }
}
