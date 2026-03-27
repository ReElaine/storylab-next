import test from "node:test";
import assert from "node:assert/strict";
import { buildBlockingGateStatus } from "../dist/core/llm/revise-engine.js";

test("reader-priority gate downgrades quality high-severity issues when reader scores pass", () => {
  const gate = buildBlockingGateStatus({
    analysis: {
      scenes: [],
      characterStates: [],
      themeReport: { chapterNumber: 1, activeThemes: [] },
      styleReport: {
        averageSentenceLength: 18,
        dialogueRatio: 0.3,
        descriptionRatio: 0.2,
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
          momentum: 7,
          emotionalPeak: 8,
          suspense: 7,
          memorability: 8,
        },
        summary: "passed",
        strengths: [],
        risks: [],
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
    sceneAudit: {
      sceneCoverageOk: true,
      issues: [
        {
          sceneNumber: 2,
          severity: "high",
          problem: "决策没有兑现代价",
          recommendation: "补代价",
        },
        {
          sceneNumber: 3,
          severity: "high",
          problem: "场景缺少明确决策",
          recommendation: "补决策",
        },
      ],
    },
  });

  assert.equal(gate.blocking, false);
  assert.equal(gate.readerPassed, true);
  assert.deepEqual(gate.blockingScenes, []);
  assert.deepEqual(gate.advisoryScenes?.map((entry) => entry.sceneNumber), [2, 3]);
  assert.ok((gate.advisoryReasons?.[0] ?? "").includes("reader 已过线"));
});
