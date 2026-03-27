import test from "node:test";
import assert from "node:assert/strict";
import { SettlementAgent } from "../dist/core/modules/settlement-agent.js";

test("settlement agent produces summary, state delta, chronology, and open loops", () => {
  const agent = new SettlementAgent();
  const result = agent.settle({
    chapterNumber: 1,
    draft: {
      chapterNumber: 1,
      title: "第一次反抗",
      content: "林凡当众夺回灵石，赵执事因此记恨，后续资源可能被断供。",
      summary: "工作稿",
      basedOnPlan: 1,
    },
    plan: {
      targetChapterNumber: 1,
      chapterMission: "主角第一次反抗规则，并获得短期收益，同时埋下代价。",
      readerGoal: "让读者获得爽点与隐患感。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-林凡",
          sceneNumber: 1,
          pov: "林凡",
          goal: "在资源分发中建立不公",
          conflict: "陈师兄与赵执事联手压制",
          turn: "林凡意识到继续忍耐只会失去最后的资源",
          result: "林凡当众出手，夺回灵石，但被赵执事记恨",
          newInformation: ["赵执事会在后续资源上打压林凡"],
          emotionalShift: "压抑 -> 爆发",
          drivingCharacter: "林凡",
          opposingForce: "赵执事",
          decision: "当众反抗",
          cost: "后续资源被断供",
          relationshipChange: "林凡与外门执事彻底对立",
          thematicTension: "反抗有代价",
          valuePositionA: "反抗",
          valuePositionB: "忍耐",
          sceneStance: "偏向反抗",
          styleDirective: "快节奏",
        },
      ],
      characterIntent: [],
      themeIntent: "推进反抗有代价",
      thematicQuestion: "弱者是否能不付代价地改变命运？",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "锋利",
        pacingProfile: "快",
        descriptionDensity: "低",
        toneConstraints: [],
      },
      gateNote: "",
    },
    analysis: {
      scenes: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-林凡",
          sceneNumber: 1,
          pov: "林凡",
          goal: "在资源分发中建立不公",
          conflict: "陈师兄与赵执事联手压制",
          turn: "林凡意识到继续忍耐只会失去最后的资源",
          result: "林凡当众出手，夺回灵石，但被赵执事记恨",
          newInformation: ["赵执事会在后续资源上打压林凡"],
          emotionalShift: "压抑 -> 爆发",
          sourceParagraphs: ["林凡当众夺回灵石，赵执事因此记恨。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "改变命运",
          fear: "继续被踩在底层",
          misbelief: "只要忍耐就能熬过去",
          recentDecision: "当众反抗陈师兄",
          decisionCost: "赵执事开始记恨并可能断供",
          relationshipShift: ["与赵执事彻底结仇"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 1,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 18,
        dialogueRatio: 0.35,
        descriptionRatio: 0.15,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 1,
        scores: {
          hook: 8,
          momentum: 8,
          emotionalPeak: 8,
          suspense: 7,
          memorability: 7,
        },
        summary: "爽点成立，但代价已经埋下。",
        strengths: [],
        risks: ["赵执事记恨林凡，后续资源可能被断供。"],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 1,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    previousChronology: { events: [] },
    previousOpenLoops: { loops: [] },
  });

  assert.equal(result.chapterSummary.chapterNumber, 1);
  assert.equal(result.chapterStateDelta.chapterNumber, 1);
  assert.equal(result.chronology.events.length, 1);
  assert.ok(result.openLoops.loops.length >= 1);
  assert.ok(result.chapterSummary.openedLoopIds.length >= 1);
  assert.ok(result.chapterStateDelta.updatedLoops.some((loop) => loop.action === "opened"));
});
