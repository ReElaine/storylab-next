import test from "node:test";
import assert from "node:assert/strict";

import {
  HeuristicReviseEngine,
  buildBlockingGateStatus,
  buildRevisionComparisonReport,
} from "../dist/core/llm/revise-engine.js";
import { parseSceneDocument } from "../dist/core/utils/scene-text.js";

const styleGuide = {
  narrativeVoice: "近距离第三人称，压迫感强，少解释",
  dialogueRule: "对白必须体现角色差异",
  sentenceRhythm: "短句推进冲突，中句承接信息",
  descriptionDensity: "动作场景低描写密度，情绪停顿时提高感官描写",
  paragraphStrategy: "一段只承担一个推进功能",
};

const plan = {
  targetChapterNumber: 2,
  chapterMission: "让中盘代价落地",
  readerGoal: "让读者看到一次明确且有代价的选择",
  sceneBlueprint: [
    {
      sceneId: "scene-1",
      sceneAnchor: "scene-1-林烬",
      sceneNumber: 1,
      pov: "林烬",
      goal: "让林烬确认入口风险",
      conflict: "林烬要推进，门后的异动在阻拦",
      turn: "门后的回声突然模仿她的声音",
      result: "林烬确认必须继续",
      newInformation: ["门后的东西在观察她"],
      emotionalShift: "谨慎 -> 紧张",
      drivingCharacter: "林烬",
      opposingForce: "门后的异动",
      decision: "林烬决定继续推进",
      cost: "她的手被灼伤",
      relationshipChange: "林烬与沈砚从试探进入被迫协作",
      thematicTension: "代价与亲密 vs 力量可以无损获得",
      valuePositionA: "代价与亲密",
      valuePositionB: "力量可以无损获得",
      sceneStance: "偏向代价与亲密",
      styleDirective: "动作优先，环境点到即止",
    },
    {
      sceneId: "scene-2",
      sceneAnchor: "scene-2-林烬",
      sceneNumber: 2,
      pov: "林烬",
      goal: "让林烬在求助与隐瞒之间做选择",
      conflict: "沈砚要求她说出真相",
      turn: "沈砚直接说出她在隐瞒",
      result: "关系压力升级",
      newInformation: ["沈砚已经察觉林烬的伤势"],
      emotionalShift: "紧张 -> 压迫",
      drivingCharacter: "林烬",
      opposingForce: "沈砚",
      decision: "林烬必须决定是否开口求助",
      cost: "一旦开口，她就失去独自承担的幻觉",
      relationshipChange: "林烬与沈砚的边界被重写",
      thematicTension: "代价与亲密 vs 力量可以无损获得",
      valuePositionA: "代价与亲密",
      valuePositionB: "力量可以无损获得",
      sceneStance: "偏向代价与亲密",
      styleDirective: "对白必须明显区分角色策略",
    },
    {
      sceneId: "scene-3",
      sceneAnchor: "scene-3-林烬",
      sceneNumber: 3,
      pov: "林烬",
      goal: "在结尾留下追读钩子",
      conflict: "门后的声音催促她继续",
      turn: "声音报出只有母亲知道的旧称呼",
      result: "林烬决定追进去",
      newInformation: ["母亲曾经来过这里"],
      emotionalShift: "压迫 -> 失衡",
      drivingCharacter: "林烬",
      opposingForce: "门后的声音",
      decision: "林烬决定不再后撤",
      cost: "她承认自己已经付出代价",
      relationshipChange: "林烬开始允许沈砚跟进",
      thematicTension: "代价与亲密 vs 力量可以无损获得",
      valuePositionA: "代价与亲密",
      valuePositionB: "力量可以无损获得",
      sceneStance: "偏向代价与亲密",
      styleDirective: "结尾短句收束，保留钩子",
    },
  ],
  characterIntent: [],
  themeIntent: "让主题冲突通过选择浮出",
  thematicQuestion: "主角是否承认力量必然伴随代价？",
  styleProfile: {
    narrationStyle: styleGuide.narrativeVoice,
    dialogueStyle: styleGuide.dialogueRule,
    pacingProfile: styleGuide.sentenceRhythm,
    descriptionDensity: styleGuide.descriptionDensity,
    toneConstraints: [styleGuide.paragraphStrategy],
  },
  gateNote: "验证样例",
};

