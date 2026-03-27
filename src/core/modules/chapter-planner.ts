import type {
  ChapterPlan,
  ChapterSummaryRecord,
  CharacterHistory,
  ChronologyLedger,
  HumanGate,
  OpenLoopsLedger,
  SceneBlueprintItem,
  StoryMemory,
  StyleGuide,
  StyleProfile,
  ThemeHistory,
} from "../types.js";

function buildMission(
  memory: StoryMemory,
  chapterSummaries: ReadonlyArray<ChapterSummaryRecord>,
  openLoops: OpenLoopsLedger,
): string {
  const urgentLoop = openLoops.loops.find((loop) => loop.status !== "closed" && loop.urgency === "high")
    ?? openLoops.loops.find((loop) => loop.status !== "closed");
  if (urgentLoop) {
    return `承接未兑现事项“${urgentLoop.description}”，并把它推进成更明确的章节行动。`;
  }
  if (memory.activeHooks.length > 0) {
    return `推进 ${memory.activeHooks[0]}，同时把上一章遗留的不安转化为更明确的行动。`;
  }
  const latestSummary = chapterSummaries.at(-1);
  if (latestSummary) {
    return `承接上一章“${latestSummary.summary}”留下的局面，推动角色进入下一轮冲突。`;
  }
  return "让角色从当前状态进入下一轮更具体的冲突。";
}

function buildStyleProfile(guide: StyleGuide): StyleProfile {
  return {
    narrationStyle: guide.narrativeVoice,
    dialogueStyle: guide.dialogueRule,
    pacingProfile: guide.sentenceRhythm,
    descriptionDensity: guide.descriptionDensity,
    toneConstraints: [guide.paragraphStrategy, "避免空泛解释", "优先用动作和对话承载冲突"],
  };
}

function buildSceneIdentity(sceneNumber: number, pov: string): Pick<SceneBlueprintItem, "sceneId" | "sceneAnchor"> {
  return {
    sceneId: `scene-${sceneNumber}`,
    sceneAnchor: `scene-${sceneNumber}-${pov}`,
  };
}

function buildSceneBlueprint(
  characterHistory: ReadonlyArray<CharacterHistory>,
  themeHistory: ThemeHistory,
  styleProfile: StyleProfile,
  chapterSummaries: ReadonlyArray<ChapterSummaryRecord>,
  chronology: ChronologyLedger,
  openLoops: OpenLoopsLedger,
): ReadonlyArray<SceneBlueprintItem> {
  const lead = characterHistory[0]?.latestState;
  const obstacle = characterHistory[1]?.latestState;
  const latestTheme = themeHistory.timeline[themeHistory.timeline.length - 1];
  const latestSummary = chapterSummaries.at(-1);
  const urgentLoop = openLoops.loops.find((loop) => loop.status !== "closed" && loop.urgency === "high")
    ?? openLoops.loops.find((loop) => loop.status !== "closed");
  const recentEvent = chronology.events.at(-1);
  const leadName = lead?.name ?? "主角";
  const opposingName = obstacle?.name ?? "阻碍者";
  const theme = latestTheme?.theme ?? "代价与亲密";
  const antiTheme = latestTheme?.antiTheme ?? "力量可以无损获得";
  const valueConflict = latestTheme?.interpretation ?? "控制自己 vs 接受他人介入";
  const carryForward = urgentLoop?.description
    ?? latestSummary?.summary
    ?? recentEvent?.summary
    ?? "上一章遗留的问题";

  return [
    {
      ...buildSceneIdentity(1, leadName),
      sceneNumber: 1,
      pov: leadName,
      goal: `${leadName}试图主动推进“${carryForward}”`,
      conflict: `${opposingName}让目标必须伴随代价`,
      turn: `${leadName}意识到当前误判正在放大风险`,
      result: `${leadName}被迫继续推进，而不是原地观望`,
      newInformation: [`上一章遗留的问题“${carryForward}”出现了更具体的新解释`],
      emotionalShift: "试探 -> 紧张",
      drivingCharacter: leadName,
      opposingForce: opposingName,
      decision: `${leadName}必须决定是继续推进，还是暂时后撤`,
      cost: `${leadName}一旦继续推进，就要先付出 ${lead?.decisionCost ?? "明确代价"}`,
      relationshipChange: `${leadName}与${opposingName}从试探进入高压协作`,
      thematicTension: `${theme} vs ${antiTheme}`,
      valuePositionA: theme,
      valuePositionB: antiTheme,
      sceneStance: `先压向 ${theme}`,
      styleDirective: `叙述遵循“${styleProfile.narrationStyle}”，节奏按“${styleProfile.pacingProfile}”推进`,
    },
    {
      ...buildSceneIdentity(2, leadName),
      sceneNumber: 2,
      pov: leadName,
      goal: `让 ${leadName} 围绕“${carryForward}”做出一次无法完全回撤的选择`,
      conflict: `${opposingName}逼迫角色明确站队`,
      turn: `关系压力升级，${leadName}必须付出代价`,
      result: "人物关系出现位移，章节冲突被推高",
      newInformation: ["新的事实改变了角色对风险的判断，并推进既有 open loop"],
      emotionalShift: "紧张 -> 压迫",
      drivingCharacter: leadName,
      opposingForce: opposingName,
      decision: `${leadName}必须在隐瞒、求助或抢先行动之间做决定`,
      cost: `该决定会立刻带来 ${lead?.decisionCost ?? "关系与身体上的代价"}`,
      relationshipChange: `${leadName}与${opposingName}的关系被迫重新划线`,
      thematicTension: `价值冲突通过选择体现：${valueConflict}`,
      valuePositionA: theme,
      valuePositionB: antiTheme,
      sceneStance: `让角色用行动偏向 ${theme}`,
      styleDirective: `对白必须体现“${styleProfile.dialogueStyle}”，避免所有角色说话同质化`,
    },
    {
      ...buildSceneIdentity(3, leadName),
      sceneNumber: 3,
      pov: leadName,
      goal: "把本章推进到更强的尾钩，同时为下一章留下必须承接的状态",
      conflict: `${theme} 与 ${antiTheme} 正面碰撞`,
      turn: "一个关键信息让角色意识到代价已经开始兑现",
      result: "留下一个必须进入下一章解决的问题",
      newInformation: ["主题冲突第一次以不可回避的方式显形"],
      emotionalShift: "压迫 -> 失衡",
      drivingCharacter: leadName,
      opposingForce: `${opposingName}与更大的系统压力`,
      decision: `${leadName}必须接受代价已经发生，而不是继续自我合理化`,
      cost: "代价从抽象威胁变成具体后果",
      relationshipChange: `${leadName}与${opposingName}的信任被重新定义`,
      thematicTension: `让 ${theme} 暂时占上风，但保留 ${antiTheme} 的诱惑`,
      valuePositionA: theme,
      valuePositionB: antiTheme,
      sceneStance: `本场景明确站向 ${theme}`,
      styleDirective: `结尾必须保留追读钩子，同时维持“${styleProfile.descriptionDensity}”的描写密度`,
    },
  ];
}

