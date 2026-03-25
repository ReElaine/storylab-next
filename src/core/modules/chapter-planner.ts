import type {
  ChapterPlan,
  CharacterHistory,
  HumanGate,
  StoryMemory,
  ThemeHistory,
} from "../types.js";

function buildMission(memory: StoryMemory): string {
  if (memory.activeHooks.length > 0) {
    return `推进 ${memory.activeHooks[0]}，同时把上一章遗留的不安转化为更明确的行动。`;
  }
  return "让角色从当前状态进入下一轮更具体的冲突。";
}

export class ChapterPlanner {
  planNextChapter(
    targetChapterNumber: number,
    characterHistory: ReadonlyArray<CharacterHistory>,
    themeHistory: ThemeHistory,
    memory: StoryMemory,
    gates: ReadonlyArray<HumanGate>,
  ): ChapterPlan {
    const presentCharacters = characterHistory
      .filter((entry) => entry.latestState.presentInChapter)
      .slice(0, 3);

    const latestTheme = themeHistory.timeline[themeHistory.timeline.length - 1];
    const nextGate = gates.find((gate) => gate.triggerChapter === targetChapterNumber);

    return {
      targetChapterNumber,
      chapterMission: buildMission(memory),
      readerGoal: "让读者同时获得推进感和更清晰的风险感，结尾留下必须继续读的悬念。",
      sceneBlueprint: [
        {
          sceneNumber: 1,
          objective: "承接上一章余波，把角色放进新的短期目标里",
          tension: "角色必须决定隐瞒、求助还是抢先行动",
          reveal: "上一章获得的异常信号出现新的解释",
          endingBeat: "主角做出会放大代价的选择",
        },
        {
          sceneNumber: 2,
          objective: "把外部压力和人物关系压力叠加",
          tension: "盟友不再只提供信息，而开始要求立场",
          reveal: "暴露一个会改变人物判断的新事实",
          endingBeat: "关系发生轻微偏转",
        },
        {
          sceneNumber: 3,
          objective: "以更强钩子结束章节",
          tension: "代价从抽象威胁变成具体后果",
          reveal: "主题冲突被明确化",
          endingBeat: "留下一个新的不可回避问题",
        },
      ],
      characterIntent: presentCharacters.map((entry) => ({
        name: entry.name,
        desiredMovement: `${entry.name}需要沿着“${entry.latestState.arcProgress}”继续被迫做选择`,
        costPressure: entry.latestState.decisionCost,
      })),
      themeIntent: latestTheme
        ? `继续推进“${latestTheme.theme}”并压低“${latestTheme.antiTheme}”的成立空间。`
        : "让章节表达一个明确的价值冲突，而不是只堆叠事件。",
      gateNote: nextGate
        ? `本章命中人工检查点：${nextGate.label}，完成后应暂停并人工复核。`
        : "本章没有命中硬性人工检查点，但仍建议依据 revision brief 自查。",
    };
  }
}
