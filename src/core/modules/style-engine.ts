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
    const dialogueLines = lines.filter((line) => /[“"]/u.test(line)).length;
    const descriptionLines = lines.filter((line) => /墙|灯|灰|影|门|热|风|光/u.test(line)).length;
    const dialogueRatio = lines.length === 0 ? 0 : dialogueLines / lines.length;
    const descriptionRatio = lines.length === 0 ? 0 : descriptionLines / lines.length;

    return {
      averageSentenceLength,
      dialogueRatio,
      descriptionRatio,
      rhythmNote:
        averageSentenceLength < 22
          ? "整体节奏偏紧，适合开篇推进"
          : "句长偏稳，需要注意是否压低了冲突速度",
      adherenceNote: `风格目标为“${guide.narrativeVoice}”，当前对白占比 ${dialogueRatio.toFixed(2)}，描写占比 ${descriptionRatio.toFixed(2)}`,
    };
  }
}