export class ChapterPlanner {
  planNextChapter(
    targetChapterNumber: number,
    characterHistory: ReadonlyArray<CharacterHistory>,
    themeHistory: ThemeHistory,
    memory: StoryMemory,
    chapterSummaries: ReadonlyArray<ChapterSummaryRecord>,
    chronology: ChronologyLedger,
    openLoops: OpenLoopsLedger,
    gates: ReadonlyArray<HumanGate>,
    styleGuide: StyleGuide,
  ): ChapterPlan {
    const presentCharacters = characterHistory.filter((entry) => entry.latestState.presentInChapter).slice(0, 3);
    const latestTheme = themeHistory.timeline[themeHistory.timeline.length - 1];
    const nextGate = gates.find((gate) => gate.triggerChapter === targetChapterNumber);
    const styleProfile = buildStyleProfile(styleGuide);
    const thematicQuestion = latestTheme
      ? `本章是否要让“${latestTheme.theme}”击败“${latestTheme.antiTheme}”？`
      : "本章的事件是否真正承担了主题表达？";
    const activeLoop = openLoops.loops.find((loop) => loop.status !== "closed");

    return {
      targetChapterNumber,
      chapterMission: buildMission(memory, chapterSummaries, openLoops),
      readerGoal: "让读者同时获得推进感、代价感和明确的追读钩子。",
      sceneBlueprint: buildSceneBlueprint(
        presentCharacters,
        themeHistory,
        styleProfile,
        chapterSummaries,
        chronology,
        openLoops,
      ),
      characterIntent: presentCharacters.map((entry, index) => ({
        name: entry.name,
        desiredMovement:
          index === 0
            ? `${entry.name}要在本章做出关键选择，并被其误判拖向更危险的结果`
            : `${entry.name}要成为压力源，逼使主角面对真实代价`,
        costPressure: entry.latestState.decisionCost,
      })),
      themeIntent: latestTheme
        ? `本章要推进“${latestTheme.theme}”对“${latestTheme.antiTheme}”的压制，并通过角色选择承载价值冲突。`
        : "本章必须让事件服务于主题表达，而不只是推进情节。",
      thematicQuestion,
      styleProfile,
      gateNote: nextGate
        ? `本章命中人工检查点：${nextGate.label}。完成后应暂停并进行人工复核。`
        : activeLoop
          ? `本章必须继续承接 open loop：“${activeLoop.description}”。`
          : "本章没有命中阻断式 gate，但仍需按 revision brief 自查。",
    };
  }
}