const chapterText = [
  "# 验证章节",
  "",
  "这是 prelude，应该保持不变。",
  "",
  "【场景 1 / POV：林烬】",
  "林烬盯着半开的门。她决定继续推进，哪怕代价已经沿着掌心烧开。沈砚站在她背后，没有再劝，只提醒她别再一个人扛。门后的异动模仿了她的呼吸，逼得她把手按上门框，灼伤像烙印一样留下。她知道这一步一旦迈出，就等于承认代价与亲密比无损的力量更真实。",
  "",
  "【场景 2 / POV：林烬】",
  "沈砚看着她。两个人都没有立刻说话。空气很紧。门后的风吹过来，让人更不舒服。林烬只是往前站了一点，气氛越来越僵。",
  "",
  "【场景 3 / POV：林烬】",
  "门后的声音忽然叫出只有母亲知道的旧称呼。林烬决定追进去，因为她已经承认代价正在兑现。沈砚没有再退，只把手电举高，默认跟上。她知道自己接受了帮助，也接受了新的关系代价。走廊尽头的回声像钩子一样把她往更深处拽。",
  "",
  "---",
  "ending note / summary / appendix-like tail",
].join("\n");

const characterSeeds = [
  {
    name: "林烬",
    role: "主角",
    baselineDesire: "找到母亲留下的真相",
    baselineFear: "失控会伤人",
    baselineMisbelief: "只有独自承担才算强大",
    voiceNotes: "克制、锋利",
    relationshipMap: [{ target: "沈砚", status: "试探合作" }],
  },
  {
    name: "沈砚",
    role: "同伴",
    baselineDesire: "弄清门后的来源",
    baselineFear: "再次信错人",
    baselineMisbelief: "掌控信息就能掌控局面",
    voiceNotes: "冷静、追问式",
    relationshipMap: [{ target: "林烬", status: "警惕合作" }],
  },
];

const themeSeeds = [
  {
    theme: "代价与亲密",
    antiTheme: "力量可以无损获得",
    valueConflict: "控制自己 vs 接受他人介入",
    keywords: ["代价", "亲密", "求助"],
    antiKeywords: ["无损", "掌控", "独自"],
  },
];

