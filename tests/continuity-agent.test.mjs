import test from "node:test";
import assert from "node:assert/strict";
import { ContinuityAgent } from "../dist/core/modules/continuity-agent.js";

test("continuity agent blocks canonical persist when scene coverage and urgent open loops break", () => {
  const agent = new ContinuityAgent();
  const report = agent.audit({
    chapterNumber: 2,
    draft: {
      chapterNumber: 2,
      title: "矿坑后的夜里",
      content: "林凡被发去最脏的废道清理矿渣，但正文里没有承接上一章的断供威胁。",
      summary: "工作稿",
      basedOnPlan: 2,
    },
    plan: {
      targetChapterNumber: 2,
      chapterMission: "把赵执事的报复落到具体苦役上。",
      readerGoal: "承接上一章代价。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把打压变成具体苦役",
          conflict: "赵执事开始卡资源",
          turn: "林凡确认威胁正在落地",
          result: "林凡被迫接受危险苦役",
          newInformation: ["外门记录弟子也开始配合打压"],
          emotionalShift: "烦闷 -> 警惕",
          drivingCharacter: "赵执事",
          opposingForce: "林凡",
          decision: "先接下苦役",
          cost: "必须承担更危险任务",
          relationshipChange: "双方结怨升级",
          thematicTension: "反抗后代价升级",
          valuePositionA: "低头",
          valuePositionB: "硬抗",
          sceneStance: "压向更冷现实",
          styleDirective: "快节奏",
        },
        {
          sceneId: "scene-2",
          sceneAnchor: "scene-2-深井差事",
          sceneNumber: 2,
          pov: "林凡",
          goal: "把下章压力点钉在深井任务上",
          conflict: "新的差事牌逼他去深井",
          turn: "停发配给写成死规矩",
          result: "林凡没有退路",
          newInformation: ["深井任务会成为下一章直接威胁"],
          emotionalShift: "警惕 -> 决意",
          drivingCharacter: "赵执事",
          opposingForce: "林凡",
          decision: "接下差事牌",
          cost: "拒绝就停发三月配给",
          relationshipChange: "结怨转成制度性围剿",
          thematicTension: "代价持续升级",
          valuePositionA: "退让保命",
          valuePositionB: "硬扛到底",
          sceneStance: "把危险任务变成下章钩子",
          styleDirective: "收束留钩",
        },
      ],
      characterIntent: [],
      themeIntent: "推进反抗有代价",
      thematicQuestion: "反抗后代价如何持续升级",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "克制",
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
          sceneAnchor: "scene-1-苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把打压变成具体苦役",
          conflict: "赵执事开始卡资源",
          turn: "林凡确认威胁正在落地",
          result: "林凡被迫接受危险苦役",
          newInformation: ["外门记录弟子也开始配合打压"],
          emotionalShift: "烦闷 -> 警惕",
          sourceParagraphs: ["林凡被发去最脏的废道清理矿渣。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "活下去并向上爬",
          fear: "被断供后失去修炼机会",
          misbelief: "再忍一忍就能熬过去",
          recentDecision: "先接下苦役",
          decisionCost: "要承担更危险的任务",
          relationshipShift: ["与赵执事的结怨升级"],
          arcProgress: "开始适应反抗后的连续代价",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 2,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 16,
        dialogueRatio: 0.1,
        descriptionRatio: 0.25,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 2,
        scores: {
          hook: 7,
          momentum: 7,
          emotionalPeak: 6,
          suspense: 7,
          memorability: 6,
        },
        summary: "代价开始压实。",
        strengths: [],
        risks: ["赵执事的断供威胁没有在本章具体落地。"],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 2,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    settlement: {
      chapterSummary: {
        chapterNumber: 2,
        title: "矿坑后的夜里",
        summary: "林凡被迫接受危险苦役，但上一章最急迫的断供威胁没有被明确承接。",
        keyEvents: ["林凡被迫接受危险苦役"],
        changedCharacters: [],
        openedLoopIds: [],
        advancedLoopIds: [],
        closedLoopIds: [],
      },
      chapterStateDelta: {
        chapterNumber: 2,
        title: "矿坑后的夜里",
        changedCharacters: [],
        chronologyInsertions: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "赵执事"],
            summary: "林凡被发去最脏的废道清理矿渣",
            consequence: "他必须先接下危险苦役",
          },
        ],
        updatedLoops: [],
        stateHighlights: ["林凡被迫接受危险苦役"],
      },
      chronology: {
        events: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "赵执事"],
            summary: "林凡被发去最脏的废道清理矿渣",
            consequence: "他必须先接下危险苦役",
          },
        ],
      },
      openLoops: {
        loops: [],
      },
    },
    previousChronology: {
      events: [
        {
          eventId: "ch0001-scene-3",
          chapterNumber: 1,
          sceneNumber: 3,
          sceneId: "scene-3",
          actors: ["林凡", "赵执事"],
          summary: "林凡当众夺回灵石",
          consequence: "赵执事决定后续断供并加重打压",
        },
      ],
    },
    previousOpenLoops: {
      loops: [
        {
          loopId: "loop-ch0001-01",
          type: "threat",
          introducedInChapter: 1,
          owner: "赵执事",
          description: "后续资源可能被彻底断供，甚至被安排危险差事",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: ["下一章必须承接断供或危险差事"],
          relatedEntities: ["赵执事", "林凡"],
          evidenceRefs: ["scene-4"],
          lastUpdatedChapter: 1,
        },
      ],
    },
    previousCharacterHistory: [
      {
        name: "林凡",
        latestState: {
          name: "林凡",
          desire: "改变命运",
          fear: "被断供后失去修炼机会",
          misbelief: "再忍一忍就能熬过去",
          recentDecision: "当众夺回灵石",
          decisionCost: "赵执事准备断供并加重打压",
          relationshipShift: ["与赵执事公开对立"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
        timeline: [],
      },
    ],
    worldRules: {
      rules: [],
    },
  });

  assert.equal(report.blocking, true);
  assert.ok(report.issues.some((issue) => issue.code === "scene_coverage_conflict"));
  assert.ok(report.issues.some((issue) => issue.code === "open_loop_conflict"));
});

