import type {
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  ChapterStateDelta,
  ChapterSummaryRecord,
  ChronologyEvent,
  ChronologyLedger,
  OpenLoopEntry,
  OpenLoopsLedger,
  SettlementBundle,
} from "../types.js";

interface SettlementInput {
  readonly chapterNumber: number;
  readonly draft: ChapterDraft;
  readonly plan: ChapterPlan;
  readonly analysis: ChapterAnalysisBundle;
  readonly previousChronology: ChronologyLedger;
  readonly previousOpenLoops: OpenLoopsLedger;
}

const OPEN_LOOP_SIGNAL = /隐患|后果|威胁|秘密|疑问|悬念|记恨|危险|断供|未解决|必须进入下一章|真相|代价/u;
const CLOSE_SIGNAL = /解决|兑现|结束|了结|揭晓|落定|拿回|达成|关闭/u;

function uniqueStrings(values: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function trimSentence(text: string, maxLength = 80): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function pickLoopType(text: string): OpenLoopEntry["type"] {
  if (/承诺|必须|约定/u.test(text)) return "promise";
  if (/债|亏欠/u.test(text)) return "debt";
  if (/威胁|危险|打压|记恨/u.test(text)) return "threat";
  if (/秘密|真相|谜|未知/u.test(text)) return "mystery";
  if (/问题|是否|能否|为什么/u.test(text)) return "question";
  return "foreshadow";
}

function pickUrgency(text: string): OpenLoopEntry["urgency"] {
  if (/立刻|马上|必须|危险|断供|记恨/u.test(text)) return "high";
  if (/很快|尽快|下一章|后续/u.test(text)) return "medium";
  return "low";
}

function extractKeywords(text: string): ReadonlyArray<string> {
  return uniqueStrings(
    text
      .split(/[，。！？；、“”\s:：,.;!?()（）\-]+/u)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 2),
  ).slice(0, 6);
}

function buildChronologyInsertions(input: SettlementInput): ReadonlyArray<ChronologyEvent> {
  return input.analysis.scenes.map((scene) => ({
    eventId: `ch${String(input.chapterNumber).padStart(4, "0")}-scene-${scene.sceneNumber}`,
    chapterNumber: input.chapterNumber,
    sceneNumber: scene.sceneNumber,
    sceneId: scene.sceneId,
    actors: uniqueStrings(
      [
        scene.pov,
        ...input.analysis.characterStates
          .filter((character) => character.presentInChapter)
          .map((character) => character.name)
          .filter((name) => scene.sourceParagraphs.some((paragraph) => paragraph.includes(name))),
      ],
    ),
    summary: trimSentence(`${scene.goal}；${scene.turn}；${scene.result}`),
    consequence: trimSentence(scene.newInformation[0] ?? scene.emotionalShift ?? scene.result),
  }));
}

function buildKeyEvents(events: ReadonlyArray<ChronologyEvent>): ReadonlyArray<string> {
  return events.map((event) => trimSentence(event.summary, 64));
}

function matchLoop(loop: OpenLoopEntry, chapterSignals: string): { matched: boolean; shouldClose: boolean } {
  const keywords = extractKeywords(loop.description);
  const matched = keywords.some((keyword) => keyword.length >= 2 && chapterSignals.includes(keyword));
  if (!matched) {
    return { matched: false, shouldClose: false };
  }

  return {
    matched: true,
    shouldClose: CLOSE_SIGNAL.test(chapterSignals) && keywords.length > 0,
  };
}

function buildChapterSignals(input: SettlementInput): string {
  return [
    input.draft.content,
    input.analysis.readerReport.summary,
    ...input.analysis.readerReport.risks,
    ...input.analysis.scenes.flatMap((scene) => [scene.goal, scene.conflict, scene.turn, scene.result, ...scene.newInformation]),
  ]
    .join("\n")
    .replace(/\s+/gu, " ")
    .trim();
}

function createNewLoopCandidates(input: SettlementInput, existingLoops: ReadonlyArray<OpenLoopEntry>): ReadonlyArray<OpenLoopEntry> {
  const sources = uniqueStrings([
    ...input.analysis.readerReport.risks,
    ...input.analysis.scenes.flatMap((scene) => [
      scene.turn,
      scene.result,
      ...scene.newInformation,
    ]),
  ])
    .filter((text) => OPEN_LOOP_SIGNAL.test(text))
    .slice(0, 3);

  const existingDescriptions = existingLoops.map((loop) => loop.description);
  const nextIndexBase = existingLoops.filter((loop) => loop.introducedInChapter === input.chapterNumber).length;

  return sources
    .filter((source) => !existingDescriptions.some((description) => description.includes(source) || source.includes(description)))
    .map((source, index) => {
      const relatedEntities = uniqueStrings(
        input.analysis.characterStates
          .filter((character) => source.includes(character.name))
          .map((character) => character.name),
      );
      const owner = relatedEntities[0] ?? input.analysis.scenes[0]?.pov ?? "章节系统";

      return {
        loopId: `loop-ch${String(input.chapterNumber).padStart(4, "0")}-${String(nextIndexBase + index + 1).padStart(2, "0")}`,
        type: pickLoopType(source),
        introducedInChapter: input.chapterNumber,
        owner,
        description: trimSentence(source, 96),
        expectedPayoffWindow: "soon",
        urgency: pickUrgency(source),
        status: "open",
        payoffConstraints: [
          "后续章节必须继续承接这条未兑现事项",
        ],
        relatedEntities,
        evidenceRefs: input.analysis.scenes.map((scene) => `scene-${scene.sceneNumber}`),
        lastUpdatedChapter: input.chapterNumber,
      } satisfies OpenLoopEntry;
    });
}

