import test from "node:test";
import assert from "node:assert/strict";
import { ChapterPlanner } from "../dist/core/modules/chapter-planner.js";

test("chapter planner uses reveals, relationships, theme progression, and capability state to build the next mission", () => {
  const planner = new ChapterPlanner();
  const plan = planner.planNextChapter(
    2,
    [
      {
        name: "主角",
        latestState: {
          name: "主角",
          desire: "改变命运",
          fear: "继续被打压",
          misbelief: "只要再忍一步就能熬过去",
          recentDecision: "当众反击",
          decisionCost: "执事已经记恨并准备断供",
          relationshipShift: ["与执事对立"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
        timeline: [],
      },
    ],
    {
      timeline: [
        {
          chapterNumber: 1,
          theme: "反抗有代价",
          antiTheme: "低头可以换安全",
          themeSignalCount: 3,
          antiSignalCount: 1,
          interpretation: "主角开始意识到，反抗不会免费。",
        },
      ],
    },
    {
      lastAnalyzedChapter: 1,
      activeHooks: [],
      unresolvedRisks: [],
      readerTrajectory: {
        averageHookScore: 7,
        averageMomentumScore: 7,
        averageEmotionalPeakScore: 8,
      },
    },
    [
      {
        chapterNumber: 1,
        title: "第一次反击",
        summary: "主角当众夺回配给，但执事已经开始记恨。",
        keyEvents: [],
        changedCharacters: [],
        openedLoopIds: ["loop-ch0001-01"],
        advancedLoopIds: [],
        closedLoopIds: [],
      },
    ],
    {
      events: [
        {
          eventId: "ch0001-scene-1",
          chapterNumber: 1,
          sceneNumber: 1,
          sceneId: "scene-1",
          actors: ["主角", "执事"],
          summary: "主角当众夺回配给",
          consequence: "执事记恨，后续资源将被打压",
        },
      ],
    },
    {
      loops: [
        {
          loopId: "loop-ch0001-01",
          type: "threat",
          introducedInChapter: 1,
          owner: "执事",
          description: "执事记恨主角，后续资源可能被断供",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: [],
          relatedEntities: ["主角", "执事"],
          evidenceRefs: ["scene-1"],
          lastUpdatedChapter: 1,
        },
      ],
    },
    {
      entries: [
        {
          revealId: "reveal-ch0001-01",
          chapterNumber: 1,
          sceneNumber: 3,
          sceneId: "scene-3",
          sourceLoopId: "loop-ch0001-01",
          category: "promise",
          subject: "执事的打压方式",
          revealedTruth: "执事会先用断供把主角逼进更危险的差事",
          revealStrength: "partial",
          knownByReader: true,
          knownByCharacters: ["主角"],
          evidenceRefs: ["scene-3"],
        },
      ],
    },
    {
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
    {
      entries: [
        {
          chapterNumber: 1,
          primaryTheme: "反抗有代价",
          antiTheme: "低头就能换安全",
          thematicQuestion: "第一次反抗之后，代价会不会继续升级？",
          movementSummary: "主角已经意识到，反抗后的代价会持续升级，而不是一次性过去。",
          stance: "toward_theme",
          pressurePoint: "短期胜利之后，代价必须继续落地。",
          carrierCharacters: ["主角", "执事"],
          supportingSceneNumbers: [3, 4],
          evidenceRefs: ["scene-3", "scene-4"],
        },
      ],
    },
    {
      entries: [
        {
          entryId: "capres-ch0001-lead",
          chapterNumber: 1,
          character: "主角",
          capabilityState: "已经敢于公开反击",
          resourceState: "后续配给与机会可能被断供",
          conditionState: "已经被外门体系盯上，处境更危险",
          activeConstraints: ["执事会继续拿配给和规矩压他"],
          sceneNumbers: [3, 4],
          evidenceRefs: ["scene-3", "scene-4"],
        },
      ],
    },
    [],
    {
      narrativeVoice: "直接",
      dialogueRule: "锋利",
      sentenceRhythm: "快",
      descriptionDensity: "低",
      paragraphStrategy: "优先动作与对话",
    },
  );

  assert.ok(plan.chapterMission.includes("执事的打压方式"));
  assert.ok(plan.chapterMission.includes("揭示"));
  assert.ok(plan.themeIntent.includes("反抗有代价"));
  assert.ok(plan.thematicQuestion.includes("代价"));
  assert.ok(plan.sceneBlueprint[0].thematicTension.includes("代价"));
  assert.ok(plan.sceneBlueprint[0].relationshipChange.includes("对立"));
  assert.ok(plan.gateNote.includes("最近揭示"));
});