test("continuity agent allows canonical persist when scene coverage and urgent loops are carried forward", () => {
  const agent = new ContinuityAgent();
  const report = agent.audit({
    chapterNumber: 2,
    draft: {
      chapterNumber: 2,
      title: "矿坑后的夜里",
      content: "赵执事真的断了林凡的配给，还把他赶去西三区深井。林凡知道这口井就是下一轮打压的起点。",
      summary: "工作稿",
      basedOnPlan: 2,
    },
    plan: {
      targetChapterNumber: 2,
      chapterMission: "把断供与深井任务压实。",
      readerGoal: "承接上一章代价。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把断供落地",
          conflict: "赵执事真的开始断供",
          turn: "林凡意识到断供是制度性打压",
          result: "深井任务变成下一章直接威胁",
          newInformation: ["西三区深井会成为下一章主压力"],
          emotionalShift: "烦闷 -> 警惕",
          drivingCharacter: "赵执事",
          opposingForce: "林凡",
          decision: "先吞下这口气",
          cost: "接下危险任务",
          relationshipChange: "双方结怨升级",
          thematicTension: "反抗后代价升级",
          valuePositionA: "低头",
          valuePositionB: "硬抗",
          sceneStance: "现实更冷",
          styleDirective: "快节奏",
        },
      ],
      characterIntent: [],
      themeIntent: "推进反抗有代价",
      thematicQuestion: "反抗后代价如何持续升级",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "克制",
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
          sceneAnchor: "scene-1-苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把断供落地",
          conflict: "赵执事真的开始断供",
          turn: "林凡意识到断供是制度性打压",
          result: "深井任务变成下一章直接威胁",
          newInformation: ["西三区深井会成为下一章主压力"],
          emotionalShift: "烦闷 -> 警惕",
          sourceParagraphs: ["赵执事真的断了林凡的配给，还把他赶去西三区深井。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "活下去并向上爬",
          fear: "被断供后失去修炼机会",
          misbelief: "再忍一忍就能熬过去",
          recentDecision: "先接下深井任务",
          decisionCost: "必须去更危险的深井",
          relationshipShift: ["与赵执事的结怨升级"],
          arcProgress: "反抗后的代价开始持续升级",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 2,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 16,
        dialogueRatio: 0.1,
        descriptionRatio: 0.25,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 2,
        scores: {
          hook: 7,
          momentum: 8,
          emotionalPeak: 6,
          suspense: 7,
          memorability: 6,
        },
        summary: "断供和深井威胁已经承接到位。",
        strengths: [],
        risks: [],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 2,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    settlement: {
      chapterSummary: {
        chapterNumber: 2,
        title: "矿坑后的夜里",
        summary: "赵执事真的断了林凡的配给，还把他赶去西三区深井。",
        keyEvents: ["赵执事断供并安排深井任务"],
        changedCharacters: [],
        openedLoopIds: ["loop-ch0002-01"],
        advancedLoopIds: ["loop-ch0001-01"],
        closedLoopIds: [],
      },
      chapterStateDelta: {
        chapterNumber: 2,
        title: "矿坑后的夜里",
        changedCharacters: [],
        chronologyInsertions: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "赵执事"],
            summary: "赵执事真的断了林凡的配给",
            consequence: "林凡被赶去西三区深井",
          },
        ],
        updatedLoops: [
          {
            loopId: "loop-ch0001-01",
            action: "advanced",
            description: "后续资源可能被彻底断供，甚至被安排危险差事",
            evidence: "scene-1",
          },
        ],
        stateHighlights: ["断供与深井威胁落地"],
      },
      chronology: {
        events: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "赵执事"],
            summary: "赵执事真的断了林凡的配给",
            consequence: "林凡被赶去西三区深井",
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
            description: "后续资源可能被彻底断供，甚至被安排危险差事",
            expectedPayoffWindow: "soon",
            urgency: "high",
            status: "advanced",
            payoffConstraints: ["下一章必须承接断供或危险差事"],
            relatedEntities: ["赵执事", "林凡"],
            evidenceRefs: ["scene-1"],
            lastUpdatedChapter: 2,
          },
        ],
      },
    },
    previousChronology: {
      events: [
        {
          eventId: "ch0001-scene-3",
          chapterNumber: 1,
          sceneNumber: 3,
          sceneId: "scene-3",
          actors: ["林凡", "赵执事"],
          summary: "林凡当众夺回灵石",
          consequence: "赵执事决定后续断供并加重打压",
        },
      ],
    },
    previousOpenLoops: {
      loops: [
        {
          loopId: "loop-ch0001-01",
          type: "threat",
          introducedInChapter: 1,
          owner: "赵执事",
          description: "后续资源可能被彻底断供，甚至被安排危险差事",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: ["下一章必须承接断供或危险差事"],
          relatedEntities: ["赵执事", "林凡"],
          evidenceRefs: ["scene-4"],
          lastUpdatedChapter: 1,
        },
      ],
    },
    previousCharacterHistory: [
      {
        name: "林凡",
        latestState: {
          name: "林凡",
          desire: "改变命运",
          fear: "被断供后失去修炼机会",
          misbelief: "再忍一忍就能熬过去",
          recentDecision: "当众夺回灵石",
          decisionCost: "赵执事准备断供并加重打压",
          relationshipShift: ["与赵执事公开对立"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
        timeline: [],
      },
    ],
    worldRules: {
      rules: [],
    },
  });

  assert.equal(report.blocking, false);
  assert.equal(report.issues.length, 0);
});

