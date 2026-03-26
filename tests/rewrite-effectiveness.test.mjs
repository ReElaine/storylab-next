import test from "node:test";
import assert from "node:assert/strict";

import { buildRevisionComparisonReport } from "../dist/core/llm/revise-engine.js";

test("comparison does not mark blueprint-to-prose scene rewrite as worse", () => {
  const comparison = buildRevisionComparisonReport({
    chapterNumber: 1,
    before: {
      scenes: [
        {
          sceneId: "scene-3",
          sceneAnchor: "scene-3-anchor",
          sceneNumber: 3,
          pov: "林凡",
          goal: "反击",
          conflict: "陈师兄抢灵石",
          turn: "林凡决定夺回",
          result: "赢回灵石",
          newInformation: [],
          emotionalShift: "怒 -> 爽",
          sourceParagraphs: ["【场景 3 / POV：林凡】驱动场景的人是 林凡。真正推动本场景的不是事情发生了，而是 林凡 必须做出决定。"],
        },
      ],
      characterStates: [],
      themeReport: { chapterNumber: 1, activeThemes: [] },
      styleReport: {
        averageSentenceLength: 18,
        dialogueRatio: 0.2,
        descriptionRatio: 0.2,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 1,
        scores: { hook: 7, momentum: 7, emotionalPeak: 6, suspense: 6, memorability: 6 },
        summary: "",
        strengths: [],
        risks: [],
        revisionSuggestions: [],
      },
      gateDecision: { chapterNumber: 1, gate: null, required: false, rationale: "" },
      revisionBrief: "",
    },
    after: {
      scenes: [
        {
          sceneId: "scene-3",
          sceneAnchor: "scene-3-anchor",
          sceneNumber: 3,
          pov: "林凡",
          goal: "反击",
          conflict: "陈师兄抢灵石",
          turn: "林凡突然出手",
          result: "赢回灵石但被盯上",
          newInformation: [],
          emotionalShift: "怒 -> 决绝",
          sourceParagraphs: [
            "陈师兄的手已经伸到林凡眼前。",
            "林凡没退，直接扣住他的手腕，把灵石硬生生夺了回来。",
            "周围一片死寂，赵执事在不远处冷冷看着。",
          ],
        },
      ],
      characterStates: [],
      themeReport: { chapterNumber: 1, activeThemes: [] },
      styleReport: {
        averageSentenceLength: 14,
        dialogueRatio: 0.25,
        descriptionRatio: 0.25,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 1,
        scores: { hook: 7, momentum: 7, emotionalPeak: 6, suspense: 6, memorability: 6 },
        summary: "",
        strengths: [],
        risks: [],
        revisionSuggestions: [],
      },
      gateDecision: { chapterNumber: 1, gate: null, required: false, rationale: "" },
      revisionBrief: "",
    },
    beforeSceneAudit: {
      sceneCoverageOk: true,
      issues: [],
    },
    afterSceneAudit: {
      sceneCoverageOk: true,
      issues: [
        {
          sceneNumber: 3,
          severity: "medium",
          problem: "场景只有剧情推进，没有主题冲突",
          recommendation: "补强主题冲突",
        },
      ],
    },
    plan: {
      targetChapterNumber: 1,
      chapterMission: "测试",
      readerGoal: "测试",
      sceneBlueprint: [
        {
          sceneId: "scene-3",
          sceneAnchor: "scene-3-anchor",
          sceneNumber: 3,
          pov: "林凡",
          goal: "反击",
          conflict: "陈师兄抢灵石",
          turn: "林凡突然出手",
          result: "赢回灵石但被盯上",
          newInformation: [],
          emotionalShift: "怒 -> 决绝",
          drivingCharacter: "林凡",
          opposingForce: "陈师兄",
          decision: "林凡决定当众夺回灵石",
          cost: "会被赵执事盯上",
          relationshipChange: "众人重新评估林凡",
          thematicTension: "忍让 vs 反抗",
          valuePositionA: "忍让",
          valuePositionB: "反抗",
          sceneStance: "站向反抗",
          styleDirective: "短句，动作密集",
        },
      ],
      characterIntent: [],
      themeIntent: "",
      thematicQuestion: "",
      styleProfile: {
        narrationStyle: "",
        dialogueStyle: "",
        pacingProfile: "",
        descriptionDensity: "",
        toneConstraints: [],
      },
      gateNote: "",
    },
    beforeDraftContent: "【场景 3 / POV：林凡】\n驱动场景的人是 林凡。真正推动本场景的不是事情发生了，而是 林凡 必须做出决定。",
    afterDraftContent:
      "【场景 3 / POV：林凡】\n陈师兄的手已经伸到林凡眼前。\n\n林凡没退，直接扣住他的手腕，把灵石硬生生夺了回来。\n\n周围一片死寂，赵执事在不远处冷冷看着。",
    trace: {
      targetSceneNumbers: [3],
      actualRewrittenSceneNumbers: [3],
      comparisonSceneNumbers: [3],
      unchangedSceneNumbers: [],
      reviewedButNotRewrittenSceneNumbers: [],
      sceneRewriteMetadata: {
        3: {
          reason: ["该 scene 被选中进行局部重写"],
          strategy: ["让林凡主动反击"],
        },
      },
    },
  });

  assert.equal(comparison.sceneChanges[0]?.postRewriteAssessment.rewriteOutcome === "worse", false);
  assert.match(comparison.sceneChanges[0]?.postRewriteAssessment.rewriteOutcome ?? "", /slightly_better|clearly_better/);
  assert.equal(comparison.sceneChanges[0]?.postRewriteAssessment.benefitSummary.includes("improved_style"), true);
});