test("single-scene verification proves only one blocking scene is rewritten", async () => {
  const reviseEngine = new HeuristicReviseEngine();

  const beforeDraft = {
    chapterNumber: 2,
    title: "验证章节",
    content: chapterText,
    summary: "验证 scene-level revise",
    basedOnPlan: 2,
  };

  const beforeAnalysis = {
    scenes: [
      {
        sceneId: "scene-1",
        sceneAnchor: "scene-1-林烬",
        sceneNumber: 1,
        pov: "林烬",
        goal: "让林烬确认入口风险",
        conflict: "林烬要推进，门后的异动在阻拦",
        turn: "门后的回声突然模仿她的声音",
        result: "林烬确认必须继续",
        newInformation: ["门后的东西在观察她"],
        emotionalShift: "谨慎 -> 紧张",
        sourceParagraphs: ["林烬决定继续推进，代价是手被灼伤，代价与亲密压过无损力量。"],
      },
      {
        sceneId: "scene-2",
        sceneAnchor: "scene-2-林烬",
        sceneNumber: 2,
        pov: "林烬",
        goal: "让林烬在求助与隐瞒之间做选择",
        conflict: "沈砚要求她说出真相",
        turn: "沈砚直接说出她在隐瞒",
        result: "关系压力升级",
        newInformation: ["沈砚已经察觉林烬的伤势"],
        emotionalShift: "紧张 -> 压迫",
        sourceParagraphs: ["沈砚看着她。两个人都没有立刻说话。空气很紧。"],
      },
      {
        sceneId: "scene-3",
        sceneAnchor: "scene-3-林烬",
        sceneNumber: 3,
        pov: "林烬",
        goal: "在结尾留下追读钩子",
        conflict: "门后的声音催促她继续",
        turn: "声音报出只有母亲知道的旧称呼",
        result: "林烬决定追进去",
        newInformation: ["母亲曾经来过这里"],
        emotionalShift: "压迫 -> 失衡",
        sourceParagraphs: ["林烬决定不再后撤，并承认代价已经发生。"],
      },
    ],
    characterStates: [],
    themeReport: { chapterNumber: 2, activeThemes: [] },
    styleReport: {
      averageSentenceLength: 12,
      dialogueRatio: 0.2,
      descriptionRatio: 0.2,
      rhythmNote: "可接受",
      adherenceNote: "可接受",
      styleDriftPoints: [],
      dialogueHomogeneitySpots: [],
      descriptionBalanceNote: "可接受",
    },
    readerReport: {
      chapterNumber: 2,
      scores: {
        hook: 7,
        momentum: 7,
        emotionalPeak: 5,
        suspense: 6,
        memorability: 6,
      },
      summary: "验证样例",
      strengths: [],
      risks: [],
      revisionSuggestions: [],
    },
    gateDecision: {
      chapterNumber: 2,
      gate: null,
      required: false,
      rationale: "验证样例",
    },
    revisionBrief: "仅修 scene 2",
  };
  const beforeSceneAudit = {
    sceneCoverageOk: true,
    issues: [
      {
        sceneNumber: 2,
        severity: "high",
        problem: "场景缺少明确决策",
        recommendation: "补出林烬是否开口求助的决定。",
      },
      {
        sceneNumber: 2,
        severity: "medium",
        problem: "场景只有剧情推进，没有主题冲突",
        recommendation: "让价值冲突通过对白与动作体现。",
      },
    ],
  };
  const blockingGate = buildBlockingGateStatus({ analysis: beforeAnalysis, sceneAudit: beforeSceneAudit });

  assert.equal(blockingGate.blocking, true);
  assert.deepEqual(blockingGate.blockingScenes.map((entry) => entry.sceneNumber), [2]);

  const revision = await reviseEngine.revise({
    draft: beforeDraft,
    plan,
    analysis: beforeAnalysis,
    sceneAudit: beforeSceneAudit,
    characterHistory: [],
    themeHistory: { timeline: [] },
    styleGuide,
    targetSceneNumbers: blockingGate.blockingScenes.map((entry) => entry.sceneNumber),
  });

  const afterAnalysis = {
    ...beforeAnalysis,
    scenes: beforeAnalysis.scenes.map((scene) =>
      scene.sceneNumber === 2
        ? {
            ...scene,
            sourceParagraphs: [
              "林烬终于决定开口求助，并立刻承认这样做的代价是失去独自承担的幻觉。她和沈砚的关系被迫前移，代价与亲密压过无损力量。",
            ],
          }
        : scene,
    ),
  };
  const afterSceneAudit = {
    sceneCoverageOk: true,
    issues: [],
  };
  const comparison = buildRevisionComparisonReport({
    chapterNumber: 2,
    before: beforeAnalysis,
    after: afterAnalysis,
    beforeSceneAudit,
    afterSceneAudit,
    plan,
    beforeDraftContent: beforeDraft.content,
    afterDraftContent: revision.draft.content,
    trace: revision.trace,
  });

  const beforeDocument = parseSceneDocument(beforeDraft.content);
  const afterDocument = parseSceneDocument(revision.draft.content);

  assert.deepEqual(revision.trace.targetSceneNumbers, [2]);
  assert.deepEqual(revision.trace.actualRewrittenSceneNumbers, [2]);
  assert.deepEqual(revision.trace.comparisonSceneNumbers, [2]);
  assert.deepEqual(comparison.comparisonSceneNumbers, [2]);
  assert.deepEqual(comparison.reviewedButNotRewrittenSceneNumbers, []);

  assert.equal(beforeDocument.prelude, afterDocument.prelude);
  assert.equal(beforeDocument.postlude, afterDocument.postlude);
  assert.equal(afterDocument.scenes[0]?.content, beforeDocument.scenes[0]?.content);
  assert.notEqual(afterDocument.scenes[1]?.content, beforeDocument.scenes[1]?.content);
  assert.equal(afterDocument.scenes[2]?.content, beforeDocument.scenes[2]?.content);

  assert.equal(comparison.sceneAlignment.stableByParsedScenes, true);
  assert.equal(comparison.sceneAlignment.stableByAnalysisScenes, true);
  assert.deepEqual(
    comparison.sceneChanges.map((entry) => entry.sceneNumber),
    [2],
  );
  assert.ok(
    comparison.sceneChanges[0]?.textualChangeEvidence.some((entry) => entry.includes("decision") || entry.includes("theme")),
  );
});
