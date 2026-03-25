import type {
  ChapterPlan,
  CharacterHistory,
  HumanGate,
  SceneBlueprintItem,
  StoryMemory,
  ThemeHistory,
} from "../types.js";

function buildMission(memory: StoryMemory): string {
  if (memory.activeHooks.length > 0) {
    return `推进 ${memory.activeHooks[0]}，同时把上一章遗留的不安转化为更明确的行动。`;
  }
  return "让角色从当前状态进入下一轮更具体的冲突。";
}

function buildSceneBlueprint(
  characterHistory: ReadonlyArray<CharacterHistory>,
  themeHistory: ThemeHistory,
): ReadonlyArray<SceneBlueprintItem> {
  const lead = characterHistory[0]?.latestState;
  const obstacle = characterHistory[1]?.latestState;
  const latestTheme = themeHistory.timeline[themeHistory.timeline.length - 1];

  return [
    {
      sceneNumber: 1,
      pov: lead?.name ?? "主角",
      goal: `${lead?.name ?? "主角"}试图主动推进当前悬念`,
      conflict: `${obstacle?.name ?? "阻碍者"}让目标必须伴随代价`,
      turn: `${lead?.name ?? "主角"}意识到当前误判正在放大风险`,
      result: `${lead?.name ?? "主角"}被迫继续追进，而不是原地观望`,
      newInformation: ["上一章遗留的问题出现了更具体的新解释"],
      emotionalShift: "试探 -> 紧张",
    },
    {
      sceneNumber: 2,
      pov: lead?.name ?? "主角",
      goal: `让 ${lead?.name ?? "主角"} 做出一次无法完全回撤的选择`,
      conflict: `${obstacle?.name ?? "阻碍者"}逼迫角色明确站队`,
      turn: `关系压力升级，${lead?.name ?? "主角"}必须付出代价`,
      result: "人物关系出现位移，章节冲突被推高",
      newInformation: ["新的事实改变了角色对风险的判断"],
      emotionalShift: "紧张 -> 压迫",
    },
    {
      sceneNumber: 3,
      pov: lead?.name ?? "主角",
      goal: "把章节推到一个更强的尾钩",
      conflict: `${latestTheme?.theme ?? "主题问题"} 与 ${latestTheme?.antiTheme ?? "反主题"} 正面碰撞`,
      turn: "一个关键事实让人物意识到代价已经开始兑现",
      result: "留下一个必须进入下一章解决的问题",
      newInformation: ["主题冲突第一次以不可回避的方式显形"],
      emotionalShift: "压迫 -> 失衡",
    },
  ];
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
      readerGoal: "让读者同时获得推进感、代价感和明确的追读钩子。",
      sceneBlueprint: buildSceneBlueprint(presentCharacters, themeHistory),
      characterIntent: presentCharacters.map((entry, index) => ({
        name: entry.name,
        desiredMovement:
          index === 0
            ? `${entry.name}要在本章做出关键选择，并被其误判拖向更危险的结果`
            : `${entry.name}要成为压力源，迫使主角色面对真实代价`,
        costPressure: entry.latestState.decisionCost,
      })),
      themeIntent: latestTheme
        ? `本章要推进“${latestTheme.theme}”对“${latestTheme.antiTheme}”的压制，并通过角色选择承载价值冲突。`
        : "本章必须让事件服务于主题表达，而不只是推进情节。",
      gateNote: nextGate
        ? `本章命中人工检查点：${nextGate.label}。完成后应暂停并进行人工复核。`
        : "本章没有命中阻断式 gate，但仍需按 revision brief 自查。",
    };
  }
}
