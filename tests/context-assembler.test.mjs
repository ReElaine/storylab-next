import test from "node:test";
import assert from "node:assert/strict";
import { ContextAssembler } from "../dist/core/modules/context-assembler.js";

test("context assembler builds a state-driven planning pack from summaries, chronology, loops and state ledgers", () => {
  const assembler = new ContextAssembler();
  const contextPack = assembler.assemblePlanContext({
    book: {
      id: "test-book",
      title: "逆命试写",
      authorVision: "长篇连载测试样例",
      targetReaders: ["网文", "成长"],
      targetLength: 100,
      language: "zh",
    },
    targetChapterNumber: 2,
    chapterSummaries: [
      {
        chapterNumber: 1,
        title: "第一次反击",
        summary: "主角当众夺回被抢走的配给，但外门执事开始记恨。",
        keyEvents: ["主角当众夺回配给"],
        changedCharacters: [],
        openedLoopIds: ["loop-ch0001-01"],
        advancedLoopIds: [],
        closedLoopIds: [],
      },
    ],
    characterHistory: [
      {
        name: "主角",
        latestState: {
          name: "主角",
          desire: "改变命运",
          fear: "被进一步打压",
          misbelief: "再忍一步就能熬过去",
          recentDecision: "当众反击",
          decisionCost: "执事已经开始准备断供和报复",
          relationshipShift: ["与执事转为公开对立"],
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
          actors: ["主角", "执事"],
          summary: "主角当众夺回被抢走的配给",
          consequence: "执事决定后续通过断供和差事继续施压",
        },
      ],
    },
    openLoops: {
      loops: [
        {
          loopId: "loop-ch0001-01",
          type: "threat",
          introducedInChapter: 1,
          owner: "执事",
          description: "执事会继续报复主角，并拿资源规则做文章",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: ["必须在近期形成具体后果"],
          relatedEntities: ["主角", "执事"],
          evidenceRefs: ["scene-3"],
          lastUpdatedChapter: 1,
        },
      ],
    },
    reveals: {
      entries: [
        {
          revealId: "reveal-ch0001-01",
          chapterNumber: 1,
          sceneNumber: 3,
          sceneId: "scene-3",
          sourceLoopId: "loop-ch0001-01",
          category: "promise",
          subject: "执事的打压方式",
          revealedTruth: "执事会先用断供和规矩逼主角低头",
          revealStrength: "partial",
          knownByReader: true,
          knownByCharacters: ["主角"],
          evidenceRefs: ["scene-3"],
        },
      ],
    },
    relationships: {
      entries: [
        {
          relationshipId: "lead::steward",
          characters: ["主角", "执事"],
          status: "主角与执事从隐忍转为公开对立",
          polarity: "hostile",
          tension: "high",
          lastChange: "主角与执事从隐忍转为公开对立",
          lastUpdatedChapter: 1,
          evidenceRefs: ["scene-3"],
        },
      ],
    },
    themeProgression: {
      entries: [
        {
          chapterNumber: 1,
          primaryTheme: "反抗有代价",
          antiTheme: "低头就能换来安全",
          thematicQuestion: "第一次反抗之后，代价会不会持续升级？",
          movementSummary: "主角已经发现，短期胜利换来的不是结束，而是持续的制度性反扑。",
          stance: "toward_theme",
          pressurePoint: "短期胜利之后，代价必须继续落地。",
          carrierCharacters: ["主角", "执事"],
          supportingSceneNumbers: [3, 4],
          evidenceRefs: ["scene-3", "scene-4"],
        },
      ],
    },
    capabilityResources: {
      entries: [
        {
          entryId: "capres-ch0001-lead",
          chapterNumber: 1,
          character: "主角",
          capabilityState: "刚证明自己敢于当众反击",
          resourceState: "后续配给与机会可能被断供",
          conditionState: "已经被外门体系盯上，处境更危险",
          activeConstraints: ["执事会继续拿配给和规矩压他"],
          sceneNumbers: [3, 4],
          evidenceRefs: ["scene-3", "scene-4"],
        },
      ],
    },
  });

  assert.equal(contextPack.taskType, "plan-next");
  assert.equal(contextPack.targetChapterNumber, 2);
  assert.equal(contextPack.currentBookPhase.phaseKey, "opening");
  assert.equal(contextPack.activeOpenLoops[0].loopId, "loop-ch0001-01");
  assert.equal(contextPack.recentReveals[0].revealId, "reveal-ch0001-01");
  assert.equal(contextPack.recentRelationshipChanges[0].relationshipId, "lead::steward");
  assert.equal(contextPack.recentThemeProgression[0].chapterNumber, 1);
  assert.equal(contextPack.recentCapabilityResourceStates[0].chapterNumber, 1);
  assert.equal(contextPack.relevantCharacterStates[0].name, "主角");
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("主角当众夺回被抢走的配给")));
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("最近揭示")));
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("最近关系变化")));
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("最近主题推进")));
  assert.ok(contextPack.carryForwardFacts.some((item) => item.includes("最近能力/资源/状态")));
  assert.ok(contextPack.planningFocus.some((item) => item.includes("最近揭示")));
  assert.ok(contextPack.planningFocus.some((item) => item.includes("关系变化")));
  assert.ok(contextPack.planningFocus.some((item) => item.includes("主题推进")));
  assert.ok(contextPack.planningFocus.some((item) => item.includes("能力/资源/状态")));
});
