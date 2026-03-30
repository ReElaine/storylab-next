import test from "node:test";
import assert from "node:assert/strict";
import { ContextAssembler } from "../dist/core/modules/context-assembler.js";

test("context assembler builds a state-driven planning pack from summaries, chronology, loops and character state", () => {
  const assembler = new ContextAssembler();
  const contextPack = assembler.assemblePlanContext({
    book: {
      id: "linfan-rebellion",
      title: "凡骨逆命",
      authorVision: "修仙爽文",
      targetReaders: ["修仙", "逆袭"],
      targetLength: 100,
      language: "zh",
    },
    targetChapterNumber: 2,
    chapterSummaries: [
      {
        chapterNumber: 1,
        title: "第一次反抗",
        summary: "林凡当众夺回灵石，但赵执事开始记恨。",
        keyEvents: ["林凡当众夺回灵石"],
        changedCharacters: [],
        openedLoopIds: ["loop-ch0001-01"],
        advancedLoopIds: [],
        closedLoopIds: [],
      },
    ],
    characterHistory: [
      {
        name: "林凡",
        latestState: {
          name: "林凡",
          desire: "改变命运",
          fear: "资源被断供",
          misbelief: "只要再忍一忍就不会被盯上",
          recentDecision: "当众夺回灵石",
          decisionCost: "赵执事记恨并准备打压",
          relationshipShift: ["与赵执事公开对立"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
        timeline: [],
      },
    ],
    chronology: {
      events: [
        {
          eventId: "event-1",
          chapterNumber: 1,
          sceneNumber: 3,
          sceneId: "scene-3",
          actors: ["林凡", "赵执事"],
          summary: "林凡当众夺回灵石",
          consequence: "赵执事决定后续断供并加重打压",
        },
      ],
    },
    openLoops: {
      loops: [
        {
          loopId: "loop-ch0001-01",
          type: "threat",
          introducedInChapter: 1,
          owner: "赵执事",
          description: "赵执事会报复林凡，资源可能被断供",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: ["必须在近期形成具体后果"],
          relatedEntities: ["林凡", "赵执事"],
          evidenceRefs: ["scene-3"],
          lastUpdatedChapter: 1,
        },
      ],
    },
  });

  assert.equal(contextPack.taskType, "plan-next");
  assert.equal(contextPack.targetChapterNumber, 2);
  assert.equal(contextPack.currentBookPhase.phaseKey, "opening");
  assert.equal(contextPack.activeOpenLoops[0].loopId, "loop-ch0001-01");
  assert.equal(contextPack.relevantCharacterStates[0].name, "林凡");
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("林凡当众夺回灵石")));
  assert.ok(contextPack.planningFocus.some((item) => item.includes("open loop")));
});