test("continuity agent blocks canonical persist when world rules are violated", () => {
  const agent = new ContinuityAgent();
  const report = agent.audit({
    chapterNumber: 2,
    draft: {
      chapterNumber: 2,
      title: "深井口的火光",
      content: "林凡摸出一把手枪，顶住陈师兄的眉心。赵执事刚想喝止，林凡已经扣下扳机。",
      summary: "工作稿",
      basedOnPlan: 2,
    },
    plan: {
      targetChapterNumber: 2,
      chapterMission: "把上章代价推进成更硬的压迫。",
      readerGoal: "承接反抗后的后果。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-深井口",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把代价压到深井任务上",
          conflict: "赵执事把危险差事压到林凡头上",
          turn: "林凡发现深井口有人故意堵他",
          result: "冲突升级为更公开的对抗",
          newInformation: ["西三区深井已经被人提前做了手脚"],
          emotionalShift: "警惕 -> 绷紧",
          drivingCharacter: "林凡",
          opposingForce: "赵执事",
          decision: "硬接深井任务",
          cost: "危险差事直接压到身上",
          relationshipChange: "与赵执事公开撕破脸",
          thematicTension: "反抗后的代价变得更具体",
          valuePositionA: "低头保命",
          valuePositionB: "硬扛到底",
          sceneStance: "继续压向更冷现实",
          styleDirective: "快节奏",
        },
      ],
      characterIntent: [],
      themeIntent: "反抗有代价",
      thematicQuestion: "主角还能否承受反抗后的持续打压",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "克制",
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
          sceneAnchor: "scene-1-深井口",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把代价压到深井任务上",
          conflict: "赵执事把危险差事压到林凡头上",
          turn: "林凡发现深井口有人故意堵他",
          result: "冲突升级为更公开的对抗",
          newInformation: ["西三区深井已经被人提前做了手脚"],
          emotionalShift: "警惕 -> 绷紧",
          sourceParagraphs: ["林凡摸出一把手枪，顶住陈师兄的眉心。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "活下去并向上爬",
          fear: "被彻底断供后再无翻身机会",
          misbelief: "只要够狠就能立刻吓住所有人",
          recentDecision: "在深井口直接亮出手枪",
          decisionCost: "会把冲突推到不可收拾的地步",
          relationshipShift: ["与赵执事彻底公开对立"],
          arcProgress: "开始误把极端手段当成唯一出路",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 2,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 15,
        dialogueRatio: 0.1,
        descriptionRatio: 0.2,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 2,
        scores: {
          hook: 7,
          momentum: 8,
          emotionalPeak: 7,
          suspense: 6,
          memorability: 6,
        },
        summary: "冲突升级，但世界规则明显跑偏。",
        strengths: [],
        risks: ["现代热武器和当前修仙设定明显冲突。"],
        revisionSuggestions: ["把现代枪械替换成符合世界规则的差事牌、法器或矿井机关。"],
      },
      gateDecision: {
        chapterNumber: 2,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    settlement: {
      chapterSummary: {
        chapterNumber: 2,
        title: "深井口的火光",
        summary: "林凡在深井口亮出了不属于这个世界观的现代枪械。",
        keyEvents: ["林凡亮出手枪威胁陈师兄"],
        changedCharacters: [],
        openedLoopIds: [],
        advancedLoopIds: [],
        closedLoopIds: [],
      },
      chapterStateDelta: {
        chapterNumber: 2,
        title: "深井口的火光",
        changedCharacters: [],
        chronologyInsertions: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "陈师兄", "赵执事"],
            summary: "林凡在深井口亮出手枪威胁陈师兄",
            consequence: "冲突被推进到不符合设定的热武器对峙",
          },
        ],
        updatedLoops: [],
        stateHighlights: ["现代热武器闯入修仙场景"],
      },
      chronology: {
        events: [
          {
            eventId: "ch0002-scene-1",
            chapterNumber: 2,
            sceneNumber: 1,
            sceneId: "scene-1",
            actors: ["林凡", "陈师兄", "赵执事"],
            summary: "林凡在深井口亮出手枪威胁陈师兄",
            consequence: "冲突被推进到不符合设定的热武器对峙",
          },
        ],
      },
      openLoops: {
        loops: [],
      },
    },
    previousChronology: {
      events: [],
    },
    previousOpenLoops: {
      loops: [],
    },
    previousCharacterHistory: [],
    worldRules: {
      rules: [
        {
          ruleId: "no-modern-firearms",
          description: "本书修仙主线里禁止现代热武器直接入场。",
          severity: "high",
          forbiddenPhrases: ["手枪", "步枪", "冲锋枪"],
          appliesWhenAnyPhrases: [],
          requiredPhrases: [],
        },
      ],
    },
  });

  assert.equal(report.blocking, true);
  assert.ok(report.issues.some((issue) => issue.code === "world_rule_conflict"));
  assert.equal(report.checkedCounts.worldRules, 1);
  assert.equal(report.skippedChecks.length, 0);
});
