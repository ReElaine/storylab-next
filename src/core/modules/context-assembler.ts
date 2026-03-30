import type {
  BookPhaseState,
  BookRecord,
  ChapterSummaryRecord,
  CharacterHistory,
  ChronologyLedger,
  ContextPack,
  OpenLoopsLedger,
  RelationshipLedger,
  RevealsLedger,
} from "../types.js";

function inferBookPhase(book: BookRecord, targetChapterNumber: number): BookPhaseState {
  const ratio = book.targetLength > 0 ? targetChapterNumber / book.targetLength : 0;
  if (ratio <= 0.2) {
    return {
      phaseKey: "opening",
      label: "开局立局",
      rationale: "当前仍处在建立世界规则、角色处境与主冲突入口的阶段。",
      tensionGoal: "尽快立住压迫、目标与追读钩子，不要让章节像重新开书。",
    };
  }
  if (ratio <= 0.45) {
    return {
      phaseKey: "early-rise",
      label: "上升段",
      rationale: "角色开始主动出击，短期胜利与长期代价要同时积累。",
      tensionGoal: "保持推进感，让旧承诺继续滚动，不要停留在重复受压。",
    };
  }
  if (ratio <= 0.7) {
    return {
      phaseKey: "mid-escalation",
      label: "中盘升级",
      rationale: "既有因果链开始相互碰撞，章节需要承接多条压力线。",
      tensionGoal: "强化旧线交汇与局势升级，避免每章像孤立任务。",
    };
  }
  if (ratio <= 0.9) {
    return {
      phaseKey: "late-crisis",
      label: "危机段",
      rationale: "故事进入高压收束前夜，代价兑现与关系裂变应更加明显。",
      tensionGoal: "让冲突更集中，避免再开过多新线。",
    };
  }

  return {
    phaseKey: "endgame",
    label: "收束段",
    rationale: "故事接近收束，章节更需要兑现旧承诺并回收关键状态。",
    tensionGoal: "优先收旧线、兑付因果与主题问题，不再扩散。",
  };
}

export class ContextAssembler {
  assemblePlanContext(input: {
    book: BookRecord;
    targetChapterNumber: number;
    chapterSummaries: ReadonlyArray<ChapterSummaryRecord>;
    characterHistory: ReadonlyArray<CharacterHistory>;
    chronology: ChronologyLedger;
    openLoops: OpenLoopsLedger;
    reveals: RevealsLedger;
    relationships: RelationshipLedger;
  }): ContextPack {
    const currentBookPhase = inferBookPhase(input.book, input.targetChapterNumber);
    const recentChapterSummaries = input.chapterSummaries.slice(-3);
    const activeOpenLoops = input.openLoops.loops
      .filter((loop) => loop.status !== "closed")
      .sort((left, right) => {
        const urgencyRank = { high: 0, medium: 1, low: 2 } as const;
        return urgencyRank[left.urgency] - urgencyRank[right.urgency];
      })
      .slice(0, 5);
    const recentReveals = input.reveals.entries.slice(-4);
    const recentRelationshipChanges = input.relationships.entries
      .slice()
      .sort((left, right) => right.lastUpdatedChapter - left.lastUpdatedChapter)
      .slice(0, 4);
    const chronologySlice = input.chronology.events.slice(-6);
    const relevantCharacterStates = input.characterHistory
      .filter((entry) => entry.latestState.presentInChapter)
      .slice(0, 4)
      .map((entry) => ({
        name: entry.name,
        currentDesire: entry.latestState.desire,
        currentFear: entry.latestState.fear,
        currentMisbelief: entry.latestState.misbelief,
        recentDecision: entry.latestState.recentDecision,
        decisionCost: entry.latestState.decisionCost,
        arcProgress: entry.latestState.arcProgress,
        relationshipShift: entry.latestState.relationshipShift,
      }));

    const carryForwardFacts = [
      ...recentChapterSummaries.map((summary) => `第${summary.chapterNumber}章摘要：${summary.summary}`),
      ...activeOpenLoops.slice(0, 3).map((loop) => `未兑现事项：${loop.description}`),
      ...recentReveals.slice(-2).map((reveal) => `最近揭示：${reveal.subject} -> ${reveal.revealedTruth}`),
      ...recentRelationshipChanges.slice(0, 2).map((entry) => `最近关系变化：${entry.characters.join(" / ")} -> ${entry.lastChange}`),
      ...chronologySlice.slice(-3).map((event) => `最近事件：${event.summary} -> ${event.consequence}`),
    ];

    const planningFocus = [
      `当前书稿阶段：${currentBookPhase.label}，重点是${currentBookPhase.tensionGoal}`,
      recentReveals[0]
        ? `优先承接最近揭示“${recentReveals[0].subject}”，把真相转成新的后果与行动`
        : activeOpenLoops[0]
          ? `优先承接 open loop：“${activeOpenLoops[0].description}”`
        : "没有高优先级 open loop 时，也要承接最近章节留下的风险",
      recentRelationshipChanges[0]
        ? `最近关系变化需要继续滚动：${recentRelationshipChanges[0].characters.join(" / ")} -> ${recentRelationshipChanges[0].lastChange}`
        : "当前没有高优先级关系变化时，也要避免把已紧张的关系写回初始状态",
      relevantCharacterStates[0]
        ? `主视角角色当前最重要的连续状态：欲望=${relevantCharacterStates[0].currentDesire}；误判=${relevantCharacterStates[0].currentMisbelief}`
        : "当前没有足够的角色运行态，请保守承接上一章状态",
    ];

    return {
      taskType: "plan-next",
      targetChapterNumber: input.targetChapterNumber,
      currentBookPhase,
      recentChapterSummaries,
      activeOpenLoops,
      recentReveals,
      recentRelationshipChanges,
      chronologySlice,
      relevantCharacterStates,
      carryForwardFacts,
      planningFocus,
    };
  }
}