function summarizeChangedCharacters(input: SettlementInput): ChapterSummaryRecord["changedCharacters"] {
  return input.analysis.characterStates
    .filter((state) => state.presentInChapter)
    .map((state) => ({
      name: state.name,
      summary: trimSentence(`${state.name}在本章的推进是：${state.arcProgress}`),
      recentDecision: state.recentDecision,
      decisionCost: state.decisionCost,
    }));
}

export class SettlementAgent {
  settle(input: SettlementInput): SettlementBundle {
    const chronologyInsertions = buildChronologyInsertions(input);
    const nextChronology: ChronologyLedger = {
      events: [...input.previousChronology.events, ...chronologyInsertions],
    };

    const chapterSignals = buildChapterSignals(input);
    const loopUpdates: Array<ChapterStateDelta["updatedLoops"][number]> = [];
    const updatedExistingLoops = input.previousOpenLoops.loops.map((loop) => {
      const match = matchLoop(loop, chapterSignals);
      if (!match.matched || loop.status === "closed") {
        return loop;
      }

      const action = match.shouldClose ? "closed" : "advanced";
      loopUpdates.push({
        loopId: loop.loopId,
        action,
        description: loop.description,
        evidence: trimSentence(chapterSignals, 72),
      });

      return {
        ...loop,
        status: action,
        lastUpdatedChapter: input.chapterNumber,
      } satisfies OpenLoopEntry;
    });

    const newLoops = createNewLoopCandidates(input, updatedExistingLoops);
    loopUpdates.push(
      ...newLoops.map((loop) => ({
        loopId: loop.loopId,
        action: "opened" as const,
        description: loop.description,
        evidence: loop.evidenceRefs.join(", "),
      })),
    );

    const nextOpenLoops: OpenLoopsLedger = {
      loops: [...updatedExistingLoops, ...newLoops],
    };

    const openedLoopIds = loopUpdates.filter((loop) => loop.action === "opened").map((loop) => loop.loopId);
    const advancedLoopIds = loopUpdates.filter((loop) => loop.action === "advanced").map((loop) => loop.loopId);
    const closedLoopIds = loopUpdates.filter((loop) => loop.action === "closed").map((loop) => loop.loopId);
    const changedCharacters = summarizeChangedCharacters(input);

    const chapterSummary: ChapterSummaryRecord = {
      chapterNumber: input.chapterNumber,
      title: input.draft.title,
      summary: trimSentence(
        `${input.plan.chapterMission} 本章推进了 ${input.analysis.scenes.length} 个场景，核心结果是 ${input.analysis.scenes[input.analysis.scenes.length - 1]?.result ?? "角色被推入下一轮冲突"}。`,
        120,
      ),
      keyEvents: buildKeyEvents(chronologyInsertions),
      changedCharacters,
      openedLoopIds,
      advancedLoopIds,
      closedLoopIds,
    };

    const chapterStateDelta: ChapterStateDelta = {
      chapterNumber: input.chapterNumber,
      title: input.draft.title,
      changedCharacters: input.analysis.characterStates
        .filter((state) => state.presentInChapter)
        .map((state) => ({
          name: state.name,
          currentDecision: state.recentDecision,
          decisionCost: state.decisionCost,
          arcProgress: state.arcProgress,
          summary: trimSentence(`${state.name}做出“${state.recentDecision}”，代价是“${state.decisionCost}”`, 96),
        })),
      chronologyInsertions,
      updatedLoops: loopUpdates,
      stateHighlights: uniqueStrings([
        ...input.analysis.characterStates
          .filter((state) => state.presentInChapter)
          .map((state) => `${state.name}: ${state.arcProgress}`),
        ...loopUpdates.map((loop) => `${loop.action}:${loop.description}`),
      ]).slice(0, 8),
    };

    return {
      chapterSummary,
      chapterStateDelta,
      chronology: nextChronology,
      openLoops: nextOpenLoops,
    };
  }
}
