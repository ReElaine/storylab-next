import type { ReaderExperienceReport, ScenePlanItem } from "../types.js";

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value));
}

export class ReaderExperienceCritic {
  review(
    chapterNumber: number,
    chapterText: string,
    scenes: ReadonlyArray<ScenePlanItem>,
  ): ReaderExperienceReport {
    const ending = chapterText.slice(-120);
    const hook = clampScore(ending.includes("？") || ending.includes("事") ? 8 : 6);
    const momentum = clampScore(scenes.length + (chapterText.includes("决定") ? 4 : 2));
    const emotionalPeak = clampScore((chapterText.includes("疼") ? 4 : 2) + (chapterText.includes("发冷") ? 3 : 1));
    const suspense = clampScore((chapterText.includes("真相") ? 3 : 1) + (chapterText.includes("可能") ? 4 : 2));
    const memorability = clampScore(chapterText.includes("影子全部活了过来") ? 8 : 6);

    const strengths = [
      "开篇目标明确，读者知道角色为什么要推门",
      "章节末尾把个人风险和更大的悬念绑定，具备追读牵引力",
    ];

    const risks = [
      ...(momentum < 7 ? ["中段推进稍直，场景间的节拍差异还可以更大"] : []),
      ...(emotionalPeak < 7 ? ["痛感到了，但情绪峰值还可以再抬高一层"] : []),
    ];

    const revisionSuggestions = [
      "给第二场景增加一个更具体的读者预期问题，例如沈砚为什么提前知道代价",
      "把主角做决定前的内在拉扯再压缩半拍，让伸手动作更像不可撤回的跃迁",
      "在结尾悬念前加一小处记忆点型意象，强化章节辨识度",
    ];

    return {
      chapterNumber,
      scores: { hook, momentum, emotionalPeak, suspense, memorability },
      summary: "本章具备合格开篇牵引力，最大优势是结尾回钩，最大风险是中段惊异感还可以更陡。",
      strengths,
      risks,
      revisionSuggestions,
    };
  }
}
